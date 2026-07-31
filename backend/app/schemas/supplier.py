from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr


class SupplierCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str
    telefono: str | None = None
    email: EmailStr | None = None


class SupplierUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str | None = None
    telefono: str | None = None
    email: EmailStr | None = None


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    telefono: str | None
    email: str | None


class SupplierAnalyticsOut(BaseModel):
    id: int
    nombre: str
    telefono: str | None
    email: str | None
    total_productos: int
    stock_total: int
    margen_promedio: Decimal
    unidades_vendidas: int
    ingresos_usd: Decimal


class SupplierAnalyticsResponse(BaseModel):
    total_proveedores: int
    total_productos: int
    stock_total: int
    margen_promedio_general: Decimal
    unidades_vendidas: int
    ingresos_usd: Decimal
    proveedores: list[SupplierAnalyticsOut]


class SupplierDetailProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    codigo_barra: str | None
    stock_unidades: int
    precio_unidad_usd: Decimal
    unidades_vendidas: int
    ingresos_usd: Decimal
    margen_porcentaje: Decimal


class SupplierDetailAnalyticsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    total_productos: int
    stock_total: int
    unidades_vendidas: int
    ingresos_usd: Decimal
    margen_promedio: Decimal
    top_productos: list[SupplierDetailProductOut]


class SupplierPaginationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[SupplierOut]
    total: int
    page: int
    page_size: int
    pages: int
