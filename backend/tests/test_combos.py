from decimal import Decimal

_ADMIN = {"username": "admin", "email": "admin@test.com", "password": "admin123",
          "nombre_completo": "Admin", "rol_id": 1}
_PRODUCT = {"nombre": "Producto Test",
            "precio_costo_caja_usd": 120, "precio_unidad_usd": 25,
            "precio_caja_usd": 600, "stock_unidades": 100, "unidades_por_caja": 12}


def _login(client, user):
    client.post("/api/auth/register", json=user)


def _create_product(client, nombre="Producto Test"):
    payload = dict(_PRODUCT)
    payload["nombre"] = nombre
    return client.post("/api/products", json=payload)


def _get_payment_methods(client):
    return client.get("/api/payment-methods?solo_activos=true").json()


def _create_combo(client, product_id, method_id):
    return client.post("/api/combos", json={
        "nombre": "8 Latas Mix x $5",
        "descripcion": "Combo de prueba",
        "precio_total_usd": 5.00,
        "grupos": [{
            "nombre": "Latas",
            "min_cantidad": 8,
            "max_cantidad": 8,
            "productos": [{"producto_id": product_id}],
        }],
        "metodo_pago_ids": [method_id],
    })


class TestComboSerialization:

    def test_list_returns_product_names_and_payment_ids(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        resp = _create_combo(client, prod["id"], methods[0]["id"])
        assert resp.status_code == 201
        combo = resp.json()

        assert combo["metodo_pago_ids"] == [methods[0]["id"]]
        assert combo["groups"][0]["products"][0]["producto_id"] == prod["id"]
        assert combo["groups"][0]["products"][0]["producto_nombre"] == "Producto Test"

        listed = client.get("/api/combos").json()
        listed_combo = next(c for c in listed if c["id"] == combo["id"])
        assert listed_combo["metodo_pago_ids"] == [methods[0]["id"]]
        assert listed_combo["groups"][0]["products"][0]["producto_nombre"] == "Producto Test"

    def test_edit_roundtrip_preserves_names(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        combo = _create_combo(client, prod["id"], methods[0]["id"]).json()

        resp = client.put(f"/api/combos/{combo['id']}", json={
            "nombre": "Combo Actualizado",
            "precio_total_usd": 6.50,
            "grupos": [{
                "nombre": g["nombre"],
                "min_cantidad": g["min_cantidad"],
                "max_cantidad": g["max_cantidad"],
                "productos": [{"producto_id": p["producto_id"]} for p in g["products"]],
            } for g in combo["groups"]],
            "metodo_pago_ids": [methods[0]["id"]],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["groups"][0]["products"][0]["producto_nombre"] == "Producto Test"
        assert Decimal(str(data["precio_total_usd"])) == Decimal("6.50")


class TestComboEndpoints:

    def test_get_by_id(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        combo = _create_combo(client, prod["id"], methods[0]["id"]).json()
        resp = client.get(f"/api/combos/{combo['id']}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == combo["id"]
        assert data["nombre"] == "8 Latas Mix x $5"
        assert len(data["groups"]) == 1
        assert len(data["metodo_pago_ids"]) == 1

    def test_get_by_id_not_found(self, client):
        _login(client, _ADMIN)
        resp = client.get("/api/combos/999")
        assert resp.status_code == 404

    def test_get_by_id_operator_forbidden(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        combo = _create_combo(client, prod["id"], methods[0]["id"]).json()
        client.post("/api/auth/register", json={
            "username": "oper", "email": "oper@test.com", "password": "oper123",
            "nombre_completo": "Oper", "rol_id": 2,
        })
        resp = client.get(f"/api/combos/{combo['id']}")
        assert resp.status_code == 403

    def test_create_success(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        resp = _create_combo(client, prod["id"], methods[0]["id"])
        assert resp.status_code == 201
        data = resp.json()
        assert data["nombre"] == "8 Latas Mix x $5"
        assert Decimal(str(data["precio_total_usd"])) == Decimal("5.00")
        assert data["activo"] is True

    def test_create_unauthenticated(self, client):
        resp = client.post("/api/combos", json={"nombre": "X"})
        assert resp.status_code == 401

    def test_update_success(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        combo = _create_combo(client, prod["id"], methods[0]["id"]).json()
        resp = client.put(f"/api/combos/{combo['id']}", json={
            "nombre": "Combo Updated",
            "precio_total_usd": 7.50,
            "grupos": [{
                "nombre": "G",
                "min_cantidad": 1,
                "max_cantidad": 5,
                "productos": [{"producto_id": prod["id"]}],
            }],
            "metodo_pago_ids": [methods[0]["id"]],
        })
        assert resp.status_code == 200
        assert resp.json()["nombre"] == "Combo Updated"
        assert Decimal(str(resp.json()["precio_total_usd"])) == Decimal("7.50")

    def test_update_not_found(self, client):
        _login(client, _ADMIN)
        resp = client.put("/api/combos/999", json={"nombre": "X"})
        assert resp.status_code == 404

    def test_delete_success(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        combo = _create_combo(client, prod["id"], methods[0]["id"]).json()
        resp = client.delete(f"/api/combos/{combo['id']}")
        assert resp.status_code == 200
        assert resp.json()["detail"] == "Combo eliminado"
        assert client.get(f"/api/combos/{combo['id']}").status_code == 404

    def test_delete_not_found(self, client):
        _login(client, _ADMIN)
        resp = client.delete("/api/combos/999")
        assert resp.status_code == 404

    def test_list_empty(self, client):
        _login(client, _ADMIN)
        resp = client.get("/api/combos")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_returns_all(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        _create_combo(client, prod["id"], methods[0]["id"])
        _create_combo(client, prod["id"], methods[0]["id"])
        resp = client.get("/api/combos")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_active_combos_returns_only_active(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        combo = _create_combo(client, prod["id"], methods[0]["id"]).json()
        client.put(f"/api/combos/{combo['id']}", json={
            "activo": False,
            "grupos": [{
                "nombre": "G",
                "min_cantidad": 1,
                "max_cantidad": 5,
                "productos": [{"producto_id": prod["id"]}],
            }],
            "metodo_pago_ids": [methods[0]["id"]],
        })
        resp = client.get("/api/combos/active")
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    def test_active_combos_returns_active(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        _create_combo(client, prod["id"], methods[0]["id"])
        resp = client.get("/api/combos/active")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_list_unauthenticated(self, client):
        resp = client.get("/api/combos")
        assert resp.status_code == 401

    def test_list_as_operator_allowed(self, client):
        client.post("/api/auth/register", json={
            "username": "oper", "email": "oper@test.com", "password": "oper123",
            "nombre_completo": "Oper", "rol_id": 2,
        })
        resp = client.get("/api/combos")
        assert resp.status_code == 200

    def test_create_operator_forbidden(self, client):
        client.post("/api/auth/register", json={
            "username": "oper", "email": "oper@test.com", "password": "oper123",
            "nombre_completo": "Oper", "rol_id": 2,
        })
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        resp = _create_combo(client, prod["id"], methods[0]["id"])
        assert resp.status_code == 403


class TestPriceRuleSerialization:

    def test_list_returns_product_names(self, client):
        _login(client, _ADMIN)
        prod = _create_product(client).json()
        methods = _get_payment_methods(client)
        resp = client.post("/api/price-rules", json={
            "nombre": "Divisas Cerveza",
            "descripcion": "Regla de prueba",
            "productos": [{
                "producto_id": prod["id"],
                "tipo_empaque": "UNIDAD",
                "precio_usd": 2.5,
            }],
            "metodo_pago_ids": [methods[0]["id"]],
        })
        assert resp.status_code == 201
        rule = resp.json()

        listed = client.get("/api/price-rules").json()
        listed_rule = next(r for r in listed if r["id"] == rule["id"])
        assert listed_rule["products"][0]["producto_nombre"] == "Producto Test"

    def test_update_roundtrip(self, client):
        _login(client, _ADMIN)
        prod1 = _create_product(client, "Cerveza A").json()
        prod2 = _create_product(client, "Cerveza B").json()
        methods = _get_payment_methods(client)
        rule = client.post("/api/price-rules", json={
            "nombre": "Divisas Cerveza",
            "productos": [{
                "producto_id": prod1["id"],
                "tipo_empaque": "UNIDAD",
                "precio_usd": 2.5,
            }],
            "metodo_pago_ids": [methods[0]["id"]],
        }).json()

        resp = client.put(f"/api/price-rules/{rule['id']}", json={
            "nombre": "Regla Actualizada",
            "productos": [
                {
                    "producto_id": prod1["id"],
                    "tipo_empaque": "UNIDAD",
                    "precio_usd": 3.0,
                },
                {
                    "producto_id": prod2["id"],
                    "tipo_empaque": "CAJA",
                    "precio_usd": 30.0,
                },
            ],
            "metodo_pago_ids": [methods[0]["id"], methods[1]["id"]],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["nombre"] == "Regla Actualizada"
        names = {p["producto_nombre"] for p in data["products"]}
        assert names == {"Cerveza A", "Cerveza B"}
