from decimal import Decimal

import pytest


def _register_admin(client):
    client.post("/auth/register", json={
        "username": "admin",
        "email": "admin@test.com",
        "password": "admin123",
        "nombre_completo": "Admin",
        "rol_id": 1,
    })


def _register_operator(client):
    client.post("/auth/register", json={
        "username": "operator",
        "email": "op@test.com",
        "password": "op123",
        "nombre_completo": "Operator",
        "rol_id": 2,
    })


class TestCreateRate:
    def test_admin_creates_rate(self, client):
        _register_admin(client)
        response = client.post("/exchange-rates", json={
            "moneda": "USD",
            "tasa_ves": 90.50,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["moneda"] == "USD"
        assert data["tasa_ves"] == "90.5000"

    def test_operator_cannot_create(self, client):
        _register_operator(client)
        response = client.post("/exchange-rates", json={
            "moneda": "USD",
            "tasa_ves": 90.50,
        })
        assert response.status_code == 403

    def test_unauthenticated_cannot_create(self, client):
        response = client.post("/exchange-rates", json={
            "moneda": "USD",
            "tasa_ves": 90.50,
        })
        assert response.status_code == 401

    def test_create_rate_invalid_moneda(self, client):
        _register_admin(client)
        response = client.post("/exchange-rates", json={
            "moneda": "GBP",
            "tasa_ves": 90.50,
        })
        assert response.status_code == 422

    def test_create_rate_negative_tasa(self, client):
        _register_admin(client)
        response = client.post("/exchange-rates", json={
            "moneda": "USD",
            "tasa_ves": -1,
        })
        assert response.status_code == 422

    def test_create_rate_zero_tasa(self, client):
        _register_admin(client)
        response = client.post("/exchange-rates", json={
            "moneda": "USD",
            "tasa_ves": 0,
        })
        assert response.status_code == 422

    def test_create_rate_missing_body(self, client):
        _register_admin(client)
        response = client.post("/exchange-rates", data="", headers={"content-type": "text/plain"})
        assert response.status_code == 422

    def test_create_rate_empty_body(self, client):
        _register_admin(client)
        response = client.post("/exchange-rates", json={})
        assert response.status_code == 422


class TestLatestRate:
    def test_latest_rate_returns_most_recent(self, client):
        _register_admin(client)
        r1 = client.post("/exchange-rates", json={"moneda": "USD", "tasa_ves": 90.00})
        assert r1.status_code == 201
        r2 = client.post("/exchange-rates", json={"moneda": "USD", "tasa_ves": 91.50})
        assert r2.status_code == 201

        response = client.get("/exchange-rates/latest")
        assert response.status_code == 200
        data = response.json()
        assert Decimal(data["rates"]["USD"]) == Decimal("91.5000")

    def test_latest_rate_both_currencies(self, client):
        _register_admin(client)
        client.post("/exchange-rates", json={"moneda": "USD", "tasa_ves": 90.00})
        client.post("/exchange-rates", json={"moneda": "EUR", "tasa_ves": 100.00})

        response = client.get("/exchange-rates/latest")
        data = response.json()
        assert "USD" in data["rates"]
        assert "EUR" in data["rates"]
        assert Decimal(data["rates"]["USD"]) == Decimal("90.0000")
        assert Decimal(data["rates"]["EUR"]) == Decimal("100.0000")

    def test_latest_rate_empty(self, client):
        _register_admin(client)
        response = client.get("/exchange-rates/latest")
        assert response.status_code == 200
        data = response.json()
        assert data["rates"] == {}

    def test_latest_rate_unauthenticated(self, client):
        response = client.get("/exchange-rates/latest")
        assert response.status_code == 401


class TestRateHistory:
    def test_history_returns_all(self, client):
        _register_admin(client)
        client.post("/exchange-rates", json={"moneda": "USD", "tasa_ves": 90.00})
        client.post("/exchange-rates", json={"moneda": "EUR", "tasa_ves": 100.00})
        client.post("/exchange-rates", json={"moneda": "USD", "tasa_ves": 91.00})

        response = client.get("/exchange-rates/history")
        assert response.status_code == 200
        data = response.json()
        assert len(data["history"]) == 3

    def test_history_filter_by_moneda(self, client):
        _register_admin(client)
        client.post("/exchange-rates", json={"moneda": "USD", "tasa_ves": 90.00})
        client.post("/exchange-rates", json={"moneda": "EUR", "tasa_ves": 100.00})

        response = client.get("/exchange-rates/history?moneda=USD")
        data = response.json()
        assert len(data["history"]) == 1
        assert data["history"][0]["moneda"] == "USD"

    def test_history_invalid_moneda(self, client):
        _register_admin(client)
        response = client.get("/exchange-rates/history?moneda=GBP")
        assert response.status_code == 409

    def test_history_unauthenticated(self, client):
        response = client.get("/exchange-rates/history")
        assert response.status_code == 401
