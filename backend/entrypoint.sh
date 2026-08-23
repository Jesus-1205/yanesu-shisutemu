#!/bin/sh
set -e

# Aplica migraciones de Alembic al esquema de la base de datos.
alembic upgrade head

# Semillas iniciales (roles, métodos de pago) si las tablas están vacías.
python -c "from app.core.first_run import initialize_database; from app.core.database import SessionLocal; db = SessionLocal(); initialize_database(db); db.close()"

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
