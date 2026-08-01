import json
from decimal import Decimal

_ADMIN = {"username": "admin", "email": "admin@test.com", "password": "admin123",
          "nombre_completo": "Admin", "rol_id": 1}


def _login(client, user=_ADMIN):
    client.post("/api/auth/register", json=user)


def _create_supplier(client):
    return client.post("/api/suppliers", json={"nombre": "Proveedor Test"})


def _create_product(client):
    return client.post("/api/products", json={
        "nombre": "Producto Test",
        "precio_costo_caja_usd": 120,
        "precio_unidad_usd": 25,
        "precio_caja_usd": 600,
        "stock_unidades": 100,
        "unidades_por_caja": 12,
        "categoria_ids": [1],
    })


def _invoice_payload(sup_id, prod_id, num, cajas=1, costo_usd=50, costo_bs=50):
    return {
        "proveedor_id": sup_id,
        "numero_factura": num,
        "moneda_principal": "USD",
        "tasa_bs": 1,
        "detalles": [{
            "producto_id": prod_id,
            "cantidad_cajas": cajas,
            "costo_caja_usd": costo_usd,
            "costo_caja_bs": costo_bs,
        }],
    }


class TestCreateInvoice:

    def test_create_as_admin(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()

        payload = _invoice_payload(sup["id"], prod["id"], "F-TEST-001", cajas=2, costo_usd=60, costo_bs=60)
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 201
        data = response.json()
        assert data["numero_factura"] == "F-TEST-001"
        assert data["proveedor_id"] == sup["id"]
        assert data["moneda_principal"] == "USD"
        assert data["tasa_bs"] == "1.00"
        assert data["total_usd"] == "120.00"
        assert data["total_bs"] == "120.00"
        assert len(data["detalles"]) == 1
        assert data["detalles"][0]["costo_caja_bs"] == "60.00"
        assert "supplier" in data

    def test_create_unauthenticated(self, client):
        payload = {
            "proveedor_id": 1,
            "numero_factura": "F-UNAUTH",
            "moneda_principal": "USD",
            "tasa_bs": 1,
            "detalles": [],
        }
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 401

    def test_create_duplicate(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        payload = _invoice_payload(sup["id"], prod["id"], "F-DUP")
        client.post("/api/invoices", data={"data": json.dumps(payload)})
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 409

    def test_create_product_not_found(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        payload = {
            "proveedor_id": sup["id"],
            "numero_factura": "F-NF",
            "moneda_principal": "USD",
            "tasa_bs": 1,
            "detalles": [{"producto_id": 999, "cantidad_cajas": 1, "costo_caja_usd": 50, "costo_caja_bs": 50}],
        }
        response = client.post("/api/invoices", data={"data": json.dumps(payload)})
        assert response.status_code == 404


class TestListInvoices:

    def test_list_empty(self, client):
        _login(client)
        response = client.get("/api/invoices")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_pagination(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        for i in range(3):
            client.post("/api/invoices", data={"data": json.dumps(
                _invoice_payload(sup["id"], prod["id"], f"F-{i:03d}")
            )})
        response = client.get("/api/invoices?page=1&page_size=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3

    def test_list_filter_proveedor(self, client):
        _login(client)
        sup1 = _create_supplier(client).json()
        sup2 = client.post("/api/suppliers", json={"nombre": "Otro"}).json()
        prod = _create_product(client).json()
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup1["id"], prod["id"], "F-A")
        )})
        client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup2["id"], prod["id"], "F-B")
        )})
        response = client.get(f"/api/invoices?proveedor_id={sup1['id']}")
        assert len(response.json()["items"]) == 1


class TestGetInvoice:

    def test_get_by_id(self, client):
        _login(client)
        sup = _create_supplier(client).json()
        prod = _create_product(client).json()
        created = client.post("/api/invoices", data={"data": json.dumps(
            _invoice_payload(sup["id"], prod["id"], "F-GET", cajas=2, costo_usd=55, costo_bs=55)
        )}).json()

        response = client.get(f"/api/invoices/{created['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created["id"]
        assert data["moneda_principal"] == "USD"
        assert data["total_usd"] == "110.00"
        assert data["total_bs"] == "110.00"
        assert data["supplier"]["nombre"] == "Proveedor Test"
        assert len(data["detalles"]) == 1
        assert data["detalles"][0]["product"]["nombre"] == "Producto Test"
        assert data["detalles"][0]["costo_caja_bs"] == "55.00"

    def test_get_by_id_not_found(self, client):
        _login(client)
        response = client.get("/api/invoices/999")
        assert response.status_code == 404
