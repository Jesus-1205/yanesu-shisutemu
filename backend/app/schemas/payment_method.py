from typing import Literal

from pydantic import BaseModel, ConfigDict


class PaymentMethodCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    nombre: str
    moneda_default: Literal["USD", "VES"] = "VES"
    acepta_referencia: bool = False
    activo: bool = True


class PaymentMethodUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    nombre: str | None = None
    moneda_default: Literal["USD", "VES"] | None = None
    acepta_referencia: bool | None = None
    activo: bool | None = None


class PaymentMethodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    moneda_default: str
    acepta_referencia: bool
    activo: bool