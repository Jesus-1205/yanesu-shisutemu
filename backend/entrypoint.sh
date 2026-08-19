#!/bin/sh
set -e

# Inicializa esquema + seeds (roles, métodos de pago) si no existen.
python -c "from app.core.first_run import initialize_database; from app.core.database import SessionLocal; db = SessionLocal(); initialize_database(db); db.close()"

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
