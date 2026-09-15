from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.dashboard import DashboardStatsOut
from app.services.dashboard_service import get_dashboard_stats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsOut, status_code=status.HTTP_200_OK)
def dashboard_stats(db: Session = Depends(get_db)):
    """GET /dashboard/stats - Métricas del dashboard resueltas en una sola sentencia.

    Devuelve conteos de productos, sin stock, categorías y proveedores
    usando COUNTs y subconsultas escalares, sin cargar relaciones.
    """
    return get_dashboard_stats(db)

