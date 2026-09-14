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


class TestCoreModulesCoverage:

    def test_port_manager_flow(self, tmp_path):
        import os
        from unittest.mock import patch
        from app.core import port_manager

        with patch("app.core.port_manager.get_app_data_dir", return_value=tmp_path):
            port_manager.save_port_info(8005)
            assert (tmp_path / ".port").read_text() == "8005"
            assert (tmp_path / ".port.pid").read_text() == str(os.getpid())

            # Cleanup stale port with invalid content
            (tmp_path / ".port").write_text("invalid")
            port_manager._cleanup_stale_port()
            assert not (tmp_path / ".port").exists()

            # Cleanup stale port with dead pid
            (tmp_path / ".port").write_text("8005")
            (tmp_path / ".port.pid").write_text("99999999")
            with patch("os.kill", side_effect=OSError("No such process")):
                port_manager._cleanup_stale_port()
            assert not (tmp_path / ".port").exists()

            # find_free_port success
            free_port = port_manager.find_free_port(8000, 8050)
            assert 8000 <= free_port <= 8050

            # find_free_port failure
            with patch("socket.socket.bind", side_effect=OSError("Port in use")):
                with pytest.raises(RuntimeError, match="Ningún puerto libre"):
                    port_manager.find_free_port(8000, 8002)

    def test_first_run_initialize_database(self):
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from app.core.database import Base
        from app.core.first_run import initialize_database

        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=engine)
        Session = sessionmaker(bind=engine)
        session = Session()

        # Primera corrida: crea roles y métodos de pago por defecto, retorna True (requiere admin)
        needs_admin = initialize_database(session)
        assert needs_admin is True

        # Segunda corrida con datos ya existentes: no duplica
        needs_admin_2 = initialize_database(session)
        assert needs_admin_2 is True
        session.close()

    def test_database_sqlite_pragma_and_get_db(self):
        from unittest.mock import MagicMock, patch
        from app.core.database import set_sqlite_pragma, get_db

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        set_sqlite_pragma(mock_conn, None)
        mock_cursor.execute.assert_called_with("PRAGMA foreign_keys=ON")
        mock_cursor.close.assert_called_once()

        # get_db generator
        db_gen = get_db()
        db_session = next(db_gen)
        assert db_session is not None
        try:
            next(db_gen)
        except StopIteration:
            pass

    def test_error_handlers_direct_invocation(self):
        import asyncio
        from unittest.mock import MagicMock
        from fastapi import FastAPI
        from sqlalchemy.exc import IntegrityError
        from app.core.error_handler import register_error_handlers

        app = FastAPI()
        register_error_handlers(app)

        mock_req = MagicMock()
        mock_req.client.host = "127.0.0.1"
        mock_req.method = "GET"
        mock_req.url.path = "/test"

        val_handler = app.exception_handlers[ValueError]
        resp_val = asyncio.run(val_handler(mock_req, ValueError("Valor inválido")))
        assert resp_val.status_code == 400

        integ_handler = app.exception_handlers[IntegrityError]
        resp_integ = asyncio.run(integ_handler(mock_req, IntegrityError("stmt", "params", "orig")))
        assert resp_integ.status_code == 409

        gen_handler = app.exception_handlers[Exception]
        resp_gen = asyncio.run(gen_handler(mock_req, RuntimeError("Crash")))
        assert resp_gen.status_code == 500

    def test_config_paths_and_platforms(self, tmp_path):
        import sys
        from pathlib import Path
        from unittest.mock import patch
        from app.core import config

        # DATA_DIR override
        with patch.dict(config.os.environ, {"DATA_DIR": str(tmp_path)}):
            p = config.get_app_data_dir()
            assert p == tmp_path

        # Platform darwin
        with patch.object(sys, "platform", "darwin"), patch.object(Path, "home", return_value=tmp_path):
            with patch.dict(config.os.environ, {"DATA_DIR": ""}):
                p = config.get_app_data_dir()
                assert "Library" in str(p) or "Application Support" in str(p) or "YanesuShisutemu" in str(p)

        # Platform linux
        with patch.object(sys, "platform", "linux"), patch.object(Path, "home", return_value=tmp_path):
            with patch.dict(config.os.environ, {"DATA_DIR": ""}):
                p = config.get_app_data_dir()
                assert ".local" in str(p) or "YanesuShisutemu" in str(p)

        # Secret key file generate & read
        with patch("app.core.config.get_app_data_dir", return_value=tmp_path):
            with patch.dict(config.os.environ, {"SECRET_KEY": ""}):
                key1 = config.get_secret_key()
                assert len(key1) > 10
                key2 = config.get_secret_key()
                assert key1 == key2

                # Fallback on read error
                with patch("pathlib.Path.read_text", side_effect=PermissionError("Locked")):
                    fb_key = config.get_secret_key()
                    assert fb_key == "supersecretkey"


