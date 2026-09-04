from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RetornableProductoCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    producto_id: int
    presentacion: Literal["222", "333"]


class RetornableProductoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    producto_id: int
    presentacion: str
    producto_nombre: str = ""
    stock_cajas: int = 0
    stock_unidades: int = 0


class RetornableEstadoOut(BaseModel):
    """Una fila de estado (CASILLERO, VACIO o LLENO)."""

    model_config = ConfigDict(from_attributes=True)

    estado: str
    cantidad_botellas: int
    cantidad_cajas: int
    total_botellas: int
    cajas_enteras: int
    botellas_sueltas: int


class RetornablePresentacionOut(BaseModel):
    """Resumen completo de una presentacion (222 o 333)."""

    presentacion: str
    casillero: RetornableEstadoOut
    vacio: RetornableEstadoOut
    lleno: RetornableEstadoOut
    total_botellas: int
    total_cajas_enteras: int
    lleno_esperado_botellas: int
    discrepancia_botellas: int
    productos_asociados: list[RetornableProductoOut]


class RetornableResumenOut(BaseModel):
    """Resumen general del inventario retornable."""

    ultimo_reporte_fecha: datetime | None = None
    ultimo_reporte_realizado_por: str | None = None
    presentaciones: list[RetornablePresentacionOut]


class DetalleLinea(BaseModel):
    """Linea de detalle de un reporte."""

    presentacion: str
    estado: str
    cantidad_botellas: int
    cantidad_cajas: int


class DetalleLineaConDiscrepancia(DetalleLinea):
    """Linea con discrepancia calculada."""

    esperado_botellas: int
    esperado_cajas: int
    discrepancia_botellas: int
    discrepancia_cajas: int


class RetornableReporteCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    realizado_por: str = Field(min_length=1, max_length=150)
    observaciones: str | None = None
    detalles: list[DetalleLinea] = Field(min_length=6, max_length=6)


class RetornableReporteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha: datetime
    realizado_por: str
    usuario_id: int
    observaciones: str | None
    es_actual: bool


class RetornableReporteDetalleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reporte_id: int
    presentacion: str
    estado: str
    cantidad_botellas: int
    cantidad_cajas: int


class RetornableReporteCompletoOut(BaseModel):
    """Reporte con sus 6 lineas y discrepancias vs reporte anterior."""

    reporte: RetornableReporteOut
    detalles: list[DetalleLineaConDiscrepancia]
    reporte_anterior_id: int | None = None
    reporte_anterior_fecha: datetime | None = None


class RetornableReportePaginationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[RetornableReporteOut]
    total: int
    page: int
    page_size: int
    pages: int


class RetornableMovimientoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fecha: datetime
    presentacion: str
    estado: str
    delta_botellas: int
    tipo_movimiento: str
    referencia_id: int | None
    referencia_tipo: str | None
    usuario_id: int
    usuario_nombre: str = ""
    observaciones: str | None


class RetornableMovimientoPaginationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[RetornableMovimientoOut]
    total: int
    page: int
    page_size: int
    pages: int


class RetornableSnapshotOut(BaseModel):
    """Inventario reconstruido en una fecha especifica."""

    fecha: datetime
    presentaciones: list[RetornablePresentacionOut]
