from decimal import Decimal

from app.core.exceptions import ConflictError
from app.models.exchange_rate import ExchangeRate
from app.schemas.exchange_rate import ExchangeRateCreate
from app.services.exchange_rate_service import (
    create_rate, get_latest_rate, get_all_latest_rates, get_rate_history,
)


def _create_usd(db):
    data = ExchangeRateCreate(moneda="USD", tasa_ves=Decimal("90.50"))
    return create_rate(db, data, user_id=1)


def _create_eur(db):
    data = ExchangeRateCreate(moneda="EUR", tasa_ves=Decimal("98.00"))
    return create_rate(db, data, user_id=1)


def test_create_rate_success(db):
    rate = _create_usd(db)
    assert rate.moneda == "USD"
    assert rate.tasa_ves == Decimal("90.50")
    assert rate.id is not None


def test_get_latest_rate_returns_most_recent(db):
    _create_usd(db)
    data2 = ExchangeRateCreate(moneda="USD", tasa_ves=Decimal("91.00"))
    create_rate(db, data2, user_id=1)
    latest = get_latest_rate(db, "USD")
    assert latest.tasa_ves == Decimal("91.00")


def test_get_latest_rate_none(db):
    assert get_latest_rate(db, "USD") is None


def test_get_all_latest_rates_both(db):
    _create_usd(db)
    _create_eur(db)
    result = get_all_latest_rates(db)
    assert result == {"USD": Decimal("90.50"), "EUR": Decimal("98.00")}


def test_get_all_latest_rates_partial(db):
    _create_usd(db)
    result = get_all_latest_rates(db)
    assert result == {"USD": Decimal("90.50")}
    assert "EUR" not in result


def test_get_all_latest_rates_empty(db):
    assert get_all_latest_rates(db) == {}


def test_get_rate_history_all(db):
    _create_usd(db)
    _create_eur(db)
    history = get_rate_history(db)
    assert len(history) == 2


def test_get_rate_history_filter_by_moneda(db):
    _create_usd(db)
    _create_eur(db)
    usd_history = get_rate_history(db, moneda="USD")
    assert len(usd_history) == 1
    assert usd_history[0].moneda == "USD"


def test_get_rate_history_invalid_moneda(db):
    try:
        get_rate_history(db, moneda="GBP")
        assert False, "Should raise ConflictError"
    except ConflictError as e:
        assert "Moneda inválida" in str(e)


def test_get_rate_history_limit(db):
    for i in range(5):
        data = ExchangeRateCreate(moneda="USD", tasa_ves=Decimal(f"90.{i}"))
        create_rate(db, data, user_id=1)
    history = get_rate_history(db, limit=3)
    assert len(history) == 3
