import pytest


def test_value_error_returns_400(client, db_session):
    resp = client.post(
        "/api/auth/login",
        json={"username": "test", "password": "test"},
    )
    assert resp.status_code == 401


def test_404_returns_404(client, db_session):
    resp = client.get("/api/nonexistent-endpoint-12345")
    assert resp.status_code in (404, 405)


def test_ensure_logging_adds_handler():
    import logging
    root = logging.getLogger()
    saved = root.handlers[:]
    root.handlers.clear()

    try:
        from app.core.logging_setup import ensure_logging
        ensure_logging()

        file_handlers = [h for h in root.handlers if isinstance(h, logging.handlers.RotatingFileHandler)]
        assert len(file_handlers) == 1
        assert "sistema.log" in file_handlers[0].baseFilename
    finally:
        root.handlers.clear()
        for h in saved:
            root.addHandler(h)
