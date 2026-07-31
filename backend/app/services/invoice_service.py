from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Literal

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.invoice import DetalleFactura, Factura, MonedaEnum
from app.models.product import Product
from app.models.supplier import Supplier
from app.schemas.invoice import FacturaCreate, InvoiceAnalysisOut, MatchedProduct, MatchedSupplier
from app.schemas.product import ProductOut as ProductOutSchema

UPLOAD_DIR = Path("uploads") / "facturas"

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
Tu ÚNICO trabajo es extraer la lista de productos con sus cantidades y precios.
Devuelve EXCLUSIVAMENTE un JSON válido sin texto adicional.

Formato requerido:
{
  "productos": [
    {
      "nombre": "string - nombre/descripción del producto",
      "cantidad": "number - cantidad de cajas o unidades compradas",
      "precio_unitario": "number - precio por caja sin impuestos CON DECIMALES EXACTOS"
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

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

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

    dest = UPLOAD_DIR / saved_name
    dest.write_bytes(file_bytes)
    return str(dest)


# ── Fuzzy Matching con pg_trgm ───────────────────────────────────────────

def _similarity_threshold() -> float:
    """Umbral mínimo de similitud para considerar PARTIAL."""
    return 0.3


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
    """Busca proveedor por similitud trigram.

    Lógica:
      1. Intento EXACT (ILIKE)
      2. Si no, busca los 3 más similares con pg_trgm
      3. Si el mejor supera umbral → PARTIAL, si no → NOT_FOUND
    """
    # Intento EXACT
    stmt_exact = select(Supplier).where(
        func.lower(Supplier.nombre) == func.lower(nombre_ia)
    )
    exacto = db.execute(stmt_exact).scalars().first()
    if exacto:
        return MatchedSupplier(
            id=exacto.id,
            nombre=exacto.nombre,
            match_status="EXACT",
            confidence=1.0,
        )

    # Búsqueda difusa con trigram
    stmt = select(
        Supplier,
        func.similarity(Supplier.nombre, nombre_ia).label("sim"),
    ).order_by(text("sim DESC")).limit(3)

    results = db.execute(stmt).all()
    if not results:
        return MatchedSupplier(
            id=0,
            nombre=nombre_ia,
            match_status="NOT_FOUND",
            confidence=0.0,
        )

    best_supplier, best_sim = results[0]
    if best_sim >= _similarity_threshold():
        return MatchedSupplier(
            id=best_supplier.id,
            nombre=best_supplier.nombre,
            match_status="PARTIAL",
            confidence=float(best_sim),
        )

    return MatchedSupplier(
        id=0,
        nombre=nombre_ia,
        match_status="NOT_FOUND",
        confidence=float(best_sim) if results else 0.0,
    )


def fuzzy_match_productos_batch(
    db: Session, productos_ia: list[dict]
) -> list[MatchedProduct]:
    """Match de productos en BATCH para evitar N+1 queries.

    Estrategia:
      1. Extraigo todos los nombres únicos de la IA
      2. UNA sola query con CTE + operador GIN (%) para traer TODOS los campos
      3. Evalúo EXACT/PARTIAL en memoria sobre el diccionario

    IMPORTANTE: No se hacen consultas dentro del bucle.
    El operador % es el que activa el índice GIN pg_trgm.
    """
    if not productos_ia:
        return []

    nombres_unicos = list({p["nombre"] for p in productos_ia})
    umbral = _similarity_threshold()

    # ── Limpiar unidades de los nombres para mejorar matching ──────────
    # "MEDIA ANIS CARTUJO 350ML 24UNID." → "MEDIA ANIS CARTUJO 350ML"
    nombres_limpios = [_strip_unidades(n) for n in nombres_unicos]
    # Mapa: nombre_limpio → nombre_original (para indexer después)
    limpia_a_original = {limpia: orig for limpia, orig in zip(nombres_limpios, nombres_unicos)}

    # ── Query batch con CTE + operador GIN (%) ─────────────────────────
    # El operador % activa el índice GIN pg_trgm
    # Generamos placeholders individuales para el array (:n0, :n1, ...)
    # porque SQLAlchemy text() no entiende la sintaxis PostgreSQL ::text[]
    placeholders = ", ".join([f":n{i}" for i in range(len(nombres_limpios))])
    query = text(f"""
        WITH nombres_ia AS (
            SELECT unnest(ARRAY[{placeholders}]) AS nombre_busqueda
        )
        SELECT
            p.id,
            p.codigo_barra,
            p.nombre,
            p.unidades_por_caja,
            p.stock_unidades,
            p.stock_minimo,
            p.precio_costo_caja_usd,
            p.precio_costo_usd,
            p.precio_unidad_usd,
            p.precio_caja_usd,
            p.proveedor_id,
            p.tipo_iva,
            n.nombre_busqueda,
            similarity(p.nombre, n.nombre_busqueda) AS sim
        FROM productos p
        JOIN nombres_ia n ON p.nombre % n.nombre_busqueda
        WHERE similarity(p.nombre, n.nombre_busqueda) > :umbral
        ORDER BY n.nombre_busqueda, sim DESC
    """)

    params = {f"n{i}": n for i, n in enumerate(nombres_limpios)}
    params["umbral"] = umbral
    rows = db.execute(query, params).fetchall()

    # ── Indexo por nombre LIMPIO de la IA (el que se usó en la query) ─
    matches_map: dict[str, list[dict]] = {}
    for row in rows:
        key = row.nombre_busqueda
        if key not in matches_map:
            matches_map[key] = []
        matches_map[key].append({
            "id": row.id,
            "codigo_barra": row.codigo_barra,
            "nombre": row.nombre,
            "unidades_por_caja": row.unidades_por_caja,
            "stock_unidades": row.stock_unidades,
            "stock_minimo": row.stock_minimo,
            "precio_costo_caja_usd": row.precio_costo_caja_usd,
            "precio_costo_usd": row.precio_costo_usd,
            "precio_unidad_usd": row.precio_unidad_usd,
            "precio_caja_usd": row.precio_caja_usd,
            "proveedor_id": row.proveedor_id,
            "tipo_iva": row.tipo_iva,
            "sim": float(row.sim),
        })

    # ── Armo resultados EN MEMORIA (sin consultas a DB) ────────────────
    resultados: list[MatchedProduct] = []
    for item in productos_ia:
        nombre_ia = item["nombre"]
        nombre_limpio = _strip_unidades(nombre_ia)
        candidatos = matches_map.get(nombre_limpio, [])

        # Intento EXACT: busco en memoria por nombre idéntico (usando nombre limpio)
        exacto = None
        for c in candidatos:
            if c["nombre"].lower() == nombre_limpio.lower():
                exacto = c
                break

        if exacto:
            resultados.append(MatchedProduct(
                producto_id=exacto["id"],
                nombre_extraido=nombre_ia,
                cantidad_cajas=item["cantidad"],
                precio_unitario=Decimal(str(item["precio_unitario"])),
                match_status="EXACT",
                confidence=1.0,
                suggestions=[],
            ))
        elif candidatos:
            # PARTIAL: armo ProductOut directamente desde datos en memoria
            suggestions = []
            for c in candidatos[:3]:
                suggestions.append(ProductOutSchema(
                    id=c["id"],
                    codigo_barra=c["codigo_barra"],
                    nombre=c["nombre"],
                    categories=[],
                    unidades_por_caja=c["unidades_por_caja"],
                    stock_unidades=c["stock_unidades"],
                    stock_minimo=c["stock_minimo"],
                    precio_costo_caja_usd=Decimal(str(c["precio_costo_caja_usd"])),
                    precio_costo_usd=Decimal(str(c["precio_costo_usd"])),
                    precio_unidad_usd=Decimal(str(c["precio_unidad_usd"])),
                    precio_caja_usd=Decimal(str(c["precio_caja_usd"])),
                    proveedor_id=c["proveedor_id"],
                    tipo_iva=c["tipo_iva"],
                ))

            mejor_sim = candidatos[0]["sim"]
            resultados.append(MatchedProduct(
                producto_id=None,
                nombre_extraido=nombre_ia,
                cantidad_cajas=item["cantidad"],
                precio_unitario=Decimal(str(item["precio_unitario"])),
                match_status="PARTIAL",
                confidence=mejor_sim,
                suggestions=suggestions,
            ))
        else:
            resultados.append(MatchedProduct(
                producto_id=None,
                nombre_extraido=nombre_ia,
                cantidad_cajas=item["cantidad"],
                precio_unitario=Decimal(str(item["precio_unitario"])),
                match_status="NOT_FOUND",
                confidence=0.0,
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
            raise ValueError(
                f"Gemini API error {response.status_code}: {response.text}"
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
    proveedor_match = fuzzy_match_proveedor(db, metadata["proveedor"]["nombre"])

    productos_match = fuzzy_match_productos_batch(
        db,
        [
            {
                "nombre": p["nombre"],
                "cantidad": p.get("cantidad", 1),
                "precio_unitario": p.get("precio_unitario", 0),
            }
            for p in productos_data.get("productos", [])
        ],
    )

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
        fecha_factura=data.fecha_factura or date.today(),
        image_path=image_path,
        usuario_id=usuario_id,
        observaciones=data.observaciones,
        moneda_principal=data.moneda_principal,
        tasa_bs=tasa,
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
            costo_usd = item.costo_caja_usd
            costo_bs = (item.costo_caja_usd * tasa).quantize(Decimal("0.01"))
        else:
            costo_bs = item.costo_caja_bs
            costo_usd = (item.costo_caja_bs / tasa).quantize(Decimal("0.01"))

        detalle = DetalleFactura(
            factura=factura,
            producto_id=item.producto_id,
            cantidad_cajas=item.cantidad_cajas,
            costo_caja_usd=costo_usd,
            costo_caja_bs=costo_bs,
        )
        detalles.append(detalle)

        subtotal_usd = Decimal(item.cantidad_cajas) * costo_usd
        subtotal_bs = Decimal(item.cantidad_cajas) * costo_bs
        total_usd += subtotal_usd
        total_bs += subtotal_bs

        unidades_por_caja = item.unidades_por_caja or product.unidades_por_caja
        unidades_ingresadas = item.cantidad_cajas * unidades_por_caja
        nuevo_stock = product.stock_unidades + unidades_ingresadas

        stock_cajas_actual = Decimal(product.stock_unidades) / Decimal(product.unidades_por_caja)
        total_cajas = stock_cajas_actual + Decimal(item.cantidad_cajas)

        if total_cajas > 0:
            nuevo_costo_caja = (
                (stock_cajas_actual * product.precio_costo_caja_usd)
                + (Decimal(item.cantidad_cajas) * costo_usd)
            ) / total_cajas
            nuevo_costo_caja = nuevo_costo_caja.quantize(Decimal("0.01"))
        else:
            nuevo_costo_caja = product.precio_costo_caja_usd

        nuevo_costo_unidad = (nuevo_costo_caja / Decimal(unidades_por_caja)).quantize(
            Decimal("0.01")
        )

        if item.unidades_por_caja and item.unidades_por_caja != product.unidades_por_caja:
            product.unidades_por_caja = item.unidades_por_caja

        product.stock_unidades = nuevo_stock
        product.precio_costo_caja_usd = nuevo_costo_caja
        product.precio_costo_usd = nuevo_costo_unidad
        product.proveedor_id = data.proveedor_id

    factura.detalles = detalles
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
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    stmt = select(Factura)

    if proveedor_id is not None:
        stmt = stmt.where(Factura.proveedor_id == proveedor_id)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Factura.numero_factura.ilike(pattern),
                Factura.observaciones.ilike(pattern),
            )
        )

    stmt = stmt.order_by(Factura.created_at.desc())

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar() or 0

    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size).options(
        selectinload(Factura.supplier),
        selectinload(Factura.detalles).selectinload(DetalleFactura.product),
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
        )
        .where(Factura.id == invoice_id)
    )
    factura = db.execute(stmt).scalars().first()
    if not factura:
        raise EntityNotFoundError("Factura no encontrada")
    return factura
