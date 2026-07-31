from decimal import Decimal
from unittest.mock import patch, Mock

import pytest
from app.core.bcv_scraper import fetch_bcv_rates


MOCK_HTML = """
<div id="dolar" class="col-sm-12 col-xs-12 ">
    <div class="field-content">
        <div class="row recuadrotsmc">
            <div class="col-sm-6 col-xs-6">
                <img src="/sites/default/files/dollar-04_2.png" class="icono_bss_blanco1">
                <span> USD</span>
            </div>
            <div class="col-sm-6 col-xs-6 centrado textp">
                <strong class="strong-tb"> 727,45120000</strong>
            </div>
        </div>
    </div>
</div>
<div id="euro" class="col-sm-12 col-xs-12 ">
    <div class="field-content">
        <div class="row recuadrotsmc">
            <div class="col-sm-6 col-xs-6">
                <img src="/sites/default/files/euro-04_2.png" class="icono_bss_blanco1">
                <span> EUR </span>
            </div>
            <div class="col-sm-6 col-xs-6 centrado textp">
                <strong class="strong-tb"> 832,24781987</strong>
            </div>
        </div>
    </div>
</div>
"""


@pytest.fixture
def mock_response():
    mock = Mock()
    mock.text = MOCK_HTML
    mock.raise_for_status = Mock()
    return mock


def test_fetch_bcv_rates_success(mock_response):
    with patch("app.core.bcv_scraper.requests.get", return_value=mock_response):
        rates = fetch_bcv_rates()
    assert rates["USD"] == Decimal("727.451")
    assert rates["EUR"] == Decimal("832.248")


def test_fetch_bcv_rates_missing_rates():
    html_no_rates = "<html><body>No rates here</body></html>"
    mock = Mock()
    mock.text = html_no_rates
    mock.raise_for_status = Mock()

    with patch("app.core.bcv_scraper.requests.get", return_value=mock):
        with pytest.raises(RuntimeError, match="No se encontraron tasas"):
            fetch_bcv_rates()


def test_fetch_bcv_rates_connection_error():
    with patch("app.core.bcv_scraper.requests.get", side_effect=ConnectionError("timeout")):
        with pytest.raises(ConnectionError):
            fetch_bcv_rates()
