import importlib
from unittest.mock import patch
from sqlalchemy.pool import QueuePool
import app.core.config as config
import app.core.database as db_module


def test_postgres_engine_pool_configuration():
    """Assert that create_engine with PostgreSQL URL sets
    pool_size=10, max_overflow=20, pool_timeout=30.0, pool_recycle=1800 on QueuePool.
    """
    test_pg_url = "postgresql+psycopg2://yanesu_user:secret@127.0.0.1:5432/yanesudb"
    with patch.object(config.Config, "SQLALCHEMY_DATABASE_URL", test_pg_url):
        importlib.reload(db_module)
        try:
            pool = db_module.engine.pool
            assert isinstance(pool, QueuePool), f"Expected QueuePool, got {type(pool)}"
            assert pool.size() == 10, f"Expected pool_size=10, got {pool.size()}"
            assert pool._max_overflow == 20, f"Expected max_overflow=20, got {pool._max_overflow}"
            assert pool._timeout == 30.0, f"Expected pool_timeout=30.0, got {pool._timeout}"
            assert pool._recycle == 1800, f"Expected pool_recycle=1800, got {pool._recycle}"
            assert pool._pre_ping is True, f"Expected pool_pre_ping=True, got {pool._pre_ping}"
        finally:
            importlib.reload(db_module)
