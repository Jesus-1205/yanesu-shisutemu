from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SaleItemCreate(BaseModel):
    producto_id: int
    tipo_empaque: Literal["UNIDAD", "CAJA"]
    cantidad: int = Field(gt=0)
    unidades_descontadas: int = Field(gt=0)
    precio_unitario_usd: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    iva_porcentaje: Decimal = Field(default=Decimal("16.00"), ge=0)
    usa_precio_divisas: bool = False
    combo_id: int | None = None


class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    venta_id: int
    producto_id: int
    producto_nombre: str = ""
    tipo_empaque: str
    cantidad: int
    unidades_descontadas: int
    precio_unitario_usd: Decimal
    subtotal_usd: Decimal
    iva_porcentaje: Decimal
    usa_precio_divisas: bool = False
    combo_id: int | None = None
    combo_nombre: str | None = None


class SalePaymentCreate(BaseModel):
    metodo_pago_id: int
    referencia: str | None = None
    monto_usd: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2, ge=0)
    monto_ves: Decimal = Field(default=Decimal("0.00"), max_digits=14, decimal_places=2, ge=0)


class SalePaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    venta_id: int
    metodo_pago_id: int
    metodo_pago_nombre: str
    referencia: str | None
    monto_usd: Decimal
    monto_ves: Decimal


class SaleCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    tasa_bcv_aplicada: Decimal = Field(gt=0, max_digits=10, decimal_places=4)
    historico_tasa_id: int | None = None
    observaciones: str | None = None
    monto_exento_usd: Decimal = Decimal("0.00")
    base_imponible_usd: Decimal = Decimal("0.00")
    monto_iva_usd: Decimal = Decimal("0.00")
    items: list[SaleItemCreate] = Field(min_length=1)
    pagos: list[SalePaymentCreate] = Field(min_length=1)


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha_venta: datetime
    usuario_id: int
    usuario_nombre: str = ""
    tasa_bcv_aplicada: Decimal
    historico_tasa_id: int | None
    observaciones: str | None = None
    monto_exento_usd: Decimal
    base_imponible_usd: Decimal
    monto_iva_usd: Decimal
    total_usd: Decimal
    monto_exento_ves: Decimal
    base_imponible_ves: Decimal
    monto_iva_ves: Decimal
    total_ves: Decimal
    metodo_pago: str = "-"
    items: list[SaleItemOut]
    pagos: list[SalePaymentOut] = Field(default=[], validation_alias="payments")


class TopWeekOut(BaseModel):
    periodo: str
    total_ventas: int
    total_usd: Decimal
    total_ves: Decimal


class SalePaginationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[SaleOut]
    total: int
    page: int
    page_size: int
    pages: int


class PaymentMethodSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    metodo_pago_id: int
    metodo_pago_nombre: str
    moneda_default: str
    cantidad_pagos: int
    total_usd: Decimal
    total_ves: Decimal
    total_equivalente_usd: Decimal


class CalculateRequestItem(BaseModel):
    producto_id: int
    tipo_empaque: Literal["UNIDAD", "CAJA"]
    cantidad: int = Field(gt=0)
    usa_precio_divisas: bool = False


class CalculateRequest(BaseModel):
    items: list[CalculateRequestItem] = []
    combos: list["CalculateComboRequest"] = []
    metodo_pago_ids: list[int] = Field(min_length=1)


class CalculateComboSelection(BaseModel):
    grupo_id: int
    productos: list[int] = []
    cantidades: list[int] = []


class CalculateComboRequest(BaseModel):
    combo_id: int
    cantidad: int = Field(gt=0, default=1)
    selecciones: list[CalculateComboSelection] = []


class CalculateResponseItem(BaseModel):
    producto_id: int
    producto_nombre: str = ""
    tipo_empaque: str
    cantidad: int
    precio_unitario_usd: Decimal
    precio_original_usd: Decimal
    usa_precio_divisas: bool


class CalculateResponse(BaseModel):
    items: list[CalculateResponseItem]
    total_usd: Decimal
    total_divisas_usd: Decimal = Decimal("0")
    total_normal_usd: Decimal = Decimal("0")
    ahorro_usd: Decimal = Decimal("0")
    metodos_divisas_disponibles: list[int] = []
    combo_items: list[CalculateResponseItem] = []
