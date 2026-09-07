from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.retornable import (
    RetornableMovimientoPaginationOut,
    RetornableProductoCreate,
    RetornableProductoOut,
    RetornableReporteCreate,
    RetornableReportePaginationOut,
    RetornableResumenOut,
)
from app.services import retornable_service as svc
from app.services.audit_service import log_action

router = APIRouter(prefix="/retornable", tags=["retornable"])


# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------


@router.get("/resumen", response_model=RetornableResumenOut, status_code=status.HTTP_200_OK)
def get_resumen(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /retornable/resumen - Inventario retornable actual con difs

    Recibe: cookie access_token
    Hace:   obtiene ultimo reporte, suma movimientos, calcula stock por estado/presentacion
    Devuelve: 200 + resumen con 2 presentaciones x 3 estados + difs
    """
    return svc.obtener_resumen(db)


# ---------------------------------------------------------------------------
# Reportes
# ---------------------------------------------------------------------------


@router.post(
    "/reportes",
    status_code=status.HTTP_201_CREATED,
    response_model=RetornableReportePaginationOut,
)
def crear_reporte(
    data: RetornableReporteCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """POST /retornable/reportes - Crear nuevo reporte de conteo fisico

    Recibe: JSON body con realizado_por, observaciones, detalles (6 lineas)
    Hace:   crea reporte con sus 6 detalles (2 presentaciones x 3 estados)
    Devuelve: 201 + reporte creado | 422 validacion
    """
    reporte = svc.crear_reporte(db, data, current_user.id)
    ip = request.client.host if request.client else "local"
    log_action(
        usuario=current_user.username,
        ip=ip,
        accion="CREAR",
        entidad="retornable_reporte",
        entidad_id=reporte.id,
        detalle=f"Reporte #{reporte.id} creado por {data.realizado_por}",
    )
    result = svc.listar_reportes(db, page=1, page_size=1)
    return result


@router.put(
    "/reportes/{reporte_id}/confirmar",
    status_code=status.HTTP_200_OK,
)
def confirmar_reporte(
    reporte_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """PUT /retornable/reportes/{id}/confirmar - Confirmar reporte

    Recibe: reporte_id en path, cookie access_token
    Hace:   actualiza retornable_inventario con los valores del reporte
    Devuelve: 200 ok | 404 no encontrado | 409 reporte no es el actual
    """
    svc.confirmar_reporte(db, reporte_id)
    ip = request.client.host if request.client else "local"
    log_action(
        usuario=current_user.username,
        ip=ip,
        accion="CONFIRMAR",
        entidad="retornable_reporte",
        entidad_id=reporte_id,
        detalle=f"Reporte #{reporte_id} confirmado",
    )
    return {"detail": "Reporte confirmado exitosamente"}


@router.get(
    "/reportes",
    response_model=RetornableReportePaginationOut,
    status_code=status.HTTP_200_OK,
)
def listar_reportes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /retornable/reportes - Listar reportes paginados

    Recibe: query params page, page_size
    Hace:   lista reportes ordenados por fecha descendente
    Devuelve: 200 + paginacion
    """
    return svc.listar_reportes(db, page=page, page_size=page_size)


@router.get(
    "/reportes/{reporte_id}",
    status_code=status.HTTP_200_OK,
)
def get_detalle_reporte(
    reporte_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /retornable/reportes/{id} - Detalle de reporte con difs

    Recibe: reporte_id en path
    Hace:   obtiene las 6 lineas del reporte + difs vs reporte anterior
    Devuelve: 200 + detalle con difs | 404 no encontrado
    """
    return svc.obtener_detalle_reporte(db, reporte_id)


# ---------------------------------------------------------------------------
# Historico
# ---------------------------------------------------------------------------


@router.get(
    "/historico",
    response_model=RetornableMovimientoPaginationOut,
    status_code=status.HTTP_200_OK,
)
def listar_movimientos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    presentacion: str | None = Query(None),
    tipo_movimiento: str | None = Query(None),
    fecha_desde: datetime | None = Query(None),
    fecha_hasta: datetime | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /retornable/historico - Movimientos historicos del inventario

    Recibe: query params con filtros opcionales (presentacion, tipo, fecha)
    Hace:   lista movimientos con filtros y paginacion
    Devuelve: 200 + paginacion de movimientos
    """
    return svc.listar_movimientos(
        db,
        page=page,
        page_size=page_size,
        presentacion=presentacion,
        tipo_movimiento=tipo_movimiento,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
    )


# ---------------------------------------------------------------------------
# Productos asociados
# ---------------------------------------------------------------------------


@router.get(
    "/productos",
    response_model=list[RetornableProductoOut],
    status_code=status.HTTP_200_OK,
)
def get_productos(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /retornable/productos - Listar productos asociados

    Recibe: cookie access_token
    Hace:   lista productos con su presentacion asociada
    Devuelve: 200 + lista de productos asociados
    """
    return svc.listar_productos_asociados(db)


@router.post(
    "/productos",
    status_code=status.HTTP_201_CREATED,
)
def asociar_producto(
    data: RetornableProductoCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """POST /retornable/productos - Asociar producto a presentacion

    Recibe: JSON body con producto_id y presentacion (222/333)
    Hace:   verifica que el producto no este ya asociado
    Devuelve: 201 | 409 ya asociado | 404 producto no encontrado
    """
    asoc = svc.asociar_producto(db, data.producto_id, data.presentacion)
    ip = request.client.host if request.client else "local"
    log_action(
        usuario=current_user.username,
        ip=ip,
        accion="CREAR",
        entidad="retornable_producto",
        entidad_id=asoc.id,
        detalle=f"Producto #{asoc.producto_id} asociado a {asoc.presentacion}",
    )
    return {"detail": "Producto asociado exitosamente", "id": asoc.id}


@router.delete(
    "/productos/{asociacion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def desasociar_producto(
    asociacion_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """DELETE /retornable/productos/{id} - Desasociar producto

    Recibe: asociacion_id en path
    Hace:   elimina la asociacion producto-presentacion
    Devuelve: 204 | 404 no encontrado
    """
    svc.desasociar_producto(db, asociacion_id)
    ip = request.client.host if request.client else "local"
    log_action(
        usuario=current_user.username,
        ip=ip,
        accion="ELIMINAR",
        entidad="retornable_producto",
        entidad_id=asociacion_id,
        detalle=f"Asociacion #{asociacion_id} eliminada",
    )
