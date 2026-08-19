"""Migra los datos de una base SQLite existente hacia PostgreSQL.

Uso:
    python scripts/migrate_sqlite_to_postgres.py \
        [--sqlite sqlite:////ruta/yanesu.db] \
        [--postgres postgresql+psycopg://usuario:clave@host:5432/bd] \
        [--truncate]

Valores por defecto:
    --sqlite   usa la ruta de datos del desktop (get_db_path()).
    --postgres usa DATABASE_URL si apunta a postgresql.

Notas:
    - El esquema se crea en PostgreSQL con create_all() (enums, columnas
      computadas, tablas). Los seeds (roles, métodos de pago) se omiten si la
      tabla destino ya tiene filas; usa --truncate para reemplazarlos.
    - Las columnas computadas (totales de ventas) se omiten en el INSERT;
      PostgreSQL las genera.
    - Los IDs se conservan y las secuencias se reajustan al final.
    - Los datetimes naive (hora Venezuela) se interpretan en la sesión
      America/Caracas para insertarse como timestamptz correctos.
    - SECRET_KEY/ENCRYPTION_KEY del destino deben coincidir con el origen si
      se migran SystemSetting cifrados o se desea conservar los JWT.
"""
import argparse
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, func, select, text  # noqa: E402

import app.models  # noqa: F401,E402  # registra todas las tablas en Base.metadata
from app.core.database import Base  # noqa: E402

logger = logging.getLogger("migrate")
logging.basicConfig(level=logging.INFO, format="%(message)s")


def _default_sqlite_url() -> str:
    from app.core.config import get_db_path

    return f"sqlite:///{get_db_path()}"


def _build_engines(args) -> tuple:
    sqlite_url = args.sqlite if args.sqlite.startswith("sqlite:") else f"sqlite:///{args.sqlite}"
    if not args.postgres.startswith("postgresql"):
        raise SystemExit(
            "--postgres debe ser una URL postgresql+psycopg://... (o definir DATABASE_URL)"
        )
    src = create_engine(sqlite_url)
    dst = create_engine(
        args.postgres,
        pool_pre_ping=True,
        connect_args={"options": "-c timezone=America/Caracas"},
    )
    return src, dst


def _reset_sequence(conn, table) -> None:
    if "id" not in table.c:
        return
    stmt = text(
        f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), "
        f"COALESCE((SELECT MAX(id) FROM \"{table.name}\"), 1))"
    )
    conn.execute(stmt)


def _truncate_all(conn) -> None:
    names = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    conn.execute(text(f"TRUNCATE TABLE {names} CASCADE"))
    logger.info("Tablas de destino vaciadas (--truncate).")


def migrate(src, dst, *, truncate: bool = False) -> None:
    logger.info("Creando esquema en PostgreSQL si no existe...")
    Base.metadata.create_all(dst)

    if truncate:
        with dst.begin() as conn:
            _truncate_all(conn)

    migrated = 0
    for table in Base.metadata.sorted_tables:
        cols = [c for c in table.columns if c.computed is None]
        with src.connect() as conn:
            rows = conn.execute(select(*cols)).mappings().all()
        if not rows:
            logger.info("  %-24s sin datos", table.name)
            continue

        with dst.begin() as conn:
            existing = conn.execute(select(func.count()).select_from(table)).scalar()
            if existing and not truncate:
                logger.warning(
                    "  %-24s ya tiene %d filas en PostgreSQL; se omite "
                    "(usa --truncate para reemplazar)",
                    table.name, existing,
                )
                continue
            payload = [dict(r) for r in rows]
            conn.execute(table.insert(), payload)
            _reset_sequence(conn, table)
            migrated += len(payload)
            logger.info("  %-24s migradas %d filas", table.name, len(payload))

    logger.info("Migración completada: %d filas insertadas.", migrated)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sqlite", default=_default_sqlite_url(), help="URL o ruta de la base SQLite de origen")
    parser.add_argument("--postgres", default=os.getenv("DATABASE_URL", ""), help="URL PostgreSQL de destino")
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Vacia todas las tablas de destino antes de migrar (destructivo).",
    )
    args = parser.parse_args()

    src, dst = _build_engines(args)
    try:
        migrate(src, dst, truncate=args.truncate)
    finally:
        src.dispose()
        dst.dispose()


if __name__ == "__main__":
    main()
