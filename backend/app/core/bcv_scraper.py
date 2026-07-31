import warnings
from decimal import Decimal, InvalidOperation

import requests
from bs4 import BeautifulSoup
from urllib3.exceptions import InsecureRequestWarning

warnings.filterwarnings("ignore", category=InsecureRequestWarning)

URL = "https://www.bcv.org.ve"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}


def _extract_rate(soup: BeautifulSoup, currency_id: str) -> Decimal | None:
    container = soup.find("div", id=currency_id)
    if not container:
        return None

    strong = container.find("strong", class_="strong-tb")
    if not strong:
        return None

    raw = strong.get_text(strip=True)
    if not raw:
        return None

    normalized = raw.replace(",", ".").replace(" ", "")
    try:
        return Decimal(normalized)
    except InvalidOperation:
        return None


def fetch_bcv_rates() -> dict[str, Decimal]:
    """Consulta las tasas de USD y EUR en el sitio oficial del BCV.

    Returns:
        dict con claves 'USD' y 'EUR' y sus valores Decimal redondeados
        a 3 decimales. Si una moneda no se encuentra, se omite del dict.

    Raises:
        ConnectionError: si no se puede conectar al sitio.
        RuntimeError: si no se encuentra ninguna tasa.
    """
    try:
        response = requests.get(URL, headers=HEADERS, timeout=30, verify=False)
        response.raise_for_status()
    except requests.RequestException as e:
        raise ConnectionError(f"No se pudo conectar con {URL}: {e}") from e

    soup = BeautifulSoup(response.text, "html.parser")

    rates = {}
    for currency_id, key in [("dolar", "USD"), ("euro", "EUR")]:
        rate = _extract_rate(soup, currency_id)
        if rate is not None:
            rates[key] = rate.quantize(Decimal("0.001"))

    if not rates:
        raise RuntimeError(
            "No se encontraron tasas. La estructura del sitio puede haber cambiado."
        )

    return rates
