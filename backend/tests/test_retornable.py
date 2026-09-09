"""Tests de integracion para los endpoints de retornables."""
import pytest


# --- helpers ---

_ADMIN = {
    "username": "admin",
    "email": "admin@test.com",
    "password": "admin123",
    "nombre_completo": "Admin",
    "rol_id": 1,
}
_OPERATOR = {
    "username": "op",
    "email": "op@test.com",
    "password": "op123",
    "nombre_completo": "Op",
    "rol_id": 2,
}
_PRODUCT = {
    "nombre": "Polar 222ml",
    "precio_costo_caja_usd": 10,
    "precio_costo_usd": 0.30,
    "precio_unidad_usd": 0.50,
    "precio_caja_usd": 18,
}
_PRODUCT_333 = {
    "nombre": "Polar 333ml",
    "precio_costo_caja_usd": 12,
    "precio_costo_usd": 0.50,
    "precio_unidad_usd": 0.70,
    "precio_caja_usd": 16.80,
}


def _login(client, user):
    client.post("/api/auth/register", json=user)


def _crear_producto(client):
    resp = client.post("/api/products", json=_PRODUCT)
    return resp.json()["id"]


def _crear_producto_333(client):
    resp = client.post("/api/products", json=_PRODUCT_333)
    return resp.json()["id"]


def _detalles_base():
    return [
        {"presentacion": "222", "estado": "CASILLERO", "cantidad_botellas": 0, "cantidad_cajas": 5},
        {"presentacion": "222", "estado": "VACIO", "cantidad_botellas": 100, "cantidad_cajas": 2},
        {"presentacion": "222", "estado": "LLENO", "cantidad_botellas": 200, "cantidad_cajas": 5},
        {"presentacion": "333", "estado": "CASILLERO", "cantidad_botellas": 0, "cantidad_cajas": 3},
        {"presentacion": "333", "estado": "VACIO", "cantidad_botellas": 50, "cantidad_cajas": 2},
        {"presentacion": "333", "estado": "LLENO", "cantidad_botellas": 100, "cantidad_cajas": 4},
    ]


def _crear_reporte(client):
    return client.post("/api/retornable/reportes", json={
        "realizado_por": "Test User",
        "observaciones": "Test report",
        "detalles": _detalles_base(),
    })


# ===========================================================================
# GET /retornable/resumen
# ===========================================================================


class TestGetResumen:
    def test_200_ok(self, client):
        _login(client, _ADMIN)
        resp = client.get("/api/retornable/resumen")
        assert resp.status_code == 200
        data = resp.json()
        assert "presentaciones" in data
        assert len(data["presentaciones"]) == 2

    def test_401_sin_auth(self, client):
        resp = client.get("/api/retornable/resumen")
        assert resp.status_code == 401

    def test_403_sin_rol_admin(self, client):
        _login(client, _OPERATOR)
        resp = client.get("/api/retornable/resumen")
        assert resp.status_code == 403


# ===========================================================================
# POST /retornable/reportes
# ===========================================================================


class TestCrearReporte:
    def test_201_crear(self, client):
        _login(client, _ADMIN)
        resp = _crear_reporte(client)
        assert resp.status_code == 201
        data = resp.json()
        assert data["total"] >= 1

    def test_422_body_invalido_menos_detalles(self, client):
        _login(client, _ADMIN)
        resp = client.post("/api/retornable/reportes", json={
            "realizado_por": "Test",
            "detalles": [{"presentacion": "222", "estado": "LLENO", "cantidad_botellas": 10, "cantidad_cajas": 1}],
        })
        assert resp.status_code == 422

    def test_422_body_invalido_mas_detalles(self, client):
        _login(client, _ADMIN)
        detalles = _detalles_base() + [
            {"presentacion": "222", "estado": "LLENO", "cantidad_botellas": 10, "cantidad_cajas": 1}
        ]
        resp = client.post("/api/retornable/reportes", json={
            "realizado_por": "Test",
            "detalles": detalles,
        })
        assert resp.status_code == 422

    def test_401_sin_auth(self, client):
        resp = _crear_reporte(client)
        assert resp.status_code == 401

    def test_403_sin_rol_admin(self, client):
        _login(client, _OPERATOR)
        resp = _crear_reporte(client)
        assert resp.status_code == 403


# ===========================================================================
# PUT /retornable/reportes/{id}/confirmar
# ===========================================================================


class TestConfirmarReporte:
    def test_200_confirmar(self, client):
        _login(client, _ADMIN)
        _crear_reporte(client)
        resp = client.put("/api/retornable/reportes/1/confirmar")
        assert resp.status_code == 200

    def test_404_no_existe(self, client):
        _login(client, _ADMIN)
        resp = client.put("/api/retornable/reportes/999/confirmar")
        assert resp.status_code == 404

    def test_401_sin_auth(self, client):
        resp = client.put("/api/retornable/reportes/1/confirmar")
        assert resp.status_code == 401

    def test_403_sin_rol_admin(self, client):
        _login(client, _OPERATOR)
        resp = client.put("/api/retornable/reportes/1/confirmar")
        assert resp.status_code == 403


# ===========================================================================
# GET /retornable/reportes
# ===========================================================================


class TestListarReportes:
    def test_200_listar(self, client):
        _login(client, _ADMIN)
        _crear_reporte(client)
        resp = client.get("/api/retornable/reportes")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1

    def test_200_con_paginacion(self, client):
        _login(client, _ADMIN)
        for _ in range(3):
            _crear_reporte(client)
        resp = client.get("/api/retornable/reportes?page=1&page_size=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3

    def test_401_sin_auth(self, client):
        resp = client.get("/api/retornable/reportes")
        assert resp.status_code == 401


# ===========================================================================
# GET /retornable/reportes/{id}
# ===========================================================================


class TestGetDetalleReporte:
    def test_200_detalle(self, client):
        _login(client, _ADMIN)
        _crear_reporte(client)
        resp = client.get("/api/retornable/reportes/1")
        assert resp.status_code == 200
        data = resp.json()
        assert "reporte" in data
        assert "detalles" in data
        assert len(data["detalles"]) == 6

    def test_404_no_existe(self, client):
        _login(client, _ADMIN)
        resp = client.get("/api/retornable/reportes/999")
        assert resp.status_code == 404

    def test_401_sin_auth(self, client):
        resp = client.get("/api/retornable/reportes/1")
        assert resp.status_code == 401


# ===========================================================================
# GET /retornable/historico
# ===========================================================================


class TestListarMovimientos:
    def test_200_listar(self, client):
        _login(client, _ADMIN)
        resp = client.get("/api/retornable/historico")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_200_con_filtros(self, client):
        _login(client, _ADMIN)
        resp = client.get("/api/retornable/historico?presentacion=222&tipo_movimiento=VENTA")
        assert resp.status_code == 200

    def test_401_sin_auth(self, client):
        resp = client.get("/api/retornable/historico")
        assert resp.status_code == 401


# ===========================================================================
# GET /retornable/productos
# ===========================================================================


class TestGetProductos:
    def test_200_listar(self, client):
        _login(client, _ADMIN)
        resp = client.get("/api/retornable/productos")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_401_sin_auth(self, client):
        resp = client.get("/api/retornable/productos")
        assert resp.status_code == 401


# ===========================================================================
# POST /retornable/productos
# ===========================================================================


class TestAsociarProducto:
    def test_201_asociar(self, client):
        _login(client, _ADMIN)
        prod_id = _crear_producto(client)
        resp = client.post("/api/retornable/productos", json={
            "producto_id": prod_id,
            "presentacion": "222",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data

    def test_409_duplicado(self, client):
        _login(client, _ADMIN)
        prod_id = _crear_producto(client)
        client.post("/api/retornable/productos", json={
            "producto_id": prod_id,
            "presentacion": "222",
        })
        resp = client.post("/api/retornable/productos", json={
            "producto_id": prod_id,
            "presentacion": "333",
        })
        assert resp.status_code == 409

    def test_404_producto_no_existe(self, client):
        _login(client, _ADMIN)
        resp = client.post("/api/retornable/productos", json={
            "producto_id": 9999,
            "presentacion": "222",
        })
        assert resp.status_code == 404

    def test_401_sin_auth(self, client):
        resp = client.post("/api/retornable/productos", json={
            "producto_id": 1,
            "presentacion": "222",
        })
        assert resp.status_code == 401

    def test_403_sin_rol_admin(self, client):
        _login(client, _OPERATOR)
        resp = client.post("/api/retornable/productos", json={
            "producto_id": 1,
            "presentacion": "222",
        })
        assert resp.status_code == 403


# ===========================================================================
# DELETE /retornable/productos/{id}
# ===========================================================================


class TestDesasociarProducto:
    def test_204_eliminar(self, client):
        _login(client, _ADMIN)
        prod_id = _crear_producto(client)
        asoc_resp = client.post("/api/retornable/productos", json={
            "producto_id": prod_id,
            "presentacion": "222",
        })
        asoc_id = asoc_resp.json()["id"]
        resp = client.delete(f"/api/retornable/productos/{asoc_id}")
        assert resp.status_code == 204

    def test_404_no_existe(self, client):
        _login(client, _ADMIN)
        resp = client.delete("/api/retornable/productos/9999")
        assert resp.status_code == 404

    def test_401_sin_auth(self, client):
        resp = client.delete("/api/retornable/productos/1")
        assert resp.status_code == 401


# ===========================================================================
# GET /retornable/comparacion
# ===========================================================================


class TestGetComparacion:
    def test_200_comparar(self, client):
        _login(client, _ADMIN)
        resp = client.get("/api/retornable/comparacion")
        assert resp.status_code == 200
        data = resp.json()
        assert "lineas_sistema" in data
        assert "lineas_anterior" in data
        assert len(data["lineas_sistema"]) == 6

    def test_200_con_reportes(self, client):
        _login(client, _ADMIN)
        _crear_reporte(client)
        _crear_reporte(client)
        resp = client.get("/api/retornable/comparacion")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ultimo_reporte"] is not None
        assert data["reporte_anterior"] is not None

    def test_401_sin_auth(self, client):
        resp = client.get("/api/retornable/comparacion")
        assert resp.status_code == 401
