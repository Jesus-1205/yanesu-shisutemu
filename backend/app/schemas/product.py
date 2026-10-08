from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.schemas.category import CategoryOut


class ProductCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    codigo_barra: str | None = None
    nombre: str
    categoria_ids: list[int] = []
    unidades_por_caja: int = 1
    stock_cajas: int = 0
    stock_unidades: int = 0
    stock_minimo: int = 5
    precio_costo_caja_usd: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2)
    precio_unidad_usd: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    precio_caja_usd: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    proveedor_id: int | None = None
    tipo_iva: Literal["GRAVADO", "EXENTO"] = "GRAVADO"


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo_barra: str | None
    nombre: str
    categories: list[CategoryOut]
    unidades_por_caja: int
    stock_cajas: int
    stock_unidades: int
    stock_minimo: int
    precio_costo_caja_usd: Decimal
    precio_costo_usd: Decimal
    precio_unidad_usd: Decimal
    precio_caja_usd: Decimal
    proveedor_id: int | None
    tipo_iva: str
    es_favorito: bool
    precio_divisas_unidad: Decimal | None = None
    precio_divisas_caja: Decimal | None = None

    @computed_field
    @property
    def precio_sugerido_unidad_usd(self) -> Decimal:
        if self.precio_costo_usd <= 0:
            return Decimal("0")
        return (self.precio_costo_usd / Decimal("0.7")).quantize(Decimal("0.01"))

    @computed_field
    @property
    def precio_sugerido_caja_usd(self) -> Decimal:
        if self.precio_costo_caja_usd <= 0:
            return Decimal("0")
        return (self.precio_costo_caja_usd / Decimal("0.7")).quantize(Decimal("0.01"))


class ProductUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    codigo_barra: str | None = None
    nombre: str | None = None
    categoria_ids: list[int] | None = None
    unidades_por_caja: int | None = None
    stock_cajas: int | None = None
    stock_unidades: int | None = None
    stock_minimo: int | None = None
    precio_costo_caja_usd: Decimal | None = None
    precio_unidad_usd: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    precio_caja_usd: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    proveedor_id: int | None = None
    tipo_iva: Literal["GRAVADO", "EXENTO"] | None = None
    es_favorito: bool | None = None


class ProductPaginationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[ProductOut]
    total: int
    page: int
    page_size: int
    pages: int


class ProductMatrixOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    total_vendido: int
    precio_unidad_usd: Decimal
    precio_costo_usd: Decimal
    margen_porcentaje: Decimal
    stock_unidades: int


class ProductRankingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    precio_unidad_usd: Decimal
    stock_unidades: int


class ProductRankingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    producto: ProductRankingItemOut
    total_vendido: int


