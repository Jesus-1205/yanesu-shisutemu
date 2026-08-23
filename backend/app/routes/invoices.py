import json
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.invoice import (
    FacturaCreate,
    FacturaOut,
    FacturaPaginationOut,
    InvoiceAnalysisOut,
)
from app.services.audit_service import log_action
from app.services.invoice_service import (
    analyze_invoice_from_image,
    create_invoice,
    get_invoice,
    get_invoices,
    optimize_image,
)

router = APIRouter(prefix="/invoices", tags=["invoices"])


# ── Rate Limiting simple en memoria ───────────────────────────────────────
_rate_limit_store: dict[int, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # segundos
RATE_LIMIT_MAX = 10     # peticiones por ventana


def _check_rate_limit(user_id: int):
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    _rate_limit_store[user_id] = [
        t for t in _rate_limit_store[user_id] if t > window_start
    ]
    if len(_rate_limit_store[user_id]) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas peticiones. Intenta de nuevo en un minuto.",
        )
    _rate_limit_store[user_id].append(now)


# ── Endpoint de Análisis IA ──────────────────────────────────────────────


@router.post("/analyze", status_code=status.HTTP_200_OK)
def analyze_invoice(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """POST /invoices/analyze - Analizar factura con IA (Human-in-the-Loop)

    Recibe: multipart/form-data con:
      - files: uno o más archivos (imágenes o PDFs) de la factura
    Hace:   envía archivos al modelo de visión, extrae datos, hace fuzzy matching
    Devuelve: 200 + InvoiceAnalysisOut | 429 rate limit | 400/422/500 error
    """
    _check_rate_limit(current_user.id)

    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes subir al menos un archivo",
        )

    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}
    MAX_SIZE = 10 * 1024 * 1024  # 10MB por archivo

    file_data: list[tuple[bytes, str]] = []
    for f in files:
        if not f.content_type or f.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de archivo no soportado: {f.content_type}. Usa JPG, PNG, WebP, GIF o PDF.",
            )
        file_bytes = f.file.read()
        if len(file_bytes) > MAX_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El archivo {f.filename} supera 10MB ({len(file_bytes) // (1024*1024)}MB)",
            )
        file_data.append((file_bytes, f.content_type))

    try:
        result = analyze_invoice_from_image(db, file_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except (KeyError, TypeError, AttributeError) as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La IA no pudo leer la factura correctamente. Intenta con otra imagen.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar archivos con la IA",
        )

    return result


# ── Endpoints existentes ─────────────────────────────────────────────────


@router.post("", status_code=status.HTTP_201_CREATED)
async def create(
    data: str = Form(...),
    image: UploadFile | None = File(default=None),
    procesada_por_ia: bool = Form(default=False),
    raw_json_ia: str | None = Form(default=None),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """POST /invoices - Registrar factura de proveedor

    Recibe: multipart/form-data con:
      - data: JSON string con FacturaCreate (proveedor_id, numero_factura, detalles[])
      - image: (opcional) archivo de imagen de la factura
      - procesada_por_ia: (opcional) flag de auditoría
      - raw_json_ia: (opcional) JSON crudo de la IA
    Hace:   guarda imagen en uploads/, crea factura + detalles, actualiza stock y costo promedio
    Devuelve: 201 + factura | 409 factura duplicada | 404 producto no existe
    """
    parsed = FacturaCreate(**json.loads(data))

    image_bytes = None
    image_filename = None
    if image and image.filename:
        raw_bytes = await image.read()
        content_type = image.content_type or "image/jpeg"
        image_bytes, _ = optimize_image(raw_bytes, content_type)
        image_filename = image.filename

    raw_ia = None
    if raw_json_ia:
        try:
            raw_ia = json.loads(raw_json_ia)
        except json.JSONDecodeError:
            pass

    proveedor = db.get(Supplier, parsed.proveedor_id)
    proveedor_nombre = proveedor.nombre if proveedor else ""

    factura = create_invoice(
        db,
        data=parsed,
        usuario_id=current_user.id,
        image_bytes=image_bytes,
        image_filename=image_filename,
        procesada_por_ia=procesada_por_ia,
        raw_json_ia=raw_ia,
        proveedor_nombre=proveedor_nombre,
    )
    ip = request.client.host if request else "local"
    log_action(usuario=current_user.username, ip=ip, accion="CREAR", entidad="factura", entidad_id=factura.id, detalle=f"Creada factura #{factura.numero_factura} proveedor '{proveedor_nombre}'")
    return _factura_to_out(factura)


@router.get("", response_model=FacturaPaginationOut, status_code=status.HTTP_200_OK)
def list_all(
    proveedor_id: int | None = None,
    tipo_documento: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """GET /invoices - Listar facturas de proveedores

    Recibe: query params (proveedor_id, tipo_documento, search, page, page_size)
    Hace:   consulta facturas con filtros y paginación
    Devuelve: 200 + FacturaPaginationOut
    """
    result = get_invoices(
        db,
        proveedor_id=proveedor_id,
        tipo_documento=tipo_documento,
        search=search,
        page=page,
        page_size=page_size,
    )
    return {
        "items": [_factura_to_out(f) for f in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "pages": result["pages"],
    }


@router.get("/{invoice_id}", status_code=status.HTTP_200_OK)
def get_by_id(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """GET /invoices/{invoice_id} - Obtener factura con detalle

    Recibe: invoice_id en path
    Hace:   busca factura con sus productos y proveedor
    Devuelve: 200 + FacturaOut | 404
    """
    factura = get_invoice(db, invoice_id)
    return _factura_to_out(factura)


@router.get("/{invoice_id}/image", status_code=status.HTTP_200_OK)
def get_image(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """GET /invoices/{invoice_id}/image - Descargar imagen de factura

    Recibe: invoice_id en path
    Hace:   busca la ruta de la imagen y la sirve
    Devuelve: 200 + archivo imagen | 404 factura no encontrada | 404 sin imagen
    """
    factura = get_invoice(db, invoice_id)
    if not factura.image_path:
        raise HTTPException(status_code=404, detail="Esta factura no tiene imagen asociada")

    return FileResponse(factura.image_path)


def _factura_to_out(factura) -> FacturaOut:
    return FacturaOut.model_validate(factura)
