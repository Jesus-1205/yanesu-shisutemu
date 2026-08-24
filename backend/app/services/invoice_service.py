from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Literal

from rapidfuzz import fuzz, process
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_uploads_dir, get_comprobantes_pago_dir
from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.invoice import DetalleFactura, Factura, MonedaEnum, TipoEmpaqueFactura, ObsequioFactura
from app.models.invoice_payment import InvoicePayment, InvoicePaymentReceipt
from app.models.product import Product
from app.models.supplier import Supplier
from app.services.product_service import _accent_fold, _accent_fold_pattern
from app.schemas.invoice import FacturaCreate, InvoiceAnalysisOut, InvoicePaymentCreate, InvoicePaymentSummary, MatchedProduct, MatchedSupplier, ObsequioFacturaCreate
from app.schemas.product import ProductOut as ProductOutSchema

# ── System Prompt para el modelo de Visión ────────────────────────────────

INVOICE_METADATA_PROMPT = """Eres un extractor de datos de facturas comerciales venezolanas.
Tu ÚNICO trabajo es extraer: proveedor, número de factura, fecha y moneda.
Devuelve EXCLUSIVAMENTE un JSON válido sin texto adicional.

Formato requerido:
{
  "proveedor": {
    "nombre": "string - nombre COMPLETO del proveedor tal como aparece en el encabezado"
  },
  "numero_factura": "string - número o código de la factura",
  "fecha_factura": "string|null - fecha en formato YYYY-MM-DD o null si no se detecta",
  "moneda": "USD o BS"
}

Reglas para el PROVEEDOR (LO MÁS IMPORTANTE):
- El nombre del proveedor está en el ENCABEZADO de la factura (parte superior).
- Generalmente está en LETRA GRANDE, BOLD, o en un recuadro destacado.
- Incluye TODAS las palabras del nombre del proveedor. No acortes.
- Ejemplos: "DISTRIBUIDORA CAMACHO MIRANDA, C.A.", "ABASTOS Y DISTRIBUCIONES C.A."
- NO confundas con nombres de productos (POLAR, PILSEN, SOLERA, etc.).
- NO confundas con direcciones, teléfonos o RIF.
- Si ves "DISTRIBUIDORA X Y Z, C.A." en el encabezado, ese es el proveedor.

Reglas para la MONEDA:
- Si los precios son montos bajos (5, 10, 25, 68) → USD
- Si los precios son montos altos (1000, 9533, 18206) → BS
- Si dice "Bs", "Bs.S", "bolívares" → BS
- Si dice "TOTAL US$" o "$" → USD

Reglas generales:
- Si un campo no es legible, usa null.
- NO incluyas productos, cantidades ni precios en este request.
"""

INVOICE_PRODUCTS_PROMPT = """Eres un extractor de productos de facturas comerciales venezolanas.
Tu ÚNICO trabajo es extraer la lista de productos con sus cantidades, tipo de empaque y precios.
Devuelve EXCLUSIVAMENTE un JSON válido sin texto adicional.

Formato requerido:
{
  "productos": [
    {
      "nombre": "string - nombre/descripción del producto",
      "tipo_empaque": "CAJA o UNIDAD - indica si el producto se vende por cajas completas o por unidades sueltas",
      "cantidad": "number - cantidad de cajas o unidades compradas",
      "precio_unitario": "number - precio por caja o por unidad sin impuestos CON DECIMALES EXACTOS"
    }
  ]
}

Reglas para tablas complejas con variantes:
- Si un producto tiene variantes (ej: "36 BOTELLAS RETORNABLES", "12 BOTELLAS N/R", "24 LATAS"), crea un ítem por cada variante.
- El nombre del producto debe incluir la variante: "POLAR PILSEN 36 BOTELLAS RETORNABLES".
- SI el producto tiene variantes con diferentes VOLUMENES (0.222 Lts, 0.355 Lts, 0.250 Lts), incluye el volumen en el nombre para diferenciarlos: "POLAR PILSEN 24 LATAS 0.355L" y "POLAR PILSEN 24 LATAS 0.250L".
- La columna de "CANTIDAD EN CAJAS" es la cantidad de cajas compradas.
- Si hay columna de "PRECIO POR CAJAS" o "PRECIO UNITARIO", úsala directamente CON SUS DECIMALES EXACTOS (ej: 14991.77, NO redondees a 14992).
- Si hay columna de "TOTAL SIN IMPUESTOS", calcula: total / cantidad = precio_unitario CON DECIMALES.
- Ignora anotaciones manuscritas, tachaduras y texto superpuesto a mano.
- Ignora columnas de "LITROS", "ALICUOTA" (IVA), "TOTAL CON IMPUESTOS".
- Unidades de medida (BOTELLAS, LATAS, PET) van en el nombre del producto.
- NO agrupes productos que tengan diferente volumen o tipo de envase, aunque tengan el mismo nombre base.

Reglas para tipo_empaque:
- Si la factura muestra cantidades en CAJAS (multiplicado por unidades_por_caja implícitamente), usa "CAJA".
- Si la factura muestra cantidades en UNIDADES sueltas (piezas individuales), usa "UNIDAD".
- Si el producto se vende por piezas individuales (ej: 24 piezas de refresco, 12 unidades de snack), usa "UNIDAD".
- Si el producto se vende por cajas/bultos/bandas completas, usa "CAJA".
- El precio_unitario debe ser el precio por el tipo de empaque indicado (precio por caja si CAJA, precio por unidad si UNIDAD).

Reglas para nombres correctos:
- Si un producto está bajo una categoría (ej: "SANGRÍA"), incluye la categoría en el nombre: "SANGRÍA VERANO LATA", NO solo "VERANO LATA".
- Respeta el nombre exacto del producto como aparece en la factura.
- NO inventes nombres que no aparezcan en la factura.

Reglas estrictas:
- NO incluyas totales, subtotales ni impuestos. Solo precio unitario.
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


# ── Fuzzy Matching con rapidfuzz ──────────────────────────────────────────

def _similarity_threshold() -> float:
    """Umbral mínimo de similitud para considerar PARTIAL.

    Escala: 0-100 (rapidfuzz). 50.0 ≈ 50% de similitud.
    """
    return 50.0


def _strip_unidades(nombre: str) -> str:
    """Elimina patrones de unidades al final del nombre para mejorar matching.

    Ejemplos:
      "MEDIA ANIS CARTUJO 350ML 24UNID." → "MEDIA ANIS CARTUJO 350ML"
      "L/R CARTA ROJA 1L 12 UNID." → "L/R CARTA ROJA 1L"
      "CANELITA 1L 12UND" → "CANELITA 1L"
    """
    import re
    cleaned = re.sub(
        r"\s+\d+\s*(?:UNID(?:\.|ADES)?|UND(?:\.|ES)?|UDS\.?)\.?\s*$",
        "",
        nombre,
        flags=re.IGNORECASE,
    )
    return cleaned.strip()


def fuzzy_match_proveedor(
    db: Session, nombre_ia: str
) -> MatchedSupplier:
    """Busca proveedor por similitud usando rapidfuzz token_set_ratio.

    Lógica:
      1. Intento EXACT (case-insensitive)
      2. Carga todos los proveedores a memoria (tabla pequeña)
      3. process.extract con token_set_ratio, limit=3
      4. Si el mejor supera umbral → PARTIAL, si no → NOT_FOUND
    """
    nombre_ia_lower = nombre_ia.strip().lower()

    # 1. Intento EXACT
    stmt_exact = select(Supplier).where(
        func.lower(Supplier.nombre) == nombre_ia_lower
    )
    exacto = db.execute(stmt_exact).scalars().first()
    if exacto:
        return MatchedSupplier(
            id=exacto.id,
            nombre=exacto.nombre,
            match_status="EXACT",
            confidence=1.0,
        )

    # 2. Cargar todos los proveedores a memoria
    stmt = select(Supplier)
    proveedores = db.execute(stmt).scalars().all()
    if not proveedores:
        return MatchedSupplier(
            id=0,
            nombre=nombre_ia,
            match_status="NOT_FOUND",
            confidence=0.0,
        )

    # 3. Construir diccionario {nombre: Supplier}
    choices = {p.nombre: p for p in proveedores}

    # 4. Buscar los 3 más similares con token_set_ratio
    matches = process.extract(
        nombre_ia,
        choices.keys(),
        scorer=fuzz.token_set_ratio,
        limit=3,
    )

    if not matches:
        return MatchedSupplier(
            id=0,
            nombre=nombre_ia,
            match_status="NOT_FOUND",
            confidence=0.0,
        )

    # 5. Evaluar mejor resultado
    best_nombre, best_score, _ = matches[0]
    best_supplier = choices[best_nombre]

    if best_score >= _similarity_threshold():
        return MatchedSupplier(
            id=best_supplier.id,
            nombre=best_supplier.nombre,
            match_status="PARTIAL",
            confidence=best_score / 100.0,
        )

    return MatchedSupplier(
        id=0,
        nombre=nombre_ia,
        match_status="NOT_FOUND",
        confidence=best_score / 100.0,
    )


def fuzzy_match_productos_batch(
    db: Session, productos_ia: list[dict]
) -> list[MatchedProduct]:
    """Match de productos en BATCH usando rapidfuzz.

    Estrategia de memoria eficiente:
      1. UNA sola query: cargar todos los productos activos (id, nombre)
      2. Construir diccionario {nombre: Product} en memoria
      3. Para cada ítem de IA: process.extract con token_set_ratio
      4. Clasificar EXACT/PARTIAL/NOT_FOUND en memoria
    """
    if not productos_ia:
        return []

    umbral = _similarity_threshold()

    # ── 1. UNA sola query: catálogo completo ──────────────────────────
    stmt = select(Product)
    all_products = db.execute(stmt).scalars().all()

    if not all_products:
        return [
            MatchedProduct(
                producto_id=None,
                nombre_extraido=item["nombre"],
                tipo_empaque=item.get("tipo_empaque", "CAJA"),
                cantidad=item["cantidad"],
                precio_unitario=Decimal(str(item["precio_unitario"])),
                match_status="NOT_FOUND",
                confidence=0.0,
                suggestions=[],
            )
            for item in productos_ia
        ]

    # ── 2. Diccionario {nombre: Product} para lookup rápido ──────────
    catalogo = {p.nombre: p for p in all_products}

    # ── 3. Para cada ítem de IA, buscar top 3 matches ────────────────
    resultados: list[MatchedProduct] = []
    for item in productos_ia:
        nombre_ia = item["nombre"]
        nombre_limpio = _strip_unidades(nombre_ia)

        # Buscar top 3 matches en el catálogo
        matches = process.extract(
            nombre_limpio,
            catalogo.keys(),
            scorer=fuzz.token_set_ratio,
            limit=3,
        )

        if not matches:
            resultados.append(MatchedProduct(
                producto_id=None,
                nombre_extraido=nombre_ia,
                tipo_empaque=item.get("tipo_empaque", "CAJA"),
                cantidad=item["cantidad"],
                precio_unitario=Decimal(str(item["precio_unitario"])),
                match_status="NOT_FOUND",
                confidence=0.0,
                suggestions=[],
            ))
            continue

        # ── 4. Evaluar mejor resultado ──────────────────────────────
        best_nombre, best_score, _ = matches[0]
        best_product = catalogo[best_nombre]

        # Intento EXACT: comparar nombres normalizados
        if best_product.nombre.lower() == nombre_limpio.lower():
            resultados.append(MatchedProduct(
                producto_id=best_product.id,
                nombre_extraido=nombre_ia,
                tipo_empaque=item.get("tipo_empaque", "CAJA"),
                cantidad=item["cantidad"],
                precio_unitario=Decimal(str(item["precio_unitario"])),
                match_status="EXACT",
                confidence=1.0,
                suggestions=[],
            ))
            continue

        if best_score >= umbral:
            # PARTIAL: construir suggestions con top 3
            suggestions = []
            for match_nombre, match_score, _ in matches:
                p = catalogo[match_nombre]
                suggestions.append(ProductOutSchema.model_validate(p))

            resultados.append(MatchedProduct(
                producto_id=None,
                nombre_extraido=nombre_ia,
                tipo_empaque=item.get("tipo_empaque", "CAJA"),
                cantidad=item["cantidad"],
                precio_unitario=Decimal(str(item["precio_unitario"])),
                match_status="PARTIAL",
                confidence=best_score / 100.0,
                suggestions=suggestions,
            ))
        else:
            resultados.append(MatchedProduct(
                producto_id=None,
                nombre_extraido=nombre_ia,
                tipo_empaque=item.get("tipo_empaque", "CAJA"),
                cantidad=item["cantidad"],
                precio_unitario=Decimal(str(item["precio_unitario"])),
                match_status="NOT_FOUND",
                confidence=best_score / 100.0,
                suggestions=[],
            ))

    return resultados


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
        "models/gemini-3.1-flash-lite:generateContent"
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
    raw_content = (
        ia_response.get("candidates", [{}])[0]
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
    """Punto de entrada principal: analiza factura con IA + fuzzy matching.

    Hace DOS requests separados a Gemini:
      1. Metadata (proveedor, factura, fecha, moneda)
      2. Productos (nombre, cantidad, precio)

    Args:
        files: Lista de tuplas (bytes, content_type) — puede ser 1 o más archivos
    """
    # ── Optimizar archivos antes de enviar a Gemini ───────────────────
    optimized_files: list[tuple[bytes, str]] = []
    for file_bytes, content_type in files:
        opt_bytes, opt_type = optimize_image(file_bytes, content_type)
        optimized_files.append((opt_bytes, opt_type))

    # ── Request 1: Metadata (proveedor, factura, fecha, moneda) ─────
    metadata = _call_gemini(
        optimized_files,
        INVOICE_METADATA_PROMPT,
        "Extrae el nombre del proveedor, número de factura, fecha y moneda de esta factura.",
        max_output_tokens=300,
        db=db,
    )

    # ── Request 2: Productos ─────────────────────────────────────────
    productos_data = _call_gemini(
        optimized_files,
        INVOICE_PRODUCTS_PROMPT,
        "Extrae la lista de productos con sus cantidades y precios de esta factura.",
        max_output_tokens=2000,
        db=db,
    )

    # ── Fuzzy matching ───────────────────────────────────────────────
    proveedor_match = fuzzy_match_proveedor(
        db, (metadata.get("proveedor") or {}).get("nombre", "")
    )

    if not proveedor_match.nombre or proveedor_match.match_status == "NOT_FOUND":
        if not (metadata.get("proveedor") or {}).get("nombre"):
            raise ValueError("La IA no pudo identificar el proveedor en la factura.")

    productos_raw = []
    for p in productos_data.get("productos", []):
        tipo_empaque_raw = str(p.get("tipo_empaque", "CAJA")).upper()
        productos_raw.append({
            "nombre": p.get("nombre", ""),
            "tipo_empaque": tipo_empaque_raw if tipo_empaque_raw in ("CAJA", "UNIDAD") else "CAJA",
            "cantidad": p.get("cantidad", 1),
            "precio_unitario": p.get("precio_unitario", 0),
        })

    productos_match = fuzzy_match_productos_batch(db, productos_raw)

    # ── Armar respuesta ──────────────────────────────────────────────
    fecha = None
    if metadata.get("fecha_factura"):
        try:
            fecha = date.fromisoformat(metadata["fecha_factura"])
        except (ValueError, TypeError):
            pass

    moneda_raw = metadata.get("moneda", "USD").upper()
    moneda = MonedaEnum.BS if moneda_raw == "BS" else MonedaEnum.USD

    return InvoiceAnalysisOut(
        proveedor=proveedor_match,
        numero_factura=metadata.get("numero_factura", ""),
        fecha_factura=fecha,
        moneda=moneda,
        productos=productos_match,
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
        fecha_factura=data.fecha_factura or date.today(),
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

        if total_unidades > 0:
            if item.tipo_empaque == TipoEmpaqueFactura.CAJA:
                cajas_equivalentes = stock_total_actual / Decimal(product.unidades_por_caja)
                nuevo_costo_caja = (
                    (cajas_equivalentes * product.precio_costo_caja_usd)
                    + (Decimal(item.cantidad) * costo_usd)
                ) / (cajas_equivalentes + Decimal(item.cantidad))
                nuevo_costo_caja = nuevo_costo_caja.quantize(Decimal("0.01"))
                nuevo_costo_unidad = (nuevo_costo_caja / Decimal(unidades_por_caja)).quantize(
                    Decimal("0.01")
                )
            else:
                nuevo_costo_unidad = (
                    (stock_total_actual * product.precio_costo_usd)
                    + (Decimal(item.cantidad) * costo_usd)
                ) / total_unidades
                nuevo_costo_unidad = nuevo_costo_unidad.quantize(Decimal("0.01"))
                nuevo_costo_caja = (nuevo_costo_unidad * Decimal(unidades_por_caja)).quantize(
                    Decimal("0.01")
                )
        else:
            nuevo_costo_unidad = product.precio_costo_usd
            nuevo_costo_caja = product.precio_costo_caja_usd

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
    factura.total_bs = total_bs.quantize(Decimal("0.01"))
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
    page: int = 1,
    page_size: int = 20,
) -> dict:
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

    if factura.tasa_bs > 0:
        total_pagado_usd += (total_pagado_bs / factura.tasa_bs).quantize(Decimal("0.01"))

    if total_pagado_usd >= factura.total_usd:
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
            InvoicePayment.factura_id == factura_id
        )
        pagado_actual_bs = Decimal(str(db.execute(stmt_pagado_bs).scalar()))
        pagado_actual += (pagado_actual_bs / factura.tasa_bs).quantize(Decimal("0.01"))

    saldo = factura.total_usd - pagado_actual
    if data.monto_usd > saldo:
        raise ConflictError(
            f"El monto (${data.monto_usd}) excede el saldo pendiente (${saldo})"
        )

    pago = InvoicePayment(
        factura_id=factura_id,
        metodo_pago_id=data.metodo_pago_id,
        monto_usd=data.monto_usd,
        monto_bs=data.monto_bs,
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

    if factura.tasa_bs > 0:
        total_pagado_usd += (total_pagado_bs / factura.tasa_bs).quantize(Decimal("0.01"))

    saldo_usd = factura.total_usd - total_pagado_usd
    saldo_bs = factura.total_bs - total_pagado_bs

    pct = float(total_pagado_usd / factura.total_usd * 100) if factura.total_usd > 0 else 0.0

    stmt_count = select(func.count()).where(InvoicePayment.factura_id == factura_id)
    count = db.execute(stmt_count).scalar() or 0

    return InvoicePaymentSummary(
        estado_pago=factura.estado_pago,
        total_factura_usd=factura.total_usd,
        total_factura_bs=factura.total_bs,
        total_pagado_usd=total_pagado_usd.quantize(Decimal("0.01")),
        total_pagado_bs=total_pagado_bs.quantize(Decimal("0.01")),
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
