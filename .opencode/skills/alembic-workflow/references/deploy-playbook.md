# Deploy Playbook

Step-by-step procedures for deploying database changes and restoring backups.

## Normal Deploy (New Migration)

When you've committed a new migration and pushed to master, the CI/CD builds a new Docker image. On the VPS:

```bash
# 1. Pull the new image
docker compose pull

# 2. Restart (entrypoint.sh runs alembic upgrade head automatically)
docker compose up -d

# 3. Verify
docker compose logs backend --tail 20
```

**What happens internally:**
1. `docker compose up -d` starts the backend container
2. `entrypoint.sh` executes:
   - `alembic upgrade head` — applies pending migrations
   - `initialize_database()` — seeds roles, payment methods if empty
   - `uvicorn app.main:app` — starts the API server
3. If any migration fails, the container crashes (check logs)

### Pre-Deploy Checklist

- [ ] Migration tested on SQLite locally (`alembic upgrade head`)
- [ ] Migration tested on PostgreSQL locally (Docker)
- [ ] Migration file reviewed against compatibility checklist
- [ ] Backup of VPS database exists
- [ ] Changes committed and pushed to master
- [ ] CI/CD build succeeded (check GitHub Actions)

### Rollback

If a migration fails on VPS:

```bash
# 1. Check the error
docker compose logs backend --tail 50

# 2. Option A: Fix the migration, push, rebuild
# Edit the migration file, commit, push, wait for CI/CD, then:
docker compose pull
docker compose up -d

# 3. Option B: Rollback to previous version
docker compose exec backend alembic downgrade -1
docker compose restart backend
```

## Restore Backup + Stamp

When restoring a database backup (e.g., moving from VPS to local, or restoring after data loss).

### Scenario A: Fresh Restore (Empty Database)

```bash
# 1. Clean start
docker compose down -v

# 2. Start PostgreSQL only
docker compose up -d db

# 3. Wait for ready
docker compose exec db pg_isready -U yanesu_user -d yanesudb

# 4. Verify UTF-8 encoding
docker compose exec db psql -U yanesu_user -d yanesudb -c "SHOW server_encoding;"
# Expected: UTF8

# 5. Restore backup
# Linux/macOS:
docker compose exec -T db psql -U yanesu_user -d yanesudb < backup_full_yanesudb.sql
# Windows (cmd /c to preserve UTF-8):
cmd /c "docker compose exec -T db psql -U yanesu_user -d yanesudb < .\backup_testing\backup_full_yanesudb.sql"

# 6. Verify data (check for ñ/accents)
docker compose exec db psql -U yanesu_user -d yanesudb -c "SELECT nombre FROM categorias WHERE id=3;"
# Expected: Anís y Aguardiente (not An??s)

# 7. Stamp Alembic to current head
docker compose exec db psql -U yanesu_user -d yanesudb -c "DELETE FROM alembic_version;"
docker compose run --rm backend alembic stamp head

# 8. Start everything
docker compose up -d

# 9. Verify
docker compose logs backend --tail 20
```

### Scenario B: Restore Over Existing Database

If the database already has data and you want to replace it:

```bash
# 1. Stop backend (keep db running)
docker compose stop backend

# 2. Drop and recreate database
docker compose exec db psql -U yanesu_user -d postgres -c "DROP DATABASE yanesudb;"
docker compose exec db psql -U yanesu_user -d postgres -c "CREATE DATABASE yanesudb OWNER yanesu_user;"

# 3. Restore backup
cmd /c "docker compose exec -T db psql -U yanesu_user -d yanesudb < .\backup_testing\backup_full_yanesudb.sql"

# 4. Stamp
docker compose exec db psql -U yanesu_user -d yanesudb -c "DELETE FROM alembic_version;"
docker compose run --rm backend alembic stamp head

# 5. Start backend
docker compose up -d
```

### Why Stamp is Required

The backup file contains the `alembic_version` table with the revision ID from when the backup was made. This revision may not exist in the current migration files (e.g., old migrations were deleted during a cleanup).

Without stamping:
1. Backend starts → `run.py` calls `alembic upgrade head`
2. Alembic reads `alembic_version` → finds old revision `X`
3. Alembic tries to upgrade from `X` to current head
4. Either `Can't locate revision 'X'` (file deleted) or `DuplicateTable` (tables already exist)
5. Container crashes

With stamping:
1. `DELETE FROM alembic_version` → clears old revision
2. `alembic stamp head` → writes current revision to `alembic_version`
3. Backend starts → `alembic upgrade head` → sees already at head → no-op
4. Container starts normally

## Docker Compose Configuration

### PostgreSQL Encoding

Always ensure UTF-8 encoding in `docker-compose.yml`:

```yaml
db:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-yanesu}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
    POSTGRES_DB: ${POSTGRES_DB:-licoreria}
    POSTGRES_INITDB_ARGS: "--encoding=UTF8 --lc-collate=C --lc-ctype=C"
```

Without `POSTGRES_INITDB_ARGS`, PostgreSQL may use the system locale (which could be Latin-1 on some systems), causing ñ/accents to appear as `??`.

### Health Checks

The `docker-compose.yml` includes health checks for both `db` and `backend`. The backend depends on db being healthy:

```yaml
backend:
  depends_on:
    db:
      condition: service_healthy
```

This ensures PostgreSQL is ready before the backend starts (and before Alembic runs).

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | SQLAlchemy connection string | `postgresql+psycopg://user:pass@db:5432/yanesudb` |
| `SECRET_KEY` | JWT signing key | Random hex string |
| `ENCRYPTION_KEY` | Fernet encryption key | Base64-encoded 32 bytes |
| `SECURE_COOKIE` | Use secure cookies | `true` (production) / `false` (local) |
| `CORS_ORIGINS` | Allowed origins | `https://yourdomain.com` |
| `DATA_DIR` | Data directory (Docker) | `/data` |

## Troubleshooting

### Backend container keeps restarting

```bash
# Check logs
docker compose logs backend --tail 50

# Common causes:
# - Migration failed (see error table in SKILL.md)
# - Database not ready (increase healthcheck retries)
# - Missing environment variable
```

### Encoding issues (?? instead of ñ)

```bash
# Check database encoding
docker compose exec db psql -U yanesu_user -d yanesudb -c "SHOW server_encoding;"

# If not UTF8, recreate with correct encoding
docker compose down -v
# Add POSTGRES_INITDB_ARGS to docker-compose.yml
docker compose up -d db
# Re-restore backup
```

### Alembic version mismatch

```bash
# Check current version
docker compose exec db psql -U yanesu_user -d yanesudb -c "SELECT * FROM alembic_version;"

# Check expected head
docker compose run --rm backend alembic heads

# If mismatch, stamp
docker compose exec db psql -U yanesu_user -d yanesudb -c "DELETE FROM alembic_version;"
docker compose run --rm backend alembic stamp head
```
