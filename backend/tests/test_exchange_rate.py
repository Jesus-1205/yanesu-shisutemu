from decimal import Decimal

import pytest


def _register_admin(client):
    client.post("/api/auth/register", json={
        "username": "admin",
        "email": "admin@test.com",
        "password": "admin123",
        "nombre_completo": "Admin",
        "rol_id": 1,
    })


def _register_operator(client):
    client.post("/api/auth/register", json={
        "username": "operator",
        "email": "op@test.com",
        "password": "op123",
        "nombre_completo": "Operator",
        "rol_id": 2,
    })


class TestSaveRates:
    def test_admin_save_rates(self, client):
        _register_admin(client)
        response = client.post("/api/exchange-rates/save-rates", json={
            "usd": 90.50,
            "eur": 98.00,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["tasa_usd"] == "90.5000"
        assert data["tasa_eur"] == "98.0000"
        assert "id" in data
        assert "fecha_registro" in data

    def test_operator_can_save(self, client):
        _register_operator(client)
        response = client.post("/api/exchange-rates/save-rates", json={
            "usd": 90.50,
            "eur": 98.00,
        })
        assert response.status_code == 201

    def test_unauthenticated_cannot_save(self, client):
        response = client.post("/api/exchange-rates/save-rates", json={
            "usd": 90.50,
            "eur": 98.00,
        })
        assert response.status_code == 401

    def test_save_rates_negative_usd(self, client):
        _register_admin(client)
        response = client.post("/api/exchange-rates/save-rates", json={
            "usd": -1,
            "eur": 98.00,
        })
        assert response.status_code == 422

    def test_save_rates_zero_eur(self, client):
        _register_admin(client)
        response = client.post("/api/exchange-rates/save-rates", json={
            "usd": 90.50,
            "eur": 0,
        })
        assert response.status_code == 422

    def test_save_rates_empty_body(self, client):
        _register_admin(client)
        response = client.post("/api/exchange-rates/save-rates", json={})
        assert response.status_code == 422


class TestLatestRate:
    def test_latest_rate_returns_most_recent(self, client):
        _register_admin(client)
        r1 = client.post("/api/exchange-rates/save-rates", json={"usd": 90.00, "eur": 97.00})
        assert r1.status_code == 201
        r2 = client.post("/api/exchange-rates/save-rates", json={"usd": 91.50, "eur": 98.50})
        assert r2.status_code == 201

        response = client.get("/api/exchange-rates/latest")
        assert response.status_code == 200
        data = response.json()
        assert Decimal(data["rates"]["USD"]) == Decimal("91.5000")
        assert Decimal(data["rates"]["EUR"]) == Decimal("98.5000")

    def test_latest_rate_empty(self, client):
        _register_admin(client)
        response = client.get("/api/exchange-rates/latest")
        assert response.status_code == 200
        data = response.json()
        assert data["rates"] == {}

    def test_latest_rate_unauthenticated(self, client):
        response = client.get("/api/exchange-rates/latest")
        assert response.status_code == 401


class TestRateHistory:
    def test_history_returns_all(self, client):
        _register_admin(client)
        client.post("/api/exchange-rates/save-rates", json={"usd": 90.00, "eur": 97.00})
        client.post("/api/exchange-rates/save-rates", json={"usd": 91.00, "eur": 98.00})

        response = client.get("/api/exchange-rates/history")
        assert response.status_code == 200
        data = response.json()
        assert len(data["history"]) == 2
        assert data["history"][0]["tasa_usd"] == "91.0000"
        assert data["history"][0]["tasa_eur"] == "98.0000"

    def test_history_unauthenticated(self, client):
        response = client.get("/api/exchange-rates/history")
        assert response.status_code == 401

    def test_history_paginated(self, client):
        _register_admin(client)
        for i in range(5):
            client.post("/api/exchange-rates/save-rates", json={"usd": 90.00 + i, "eur": 97.00 + i})

        response = client.get("/api/exchange-rates/history?page=1&page_size=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["pages"] == 3

    def test_history_by_days_returns_recent(self, client):
        _register_admin(client)
        for i in range(3):
            client.post("/api/exchange-rates/save-rates", json={"usd": 90.00 + i, "eur": 97.00 + i})

        response = client.get("/api/exchange-rates/history?days=30")
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert len(data["history"]) == 3
        assert data["history"][0]["tasa_usd"] == "92.0000"

    def test_history_by_days_zero_returns_all(self, client):
        _register_admin(client)
        client.post("/api/exchange-rates/save-rates", json={"usd": 90.00, "eur": 97.00})

        response = client.get("/api/exchange-rates/history?days=0")
        assert response.status_code == 200
        data = response.json()
        assert len(data["history"]) == 1
