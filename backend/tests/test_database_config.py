from sqlalchemy.pool import QueuePool
from app.core.database import create_app_engine


def test_postgres_engine_pool_configuration():
    """Assert that create_app_engine with PostgreSQL URL sets
    pool_size=10, max_overflow=20, pool_timeout=30.0, pool_recycle=1800 on QueuePool.
    """
    test_pg_url = "postgresql+psycopg2://yanesu_user:secret@127.0.0.1:5432/yanesudb"
    engine = create_app_engine(test_pg_url)
    pool = engine.pool
    assert isinstance(pool, QueuePool), f"Expected QueuePool, got {type(pool)}"
    assert pool.size() == 10, f"Expected pool_size=10, got {pool.size()}"
    assert pool._max_overflow == 20, f"Expected max_overflow=20, got {pool._max_overflow}"
    assert pool._timeout == 30.0, f"Expected pool_timeout=30.0, got {pool._timeout}"
    assert pool._recycle == 1800, f"Expected pool_recycle=1800, got {pool._recycle}"
    assert pool._pre_ping is True, f"Expected pool_pre_ping=True, got {pool._pre_ping}"
