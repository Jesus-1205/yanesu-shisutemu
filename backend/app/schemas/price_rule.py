from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PriceRuleProductEntry(BaseModel):
    producto_id: int
    tipo_empaque: Literal["UNIDAD", "CAJA"]
    precio_usd: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class PriceRuleCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str = Field(min_length=1, max_length=100)
    descripcion: str | None = None
    productos: list[PriceRuleProductEntry] = Field(min_length=1)
    metodo_pago_ids: list[int] = Field(min_length=1)


class PriceRuleUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    descripcion: str | None = None
    activo: bool | None = None
    productos: list[PriceRuleProductEntry] | None = None
    metodo_pago_ids: list[int] | None = None


class PriceRuleProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    producto_id: int
    producto_nombre: str = ""
    tipo_empaque: str
    precio_usd: Decimal


class PriceRulePaymentMethodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    metodo_pago_id: int
    metodo_pago_nombre: str = ""


class PriceRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    activo: bool
    products: list[PriceRuleProductOut]
    payment_methods: list[PriceRulePaymentMethodOut]
