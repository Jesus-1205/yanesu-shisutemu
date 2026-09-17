import app.core.database as db_module
from app.core.dependencies import hash_api_key
from app.main import app
from app.models.api_key import ApiKey


def _get_db():
    return next(app.dependency_overrides[db_module.get_db]())


def _create_api_key(name="n8n-agent", raw_key="test-secret-key-12345", is_active=True):
    db = _get_db()
    try:
        key_hash = hash_api_key(raw_key)
        api_key = ApiKey(name=name, key_hash=key_hash, is_active=is_active)
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        return api_key, raw_key
    finally:
        db.close()


class TestWebhookBcvSync:
    def test_sync_bcv_rate_success(self, client):
        api_key, raw_key = _create_api_key()
        response = client.post(
            "/api/webhooks/bcv-sync",
            headers={"X-API-Key": raw_key},
            json={"usd": 45.1234, "eur": 49.5678},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["tasa_usd"] == "45.1234"
        assert data["tasa_eur"] == "49.5678"
        assert data["registrado_por_nombre"] == "Automático"

    def test_sync_bcv_rate_idempotent_returns_200(self, client):
        api_key, raw_key = _create_api_key()
        # First call creates the rate
        res1 = client.post(
            "/api/webhooks/bcv-sync",
            headers={"X-API-Key": raw_key},
            json={"usd": 45.1234, "eur": 49.5678},
        )
        assert res1.status_code == 201
        rate_id = res1.json()["id"]

        # Second call with same rates returns 200 without duplicate insert
        res2 = client.post(
            "/api/webhooks/bcv-sync",
            headers={"X-API-Key": raw_key},
            json={"usd": 45.1234, "eur": 49.5678},
        )
        assert res2.status_code == 200
        assert res2.json()["id"] == rate_id

    def test_sync_bcv_rate_without_header_returns_401(self, client):
        response = client.post(
            "/api/webhooks/bcv-sync",
            json={"usd": 45.1234, "eur": 49.5678},
        )
        assert response.status_code == 401
        assert "Header X-API-Key no proporcionado" in response.json()["detail"]

    def test_sync_bcv_rate_with_invalid_key_returns_401(self, client):
        response = client.post(
            "/api/webhooks/bcv-sync",
            headers={"X-API-Key": "invalid-wrong-key"},
            json={"usd": 45.1234, "eur": 49.5678},
        )
        assert response.status_code == 401
        assert "API Key inválida o inactiva" in response.json()["detail"]

    def test_sync_bcv_rate_with_inactive_key_returns_401(self, client):
        _, raw_key = _create_api_key(is_active=False)
        response = client.post(
            "/api/webhooks/bcv-sync",
            headers={"X-API-Key": raw_key},
            json={"usd": 45.1234, "eur": 49.5678},
        )
        assert response.status_code == 401
        assert "API Key inválida o inactiva" in response.json()["detail"]

    def test_sync_bcv_rate_supports_many_decimals_and_large_numbers(self, client):
        api_key, raw_key = _create_api_key()
        response = client.post(
            "/api/webhooks/bcv-sync",
            headers={"X-API-Key": raw_key},
            json={"usd": 848.54580000, "eur": 974.41908397},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["tasa_usd"] == "848.5458"
        assert data["tasa_eur"] == "974.4191"

    def test_sync_bcv_rate_invalid_body_returns_422(self, client):
        _, raw_key = _create_api_key()
        response = client.post(
            "/api/webhooks/bcv-sync",
            headers={"X-API-Key": raw_key},
            json={"usd": -5, "eur": 0},
        )
        assert response.status_code == 422
