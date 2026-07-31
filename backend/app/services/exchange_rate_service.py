from datetime import datetime, time, timezone
from decimal import Decimal

from sqlalchemy import func, select, desc
from sqlalchemy.orm import Session

from app.core.bcv_scraper import fetch_bcv_rates as _scrape_bcv
from app.core.config import VE_TZ
from app.core.exceptions import ConflictError
from app.models.exchange_rate import ExchangeRate
from app.schemas.exchange_rate import ExchangeRateBulkSave, ExchangeRateCreate

SCRAPE_HOUR = 17


def fetch_bcv_rates() -> dict[str, Decimal]:
    """Obtiene las tasas del BCV redondeadas a 3 decimales.

    Returns:
        dict con 'USD' y 'EUR' y sus valores Decimal.

    Raises:
        ConnectionError: si no puede conectar con el sitio.
        RuntimeError: si no encuentra las tasas.
    """
    return _scrape_bcv()


def create_rate(db: Session, data: ExchangeRateCreate, user_id: int) -> ExchangeRate:
    rate = ExchangeRate(
        moneda=data.moneda,
        tasa_ves=data.tasa_ves,
        registrado_por=user_id,
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate


def get_latest_rate(db: Session, moneda: str) -> ExchangeRate | None:
    stmt = (
        select(ExchangeRate)
        .where(ExchangeRate.moneda == moneda)
        .order_by(desc(ExchangeRate.fecha_registro), desc(ExchangeRate.id))
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


def get_all_latest_rates(db: Session) -> dict[str, Decimal]:
    monedas = ["USD", "EUR"]
    result = {}
    for m in monedas:
        rate = get_latest_rate(db, m)
        if rate:
            result[m] = rate.tasa_ves
    return result


def get_latest_rate_info(db: Session) -> dict:
    monedas = ["USD", "EUR"]
    rates: dict[str, Decimal] = {}
    latest_date = None
    for m in monedas:
        rate = get_latest_rate(db, m)
        if rate:
            rates[m] = rate.tasa_ves
            if latest_date is None or rate.fecha_registro > latest_date:
                latest_date = rate.fecha_registro
    return {"rates": rates, "fecha_ultima_actualizacion": latest_date}


def get_rate_history(db: Session, moneda: str | None = None, limit: int = 50) -> list[ExchangeRate]:
    if moneda and moneda not in ("USD", "EUR"):
        raise ConflictError("Moneda inválida. Use USD o EUR")
    stmt = select(ExchangeRate)
    if moneda:
        stmt = stmt.where(ExchangeRate.moneda == moneda)
    stmt = stmt.order_by(desc(ExchangeRate.fecha_registro)).limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_rate_history_paginated(db: Session, moneda: str | None = None, page: int = 1, page_size: int = 20) -> dict:
    if moneda and moneda not in ("USD", "EUR"):
        raise ConflictError("Moneda inválida. Use USD o EUR")
    base = select(ExchangeRate)
    if moneda:
        base = base.where(ExchangeRate.moneda == moneda)
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    stmt = base.order_by(desc(ExchangeRate.fecha_registro)).offset(offset).limit(page_size)
    items = list(db.execute(stmt).scalars().all())
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def save_rates(db: Session, data: ExchangeRateBulkSave, user_id: int) -> list[ExchangeRate]:
    rates = []
    for moneda, valor in [("USD", data.usd), ("EUR", data.eur)]:
        rate = ExchangeRate(
            moneda=moneda,
            tasa_ves=valor,
            registrado_por=user_id,
        )
        db.add(rate)
        rates.append(rate)
    db.commit()
    for r in rates:
        db.refresh(r)
    return rates


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
