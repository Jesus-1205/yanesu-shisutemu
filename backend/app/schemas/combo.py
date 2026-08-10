from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ComboGroupProductEntry(BaseModel):
    producto_id: int


class ComboGroupEntry(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    min_cantidad: int = Field(default=0, ge=0)
    max_cantidad: int = Field(ge=1)
    productos: list[ComboGroupProductEntry] = Field(min_length=1)


class ComboCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str = Field(min_length=1, max_length=100)
    descripcion: str | None = None
    precio_total_usd: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    grupos: list[ComboGroupEntry] = Field(min_length=1)
    metodo_pago_ids: list[int] = Field(min_length=1)


class ComboUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    descripcion: str | None = None
    precio_total_usd: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    activo: bool | None = None
    grupos: list[ComboGroupEntry] | None = None
    metodo_pago_ids: list[int] | None = None


class ComboGroupProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    producto_id: int
    producto_nombre: str = ""


class ComboGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    min_cantidad: int
    max_cantidad: int
    products: list[ComboGroupProductOut]


class ComboOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    precio_total_usd: Decimal
    activo: bool
    groups: list[ComboGroupOut]
    metodo_pago_ids: list[int] = []
