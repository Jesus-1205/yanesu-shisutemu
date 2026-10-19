from sqlalchemy import MetaData, create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import Config

DATABASE_URL = Config.SQLALCHEMY_DATABASE_URL

def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def create_app_engine(database_url: str):
    if database_url.startswith("postgresql"):
        return create_engine(
            database_url,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30.0,
            pool_pre_ping=True,
            pool_recycle=1800,
            connect_args={"options": "-c timezone=America/Caracas"},
        )
    else:
        eng = create_engine(
            database_url,
            connect_args={"check_same_thread": False},
        )
        event.listen(eng, "connect", set_sqlite_pragma)
        return eng


engine = create_app_engine(DATABASE_URL)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


POSTGRES_SQLITE_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=POSTGRES_SQLITE_CONVENTION)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
