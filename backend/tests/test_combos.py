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
