---
name: alembic-workflow
description: >-
  Use when working with Alembic database migrations in this project. Triggers
  on: "migration", "alembic", "schema change", "add column", "create table",
  "modify model", "deploy database", "stamp", "revision --autogenerate",
  "database", "new migration", "alter table", "drop column", "rename column",
  "add index", "add constraint", "foreign key", "enum type", "migrate",
  "alembic upgrade", "alembic downgrade", "backup restore", "restore database".
  ALWAYS invoke this skill before: (1) editing any file in backend/alembic/,
  (2) running alembic revision --autogenerate, (3) running alembic upgrade or
  downgrade, (4) deploying database changes to VPS, (5) restoring a database
  backup. This skill ensures SQLite/PostgreSQL dual-dialect compatibility and
  prevents production failures.
---

# Alembic Workflow

This project uses Alembic for database migrations with **dual-dialect support**: SQLite (desktop/Tauri) and PostgreSQL (VPS/Docker). Every migration must work on both databases without modification.

## Architecture Overview

- **Source of truth:** PostgreSQL (VPS)
- **Desktop:** SQLite with `render_as_batch=True` (simulates ALTER TABLE)
- **Migration engine:** Alembic with programmatic API in `run.py`
- **Naming convention:** Defined in `Base.metadata` (`database.py`)
- **Entrypoint:** `entrypoint.sh` runs `alembic upgrade head` on container startup

## When to Use This Skill

| Situation | Action |
|-----------|--------|
| Modifying a SQLAlchemy model | Generate migration, review, test |
| Adding a new model/table | Generate migration, review, test |
| Changing column types or constraints | Generate migration, review, test |
| Deploying to VPS | Follow deploy playbook |
| Restoring a database backup | Follow stamp workflow |
| Editing Alembic config files | Read compatibility checklist first |
| User reports migration errors | Diagnose using error table below |

## Generate a Migration

### Step 1: Modify the Model

Edit the appropriate model in `backend/app/models/`. Follow SQLAlchemy 2.0 patterns:

```python
# CORRECT
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

class User(Base):
    __tablename__ = "users"
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
```

### Step 2: Generate the Migration

```bash
# From backend/
alembic revision --autogenerate -m "add telefono to users"
```

### Step 3: Review the Generated File

**ALWAYS read the generated file before proceeding.** Check for compatibility issues using the checklist in `references/compatibility-checklist.md`. Common problems:

- `server_default=sa.text('now()')` → change to `sa.func.now()`
- `sa.JSONB()` → change to `sa.JSON()`
- `ILIKE` → remove or replace with `ilike()` method
- `server_default=sa.text('1')` for booleans → change to `sa.text('true')`

### Step 4: Test Locally

```bash
# Test on SQLite (desktop)
alembic upgrade head

# Test on PostgreSQL (Docker)
docker compose up -d db
alembic upgrade head  # with DATABASE_URL pointing to Docker
```

### Step 5: Commit and Deploy

```bash
git add backend/alembic/versions/<new_file>.py
git commit -m "feat(db): add migration for <description>"
```

## Deploy to VPS

See `references/deploy-playbook.md` for the complete playbook.

**Normal deploy (new migration):**

```bash
# On VPS
docker compose pull
docker compose up -d
```

The `entrypoint.sh` automatically runs `alembic upgrade head` on startup.

**Pre-deploy checklist:**
1. Migration tested on SQLite locally
2. Migration tested on PostgreSQL locally
3. Backup of VPS database exists
4. Changes committed and pushed to master

## Restore Backup + Stamp Workflow

When restoring a database backup (e.g., from VPS to local Docker), the `alembic_version` table may contain an old revision. You must stamp it to the current head.

```bash
# 1. Clean start
docker compose down -v

# 2. Start PostgreSQL
docker compose up -d db

# 3. Wait for ready
docker compose exec db pg_isready -U yanesu_user -d yanesudb

# 4. Verify encoding
docker compose exec db psql -U yanesu_user -d yanesudb -c "SHOW server_encoding;"

# 5. Restore (use cmd /c on Windows to preserve UTF-8)
cmd /c "docker compose exec -T db psql -U yanesu_user -d yanesudb < .\backup_testing\backup_full_yanesudb.sql"

# 6. Verify data
docker compose exec db psql -U yanesu_user -d yanesudb -c "SELECT nombre FROM categorias WHERE id=3;"

# 7. Stamp to current head
docker compose exec db psql -U yanesu_user -d yanesudb -c "DELETE FROM alembic_version;"
docker compose run --rm backend alembic stamp head

# 8. Start everything
docker compose up -d
```

**Why stamp is needed:** The backup may contain `alembic_version` with an old revision that no longer exists in the migration files. Without stamping, Alembic tries to upgrade from the old revision and fails with `DuplicateTable` or `Can't locate revision`.

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `DuplicateTable: relation "X" already exists` | Missing stamp after backup restore | `DELETE FROM alembic_version;` then `alembic stamp head` |
| `Can't locate revision identified by 'X'` | Old revision in `alembic_version` not in migration files | `DELETE FROM alembic_version;` then `alembic stamp head` |
| `??` instead of ñ/accents | Backup file encoding corrupted during restore | Re-restore with `cmd /c` (Windows) or check `--encoding=UTF8` |
| `ProgrammingError: type "jsonb" does not exist` | Migration uses PostgreSQL-specific type | Change `JSONB` to `sa.JSON()` in migration |
| `OperationalError: near "ILIKE"` | SQLite doesn't support ILIKE | Remove ILIKE, use `ilike()` SQLAlchemy method |
| `IntegrityError: NOT NULL constraint failed` | Missing `server_default` for new non-nullable column | Add `server_default='value'` or make column nullable |
| Backend container crashes on startup | Migration failed | Check `docker compose logs backend --tail 50` |

## Key Files

| File | Purpose |
|------|---------|
| `backend/alembic/env.py` | Alembic config: `render_as_batch=True`, dual-dialect |
| `backend/alembic.ini` | Alembic settings (URL overridden at runtime) |
| `backend/alembic/versions/` | Migration files |
| `backend/app/core/database.py` | `Base` with `naming_convention`, engine setup |
| `backend/app/core/config.py` | `DATABASE_URL` from env var |
| `backend/run.py` | Programmatic Alembic API (desktop entry point) |
| `backend/entrypoint.sh` | VPS entry point: `alembic upgrade head` + seeds + uvicorn |
| `backend/app/models/` | SQLAlchemy models (source for autogenerate) |

## Reference Files

Read these when needed:

- `references/compatibility-checklist.md` — Full checklist for reviewing generated migrations
- `references/deploy-playbook.md` — Step-by-step deploy and restore procedures
