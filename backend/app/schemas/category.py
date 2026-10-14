from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str
    descripcion: str | None = None


class CategoryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str | None = None
    descripcion: str | None = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None


class CategoryAnalyticsOut(BaseModel):
    id: int
    nombre: str
    descripcion: str | None
    total_productos: int
    stock_total: int
    margen_promedio: Decimal
    unidades_vendidas: int
    ingresos_usd: Decimal


class CategoryAnalyticsResponse(BaseModel):
    total_categorias: int
    total_productos: int
    stock_total: int
    margen_promedio_general: Decimal
    unidades_vendidas: int
    ingresos_usd: Decimal
    categorias: list[CategoryAnalyticsOut]


class CategorySummaryResponse(BaseModel):
    total_categorias: int
    total_productos: int
    categoria_lider_nombre: str | None = None
    mayor_margen_porcentaje: Decimal | None = None



class CategoryDetailProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    codigo_barra: str | None
    stock_unidades: int
    precio_unidad_usd: Decimal
    unidades_vendidas: int
    ingresos_usd: Decimal
    margen_porcentaje: Decimal


class CategoryDetailAnalyticsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    total_productos: int
    unidades_vendidas: int
    ingresos_usd: Decimal
    margen_promedio: Decimal
    top_productos: list[CategoryDetailProductOut]
    distribucion_ventas: list[CategoryDetailProductOut]


class CategoryPaginationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[CategoryOut]
    total: int
    page: int
    page_size: int
    pages: int


class CategoryReportItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    total_productos: int
    stock_total: int
    stock_valorado_usd: Decimal
    total_ordenes: int
    unidades_vendidas: int
    ingresos_usd: Decimal
    costos_usd: Decimal
    margen_usd: Decimal
    margen_porcentaje: Decimal

