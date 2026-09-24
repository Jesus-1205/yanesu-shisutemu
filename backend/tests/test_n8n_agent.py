from datetime import date, datetime
from decimal import Decimal

import pytest
from sqlalchemy import select
from app.core.dependencies import hash_api_key
from app.main import app
import app.core.database as db_module
from app.models.api_key import ApiKey
from app.models.category import Category
from app.models.exchange_rate import ExchangeRate
from app.models.invoice import Factura, DetalleFactura
from app.models.invoice_payment import InvoicePayment
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.role import Role
from app.models.sale import Sale, SaleItem
from app.models.sale_payment import SalePayment
from app.models.supplier import Supplier
from app.models.user import User


def _get_db():
    return next(app.dependency_overrides[db_module.get_db]())


def _create_api_key(name="n8n-test", raw_key="secret-key-n8n-xyz"):
    db = _get_db()
    try:
        key_hash = hash_api_key(raw_key)
        api_key = ApiKey(name=name, key_hash=key_hash, is_active=True)
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        return raw_key
    finally:
        db.close()


def _seed_sample_data():
    db = _get_db()
    try:
        # Supplier
        supp = Supplier(nombre="Distribuidora Polar", telefono="04141234567")
        db.add(supp)
        db.commit()
        db.refresh(supp)

        # Role & User
        role = db.execute(select(Role).where(Role.nombre == "ADMINISTRADOR")).scalars().first()
        if not role:
            role = Role(nombre="ADMINISTRADOR")
            db.add(role)
            db.commit()
            db.refresh(role)

        user = User(
            username="cajero1",
            email="cajero1@test.com",
            hashed_password="hash",
            nombre_completo="Carlos Cajero",
            rol_id=role.id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Categories
        cat = db.execute(select(Category).where(Category.nombre == "LICORES")).scalars().first()
        if not cat:
            cat = Category(nombre="LICORES")
            db.add(cat)
            db.commit()
            db.refresh(cat)

        # Product
        prod = Product(
            nombre="Ron Cacique 750ml",
            codigo_barra="7591234567890",
            unidades_por_caja=12,
            stock_cajas=10,
            stock_unidades=2,
            stock_minimo=5,
            precio_costo_caja_usd=Decimal("60.00"),
            precio_costo_usd=Decimal("5.00"),
            precio_unidad_usd=Decimal("8.00"),
            precio_caja_usd=Decimal("90.00"),
            proveedor_id=supp.id,
            tipo_iva="GRAVADO",
        )
        prod.categories.append(cat)
        db.add(prod)
        db.commit()
        db.refresh(prod)

        # Exchange rate
        rate = ExchangeRate(
            tasa_usd=Decimal("45.0000"),
            tasa_eur=Decimal("50.0000"),
            fecha_registro=datetime.now(),
            registrado_por=user.id,
        )
        db.add(rate)
        db.commit()
        db.refresh(rate)

        # Payment Method
        pm = db.execute(select(PaymentMethod).where(PaymentMethod.nombre == "PAGO_MOVIL")).scalars().first()
        if not pm:
            pm = PaymentMethod(nombre="PAGO_MOVIL", activo=True)
            db.add(pm)
            db.commit()
            db.refresh(pm)

        # Sale
        sale = Sale(
            fecha_venta=datetime.now(),
            usuario_id=user.id,
            tasa_bcv_aplicada=Decimal("45.0000"),
            monto_exento_usd=Decimal("0.00"),
            base_imponible_usd=Decimal("8.00"),
            monto_iva_usd=Decimal("1.28"),
        )
        db.add(sale)
        db.commit()
        db.refresh(sale)

        item = SaleItem(
            venta_id=sale.id,
            producto_id=prod.id,
            tipo_empaque="UNIDAD",
            cantidad=1,
            unidades_descontadas=1,
            precio_unitario_usd=Decimal("8.00"),
            iva_porcentaje=Decimal("16.00"),
        )
        db.add(item)

        payment = SalePayment(
            venta_id=sale.id,
            metodo_pago_id=pm.id,
            monto_usd=Decimal("9.28"),
            monto_ves=Decimal("417.60"),
        )
        db.add(payment)
        db.commit()

        # Factura
        factura = Factura(
            proveedor_id=supp.id,
            numero_factura="FAC-999",
            fecha_factura=date.today(),
            fecha_limite_pago=date.today(),
            usuario_id=user.id,
            total_usd=Decimal("100.00"),
            total_bs=Decimal("4500.00"),
            estado_pago="PENDIENTE",
        )
        db.add(factura)
        db.commit()
        db.refresh(factura)

        det = DetalleFactura(
            factura_id=factura.id,
            producto_id=prod.id,
            tipo_empaque="CAJA",
            cantidad=2,
            costo_unitario_usd=Decimal("50.00"),
            costo_unitario_bs=Decimal("2250.00"),
        )
        db.add(det)
        db.commit()

        prod_id = prod.id
        sale_id = sale.id
        factura_id = factura.id
        return prod_id, sale_id, factura_id
    finally:
        db.close()


class TestN8nAgentAPI:
    def test_auth_unauthorized_without_key(self, client):
        res = client.get("/api/n8n/reports/daily")
        assert res.status_code == 401

    def test_daily_report(self, client):
        raw_key = _create_api_key()
        _seed_sample_data()

        res = client.get(
            "/api/n8n/reports/daily",
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        data = res.json()
        assert "summary" in data
        assert "sales_by_method" in data
        assert data["summary"]["transactions_count"] >= 1
        assert len(data["top_products"]) >= 1

    def test_weekly_report(self, client):
        raw_key = _create_api_key()
        _seed_sample_data()

        # Seed another sale on a known past date (e.g. 2026-09-18 which is a Friday)
        db = _get_db()
        try:
            user = db.execute(select(User)).scalars().first()
            rate = db.execute(select(ExchangeRate)).scalars().first()
            prod = db.execute(select(Product)).scalars().first()
            pm = db.execute(select(PaymentMethod)).scalars().first()

            past_sale = Sale(
                usuario_id=user.id,
                tasa_bcv_aplicada=rate.tasa_usd,
                monto_exento_usd=Decimal("0.00"),
                base_imponible_usd=Decimal("20.00"),
                monto_iva_usd=Decimal("3.20"),
                fecha_venta=datetime(2026, 9, 18, 14, 0, 0),
            )
            db.add(past_sale)
            db.commit()
            db.refresh(past_sale)

            si = SaleItem(
                venta_id=past_sale.id,
                producto_id=prod.id,
                tipo_empaque="UNIDAD",
                cantidad=2,
                unidades_descontadas=2,
                precio_unitario_usd=Decimal("10.00"),
                iva_porcentaje=Decimal("16.00"),
            )
            db.add(si)

            sp = SalePayment(
                venta_id=past_sale.id,
                metodo_pago_id=pm.id,
                monto_usd=Decimal("23.20"),
                monto_ves=Decimal("1044.00"),
            )
            db.add(sp)
            db.commit()
        finally:
            db.close()

        # Target Sunday 2026-09-20 -> Week is 2026-09-14 to 2026-09-19
        res = client.get(
            "/api/n8n/reports/weekly",
            params={"target_date": "2026-09-20"},
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["start_date"] == "2026-09-14"
        assert data["end_date"] == "2026-09-19"
        assert data["summary"]["transactions_count"] >= 1
        assert Decimal(data["summary"]["total_usd"]) > Decimal("0.00")
        assert data["best_day"] is not None
        assert data["best_day"]["day_name"] == "Viernes"
        assert "pending_invoices_summary" in data
        assert data["pending_invoices_summary"]["total_invoices_pending"] >= 1
        assert Decimal(data["pending_invoices_summary"]["total_pending_usd"]) > Decimal("0.00")

    def test_tools_products_search(self, client):
        raw_key = _create_api_key()
        prod_id, _, _ = _seed_sample_data()

        # Search by name
        res = client.get(
            "/api/n8n/tools/products/search",
            params={"q": "Cacique"},
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        items = res.json()
        assert len(items) >= 1
        assert "Ron Cacique" in items[0]["nombre"]

        # Search by low stock
        res_low = client.get(
            "/api/n8n/tools/products/search",
            params={"low_stock": True},
            headers={"X-API-Key": raw_key},
        )
        assert res_low.status_code == 200
        assert len(res_low.json()) >= 1

    def test_tools_product_sales_history(self, client):
        raw_key = _create_api_key()
        prod_id, _, _ = _seed_sample_data()

        res = client.get(
            f"/api/n8n/tools/products/{prod_id}/sales-history",
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_units_sold"] >= 1
        assert data["sales_count"] >= 1

    def test_tools_sales_metrics(self, client):
        raw_key = _create_api_key()
        _seed_sample_data()

        res = client.get(
            "/api/n8n/tools/sales/metrics",
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["transactions_count"] >= 1
        assert data["top_category"] == "LICORES"

    def test_tools_sales_peak_hours(self, client):
        raw_key = _create_api_key()
        _seed_sample_data()

        res = client.get(
            "/api/n8n/tools/sales/peak-hours",
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        items = res.json()
        assert len(items) >= 1
        assert items[0]["transactions_count"] >= 1

    def test_tools_sales_search(self, client):
        raw_key = _create_api_key()
        _seed_sample_data()

        res = client.get(
            "/api/n8n/tools/sales/search",
            params={"product_name": "Cacique"},
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        items = res.json()
        assert len(items) >= 1
        assert "POS" in items[0]["tipo"]

    def test_tools_invoices_search(self, client):
        raw_key = _create_api_key()
        _seed_sample_data()

        res = client.get(
            "/api/n8n/tools/invoices/search",
            params={
                "q": " ",
                "status": "PENDIENTE",
                "product_name": " ",
                "due_after": "2020-01-01",
                "due_before": "2030-12-31",
                "limit": 50,
            },
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        items = res.json()
        assert len(items) >= 1
        assert items[0]["numero_factura"] == "FAC-999"

    def test_tools_exchange_rate(self, client):
        raw_key = _create_api_key()
        _seed_sample_data()

        res = client.get(
            "/api/n8n/tools/system/exchange-rate",
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["tasa_usd"] == "45.0000"
        assert data["ultima_modificacion_por"] == "Carlos Cajero"

    def test_tools_exchange_rate_history(self, client):
        raw_key = _create_api_key()
        _seed_sample_data()

        res = client.get(
            "/api/n8n/tools/system/exchange-rate?history=true&limit=2",
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["tasa_usd"] == "45.0000"

    def test_tools_users(self, client):
        raw_key = _create_api_key()
        _seed_sample_data()

        res = client.get(
            "/api/n8n/tools/system/users",
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        users = res.json()
        assert any(u["username"] == "cajero1" for u in users)

    def test_tools_top_suppliers(self, client):
        raw_key = _create_api_key()
        _seed_sample_data()

        res = client.get(
            "/api/n8n/tools/system/top-suppliers",
            headers={"X-API-Key": raw_key},
        )
        assert res.status_code == 200
        suppliers = res.json()
        assert len(suppliers) >= 1
        assert suppliers[0]["supplier_name"] == "Distribuidora Polar"
