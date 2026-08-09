from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.invoice import MonedaEnum
from app.schemas.product import ProductOut
from app.schemas.supplier import SupplierOut

MatchStatus = Literal["EXACT", "PARTIAL", "NOT_FOUND"]


class DetalleFacturaCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    producto_id: int
    tipo_empaque: Literal["UNIDAD", "CAJA"] = "CAJA"
    cantidad: int = Field(gt=0)
    costo_unitario_usd: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    costo_unitario_bs: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    unidades_por_caja: int | None = Field(gt=0, default=None)


class FacturaCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    proveedor_id: int
    numero_factura: str
    fecha_factura: date | None = None
    observaciones: str | None = None
    moneda_principal: MonedaEnum = MonedaEnum.USD
    tasa_bs: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    detalles: list[DetalleFacturaCreate]


class DetalleFacturaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    factura_id: int
    producto_id: int
    tipo_empaque: str
    cantidad: int
    costo_unitario_usd: Decimal
    costo_unitario_bs: Decimal
    product: ProductOut | None = None


class FacturaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proveedor_id: int
    numero_factura: str
    fecha_factura: date
    image_path: str | None
    usuario_id: int
    observaciones: str | None
    moneda_principal: MonedaEnum
    tasa_bs: Decimal
    total_usd: Decimal
    total_bs: Decimal
    created_at: datetime
    procesada_por_ia: bool = False
    raw_json_ia: dict | None = None

    supplier: SupplierOut | None = None
    detalles: list[DetalleFacturaOut] = []


class FacturaPaginationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[FacturaOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Schemas para Análisis IA ──────────────────────────────────────────────


class MatchedSupplier(BaseModel):
    """Proveedor resultante del fuzzy matching."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    match_status: MatchStatus
    confidence: float = Field(ge=0.0, le=1.0)


class MatchedProduct(BaseModel):
    """Producto resultante del fuzzy matching por cada ítem de la factura."""
    model_config = ConfigDict(from_attributes=True)

    producto_id: int | None = None
    nombre_extraido: str
    tipo_empaque: Literal["UNIDAD", "CAJA"] = "CAJA"
    cantidad: int
    precio_unitario: Decimal
    match_status: MatchStatus
    confidence: float = Field(ge=0.0, le=1.0)
    suggestions: list[ProductOut] = Field(default_factory=list)


class InvoiceAnalysisOut(BaseModel):
    """Respuesta del endpoint de análisis IA."""
    proveedor: MatchedSupplier
    numero_factura: str
    fecha_factura: date | None = None
    moneda: MonedaEnum = MonedaEnum.USD
    productos: list[MatchedProduct]
    raw_json_ia: dict
