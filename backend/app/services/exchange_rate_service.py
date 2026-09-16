from datetime import datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import func, select, desc
from sqlalchemy.orm import Session

from app.core.bcv_scraper import fetch_bcv_rates as _scrape_bcv
from app.core.config import VE_TZ
from app.models.exchange_rate import ExchangeRate
from app.schemas.exchange_rate import ExchangeRateBulkSave

SCRAPE_HOUR = 17

def fetch_bcv_rates() -> dict[str, Decimal]:
    """Obtiene las tasas del BCV en tiempo real redondeadas a 4 decimales.

    Returns:
        dict con 'USD' y 'EUR' y sus valores Decimal.

    Raises:
        ConnectionError: si no puede conectar con el sitio.
        RuntimeError: si no encuentra las tasas.
    """
    return _scrape_bcv()


def get_latest_rate(db: Session) -> ExchangeRate | None:
    stmt = (
        select(ExchangeRate)
        .order_by(desc(ExchangeRate.fecha_registro), desc(ExchangeRate.id))
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


def get_latest_rate_info(db: Session) -> dict:
    rate = get_latest_rate(db)
    if not rate:
        return {"rates": {}, "fecha_ultima_actualizacion": None}
    return {
        "rates": {"USD": rate.tasa_usd, "EUR": rate.tasa_eur},
        "fecha_ultima_actualizacion": rate.fecha_registro,
    }


def get_rate_history(db: Session, days: int | None = None, limit: int | None = None) -> list[ExchangeRate]:
    stmt = select(ExchangeRate)
    if days is not None and days > 0:
        since = (datetime.now(VE_TZ) - timedelta(days=days)).replace(tzinfo=None)
        stmt = stmt.where(ExchangeRate.fecha_registro >= since)
    stmt = stmt.order_by(desc(ExchangeRate.fecha_registro), desc(ExchangeRate.id))
    if limit is not None:
        stmt = stmt.limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_rate_history_paginated(db: Session, page: int = 1, page_size: int = 20) -> dict:
    total = db.execute(select(func.count()).select_from(ExchangeRate)).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    stmt = select(ExchangeRate).order_by(desc(ExchangeRate.fecha_registro), desc(ExchangeRate.id)).offset(offset).limit(page_size)
    items = list(db.execute(stmt).scalars().all())
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def save_rates(
    db: Session,
    data: ExchangeRateBulkSave,
    user_id: int | None = None,
    api_key_id: int | None = None,
) -> tuple[ExchangeRate, bool]:
    """Guarda nuevas tasas de cambio con idempotencia estricta.

    Si las tasas entrantes son idénticas al último registro activo,
    retorna el registro existente y created=False sin insertar duplicados.
    """
    latest = get_latest_rate(db)
    if latest and latest.tasa_usd == data.usd and latest.tasa_eur == data.eur:
        return latest, False

    rate = ExchangeRate(
        tasa_usd=data.usd,
        tasa_eur=data.eur,
        registrado_por=user_id,
        api_key_id=api_key_id,
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate, True


def get_daily_rate_status(db: Session) -> dict:
    """Verifica si las tasas fueron actualizadas hoy después de las 17:00.

    Returns:
        dict con:
        - needs_update: bool → True si es después de las 17:00 en día laboral
          y no se ha registrado ninguna tasa hoy.
        - last_update_today: str | None → ISO timestamp de la última tasa de hoy.
        - now: str → hora actual en Caracas (para debug en frontend).
    """
    ve_now = datetime.now(VE_TZ)
    today_start = ve_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59, microsecond=999999)

    stmt = (
        select(ExchangeRate)
        .where(ExchangeRate.fecha_registro >= today_start)
        .where(ExchangeRate.fecha_registro <= today_end)
        .order_by(desc(ExchangeRate.fecha_registro))
        .limit(1)
    )
    today_rate = db.execute(stmt).scalars().first()

    has_update_today = today_rate is not None
    is_after_scrape = ve_now.time() >= time(SCRAPE_HOUR, 0)
    is_weekday = ve_now.weekday() < 5

    needs_update = is_weekday and is_after_scrape and not has_update_today

    return {
        "needs_update": needs_update,
        "last_update_today": today_rate.fecha_registro.isoformat() if today_rate else None,
        "now": ve_now.isoformat(),
    }
