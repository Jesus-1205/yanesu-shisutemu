import pytest
from datetime import datetime, timezone
from decimal import Decimal
from app.models.sale import Sale
from app.services.sale_service import get_sales_paginated


def test_get_sales_paginated_returns_aggregate_totals(db_session, test_user):
    # Crear 3 ventas de prueba
    v1 = Sale(
        usuario_id=test_user.id,
        tasa_bcv_aplicada=Decimal("50.00"),
        monto_exento_usd=Decimal("10.00"),
        base_imponible_usd=Decimal("0.00"),
        monto_iva_usd=Decimal("0.00"),
        fecha_venta=datetime.now(timezone.utc),
    )
    v2 = Sale(
        usuario_id=test_user.id,
        tasa_bcv_aplicada=Decimal("50.00"),
        monto_exento_usd=Decimal("20.00"),
        base_imponible_usd=Decimal("0.00"),
        monto_iva_usd=Decimal("0.00"),
        fecha_venta=datetime.now(timezone.utc),
    )
    v3 = Sale(
        usuario_id=test_user.id,
        tasa_bcv_aplicada=Decimal("50.00"),
        monto_exento_usd=Decimal("30.00"),
        base_imponible_usd=Decimal("0.00"),
        monto_iva_usd=Decimal("0.00"),
        fecha_venta=datetime.now(timezone.utc),
    )
    db_session.add_all([v1, v2, v3])
    db_session.commit()

    # Pedir página 1 con page_size=2 (para simular paginación parcial)
    res = get_sales_paginated(db_session, page=1, page_size=2)

    assert res["total"] == 3
    assert len(res["items"]) == 2
    assert "total_usd" in res
    assert "total_ves" in res
    assert res["total_usd"] == Decimal("60.00")
    assert res["total_ves"] == Decimal("3000.00")


def test_get_sales_paginated_api_endpoint_returns_aggregate_totals(client):
    # Registrar admin
    client.post("/api/auth/register", json={
        "username": "kpi_tester",
        "email": "kpi@test.com",
        "password": "password123",
        "nombre_completo": "KPI Tester",
        "rol_id": 1,
    })

    # Crear producto exento o con IVA
    prod_resp = client.post("/api/products", json={
        "nombre": "Cerveza Polar",
        "precio_costo_caja_usd": 10,
        "precio_unidad_usd": 2,
        "precio_caja_usd": 20,
        "stock_unidades": 50,
        "unidades_por_caja": 10,
    })
    prod_id = prod_resp.json()["id"]

    # Crear 2 ventas vía endpoint: base=20, iva=3.20 -> total=23.20 cada una
    for _ in range(2):
        res = client.post("/api/sales", json={
            "tasa_bcv_aplicada": 50,
            "monto_exento_usd": 0,
            "base_imponible_usd": 20,
            "monto_iva_usd": 3.20,
            "items": [{
                "producto_id": prod_id,
                "tipo_empaque": "UNIDAD",
                "cantidad": 10,
                "unidades_descontadas": 10,
                "precio_unitario_usd": 2,
            }],
            "pagos": [{"metodo_pago_id": 1, "monto_usd": 23.20, "monto_ves": 0}],
        })
        assert res.status_code == 201

    resp = client.get("/api/sales?page=1&page_size=1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 1
    assert "total_usd" in data
    assert "total_ves" in data
    assert Decimal(str(data["total_usd"])) == Decimal("46.40")
    assert Decimal(str(data["total_ves"])) == Decimal("2320.00")
