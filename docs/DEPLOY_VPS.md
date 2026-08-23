# Despliegue en VPS con Docker Compose + PostgreSQL

**Fecha:** Agosto 2026
**Rama:** `feature/dual-db-postgres`
**Objetivo:** Desplegar el sistema en un VPS con PostgreSQL, manteniendo compatibilidad con el modo local (SQLite) del ejecutable de escritorio.

---

## 1. Visión general

```
                        ┌──────────────────────────┐
   Navegador ──:80──▶   │  nginx (frontend React)  │
                        │  /            → SPA       │
                        │  /api/        → backend   │
                        │  /health      → backend   │
                        └──────────┬───────────────┘
                                   │ (red interna)
                        ┌──────────▼───────────────┐
                        │  backend (FastAPI+uvicorn)│
                        │  DATABASE_URL=postgresql… │
                        └──────────┬───────────────┘
                                   │
                        ┌──────────▼───────────────┐
                        │  PostgreSQL 16            │
                        │  volumen: pgdata           │
                        └──────────────────────────┘
```

- **PostgreSQL** (`db`): postgres:16-alpine con healthcheck. Puerto 5432 expuesto en `127.0.0.1` para acceso mediante túnel SSH.
- **Backend** (`backend`): imagen `python:3.12-slim`; `entrypoint.sh` ejecuta migraciones de Alembic y los seeds al arrancar.
- **Frontend** (`nginx`): build multi-stage de React (node:24 → nginx:alpine) que sirve el SPA y hace proxy de `/api` y `/health` al backend.
- **Persistencia**: volumen `pgdata` (BD) y `yanesu_data` (uploads de facturas, logs, `.secret_key`).

---

## 2. Prerrequisitos

- VPS con **Docker** y **Docker Compose** (plugin v2).
  ```bash
  docker --version        # ≥ 24
  docker compose version  # ≥ v2
  ```
- DNS apuntando al VPS (si se usa HTTPS).
- Para migrar datos del desktop: una copia del archivo `yanesu.db`.

---

## 3. Configuración

```bash
cd Sistema_inventario
cp .env.example .env
```

Editar `.env`:

| Variable | Descripción |
|----------|-------------|
| `POSTGRES_USER` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | Contraseña. **Debe ser URL-safe** (sin `@ : / ? #`) porque se usa dentro de `DATABASE_URL`. |
| `POSTGRES_DB` | Nombre de la base de datos |
| `SECRET_KEY` | Firma JWT. Ver §8 (secretos). |
| `ENCRYPTION_KEY` | Cifrado Fernet de `system_settings`. Ver §8. |
| `SECURE_COOKIE` | `true` solo si hay HTTPS delante. Ver §7. |
| `CORS_ORIGINS` | Orígenes permitidos (si el frontend va por el mismo nginx, no se necesita). |
| `GEMINI_API_KEY` | API key de Gemini (opcional; puede guardarse después desde la app). |

> Si se quiere un `DATABASE_URL` personalizado (por ejemplo con credenciales complejas), puede definirse la variable `DATABASE_URL` en el `.env`; toma prioridad sobre el valor construido en `docker-compose.yml`.

---

## 4. Despliegue

```bash
docker compose build            # construir imágenes
docker compose up -d            # levantar db → backend → nginx
docker compose ps               # verificar estado (db healthy)
```

Primer arranque:
1. El `entrypoint.sh` del backend ejecuta `alembic upgrade head` para aplicar migraciones.
2. Luego ejecuta `initialize_database`: crea los seeds (roles, métodos de pago) si las tablas están vacías.
3. La app detecta `needs_setup: true` (sin usuarios) y muestra la pantalla de **Setup** para crear el administrador.
4. Crear el usuario administrador en `http://<vps>/setup`.

Verificar:
```bash
curl http://localhost/health                  # → {"status":"ok"}
curl http://localhost/api/auth/setup-status   # → {"needs_setup":true}
```

---

## 5. Migrar datos desde SQLite (desktop) a PostgreSQL

> Ejecutar **una sola vez**, antes de crear el usuario administrador en el VPS (si el VPS ya tiene datos, usar `--truncate` para reemplazar las tablas de destino).

### 5.1 Preparar el archivo SQLite

Copiar el `yanesu.db` del desktop al VPS. Ruta del desktop:

- Windows: `%LOCALAPPDATA%\YanesuShisutemu\data\yanesu.db`
- Linux: `~/.local/share/YanesuShisutemu/data/yanesu.db`

### 5.2 Ejecutar la migración

Con el stack levantado (`docker compose up -d db`), el script está incluido en la imagen del backend:

```bash
# Montar la copia de yanesu.db en un directorio accesible (ej. /root/migrate)
mkdir -p ~/migrate
cp yanesu.db ~/migrate/

docker compose run --rm \
  -v "$PWD/backend/scripts:/app/scripts" \
  -v "$HOME/migrate:/migrate" \
  backend python scripts/migrate_sqlite_to_postgres.py \
    --sqlite "sqlite:////migrate/yanesu.db" \
    --postgres "postgresql+psycopg://$POSTGRES_USER:$POSTGRES_PASSWORD@db:5432/$POSTGRES_DB"
```

Si el `.env` ya está cargado (las variables se interpolan en el compose), `--postgres` puede omitirse porque toma `DATABASE_URL`.

### 5.3 Qué hace el script

- Crea el esquema en PostgreSQL (`create_all`): tablas, enums, columnas computadas.
- Copia los datos en orden de dependencias de claves foráneas, **conservando los IDs**.
- **Omite las columnas computadas** (totales de `ventas` y `detalle_ventas`); PostgreSQL las recalcula.
- **Reajusta las secuencias** para que los nuevos registros no colisionen.
- Interpreta los datetimes naive (hora de Venezuela) en la sesión `America/Caracas` → `timestamptz` correctos.
- Si una tabla destino ya tiene filas, la omite (usa `--truncate` para reemplazar). Los seeds (`roles`, `metodos_pago`) suelen omitirse porque ya existen.

### 5.4 Verificación

```bash
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT (SELECT COUNT(*) FROM productos) AS productos, (SELECT COUNT(*) FROM ventas) AS ventas;"
```

---

## 6. Actualizar / redeploy

```bash
git pull
docker compose build
docker compose up -d
docker compose down          # si hay que detener todo (mantiene volúmenes)
```

Los volúmenes (`pgdata`, `yanesu_data`) sobreviven a `down`; solo se pierden con `down -v` (destructivo).

---

## 7. Migraciones con Alembic

El proyecto usa **Alembic** para gestionar migraciones del esquema de la base de datos. El sistema es dual-mode: SQLite (desktop) y PostgreSQL (VPS).

### 7.1 Generar una nueva migración

```bash
cd backend
python -m alembic revision --autogenerate -m "descripción del cambio"
```

### 7.2 Aplicar migraciones

```bash
cd backend
python -m alembic upgrade head
```

### 7.3 Revertir la última migración

```bash
cd backend
python -m alembic downgrade -1
```

### 7.4 Verificar el estado actual

```bash
cd backend
python -m alembic current
python -m alembic history
```

### 7.5 Notas importantes

- Las migraciones se ejecutan automáticamente en el `entrypoint.sh` del Docker.
- Para el modo desktop (SQLite), `create_all()` sigue creando las tablas si no existen. Alembic solo se usa en el entorno Docker/VPS.
- Los archivos de migración están en `backend/alembic/versions/`.
- Al generar una migración, revisar el archivo generado antes de commitear para asegurar que los cambios son correctos.

---

## 7. HTTPS y Secure cookie

- La cookie `access_token` se envía con `Secure` cuando `SECURE_COOKIE=true`. **Sin HTTPS el navegador no la guardará**, así que en producción debe haber TLS.
- Opciones:
  1. **Certbot** sobre este nginx: `certbot --nginx -d <dominio>` (requiere el puerto 80 publicado). Luego recargar con `docker compose exec nginx nginx -s reload`.
  2. **Reverse proxy externo** (Caddy/Traefik/HAProxy): en ese caso el puerto 80 del compose puede quedar interno.

Si se accede por IP/HTTP solo para pruebas, definir `SECURE_COOKIE=false` en el `.env` y recrear el backend:
```bash
docker compose up -d --force-recreate backend
```

---

## 8. Acceso a PostgreSQL mediante túnel SSH

El puerto 5432 de PostgreSQL está expuesto solo en `127.0.0.1`, por lo que solo es accesible desde el propio VPS. Para conectarse remotamente, usar un túnel SSH:

```bash
# Desde tu máquina local, crear un túnel SSH al VPS
ssh -L 5432:127.0.0.1:5432 usuario@tu-vps

# Ahora puedes conectarte a PostgreSQL como si estuviera en localhost
psql -h localhost -p 5432 -U $POSTGRES_USER -d $POSTGRES_DB
```

Opcionalmente, usar un puerto local diferente si ya tienes PostgreSQL instalado:
```bash
ssh -L 5433:127.0.0.1:5432 usuario@tu-vps
# Conectar al puerto 5433 local
psql -h localhost -p 5433 -U $POSTGRES_USER -d $POSTGRES_DB
```

---

## 8. Secretos: clave JWT y cifrado de settings

- `SECRET_KEY`: firma los JWT. Si se migran datos y se quiere conservar la sesión, debe ser el mismo valor que usaba el origen:
  - Desktop: archivo `%LOCALAPPDATA%\YanesuShisutemu\.secret_key` (o variable `SECRET_KEY`).
- `ENCRYPTION_KEY`: cifra `system_settings` (API key Gemini). Si se deja vacía, se deriva de `SECRET_KEY`, por lo que **si se migran settings cifrados, hay que replicar también la clave** usada en origen.
- **Recomendación**: en el VPS fijar explícitamente valores aleatorios en `.env` y guardarlos en el gestor de secretos del proveedor.

---

## 9. Respaldos

- Base de datos (PostgreSQL):
  ```bash
  docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%F).sql
  ```
- Archivos (`uploads/`, `logs/`): están en el volumen `yanesu_data` (montado en `/data` del backend).

---

## 10. Logs y diagnóstico

```bash
docker compose logs -f backend      # logs de FastAPI
docker compose logs -f db           # logs de PostgreSQL
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"  # consola SQL
```

El backend además escribe en `/data/logs/sistema.log` y `/data/logs/audit.log` (volumen `yanesu_data`).

---

## 11. Compatibilidad con el modo local (desktop)

- El mismo código soporta **SQLite** (default, sin `DATABASE_URL`) y **PostgreSQL**.
- Modo local/desktop: no tocar; se sigue usando `create_all()` + archivo `yanesu.db` en `AppData`.
- El engine elige dialecto según `DATABASE_URL`:
  - `postgresql+psycopg://…` → pool con `pool_pre_ping`/`pool_recycle` y sesión `America/Caracas`.
  - cualquier otra → SQLite con `check_same_thread=False` y `PRAGMA foreign_keys=ON`.
