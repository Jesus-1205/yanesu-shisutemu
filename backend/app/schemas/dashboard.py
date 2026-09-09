from pydantic import BaseModel


class DashboardStatsOut(BaseModel):
    """Métricas del dashboard: conteos ligeros resueltos en una sola sentencia SQL."""
    total_productos: int = 0
    sin_stock: int = 0
    total_categorias: int = 0
    total_proveedores: int = 0
