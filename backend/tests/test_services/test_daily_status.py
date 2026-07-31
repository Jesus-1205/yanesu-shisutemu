from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock
from zoneinfo import ZoneInfo

import pytest

from app.models.exchange_rate import ExchangeRate
from app.services.exchange_rate_service import get_daily_rate_status

VE_TZ = ZoneInfo("America/Caracas")


def _make_ve_now(hour, weekday=2):
    """Crea un datetime ficticio en Caracas con el weekday deseado (0=Lun)."""
    base = datetime(2026, 7, 27, hour, 0, tzinfo=VE_TZ)
    while base.weekday() != weekday:
        base += timedelta(days=1)
    return base


def _insert_rate(db, fecha):
    rate = ExchangeRate(
        moneda="USD",
        tasa_ves=Decimal("727.500"),
        fecha_registro=fecha,
        registrado_por=1,
    )
    db.add(rate)
    db.commit()


def _mock_datetime(ve_now):
    """Retorna un patch para datetime.now que devuelve ve_now."""
    mock_dt = MagicMock(wraps=datetime)
    mock_dt.now.return_value = ve_now
    mock_dt.side_effect = lambda *a, **kw: datetime(*a, **kw)
    return patch("app.services.exchange_rate_service.datetime", mock_dt)


class TestGetDailyRateStatus:
    def test_after_17_no_rate_needs_update(self, db):
        ve_now = _make_ve_now(hour=17, weekday=2)  # Miércoles 17:00
        with _mock_datetime(ve_now):
            result = get_daily_rate_status(db)
        assert result["needs_update"] is True

    def test_before_17_no_update(self, db):
        ve_now = _make_ve_now(hour=16, weekday=2)  # Miércoles 16:30
        with _mock_datetime(ve_now):
            result = get_daily_rate_status(db)
        assert result["needs_update"] is False

    def test_rate_today_no_update_needed(self, db):
        ve_now = _make_ve_now(hour=18, weekday=2)  # Miércoles 18:00
        fecha_hoy = ve_now.replace(hour=18, minute=0, second=0, microsecond=0)
        _insert_rate(db, fecha_hoy)
        with _mock_datetime(ve_now):
            result = get_daily_rate_status(db)
        assert result["needs_update"] is False
        assert result["last_update_today"] is not None

    def test_rate_yesterday_still_needs_update(self, db):
        ve_now = _make_ve_now(hour=18, weekday=2)  # Miércoles 18:00
        fecha_ayer = (ve_now - timedelta(days=1)).replace(
            hour=18, minute=0, second=0, microsecond=0
        )
        _insert_rate(db, fecha_ayer)
        with _mock_datetime(ve_now):
            result = get_daily_rate_status(db)
        assert result["needs_update"] is True

    def test_weekend_no_update(self, db):
        ve_now = _make_ve_now(hour=18, weekday=5)  # Sábado 18:00
        with _mock_datetime(ve_now):
            result = get_daily_rate_status(db)
        assert result["needs_update"] is False
