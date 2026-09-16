from decimal import Decimal

from app.models.exchange_rate import ExchangeRate
from app.schemas.exchange_rate import ExchangeRateBulkSave
from app.services.exchange_rate_service import (
    save_rates, get_latest_rate, get_rate_history,
)


def _save_rates(db, usd=Decimal("90.50"), eur=Decimal("98.00"), user_id=1, api_key_id=None):
    data = ExchangeRateBulkSave(usd=usd, eur=eur)
    rate, _ = save_rates(db, data, user_id=user_id, api_key_id=api_key_id)
    return rate


def test_save_rates_success(db):
    data = ExchangeRateBulkSave(usd=Decimal("90.50"), eur=Decimal("98.00"))
    rate, created = save_rates(db, data, user_id=1)
    assert created is True
    assert rate.tasa_usd == Decimal("90.50")
    assert rate.tasa_eur == Decimal("98.00")
    assert rate.id is not None


def test_save_rates_idempotence(db):
    data = ExchangeRateBulkSave(usd=Decimal("90.50"), eur=Decimal("98.00"))
    rate1, created1 = save_rates(db, data, user_id=1)
    assert created1 is True

    # Same rates -> should return existing rate and created=False
    rate2, created2 = save_rates(db, data, user_id=1)
    assert created2 is False
    assert rate2.id == rate1.id

    # New rates -> should create new entry
    data_new = ExchangeRateBulkSave(usd=Decimal("91.00"), eur=Decimal("98.00"))
    rate3, created3 = save_rates(db, data_new, user_id=1)
    assert created3 is True
    assert rate3.id != rate1.id


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


def test_fetch_bcv_rates_direct():
    from unittest.mock import patch
    from app.services.exchange_rate_service import fetch_bcv_rates

    with patch("app.services.exchange_rate_service._scrape_bcv", return_value={"USD": Decimal("51.0000"), "EUR": Decimal("56.0000")}) as mock_scrape:
        res = fetch_bcv_rates()
        assert res["USD"] == Decimal("51.0000")
        assert res["EUR"] == Decimal("56.0000")
        mock_scrape.assert_called_once()

