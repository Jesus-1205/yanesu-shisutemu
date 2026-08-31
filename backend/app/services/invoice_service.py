from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Literal

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_uploads_dir, get_comprobantes_pago_dir
from app.core.exceptions import ConflictError, EntityNotFoundError
from app.core.timezone import ve_today
from app.models.invoice import DetalleFactura, Factura, MonedaEnum, TipoDocumentoEnum, TipoEmpaqueFactura, ObsequioFactura
from app.models.invoice_payment import InvoicePayment, InvoicePaymentReceipt
from app.models.product import Product
from app.models.supplier import Supplier
from app.services.product_service import _accent_fold, _accent_fold_pattern
from app.schemas.invoice import ExtractedProduct, FacturaCreate, InvoiceAnalysisOut, InvoicePaymentCreate, InvoicePaymentSummary, ObsequioFacturaCreate

IVA_RATE = Decimal("16")
GEMINI_MODEL = "gemini-3.5-flash-lite"


def _calcular_total_con_iva(factura: Factura, db: Session) -> tuple[Decimal, Decimal]:
    """Calcula el total de la factura incluyendo IVA.

    Retorna (total_usd_con_iva, total_bs_con_iva).
    El IVA solo aplica cuando moneda_principal=BS y aplica_iva=True.
    """
    if factura.moneda_principal != MonedaEnum.BS or not factura.aplica_iva:
        return (factura.total_usd, factura.total_bs)

    stmt = select(DetalleFactura).where(DetalleFactura.factura_id == factura.id)
    detalles = db.execute(stmt).scalars().all()

    base_bs = Decimal("0")
    exento_bs = Decimal("0")

    for d in detalles:
        subtotal_bs = Decimal(str(d.cantidad)) * d.costo_unitario_bs
        if d.tipo_iva == "EXENTO":
            exento_bs += subtotal_bs
        else:
            base_bs += subtotal_bs

    iva_bs = (base_bs * IVA_RATE / Decimal("100")).quantize(Decimal("0.01"))
    total_bs = (exento_bs + base_bs + iva_bs).quantize(Decimal("0.01"))

    if factura.tasa_bs > 0:
        total_usd = (total_bs / factura.tasa_bs).quantize(Decimal("0.01"))
    else:
        total_usd = factura.total_usd

    return (total_usd, total_bs)

# ── System Prompts para el modelo de Visión ────────────────────────────────

INVOICE_METADATA_PROMPT = """Eres un extractor de metadatos de facturas comerciales venezolanas.
Tu ÚNICO trabajo es extraer los datos del encabezado y pie de la factura.
Devuelve EXCLUSIVAMENTE un JSON válido sin texto adicional.

Formato requerido:
{
  "proveedor": {
    "nombre": "string - nombre COMPLETO del proveedor tal como aparece en el encabezado"
  },
  "numero_factura": "string - número o código de la factura",
  "fecha_factura": "string|null - fecha en formato YYYY-MM-DD o null si no se detecta",
  "fecha_limite_pago": "string|null - fecha de vencimiento/pago en formato YYYY-MM-DD o null si no se detecta",
  "moneda": "USD o BS",
  "tipo_documento": "FACTURA o NOTA_ENTREGA"
}

Reglas para PROVEEDOR:
- Está en el ENCABEZADO (parte superior, letra grande, bold, recuadro destacado).
- Incluye TODAS las palabras del nombre. No acortes.
- NO confundas con nombres de productos (POLAR, PILSEN, SOLERA).
- NO confundas con direcciones, teléfonos o RIF.

Reglas para MONEDA:
- Montos bajos (5, 10, 25, 68) → USD
- Montos altos (1000, 9533, 18206) → BS
- "Bs", "Bs.S", "bolívares" → BS
- "TOTAL US$" o "$" → USD

Reglas para TIPO_DOCUMENTO:
- Si dice "FACTURA" o "FACT" → FACTURA
- Si dice "NOTA DE ENTREGA" o "N/E" → NOTA_ENTREGA
- Si no es claro → FACTURA

Reglas generales:
- Si un campo no es legible, usa null.
- NO incluyas productos, cantidades ni precios.
"""

INVOICE_PRODUCTS_PROMPT = """Eres un extractor de productos de facturas comerciales venezolanas.
Tu ÚNICO trabajo es extraer la lista de productos EN EL ORDEN EXACTO en que aparecen en la factura (de arriba a abajo).
Devuelve EXCLUSIVAMENTE un JSON válido sin texto adicional.

Formato requerido:
{
  "productos": [
    {
      "nombre": "string - descripción del producto tal como aparece en la factura",
      "tipo_empaque": "CAJA o UNIDAD",
      "cantidad": "number - cantidad de cajas o unidades compradas",
      "precio_unitario": "number - precio por caja o por unidad SIN impuestos, CON DECIMALES EXACTOS"
    }
  ]
}

Reglas de ORDEN (LO MÁS IMPORTANTE):
- Extrae los productos EN EL ORDEN EXACTO de la factura (arriba → abajo).
- NO reordenes, NO agrupes, NO saltes ítems.
- Si un producto tiene variantes (ej: "36 BOTELLAS RETORNABLES", "12 BOTELLAS N/R"), crea un ítem por cada variante EN EL ORDEN que aparecen.

Reglas para PRECIO:
- Si hay columna "PRECIO POR CAJAS" o "PRECIO UNITARIO", úsala directamente CON SUS DECIMALES EXACTOS (ej: 14991.77, NO 14992).
- Si hay "TOTAL SIN IMPUESTOS", calcula: total / cantidad = precio_unitario CON DECIMALES.
- Ignora columnas de LITROS, ALICUOTA (IVA), TOTAL CON IMPUESTOS.

Reglas para TIPO_EMPAQUE:
- CAJA si se vende por cajas/bultos/bandas completas.
- UNIDAD si son piezas individuales sueltas.
- El precio_unitario debe ser el precio por el tipo de empaque indicado.

Reglas para NOMBRES:
- Respeta el nombre exacto del producto como aparece en la factura.
- Si hay categoría (ej: "SANGRÍA"), inclúyela: "SANGRÍA VERANO LATA".
- Incluye volumen si hay variantes: "POLAR PILSEN 24 LATAS 0.355L".

Reglas estrictas:
- NO incluyas totales, subtotales ni impuestos.
- NO incluyas datos del proveedor, fecha ni número de factura.
- El precio unitario DEBE tener decimales exactos (ej: 14991.77, NO 14992).
- Si un producto no es legible, omítelo.
"""


def _save_invoice_image(
    file_bytes: bytes,
    filename: str,
    proveedor: str = "",
    numero_factura: str = "",
) -> str:
    """Guarda imagen optimizada con nombre descriptivo.

    Formato: {proveedor}_{numero_factura}_{uuid8}.{ext}
    Ej: DISTRIBUIDORA_CAMACHO_027533_a3f8b2c1.jpg
    """
    import re
    import uuid

    dest_dir = get_uploads_dir()
    dest_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(filename).suffix.lower() if Path(filename).suffix else ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".pdf"):
        ext = ".jpg"

    # Limpiar nombre del proveedor para filename
    proveedor_clean = re.sub(r"[^A-Z0-9]", "_", proveedor.upper())[:30].strip("_")
    num_clean = re.sub(r"[^A-Z0-9]", "", numero_factura.upper())[:15]
    uid = uuid.uuid4().hex[:8]

    if proveedor_clean and num_clean:
        saved_name = f"{proveedor_clean}_{num_clean}_{uid}{ext}"
    elif num_clean:
        saved_name = f"FACTURA_{num_clean}_{uid}{ext}"
    else:
        saved_name = f"FACTURA_{uid}{ext}"

    dest = dest_dir / saved_name
    dest.write_bytes(file_bytes)
    return str(dest)


MAX_IMAGE_DIMENSION = 2000  # px — Gemini no necesita más
JPEG_QUALITY = 85

try:
    from PIL import Image
    _HAS_PILLOW = True
except ImportError:
    _HAS_PILLOW = False


def optimize_image(image_bytes: bytes, content_type: str) -> tuple[bytes, str]:
    """Optimiza imagen para Gemini: resize + compresión JPEG.

    - Redimensiona a max 2000px en el lado más largo
    - Convierte a JPEG 85% quality (más ligero que PNG)
    - Para PDFs no hace nada, retorna tal cual
    - Si Pillow no está instalado, retorna tal cual
    Retorna: (bytes_optimizados, content_type_final)
    """
    from io import BytesIO

    # Si no hay Pillow, enviar tal cual
    if not _HAS_PILLOW:
        return image_bytes, content_type

    # PDFs se pasan tal cual
    if content_type == "application/pdf":
        return image_bytes, content_type

    try:
        img = Image.open(BytesIO(image_bytes))
    except Exception:
        # Si Pillow no puede abrirlo, enviar tal cual
        return image_bytes, content_type

    # Convertir RGBA/PALETTE a RGB (JPEG no soporta transparencia)
    if img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
        img = background

    # Resize si es más grande que MAX_IMAGE_DIMENSION
    w, h = img.size
    if max(w, h) > MAX_IMAGE_DIMENSION:
        ratio = MAX_IMAGE_DIMENSION / max(w, h)
        new_size = (int(w * ratio), int(h * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # Comprimir a JPEG
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    optimized = buf.getvalue()

    # Solo usar si es más ligero que el original
    if len(optimized) < len(image_bytes):
        return optimized, "image/jpeg"

    return image_bytes, content_type


def _call_gemini(
    files: list[tuple[bytes, str]],
    system_prompt: str,
    user_message: str,
    max_output_tokens: int = 1000,
    db: "Session | None" = None,
) -> dict:
    """Llama a Gemini con los archivos y prompt dados, retorna el JSON parseado."""
    import base64
    import json

    import httpx

    from app.core.config import Config
    from app.services import system_setting_service

    api_key = None
    if db:
        api_key = system_setting_service.get_api_key(db, "GEMINI_API_KEY")
    if not api_key:
        api_key = Config.GEMINI_API_KEY
    if not api_key:
        raise ValueError(
            "API Key de Gemini no configurada. "
            "El administrador debe configurarla en Ajustes del Sistema."
        )

    # Construir parts
    parts: list[dict] = [{"text": user_message}]
    for file_bytes, content_type in files:
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        parts.append({
            "inlineData": {
                "mimeType": content_type,
                "data": b64,
            }
        })

    url = (
        "https://generativelanguage.googleapis.com/v1beta/"
        f"models/{GEMINI_MODEL}:generateContent"
    )

    payload = {
        "contents": [{"parts": parts}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.0,
            "maxOutputTokens": max_output_tokens,
        },
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{url}?key={api_key}",
            headers={"Content-Type": "application/json"},
            json=payload,
        )
        if response.status_code != 200:
            if response.status_code in (401, 403):
                raise ValueError(
                    "API Key de Gemini inválida o revocada. "
                    "Revísala en Ajustes del Sistema."
                )
            if response.status_code == 429:
                raise ValueError(
                    "Se excedió la cuota de Gemini. Intenta más tarde."
                )
            if response.status_code >= 500:
                raise ValueError(
                    "Gemini no está disponible en este momento. Intenta más tarde."
                )
            raise ValueError(
                f"Gemini devolvió un error ({response.status_code})."
            )

    ia_response = response.json()

    # Verificar si Gemini bloqueó la respuesta (safety filters)
    prompt_feedback = ia_response.get("promptFeedback", {})
    if prompt_feedback.get("blockReason"):
        raise ValueError(
            "La IA bloqueó la respuesta por razones de seguridad. "
            "Intenta con otra imagen."
        )

    # Extraer contenido de candidates (puede estar vacío)
    candidates = ia_response.get("candidates", [])
    if not candidates:
        raise ValueError(
            "Gemini no retornó contenido. Intenta con otra imagen."
        )

    raw_content = (
        candidates[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )

    if not raw_content:
        raise ValueError("Gemini no retornó contenido")

    parsed = json.loads(raw_content)
    if "error" in parsed:
        raise ValueError(f"La IA no pudo leer la factura: {parsed['error']}")

    return parsed


def analyze_invoice_from_image(
    db: Session,
    files: list[tuple[bytes, str]],
) -> InvoiceAnalysisOut:
    """Punto de entrada principal: analiza factura con IA (2 llamadas separadas).

    Hace DOS requests a Gemini para reducir alucinaciones:
      1. Metadata (proveedor, factura, fecha, moneda, tipo_documento)
      2. Productos (nombre, cantidad, precio — en orden exacto)

    No hace fuzzy matching — el usuario selecciona productos manualmente.

    Args:
        files: Lista de tuplas (bytes, content_type) — puede ser 1 o más archivos
    """
    optimized_files: list[tuple[bytes, str]] = []
    for file_bytes, content_type in files:
        opt_bytes, opt_type = optimize_image(file_bytes, content_type)
        optimized_files.append((opt_bytes, opt_type))

    # ── Request 1: Metadata ───────────────────────────────────────────
    metadata = _call_gemini(
        optimized_files,
        INVOICE_METADATA_PROMPT,
        "Extrae los metadatos de esta factura: proveedor, número, fecha, moneda, tipo de documento.",
        max_output_tokens=300,
        db=db,
    )

    # ── Request 2: Productos (en orden) ──────────────────────────────
    productos_data = _call_gemini(
        optimized_files,
        INVOICE_PRODUCTS_PROMPT,
        "Extrae la lista de productos en el orden exacto en que aparecen en la factura, con cantidades y precios.",
        max_output_tokens=2000,
        db=db,
    )

    # ── Parse metadata ────────────────────────────────────────────────
    proveedor_nombre = (metadata.get("proveedor") or {}).get("nombre", "")
    if not proveedor_nombre:
        raise ValueError("La IA no pudo identificar el proveedor en la factura.")

    fecha = None
    if metadata.get("fecha_factura"):
        try:
            fecha = date.fromisoformat(metadata["fecha_factura"])
        except (ValueError, TypeError):
            pass

    fecha_limite = None
    if metadata.get("fecha_limite_pago"):
        try:
            fecha_limite = date.fromisoformat(metadata["fecha_limite_pago"])
        except (ValueError, TypeError):
            pass

    moneda_raw = metadata.get("moneda", "USD").upper()
    moneda = MonedaEnum.BS if moneda_raw == "BS" else MonedaEnum.USD

    tipo_doc_raw = metadata.get("tipo_documento", "FACTURA").upper()
    tipo_documento = (
        TipoDocumentoEnum.NOTA_ENTREGA
        if tipo_doc_raw == "NOTA_ENTREGA"
        else TipoDocumentoEnum.FACTURA
    )

    # ── Parse productos (en orden, sin matching) ─────────────────────
    productos: list[ExtractedProduct] = []
    for p in productos_data.get("productos", []):
        tipo_empaque_raw = str(p.get("tipo_empaque", "CAJA")).upper()
        productos.append(ExtractedProduct(
            nombre=p.get("nombre", ""),
            tipo_empaque=tipo_empaque_raw if tipo_empaque_raw in ("CAJA", "UNIDAD") else "CAJA",
            cantidad=p.get("cantidad", 1),
            precio_unitario=Decimal(str(p.get("precio_unitario", 0))),
        ))

    return InvoiceAnalysisOut(
        proveedor_nombre=proveedor_nombre,
        numero_factura=metadata.get("numero_factura", ""),
        fecha_factura=fecha,
        fecha_limite_pago=fecha_limite,
        moneda=moneda,
        tipo_documento=tipo_documento,
        productos=productos,
        raw_json_ia={"metadata": metadata, "productos": productos_data},
    )


def create_invoice(
    db: Session,
    data: FacturaCreate,
    usuario_id: int,
    image_bytes: bytes | None = None,
    image_filename: str | None = None,
    procesada_por_ia: bool = False,
    raw_json_ia: dict | None = None,
    proveedor_nombre: str = "",
) -> Factura:
    stmt = select(Factura).where(
        Factura.proveedor_id == data.proveedor_id,
        Factura.numero_factura == data.numero_factura,
    )
    if db.execute(stmt).scalars().first():
        raise ConflictError(
            f"La factura '{data.numero_factura}' de ese proveedor ya está registrada"
        )

    image_path = None
    if image_bytes and image_filename:
        image_path = _save_invoice_image(
            image_bytes, image_filename, proveedor_nombre, data.numero_factura
        )

    tasa = data.tasa_bs

    total_usd = Decimal("0")
    total_bs = Decimal("0")

    factura = Factura(
        proveedor_id=data.proveedor_id,
        numero_factura=data.numero_factura,
        tipo_documento=data.tipo_documento,
        fecha_factura=data.fecha_factura or ve_today(),
        fecha_limite_pago=data.fecha_limite_pago,
        image_path=image_path,
        usuario_id=usuario_id,
        observaciones=data.observaciones,
        moneda_principal=data.moneda_principal,
        tasa_bs=tasa,
        aplica_iva=data.aplica_iva,
        procesada_por_ia=procesada_por_ia,
        raw_json_ia=raw_json_ia,
    )

    detalles = []
    for item in data.detalles:
        stmt_prod = select(Product).where(Product.id == item.producto_id)
        product = db.execute(stmt_prod).scalars().first()
        if not product:
            raise EntityNotFoundError(f"Producto ID {item.producto_id} no encontrado")

        if data.moneda_principal == MonedaEnum.USD:
            costo_usd = item.costo_unitario_usd
            costo_bs = (item.costo_unitario_usd * tasa).quantize(Decimal("0.01"))
        else:
            costo_bs = item.costo_unitario_bs
            costo_usd = (item.costo_unitario_bs / tasa).quantize(Decimal("0.01"))

        detalle = DetalleFactura(
            factura=factura,
            producto_id=item.producto_id,
            tipo_empaque=item.tipo_empaque,
            cantidad=item.cantidad,
            costo_unitario_usd=costo_usd,
            costo_unitario_bs=costo_bs,
            tipo_iva=item.tipo_iva,
        )
        detalles.append(detalle)

        if item.tipo_empaque == TipoEmpaqueFactura.CAJA:
            unidades_por_caja = item.unidades_por_caja or product.unidades_por_caja
            unidades_ingresadas = item.cantidad * unidades_por_caja
        else:
            unidades_por_caja = product.unidades_por_caja
            unidades_ingresadas = item.cantidad

        subtotal_usd = Decimal(item.cantidad) * costo_usd
        subtotal_bs = Decimal(item.cantidad) * costo_bs
        total_usd += subtotal_usd
        total_bs += subtotal_bs

        stock_total_actual = Decimal(
            product.stock_unidades + (product.stock_cajas * product.unidades_por_caja)
        )
        total_unidades = stock_total_actual + Decimal(unidades_ingresadas)

        if item.tipo_empaque == TipoEmpaqueFactura.CAJA:
            nuevo_costo_caja = costo_usd
            nuevo_costo_unidad = (costo_usd / Decimal(unidades_por_caja)).quantize(Decimal("0.01"))
        else:
            nuevo_costo_unidad = costo_usd
            nuevo_costo_caja = (costo_usd * Decimal(unidades_por_caja)).quantize(Decimal("0.01"))

        if item.tipo_empaque == TipoEmpaqueFactura.CAJA:
            product.stock_cajas += item.cantidad
        else:
            product.stock_unidades += item.cantidad

        if item.unidades_por_caja and item.unidades_por_caja != product.unidades_por_caja:
            product.unidades_por_caja = item.unidades_por_caja

        product.precio_costo_caja_usd = nuevo_costo_caja
        product.precio_costo_usd = nuevo_costo_unidad
        product.proveedor_id = data.proveedor_id

    obsequios = []
    for item in data.obsequios:
        stmt_prod = select(Product).where(Product.id == item.producto_id)
        product = db.execute(stmt_prod).scalars().first()
        if not product:
            raise EntityNotFoundError(f"Producto ID {item.producto_id} no encontrado (obsequio)")

        obsequio = ObsequioFactura(
            factura=factura,
            producto_id=item.producto_id,
            tipo_empaque=item.tipo_empaque,
            cantidad=item.cantidad,
            justificacion=item.justificacion,
        )
        obsequios.append(obsequio)

        if item.tipo_empaque == TipoEmpaqueFactura.CAJA:
            product.stock_cajas += item.cantidad
        else:
            product.stock_unidades += item.cantidad

        if item.unidades_por_caja and item.unidades_por_caja != product.unidades_por_caja:
            product.unidades_por_caja = item.unidades_por_caja

    factura.detalles = detalles
    factura.obsequios = obsequios
    factura.total_usd = total_usd.quantize(Decimal("0.01"))
    if data.moneda_principal == MonedaEnum.USD and tasa > 0:
        factura.total_bs = (total_usd * tasa).quantize(Decimal("0.01"))
    else:
        factura.total_bs = total_bs.quantize(Decimal("0.01"))
        if tasa > 0:
            factura.total_usd = (total_bs / tasa).quantize(Decimal("0.01"))
    db.add(factura)
    db.commit()
    db.refresh(factura)
    return factura


def get_invoices(
    db: Session,
    *,
    proveedor_id: int | None = None,
    tipo_documento: str | None = None,
    estado_pago: str | None = None,
    search: str | None = None,
    sort_by: str | None = None,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    from datetime import date as _date

    stmt = select(Factura)

    if proveedor_id is not None:
        stmt = stmt.where(Factura.proveedor_id == proveedor_id)
    if tipo_documento:
        stmt = stmt.where(Factura.tipo_documento == tipo_documento)
    if estado_pago:
        stmt = stmt.where(Factura.estado_pago == estado_pago)
    if search:
        pattern = f"%{_accent_fold_pattern(search)}%"
        stmt = stmt.where(
            or_(
                Factura.numero_factura.ilike(pattern),
                _accent_fold(Factura.observaciones).ilike(pattern),
            )
        )
    if fecha_desde:
        stmt = stmt.where(Factura.fecha_factura >= _date.fromisoformat(fecha_desde))
    if fecha_hasta:
        stmt = stmt.where(Factura.fecha_factura <= _date.fromisoformat(fecha_hasta))

    if sort_by == "fecha_limite_pago":
        is_paid = case((Factura.estado_pago == "PAGADA", 1), else_=0)
        has_deadline = case((Factura.fecha_limite_pago.isnot(None), 0), else_=1)
        sort_date = func.coalesce(Factura.fecha_limite_pago, func.date(Factura.created_at))
        stmt = stmt.order_by(is_paid, has_deadline, sort_date.asc())
    elif sort_by in ("precio_desc", "precio_asc"):
        stmt = stmt.order_by(Factura.total_usd.desc() if sort_by == "precio_desc" else Factura.total_usd.asc())
    else:
        stmt = stmt.order_by(Factura.created_at.desc())

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size).options(
        selectinload(Factura.supplier),
        selectinload(Factura.detalles).selectinload(DetalleFactura.product),
        selectinload(Factura.payments),
        selectinload(Factura.obsequios),
    )

    items = list(db.execute(stmt).scalars().all())

    import math
    pages = math.ceil(total / page_size) if page_size > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


def get_invoice_stats(db: Session) -> dict:
    """Retorna conteo de facturas por estado de pago."""
    pendientes = db.execute(
        select(func.count()).where(Factura.estado_pago == "PENDIENTE")
    ).scalar() or 0
    parciales = db.execute(
        select(func.count()).where(Factura.estado_pago == "PARCIALMENTE_PAGADA")
    ).scalar() or 0
    pagadas = db.execute(
        select(func.count()).where(Factura.estado_pago == "PAGADA")
    ).scalar() or 0
    total = pendientes + parciales + pagadas
    return {
        "pendientes": pendientes,
        "parciales": parciales,
        "pagadas": pagadas,
        "total": total,
    }


def get_top_suppliers_by_purchases(db: Session, limit: int = 5) -> list[dict]:
    """Retorna los proveedores con más facturas, ordenados por cantidad de compras descendente."""
    stmt = (
        select(
            Factura.proveedor_id,
            func.count(Factura.id).label("invoice_count"),
        )
        .group_by(Factura.proveedor_id)
        .order_by(func.count(Factura.id).desc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()

    result = []
    for proveedor_id, invoice_count in rows:
        supplier = db.execute(
            select(Supplier).where(Supplier.id == proveedor_id)
        ).scalars().first()
        result.append({
            "supplier_id": proveedor_id,
            "supplier_name": supplier.nombre if supplier else "Desconocido",
            "invoice_count": invoice_count,
        })
    return result


def get_pending_invoices_summary(db: Session) -> dict:
    """Retorna el total USD pendiente de pago considerando IVA dinámico.

    Itera facturas PENDIENTE/PARCIALMENTE_PAGADA, calcula el total con IVA
    usando _calcular_total_con_iva, resta lo ya pagado, y suma todo.
    """
    facturas = db.execute(
        select(Factura).where(
            Factura.estado_pago.in_(["PENDIENTE", "PARCIALMENTE_PAGADA"])
        )
    ).scalars().all()

    total_pendiente = Decimal("0")

    for factura in facturas:
        total_con_iva_usd, _ = _calcular_total_con_iva(factura, db)

        pagos = db.execute(
            select(InvoicePayment).where(InvoicePayment.factura_id == factura.id)
        ).scalars().all()

        total_pagado_usd = sum(p.monto_usd for p in pagos)

        pagos_bs_only = [p for p in pagos if p.monto_usd <= 0 and p.monto_bs > 0]
        if factura.tasa_bs > 0 and pagos_bs_only:
            total_pagado_bs_only = sum(p.monto_bs for p in pagos_bs_only)
            total_pagado_usd += (Decimal(str(total_pagado_bs_only)) / factura.tasa_bs).quantize(Decimal("0.01"))

        saldo = total_con_iva_usd - total_pagado_usd
        if saldo > 0:
            total_pendiente += saldo

    return {"total_pendiente_usd": total_pendiente.quantize(Decimal("0.01"))}


def get_invoice(db: Session, invoice_id: int) -> Factura:
    stmt = (
        select(Factura)
        .options(
            selectinload(Factura.supplier),
            selectinload(Factura.detalles).selectinload(DetalleFactura.product),
            selectinload(Factura.payments),
            selectinload(Factura.obsequios),
        )
        .where(Factura.id == invoice_id)
    )
    factura = db.execute(stmt).scalars().first()
    if not factura:
        raise EntityNotFoundError("Factura no encontrada")
    return factura


# ── Pagos de Factura ────────────────────────────────────────────────────────


def _recalculate_invoice_payment_status(db: Session, factura: Factura) -> None:
    stmt_usd = select(func.coalesce(func.sum(InvoicePayment.monto_usd), 0)).where(
        InvoicePayment.factura_id == factura.id
    )
    total_pagado_usd = Decimal(str(db.execute(stmt_usd).scalar()))

    stmt_bs = select(func.coalesce(func.sum(InvoicePayment.monto_bs), 0)).where(
        InvoicePayment.factura_id == factura.id
    )
    total_pagado_bs = Decimal(str(db.execute(stmt_bs).scalar()))

    stmt_bs_only = select(func.coalesce(func.sum(InvoicePayment.monto_bs), 0)).where(
        InvoicePayment.factura_id == factura.id,
        InvoicePayment.monto_usd == 0,
    )
    total_pagado_bs_only = Decimal(str(db.execute(stmt_bs_only).scalar()))

    if factura.tasa_bs > 0 and total_pagado_bs_only > 0:
        total_pagado_usd += (total_pagado_bs_only / factura.tasa_bs).quantize(Decimal("0.01"))

    total_con_iva_usd, _ = _calcular_total_con_iva(factura, db)

    if total_pagado_usd >= total_con_iva_usd:
        factura.estado_pago = "PAGADA"
    elif total_pagado_usd > 0:
        factura.estado_pago = "PARCIALMENTE_PAGADA"
    else:
        factura.estado_pago = "PENDIENTE"


def register_invoice_payment(
    db: Session,
    factura_id: int,
    data: InvoicePaymentCreate,
    usuario_id: int,
    comprobantes_files: list[tuple[bytes, str, str]] | None = None,
) -> InvoicePayment:
    factura = db.get(Factura, factura_id)
    if not factura:
        raise EntityNotFoundError("Factura no encontrada")

    if factura.estado_pago == "PAGADA":
        raise ConflictError("La factura ya está completamente pagada")

    if data.monto_usd <= 0 and data.monto_bs <= 0:
        raise ConflictError("Debe especificar al menos un monto mayor a 0")

    from app.models.payment_method import PaymentMethod
    metodo = db.get(PaymentMethod, data.metodo_pago_id)
    if not metodo:
        raise EntityNotFoundError("Método de pago no encontrado")
    if not metodo.activo:
        raise ConflictError("El método de pago está inactivo")

    stmt_pagado = select(func.coalesce(func.sum(InvoicePayment.monto_usd), 0)).where(
        InvoicePayment.factura_id == factura_id
    )
    pagado_actual = Decimal(str(db.execute(stmt_pagado).scalar()))
    if factura.tasa_bs > 0:
        stmt_pagado_bs = select(func.coalesce(func.sum(InvoicePayment.monto_bs), 0)).where(
            InvoicePayment.factura_id == factura_id,
            InvoicePayment.monto_usd == 0,
        )
        pagado_actual_bs = Decimal(str(db.execute(stmt_pagado_bs).scalar()))
        pagado_actual += (pagado_actual_bs / factura.tasa_bs).quantize(Decimal("0.01"))

    total_con_iva_usd, _ = _calcular_total_con_iva(factura, db)
    saldo = total_con_iva_usd - pagado_actual
    if data.monto_mora <= 0 and data.monto_usd > saldo:
        raise ConflictError(
            f"El monto (${data.monto_usd}) excede el saldo pendiente (${saldo})"
        )

    tasa_usada = data.tasa_bs if data.tasa_bs and data.tasa_bs > 0 else factura.tasa_bs

    monto_bs_calculado = data.monto_bs
    if data.tasa_bs and data.tasa_bs > 0 and data.monto_usd > 0 and (not data.monto_bs or data.monto_bs <= 0):
        monto_bs_calculado = (data.monto_usd * data.tasa_bs).quantize(Decimal("0.01"))

    monto_mora = data.monto_mora.quantize(Decimal("0.01")) if data.monto_mora > 0 else Decimal("0.00")

    pago = InvoicePayment(
        factura_id=factura_id,
        metodo_pago_id=data.metodo_pago_id,
        monto_usd=data.monto_usd,
        monto_bs=monto_bs_calculado,
        tasa_bs=tasa_usada,
        monto_mora=monto_mora,
        referencia=data.referencia,
        observaciones=data.observaciones,
        usuario_id=usuario_id,
    )
    db.add(pago)
    db.flush()

    if comprobantes_files:
        comprobantes_dir = get_comprobantes_pago_dir()
        for file_bytes, content_type, filename in comprobantes_files:
            import uuid
            ext = Path(filename).suffix.lower() or ".jpg"
            saved_name = f"pago_{pago.id}_{uuid.uuid4().hex[:8]}{ext}"
            dest = comprobantes_dir / saved_name
            dest.write_bytes(file_bytes)
            receipt = InvoicePaymentReceipt(
                pago_id=pago.id,
                archivo_path=str(dest),
                nombre_original=filename,
                tipo_archivo=content_type,
            )
            db.add(receipt)

    _recalculate_invoice_payment_status(db, factura)
    db.commit()
    db.refresh(pago)
    return pago


def get_invoice_payments(db: Session, factura_id: int) -> dict:
    stmt = (
        select(InvoicePayment)
        .where(InvoicePayment.factura_id == factura_id)
        .order_by(InvoicePayment.fecha_pago.desc())
    )
    pagos = list(db.execute(stmt).scalars().all())
    return {"pagos": pagos}


def get_invoice_payment_summary(db: Session, factura_id: int) -> InvoicePaymentSummary:
    factura = db.get(Factura, factura_id)
    if not factura:
        raise EntityNotFoundError("Factura no encontrada")

    stmt_usd = select(func.coalesce(func.sum(InvoicePayment.monto_usd), 0)).where(
        InvoicePayment.factura_id == factura_id
    )
    total_pagado_usd = Decimal(str(db.execute(stmt_usd).scalar()))

    stmt_bs = select(func.coalesce(func.sum(InvoicePayment.monto_bs), 0)).where(
        InvoicePayment.factura_id == factura_id
    )
    total_pagado_bs = Decimal(str(db.execute(stmt_bs).scalar()))

    stmt_mora = select(func.coalesce(func.sum(InvoicePayment.monto_mora), 0)).where(
        InvoicePayment.factura_id == factura_id
    )
    total_mora_bs = Decimal(str(db.execute(stmt_mora).scalar()))

    stmt_bs_only = select(func.coalesce(func.sum(InvoicePayment.monto_bs), 0)).where(
        InvoicePayment.factura_id == factura_id,
        InvoicePayment.monto_usd == 0,
    )
    total_pagado_bs_only = Decimal(str(db.execute(stmt_bs_only).scalar()))

    if factura.tasa_bs > 0 and total_pagado_bs_only > 0:
        total_pagado_usd += (total_pagado_bs_only / factura.tasa_bs).quantize(Decimal("0.01"))

    total_con_iva_usd, total_con_iva_bs = _calcular_total_con_iva(factura, db)

    diferencia_cambiaria_bs = Decimal("0")
    if factura.tasa_bs > 0:
        stmt_diff_bs = select(func.coalesce(func.sum(InvoicePayment.monto_bs), 0)).where(
            InvoicePayment.factura_id == factura_id,
            InvoicePayment.tasa_bs != factura.tasa_bs,
            InvoicePayment.tasa_bs > 0,
        )
        total_bs_tasa_diferente = Decimal(str(db.execute(stmt_diff_bs).scalar()))
        if total_bs_tasa_diferente > 0:
            stmt_diff_usd = select(func.coalesce(func.sum(InvoicePayment.monto_usd), 0)).where(
                InvoicePayment.factura_id == factura_id,
                InvoicePayment.tasa_bs != factura.tasa_bs,
                InvoicePayment.tasa_bs > 0,
            )
            usd_tasa_diferente = Decimal(str(db.execute(stmt_diff_usd).scalar()))
            esperado_bs = (usd_tasa_diferente * factura.tasa_bs).quantize(Decimal("0.01"))
            diferencia_cambiaria_bs = total_bs_tasa_diferente - esperado_bs

    saldo_usd = total_con_iva_usd - total_pagado_usd
    saldo_bs = total_con_iva_bs - total_pagado_bs

    pct = float((total_pagado_usd * Decimal("100") / total_con_iva_usd).quantize(Decimal("0.01"))) if total_con_iva_usd > 0 else 0.0

    stmt_count = select(func.count()).where(InvoicePayment.factura_id == factura_id)
    count = db.execute(stmt_count).scalar() or 0

    return InvoicePaymentSummary(
        estado_pago=factura.estado_pago,
        total_factura_usd=total_con_iva_usd.quantize(Decimal("0.01")),
        total_factura_bs=total_con_iva_bs.quantize(Decimal("0.01")),
        total_pagado_usd=total_pagado_usd.quantize(Decimal("0.01")),
        total_pagado_bs=total_pagado_bs.quantize(Decimal("0.01")),
        total_mora_bs=total_mora_bs.quantize(Decimal("0.01")),
        diferencia_cambiaria_bs=diferencia_cambiaria_bs.quantize(Decimal("0.01")),
        saldo_pendiente_usd=max(saldo_usd, Decimal("0")).quantize(Decimal("0.01")),
        saldo_pendiente_bs=max(saldo_bs, Decimal("0")).quantize(Decimal("0.01")),
        cantidad_pagos=count,
        porcentaje_pagado=min(pct, 100.0),
    )


def delete_invoice_payment(db: Session, factura_id: int, payment_id: int) -> None:
    pago = db.get(InvoicePayment, payment_id)
    if not pago or pago.factura_id != factura_id:
        raise EntityNotFoundError("Pago no encontrado")

    comprobantes_dir = get_comprobantes_pago_dir()
    for receipt in pago.comprobantes:
        try:
            p = Path(receipt.archivo_path)
            if p.exists():
                p.unlink()
        except OSError:
            pass

    factura = db.get(Factura, factura_id)
    db.delete(pago)

    if factura:
        _recalculate_invoice_payment_status(db, factura)

    db.commit()
