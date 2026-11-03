import os
import tempfile
from pathlib import Path
from alembic.config import Config
from alembic import command
import sqlalchemy as sa


def test_clean_sqlite_migration_to_head(monkeypatch):
    """Verifica que una base de datos SQLite limpia pueda migrar de 0 a head sin fallos."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_db_path = Path(tmpdir) / "test_migration.db"
        sqlite_url = f"sqlite:///{tmp_db_path.as_posix()}"

        monkeypatch.setenv("DATABASE_URL", sqlite_url)
        from app.core.config import Config as AppConfig
        monkeypatch.setattr(AppConfig, "SQLALCHEMY_DATABASE_URL", sqlite_url)

        backend_dir = Path(__file__).resolve().parent.parent
        alembic_cfg = Config(str(backend_dir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
        alembic_cfg.set_main_option("sqlalchemy.url", sqlite_url)

        # Debe ejecutarse sin lanzar ValueError: No such constraint
        command.upgrade(alembic_cfg, "head")

        # Verificar que las tablas principales y las retornables existen
        engine = sa.create_engine(sqlite_url)
        inspector = sa.inspect(engine)
        tables = inspector.get_table_names()

        assert "roles" in tables
        assert "users" in tables
        assert "categorias" in tables
        assert "productos" in tables
        assert "retornable_inventario" in tables
        assert "api_keys" in tables
        assert "alembic_version" in tables

        # Verificar downgrade hasta base
        command.downgrade(alembic_cfg, "base")
        inspector_post = sa.inspect(engine)
        assert "retornable_inventario" not in inspector_post.get_table_names()
        engine.dispose()
