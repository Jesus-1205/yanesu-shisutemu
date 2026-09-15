from decimal import Decimal

from app.models.exchange_rate import ExchangeRate
from app.schemas.exchange_rate import ExchangeRateBulkSave
from app.services.exchange_rate_service import (
    save_rates, get_latest_rate, get_rate_history,
)


def _save_rates(db, usd=Decimal("90.50"), eur=Decimal("98.00")):
    data = ExchangeRateBulkSave(usd=usd, eur=eur)
    return save_rates(db, data, user_id=1)


def test_save_rates_success(db):
    rate = _save_rates(db)
    assert rate.tasa_usd == Decimal("90.50")
    assert rate.tasa_eur == Decimal("98.00")
    assert rate.id is not None


def test_get_latest_rate_returns_most_recent(db):
    _save_rates(db, usd=Decimal("90.00"), eur=Decimal("97.00"))
    _save_rates(db, usd=Decimal("91.00"), eur=Decimal("98.50"))
    latest = get_latest_rate(db)
    assert latest.tasa_usd == Decimal("91.00")
    assert latest.tasa_eur == Decimal("98.50")


def test_get_latest_rate_none(db):
    assert get_latest_rate(db) is None


def test_get_rate_history_all(db):
    _save_rates(db)
    _save_rates(db, usd=Decimal("91.00"), eur=Decimal("99.00"))
    history = get_rate_history(db)
    assert len(history) == 2


def test_get_rate_history_limit(db):
    for i in range(5):
        _save_rates(db, usd=Decimal(f"90.{i}"), eur=Decimal(f"97.{i}"))
    history = get_rate_history(db, limit=3)
    assert len(history) == 3


def test_get_rate_history_empty(db):
    history = get_rate_history(db)
    assert len(history) == 0


def test_fetch_bcv_rates_caching():
    import time
    from unittest.mock import patch
    from app.services.exchange_rate_service import fetch_bcv_rates, _bcv_cache

    _bcv_cache["rates"] = {"USD": Decimal("50.0000"), "EUR": Decimal("55.0000")}
    _bcv_cache["ts"] = time.monotonic()

    # Debería retornar de cache sin llamar a scraper
    with patch("app.services.exchange_rate_service._scrape_bcv") as mock_scrape:
        res = fetch_bcv_rates()
        assert res["USD"] == Decimal("50.0000")
        mock_scrape.assert_not_called()

    # Expira cache
    _bcv_cache["ts"] = time.monotonic() - 400
    with patch("app.services.exchange_rate_service._scrape_bcv", return_value={"USD": Decimal("51.0000")}) as mock_scrape:
        res = fetch_bcv_rates()
        assert res["USD"] == Decimal("51.0000")
        mock_scrape.assert_called_once()

