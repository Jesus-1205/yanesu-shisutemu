from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.invoice import MonedaEnum, TipoDocumentoEnum
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
    tipo_iva: Literal["GRAVADO", "EXENTO"] = "GRAVADO"


class FacturaCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    proveedor_id: int
    numero_factura: str
    tipo_documento: TipoDocumentoEnum = TipoDocumentoEnum.FACTURA
    fecha_factura: date | None = None
    observaciones: str | None = None
    moneda_principal: MonedaEnum = MonedaEnum.USD
    tasa_bs: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    aplica_iva: bool = True
    detalles: list[DetalleFacturaCreate]
    obsequios: list["ObsequioFacturaCreate"] = Field(default_factory=list)


class DetalleFacturaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    factura_id: int
    producto_id: int
    tipo_empaque: str
    cantidad: int
    costo_unitario_usd: Decimal
    costo_unitario_bs: Decimal
    tipo_iva: str
    product: ProductOut | None = None


class FacturaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    proveedor_id: int
    numero_factura: str
    tipo_documento: TipoDocumentoEnum
    fecha_factura: date
    image_path: str | None
    usuario_id: int
    observaciones: str | None
    moneda_principal: MonedaEnum
    tasa_bs: Decimal
    total_usd: Decimal
    total_bs: Decimal
    aplica_iva: bool
    estado_pago: str = "PENDIENTE"
    created_at: datetime
    procesada_por_ia: bool = False
    raw_json_ia: dict | None = None

    supplier: SupplierOut | None = None
    detalles: list[DetalleFacturaOut] = []
    obsequios: list["ObsequioFacturaOut"] = []


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


# ── Schemas para Pagos de Factura ──────────────────────────────────────────


class InvoicePaymentCreate(BaseModel):
    """Schema para registrar un pago a una factura."""
    model_config = ConfigDict(str_strip_whitespace=True)

    metodo_pago_id: int
    monto_usd: Decimal = Field(ge=0, max_digits=12, decimal_places=2, default=Decimal("0"))
    monto_bs: Decimal = Field(ge=0, max_digits=14, decimal_places=2, default=Decimal("0"))
    referencia: str | None = Field(max_length=100, default=None)
    observaciones: str | None = None


class InvoicePaymentReceiptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pago_id: int
    archivo_path: str
    nombre_original: str
    tipo_archivo: str
    created_at: datetime


class InvoicePaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    factura_id: int
    metodo_pago_id: int
    metodo_pago_nombre: str
    monto_usd: Decimal
    monto_bs: Decimal
    referencia: str | None
    observaciones: str | None
    fecha_pago: datetime
    usuario_id: int
    usuario_nombre: str | None = None
    comprobantes: list[InvoicePaymentReceiptOut] = []


class InvoicePaymentSummary(BaseModel):
    estado_pago: str
    total_factura_usd: Decimal
    total_factura_bs: Decimal
    total_pagado_usd: Decimal
    total_pagado_bs: Decimal
    saldo_pendiente_usd: Decimal
    saldo_pendiente_bs: Decimal
    cantidad_pagos: int
    porcentaje_pagado: float


# ── Schemas para Obsequios ──────────────────────────────────────────────────


class ObsequioFacturaCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    producto_id: int
    tipo_empaque: Literal["UNIDAD", "CAJA"] = "CAJA"
    cantidad: int = Field(gt=0)
    justificacion: str = Field(min_length=3, max_length=500)
    unidades_por_caja: int | None = Field(gt=0, default=None)


class ObsequioFacturaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    factura_id: int
    producto_id: int
    tipo_empaque: str
    cantidad: int
    justificacion: str
    product: ProductOut | None = None
