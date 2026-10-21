from decimal import Decimal
import pytest
from sqlalchemy import select

from app.models.category import Category
from app.models.exchange_rate import ExchangeRate
from app.models.invoice import DetalleFactura, Factura
from app.models.invoice_payment import InvoicePayment
from app.models.product import Product
from app.models.role import Role
from app.models.sale import Sale, SaleItem
from app.models.sale_payment import SalePayment
from app.models.supplier import Supplier
from app.models.user import User
from scripts.seed_demo_data import clean_demo_data, main, run_seed


def test_run_seed_end_to_end(db_session):
    """Prueba la ejecución de run_seed(reset=False) de extremo a extremo."""
    summary = run_seed(db_session, reset=False)

    assert summary["suppliers"] >= 5
    assert summary["categories"] >= 6
    assert summary["products"] >= 38
    assert summary["exchange_rates"] == 30
    assert summary["invoices"] == 10
    assert summary["sales"] >= 60

    # Verificación directa en base de datos
    prods = db_session.execute(select(Product)).scalars().all()
    rates = db_session.execute(select(ExchangeRate)).scalars().all()
    invoices = db_session.execute(select(Factura)).scalars().all()
    sales = db_session.execute(select(Sale)).scalars().all()

    assert len(prods) >= 38
    assert len(rates) == 30
    assert len(invoices) == 10
    assert len(sales) >= 60

    # Idempotencia: ejecutarlo de nuevo no debe duplicar registros
    second_summary = run_seed(db_session, reset=False)
    assert second_summary["exchange_rates"] == 30
    assert second_summary["invoices"] == 10
    assert second_summary["sales"] == len(sales)


def test_clean_demo_data(db_session):
    """Prueba la limpieza de datos operacionales de demostración."""
    # Primero sembramos datos
    run_seed(db_session, reset=False)

    # Verificamos que existen datos operacionales
    assert len(db_session.execute(select(Product)).scalars().all()) >= 38
    assert len(db_session.execute(select(Factura)).scalars().all()) == 10
    assert len(db_session.execute(select(Sale)).scalars().all()) >= 60
    assert len(db_session.execute(select(ExchangeRate)).scalars().all()) == 30

    # Ejecutamos la limpieza
    cleaned = clean_demo_data(db_session)
    assert isinstance(cleaned, dict)

    # Verificamos que los datos operacionales fueron eliminados
    sales_left = db_session.execute(select(Sale)).scalars().all()
    items_left = db_session.execute(select(SaleItem)).scalars().all()
    payments_left = db_session.execute(select(SalePayment)).scalars().all()
    invoices_left = db_session.execute(select(Factura)).scalars().all()
    inv_details_left = db_session.execute(select(DetalleFactura)).scalars().all()
    inv_payments_left = db_session.execute(select(InvoicePayment)).scalars().all()
    products_left = db_session.execute(select(Product)).scalars().all()
    rates_left = db_session.execute(select(ExchangeRate)).scalars().all()

    assert len(sales_left) == 0
    assert len(items_left) == 0
    assert len(payments_left) == 0
    assert len(invoices_left) == 0
    assert len(inv_details_left) == 0
    assert len(inv_payments_left) == 0
    assert len(products_left) == 0
    assert len(rates_left) == 0

    # Tablas estructurales y usuarios deben permanecer
    roles_left = db_session.execute(select(Role)).scalars().all()
    users_left = db_session.execute(select(User)).scalars().all()
    categories_left = db_session.execute(select(Category)).scalars().all()
    suppliers_left = db_session.execute(select(Supplier)).scalars().all()

    assert len(roles_left) > 0
    assert len(users_left) > 0
    assert len(categories_left) > 0
    assert len(suppliers_left) > 0


def test_run_seed_with_reset_flag(db_session):
    """Prueba run_seed con reset=True limpiando y re-sembrando ordenadamente."""
    # Primera siembra
    run_seed(db_session, reset=False)

    # Resiembra con reset=True
    summary = run_seed(db_session, reset=True)

    assert summary["products"] >= 38
    assert summary["exchange_rates"] == 30
    assert summary["invoices"] == 10
    assert summary["sales"] >= 60

    # Verificamos que no hay registros residuales o duplicados
    rates = db_session.execute(select(ExchangeRate)).scalars().all()
    invoices = db_session.execute(select(Factura)).scalars().all()
    sales = db_session.execute(select(Sale)).scalars().all()

    assert len(rates) == 30
    assert len(invoices) == 10
    assert len(sales) >= 60


def test_main_cli_execution(db_session, monkeypatch, capsys):
    """Prueba el punto de entrada CLI main(['--no-migrate'])."""
    monkeypatch.setattr("scripts.seed_demo_data.SessionLocal", lambda: db_session)

    exit_code = main(["--no-migrate"])
    assert exit_code == 0

    captured = capsys.readouterr()
    assert "YANESU SHISUTEMU" in captured.out or "admin" in captured.out
    assert "admin123" in captured.out

    # Validamos que se sembraron datos correctamente
    prods = db_session.execute(select(Product)).scalars().all()
    assert len(prods) >= 38
