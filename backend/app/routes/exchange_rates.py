import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.broadcaster import rate_broadcaster
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.exchange_rate import ExchangeRateBulkSave, ExchangeRateOut, ExchangeRatePaginationOut
from app.services.audit_service import log_action
from app.services.exchange_rate_service import (
    fetch_bcv_rates,
    get_daily_rate_status,
    get_latest_rate_info,
    get_rate_history,
    get_rate_history_paginated,
    save_rates,
)

router = APIRouter(prefix="/exchange-rates", tags=["exchange-rates"])


@router.post("/save-rates", status_code=status.HTTP_201_CREATED)
def save_bulk(
    data: ExchangeRateBulkSave,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """POST /exchange-rates/save-rates - Guardar tasas USD y EUR (Solo Administrador)

    Recibe: JSON body con usd (>0) y eur (>0)
    Hace:   persiste un registro atómico con ambas tasas vinculado al usuario administrador
    Devuelve: 201 + tasa creada (o 200 si no hubo cambios) | 422 si validación falla | 401/403
    """
    rate, created = save_rates(db, data, user_id=current_user.id)
    if created:
        ip = request.client.host if request.client else "local"
        log_action(usuario=current_user.username, ip=ip, accion="CONFIGURAR", entidad="tasa_cambio", entidad_id=rate.id, detalle=f"Guardadas tasas USD={rate.tasa_usd} EUR={rate.tasa_eur}")
    else:
        response.status_code = status.HTTP_200_OK
    return ExchangeRateOut.model_validate(rate)


@router.get("/bcv", status_code=status.HTTP_200_OK)
def bcv_rates(
    current_user: User = Depends(get_current_user),
):
    """GET /exchange-rates/bcv - Obtener tasas actuales del BCV (scraping)

    Recibe: cookie access_token
    Hace:   consulta en vivo el sitio web del BCV y extrae USD y EUR
    Devuelve: 200 + tasas redondeadas a 4 decimales | 401 no autenticado
    """
    try:
        rates = fetch_bcv_rates()
    except (ConnectionError, RuntimeError) as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )
    return {"rates": {m: str(v) for m, v in rates.items()}}


@router.get("/latest", status_code=status.HTTP_200_OK)
def latest(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET /exchange-rates/latest - Obtener últimas tasas de cambio

    Recibe: (sin parámetros)
    Hace:   consulta el registro más reciente con ambas tasas
    Devuelve: 200 + dict con tasas actuales y fecha_ultima_actualizacion | 401 si no autenticado
    """
    info = get_latest_rate_info(db)
    return {
        "rates": {m: str(v) for m, v in info["rates"].items()},
        "fecha_ultima_actualizacion": info["fecha_ultima_actualizacion"].isoformat() if info["fecha_ultima_actualizacion"] else None,
    }


@router.get("/stream")
async def stream_rates(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """GET /exchange-rates/stream - Server-Sent Events (SSE) para actualización de tasas en tiempo real

    Recibe: cookie de autenticación
    Hace:   mantiene una conexión HTTP abierta transmitiendo actualizaciones de tasa en formato SSE
    Devuelve: Stream text/event-stream | 401 si no autenticado
    """
    queue = await rate_broadcaster.subscribe()

    async def event_generator():
        try:
            yield ": connected\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield message
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            rate_broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history", status_code=status.HTTP_200_OK)
def history(
    page: int | None = None,
    page_size: int | None = None,
    days: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET /exchange-rates/history - Historial de tasas de cambio

    Recibe: opcional page+page_size (paginado) o days (rango en días, sin paginar)
    Hace:   consulta el historial completo, paginado o filtrado por los últimos N días
    Devuelve: 200 + {history} | 200 + paginación (items, total, pages) | 401 no autenticado
    """
    if page is not None and page_size is not None:
        result = get_rate_history_paginated(db, page=page, page_size=page_size)
        return ExchangeRatePaginationOut(
            items=[ExchangeRateOut.model_validate(r) for r in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            pages=result["pages"],
        )
    rates = get_rate_history(db, days=days)
    return {"history": [ExchangeRateOut.model_validate(r) for r in rates]}


@router.get("/daily-status", status_code=status.HTTP_200_OK)
def daily_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """GET /exchange-rates/daily-status - Verificar si las tasas fueron actualizadas hoy

    Recibe: cookie access_token
    Hace:   consulta la última tasa registrada y verifica si es de hoy
    Devuelve: 200 + needs_update (true si después de las 17:00 y no actualizado hoy)
    """
    return get_daily_rate_status(db)
