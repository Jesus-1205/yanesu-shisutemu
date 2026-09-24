from decimal import Decimal
from pydantic import BaseModel, ConfigDict
from typing import Dict, List, Any


class PaymentMethodSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usd: Decimal
    bs: Decimal
    tx_count: int


class DailyReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_usd: Decimal
    total_bs: Decimal
    transactions_count: int
    average_ticket_usd: Decimal


class TopProductSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    qty: int


class DailyReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: str
    tasa_bcv: Decimal
    summary: DailyReportSummary
    sales_by_method: Dict[str, PaymentMethodSummary]
    top_products: List[TopProductSummary]


class WeeklyReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_usd: Decimal
    total_bs: Decimal
    transactions_count: int
    average_daily_usd: Decimal


class BestDaySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: str
    day_name: str
    total_usd: Decimal


class PendingInvoicesSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_pending_usd: Decimal
    total_invoices_pending: int
    soonest_due_date: str | None = None


class WeeklyReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    start_date: str
    end_date: str
    summary: WeeklyReportSummary
    best_day: BestDaySummary | None = None
    sales_by_method: Dict[str, PaymentMethodSummary]
    top_category: str | None = None
    top_products: List[TopProductSummary]
    pending_invoices_summary: PendingInvoicesSummary


class ProductSearchToolItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo_barra: str | None = None
    nombre: str
    unidades_por_caja: int
    stock_cajas: int
    stock_unidades: int
    precio_unidad_usd: Decimal
    precio_caja_usd: Decimal
    proveedor: str | None = None
    categorias: List[str] = []


class ProductSalesHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int
    product_name: str
    total_units_sold: int
    total_revenue_usd: Decimal
    sales_count: int


class SalesMetricsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    start_date: str
    end_date: str
    total_usd: Decimal
    total_bs: Decimal
    transactions_count: int
    top_category: str | None = None
    sales_by_method: Dict[str, PaymentMethodSummary]


class PeakHoursItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    hour: int
    transactions_count: int
    total_usd: Decimal


class SaleSearchItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: str
    numero: str | None = None
    fecha_hora: str
    total_usd: Decimal
    cliente: str | None = None
    items: List[str]


class InvoiceSearchItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero_factura: str
    cliente_nombre: str
    estado: str
    total_usd: Decimal
    saldo_pendiente_usd: Decimal
    fecha_emision: str
    fecha_vencimiento: str | None = None
    items: List[str]


class ExchangeRateToolOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tasa_usd: Decimal
    tasa_eur: Decimal
    fecha_actualizacion: str
    ultima_modificacion_por: str | None = None


class UserToolItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    nombre_completo: str | None = None
    rol: str
    activo: bool


class TopSupplierItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    supplier_id: int
    supplier_name: str
    units_sold: int
    total_usd: Decimal


class CategoryTopToolItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None = None
    total_productos: int
    stock_total: int
    unidades_vendidas: int
    ingresos_usd: Decimal
    margen_promedio: Decimal


class CategoryDetailProductSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    codigo_barra: str | None = None
    stock_unidades: int
    precio_unidad_usd: Decimal
    unidades_vendidas: int
    ingresos_usd: Decimal
    margen_porcentaje: Decimal


class CategorySearchToolItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None = None
    total_productos: int
    unidades_vendidas: int
    ingresos_usd: Decimal
    margen_promedio: Decimal
    top_productos: List[CategoryDetailProductSummary]
