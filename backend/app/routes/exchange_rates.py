from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.exchange_rate import ExchangeRateBulkSave, ExchangeRateCreate, ExchangeRateOut, ExchangeRatePaginationOut
from app.services.audit_service import log_action
from app.services.exchange_rate_service import (
    create_rate,
    fetch_bcv_rates,
    get_all_latest_rates,
    get_daily_rate_status,
    get_latest_rate_info,
    get_rate_history,
    get_rate_history_paginated,
    save_rates,
)

router = APIRouter(prefix="/exchange-rates", tags=["exchange-rates"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: ExchangeRateCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """POST /exchange-rates - Crear nueva tasa de cambio

    Recibe: JSON body con moneda (USD|EUR) y tasa_ves (>0)
    Hace:   valida datos, persiste la tasa vinculada al usuario autenticado
    Devuelve: 201 + tasa creada | 422 si validación falla | 401/403 si no autenticado/no admin
    """
    rate = create_rate(db, data, current_user.id)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="CREAR", entidad="tasa_cambio", entidad_id=rate.id, detalle=f"Creada tasa {rate.moneda} = {rate.tasa_ves}")
    return ExchangeRateOut.model_validate(rate)


@router.post("/save-rates", status_code=status.HTTP_201_CREATED)
def save_bulk(
    data: ExchangeRateBulkSave,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """POST /exchange-rates/save-rates - Guardar tasas USD y EUR de una vez

    Recibe: JSON body con usd (>0) y eur (>0)
    Hace:   persiste ambas tasas vinculadas al usuario autenticado
    Devuelve: 201 + lista de tasas creadas | 422 si validación falla | 401/403
    """
    rates = save_rates(db, data, current_user.id)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="CONFIGURAR", entidad="tasa_cambio", detalle=f"Guardadas tasas USD/EUR")
    return [ExchangeRateOut.model_validate(r) for r in rates]


@router.get("/bcv", status_code=status.HTTP_200_OK)
def bcv_rates(
    current_user: User = Depends(get_current_user),
):
    """GET /exchange-rates/bcv - Obtener tasas actuales del BCV (scraping)

    Recibe: cookie access_token
    Hace:   consulta en vivo el sitio web del BCV y extrae USD y EUR
    Devuelve: 200 + tasas redondeadas a 3 decimales | 401 no autenticado
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
    Hace:   consulta la tasa más reciente de USD y EUR
    Devuelve: 200 + dict con tasas actuales y fecha_ultima_actualizacion | 401 si no autenticado
    """
    info = get_latest_rate_info(db)
    return {
        "rates": {m: str(v) for m, v in info["rates"].items()},
        "fecha_ultima_actualizacion": info["fecha_ultima_actualizacion"].isoformat() if info["fecha_ultima_actualizacion"] else None,
    }


@router.get("/history", status_code=status.HTTP_200_OK)
def history(
    moneda: str | None = Query(None),
    page: int | None = None,
    page_size: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if page is not None and page_size is not None:
        result = get_rate_history_paginated(db, moneda=moneda, page=page, page_size=page_size)
        return ExchangeRatePaginationOut(
            items=[ExchangeRateOut.model_validate(r) for r in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            pages=result["pages"],
        )
    rates = get_rate_history(db, moneda)
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
