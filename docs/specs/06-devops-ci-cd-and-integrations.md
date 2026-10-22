# Capítulo 06: DevOps, CI/CD, Infraestructura y Automatizaciones n8n

Este documento técnico detalla de forma exhaustiva la arquitectura de despliegue continuo (CI/CD), orquestación de contenedores Docker, topología de red, resiliencia del pipeline de scraping cambiario y el ecosistema de automatización máquina a máquina (M2M) con **n8n** y **Telegram** en **Yanesu Shisutemu**.

Todas las especificaciones, diagramas, tablas y esquemas aquí descritos están fundamentados en la implementación real del código fuente ubicado en `.github/workflows/docker-image.yml`, `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `backend/app/routes/webhooks.py`, `backend/app/routes/n8n_agent.py`, `backend/app/services/n8n_agent_service.py`, `backend/app/core/bcv_scraper.py` y `docs/N8N_INTEGRATION.md`.

---

## 1. Resumen Ejecutivo de DevOps y Automatización

El sistema adopta una arquitectura de micro-servicios contenerizados y desacoplados capaz de operar tanto en entornos locales de desarrollo como en servidores virtuales privados (VPS) para producción comercial con alta disponibilidad:

| Componente | Tecnología | Ubicación / Archivo | Rol en el Sistema |
| :--- | :--- | :--- | :--- |
| **Pipeline CI/CD** | GitHub Actions & GHCR | `.github/workflows/docker-image.yml` | Compilación multi-imagen en push a ramas principales y publicación determinista en GitHub Container Registry (`ghcr.io`). |
| **Orquestador** | Docker Compose v2 | `docker-compose.yml` | Orquestación declarativa de 4 servicios (`db`, `backend`, `nginx`, `n8n`) sobre red bridge interna privada (`yanesu_net`). |
| **Base de Datos Prod** | PostgreSQL 16 Alpine | Servicio `db` en `docker-compose.yml` | Motor relacional transaccional multi-usuario en producción con almacenamiento en volumen persistente `pgdata`. |
| **API Server** | FastAPI / Python 3.12 | `backend/Dockerfile`, `entrypoint.sh` | Servidor ASGI con migraciones automáticas (`alembic upgrade head`) y seed de datos en arranque. |
| **Reverse Proxy / SPA** | Nginx Alpine / React 19 | `frontend/Dockerfile`, `nginx.conf` | Servidor web estático optimizado, proxy inverso HTTP/1.1 para `/api/`, streaming SSE/WebSocket y buffer de subida de 25 MB. |
| **Motor de Automatización** | n8n Community | `docker.n8n.io/n8nio/n8n:latest` | Orquestador de flujos no-code/low-code: scraping programado del BCV, reportes ejecutivos diarios/semanales y bot de Telegram. |
| **Seguridad M2M** | Header `X-API-Key` & SHA-256 | `backend/app/core/dependencies.py` | Autenticación criptográfica sin estado para agentes externos con trazabilidad no repudiable en auditoría (`api_keys`). |
| **Agente Conversacional** | n8n + Telegram Bot | `backend/app/routes/n8n_agent.py` | 11 herramientas de *Function Calling* y 2 endpoints de reportes consolidados para consulta gerencial en lenguaje natural. |
| **Pipeline Cambiario** | BeautifulSoup4 / Scraper | `backend/app/core/bcv_scraper.py` | Extracción resiliente de tasas oficiales USD/EUR con bypass de advertencias SSL y fallback a tasas históricas en BD. |

---

## 2. Pipeline de CI/CD con GitHub Actions

El repositorio cuenta con un pipeline de integración y despliegue continuo formalizado en el archivo `.github/workflows/docker-image.yml`, denominado `Build and Push Yanesu Images`.

### 2.1. Triggers y Entorno de Ejecución

El workflow se dispara de manera automatizada ante cualquier evento de `push` sobre tres ramas críticas del repositorio:
- `main`: Rama de producción estable.
- `master`: Rama de integración principal.
- `testing`: Rama de pruebas y validación pre-productiva.

```yaml
name: Build and Push Yanesu Images

on:
  push:
    branches: [ "main", "master", "testing" ]

env:
  REGISTRY: ghcr.io
  IMAGE_BASE: ${{ github.repository }}
```

El trabajo `build-and-push` se ejecuta sobre el runner estándar `ubuntu-latest` y requiere permisos mínimos restringidos para respetar el principio de mínimo privilegio:
- `contents: read`: Acceso de lectura al árbol de código fuente.
- `packages: write`: Permiso para subir y registrar imágenes de contenedores en GitHub Packages / GHCR.

### 2.2. Normalización de Namespace y Autenticación en GHCR

Docker Container Registry prohíbe el uso de caracteres en mayúsculas en los nombres de repositorios e imágenes. Si el usuario u organización de GitHub posee mayúsculas (ej. `Jesus-1205/Sistema_inventario`), la subida fallaría. Por ello, el pipeline ejecuta un paso de transformación previo en Bash:

```yaml
- name: Checkout del código
  uses: actions/checkout@v4

- name: Normalizar nombre del repositorio a minúsculas
  run: echo "IMAGE_BASE=${GITHUB_REPOSITORY,,}" >> $GITHUB_ENV

- name: Iniciar sesión en GHCR
  uses: docker/login-action@v3
  with:
    registry: ${{ env.REGISTRY }}
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

La autenticación utiliza el token efímero nativo `${{ secrets.GITHUB_TOKEN }}`, eliminando la necesidad de gestionar tokens personales (PAT) de larga duración.

### 2.3. Compilación y Publicación del Backend

Para el servicio backend, el workflow utiliza `docker/metadata-action@v5` para derivar automáticamente las etiquetas Docker (ej. `:master`, `:testing`, `:sha-xxxxxxx`) y publica la imagen resultante mediante `docker/build-push-action@v5`:

```yaml
# --- CONSTRUCCIÓN DEL BACKEND ---
- name: Extraer metadatos (Backend)
  id: meta-backend
  uses: docker/metadata-action@v5
  with:
    images: ${{ env.REGISTRY }}/${{ env.IMAGE_BASE }}-backend

- name: Compilar y publicar Backend
  uses: docker/build-push-action@v5
  with:
    context: ./backend
    push: true
    tags: ${{ steps.meta-backend.outputs.tags }}
    labels: ${{ steps.meta-backend.outputs.labels }}
```

#### Estructura del `backend/Dockerfile`
El contenedor del backend utiliza una imagen base liviana y optimizada para producción:
```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini
COPY scripts ./scripts
COPY entrypoint.sh ./entrypoint.sh

RUN mkdir -p /data

EXPOSE 8000

CMD ["sh", "./entrypoint.sh"]
```

#### Ciclo de Vida del Arranque (`backend/entrypoint.sh`)
El archivo de entrada del contenedor garantiza que la base de datos se encuentre actualizada y sembrada antes de recibir tráfico HTTP:
```sh
#!/bin/sh
set -e

# 1. Aplica migraciones pendientes de Alembic al esquema de PostgreSQL/SQLite
alembic upgrade head

# 2. Semillas iniciales (roles ADMINISTRADOR/OPERADOR, métodos de pago, etc.)
python -c "from app.core.first_run import initialize_database; from app.core.database import SessionLocal; db = SessionLocal(); initialize_database(db); db.close()"

# 3. Sustituye el proceso PID 1 con el servidor Uvicorn en el puerto 8000
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2.4. Compilación Multietapa del Frontend (`frontend/Dockerfile`)

El frontend de React 19 / TypeScript / Tailwind v4 se compila utilizando un patrón *Multi-Stage Build* que desacopla el entorno de desarrollo y construcción (Node.js 24 + pnpm) del servidor web de entrega final (Nginx Alpine), reduciendo el tamaño de la imagen final a menos de 30 MB:

```dockerfile
# --- ETAPA 1: Construcción del bundle estático ---
FROM node:24-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.17.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# --- ETAPA 2: Servidor de producción ultraliviano ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Script de sincronización de arranque con el backend
RUN echo '#!/bin/sh' > /wait-for-backend.sh && \
    echo 'until nc -z backend 8000; do sleep 1; done' >> /wait-for-backend.sh && \
    echo 'exec nginx -g "daemon off;"' >> /wait-for-backend.sh && \
    chmod +x /wait-for-backend.sh

EXPOSE 80
CMD ["/wait-for-backend.sh"]
```

> **Prevención de Error 502 Bad Gateway:** El script `/wait-for-backend.sh` incorporado en la imagen utiliza `nc -z backend 8000` para comprobar activamente que el servicio FastAPI esté respondiendo en su puerto interno antes de iniciar el demonio Nginx. Esto previene que peticiones tempranas de usuarios o del navegador fallen con errores HTTP 502 mientras Alembic ejecuta las migraciones iniciales de la base de datos.

### 2.5. Configuración de Nginx en Contenedor (`frontend/nginx.conf`)

El servidor Nginx interno gestiona la entrega de la aplicación SPA y el enrutamiento reverso hacia el backend:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Límite amplio para permitir la carga de fotos y facturas escaneadas (Gemini OCR)
    client_max_body_size 25m;

    # Endpoint de verificación de salud directa
    location = /health {
        proxy_pass http://backend:8000/api/health;
        proxy_set_header Host $host;
    }

    # Proxy reverso hacia la API de FastAPI
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Soporte para WebSockets y Server-Sent Events (SSE de tasas BCV)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout extendido (5 minutos) para subida de facturas y OCR multimodal con Gemini
        proxy_read_timeout 300s;
    }

    # Caché estática inmutable de 1 año para bundles generados por Vite con hash
    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Fallback para HTML5 History API en aplicaciones React de página única (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 3. Orquestación con Docker Compose y Topología de Red

El archivo `docker-compose.yml` define la topología de servicios completa del sistema. Su arquitectura aísla el tráfico interno de datos, expone únicamente los puertos necesarios y asegura la inicialización ordenada mediante comprobaciones de salud (`healthchecks`).

### 3.1. Diagrama de Arquitectura de Red de Contenedores

```
                          INTERNET / CLIENTES
                                   │
                                   │ Puertos 80 (HTTP) / 443 (HTTPS)
                                   ▼
             ┌───────────────────────────────────────────┐
             │       Nginx Host VPS (SSL Cloudflare)     │
             └───────┬───────────────────────────┬───────┘
                     │ :80                       │ :5678 (Bind localhost)
                     ▼                           ▼
┌────────────────────┼───────────────────────────┼────────────────────────────────────┐
│ Docker Host        │                           │                                    │
│                    ▼                           │                                    │
│         ┌─────────────────────┐                │                                    │
│         │   nginx (Frontend)  │                │                                    │
│         │   Puerto :80        │                │                                    │
│         └──────────┬──────────┘                │                                    │
│                    │                           │                                    │
│                    │ HTTP Proxy /api           │                                    │
│                    ▼                           │                                    │
│         ┌─────────────────────┐                │                                    │
│         │   backend (FastAPI) │ ◀──────────────┴──────┐                             │
│         │   Puerto int: 8000  │  M2M HTTP Direct      │                             │
│         └──────────┬──────────┘  http://backend:8000  │                             │
│                    │                                  │                             │
│                    │ Conexión SQL                     │                             │
│                    │ postgresql+psycopg               │                             │
│                    ▼                                  │                             │
│         ┌─────────────────────┐            ┌──────────┴──────────┐                  │
│         │  db (Postgres 16)   │            │   n8n Automation    │                  │
│         │  Puerto: 5432       │            │   Puerto: 5678      │                  │
│         └─────────────────────┘            └─────────────────────┘                  │
│                                                                                     │
│ Red Bridge Aislada: yanesu_net                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Catálogo de Servicios y Parámetros

#### 1. Servicio `db` (PostgreSQL 16 Alpine)
- **Imagen:** `postgres:16-alpine`.
- **Exposición:** `127.0.0.1:5432:5432` (restringido estrictamente a la interfaz loopback del servidor anfitrión, impidiendo accesos no autorizados desde redes externas).
- **Parámetros de Inicialización:** `POSTGRES_INITDB_ARGS: "--encoding=UTF8 --lc-collate=C --lc-ctype=C"` para consistencia en ordenamientos y juego de caracteres.
- **Volumen Persistente:** `pgdata:/var/lib/postgresql/data`.
- **Healthcheck:**
  ```yaml
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-yanesu} -d ${POSTGRES_DB:-licoreria}"]
  interval: 10s
  timeout: 5s
  retries: 10
  ```

#### 2. Servicio `backend` (FastAPI)
- **Imagen:** `ghcr.io/jesus-1205/sistema_inventario_local-backend:master`.
- **Init:** `init: true` (ejecuta un proceso init ligero como PID 1 dentro del contenedor para cosecha adecuada de procesos huérfanos y captura confiable de señales `SIGTERM`/`SIGINT`).
- **Dependencia de arranque:** Requiere que `db` alcance estado `service_healthy`.
- **Variables de Entorno Críticas:**
  - `DATABASE_URL`: Cadena de conexión `postgresql+psycopg://...` hacia el hostname interno `db:5432`.
  - `SECURE_COOKIE`: Habilita la flag `Secure` en la cookie HTTPOnly `access_token` cuando se ejecuta sobre HTTPS.
  - `CORS_ORIGINS`: Lista de orígenes autorizados para peticiones cross-origin.
  - `SECRET_KEY`: Llave criptográfica para la firma de tokens JWT HS256.
  - `ENCRYPTION_KEY`: Clave simétrica Fernet de 32 bytes para cifrado de configuraciones en base de datos.
  - `GEMINI_API_KEY`: Credencial para el servicio de OCR multimodal.
  - `DATA_DIR`: Directorio de archivos `/data`.
- **Volumen:** `yanesu_data:/data`.
- **Healthcheck:** Comprueba el endpoint `/api/health` usando el runtime nativo de Python (`urllib.request`) para no depender de `curl` ni `wget`:
  ```yaml
  test: ["CMD-SHELL", "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')\" || exit 1"]
  interval: 5s
  timeout: 5s
  retries: 10
  start_period: 15s
  ```

#### 3. Servicio `nginx` (Frontend y Enrutador)
- **Imagen:** `ghcr.io/jesus-1205/sistema_inventario_local-frontend:master`.
- **Dependencia:** Requiere que `backend` alcance el estado `service_healthy`.
- **Puertos:** `80:80` (recibe el tráfico HTTP principal del host o el proxy inverso ascendente).
- **Funcionalidad:** Sirve la SPA React precompilada y reenvía `/api/` hacia `http://backend:8000`.

#### 4. Servicio `n8n` (Automatizaciones y Bots)
- **Imagen:** `docker.n8n.io/n8nio/n8n:latest`.
- **Init:** `init: true`.
- **Puertos:** `${N8N_BIND_PORT:-127.0.0.1:5678}:5678`.
- **Zona Horaria Forzada:** `GENERIC_TIMEZONE=America/Caracas` y `TZ=America/Caracas`.
- **Volumen Persistente:** `n8n_data:/home/node/.n8n` (almacena bases de datos SQLite internas de n8n, historial de ejecuciones, credenciales cifradas y diagramas de flujo).
- **Comunicación M2M:** n8n se comunica directamente con el backend mediante la URL interna `http://backend:8000/api/...` resolviendo por DNS de Docker en la red `yanesu_net`, eliminando latencia de red pública y riesgos de interceptación.

### 3.3. Volúmenes Persistentes y Seguridad de Datos

Docker Compose gestiona tres volúmenes nombrados independientes:
1. `pgdata`: Almacén relacional principal de PostgreSQL (transacciones, ventas, inventario, auditoría).
2. `yanesu_data`: Almacenamiento local para documentos escaneados, respaldos y adjuntos.
3. `n8n_data`: Estado persistente del motor de flujos de n8n.

---

## 4. Arquitectura de Automatizaciones n8n y Webhooks M2M

La integración entre **n8n**, el **Backend FastAPI** y el **Bot de Telegram** conforma un ecosistema de automatización empresarial autónomo para el negocio.

### 4.1. Mecanismo de Autenticación M2M (`X-API-Key`)

Para permitir la comunicación máquina a máquina (M2M) segura sin requerir sesiones de usuario interactivas ni renovación de tokens JWT:

1. **Estructura y Generación de Llaves (`backend/scripts/generate_api_key.py`):**
   - El script genera un token criptográfico de alta entropía con prefijo identificativo: `ys_` seguido de 32 bytes en formato URL-safe (`secrets.token_urlsafe(32)`), totalizando ~46 caracteres alfanuméricos.
   - Ejemplo: `ys_N8x2K4L9p_Q7rT8uV1wX4yZ2aB5cD8eF1gH3jK6mN9`.
2. **Almacenamiento Criptográfico Unidireccional:**
   - La base de datos nunca almacena la API Key en texto plano.
   - Se calcula el hash criptográfico SHA-256 (`hashlib.sha256(raw_key.strip().encode()).hexdigest()`) y se persiste en la tabla `api_keys` (`backend/app/models/api_key.py`):
     - `id`: Entero autoincremental.
     - `name`: Nombre descriptivo del agente (ej. `n8n-bcv-agent`, `n8n-telegram-bot`).
     - `key_hash`: String de 64 caracteres hexadecimales (con índice único `index=True`, `unique=True`).
     - `is_active`: Booleano para revocación inmediata sin eliminar registros.
     - `created_at`: Timestamp con zona horaria de Caracas (`America/Caracas`).
3. **Inyección de Dependencia (`backend/app/core/dependencies.py`):**
   - La función `verify_api_key` intercepta la cabecera HTTP `X-API-Key`.
   - Si la cabecera está ausente, arroja `HTTP 401 Unauthorized` con detalle `"Header X-API-Key no proporcionado"`.
   - Calcula el hash SHA-256 de la clave recibida y ejecuta una consulta parametrizada con SQLAlchemy 2.0:
     ```python
     stmt = select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_active.is_(True))
     api_key = db.execute(stmt).scalars().first()
     ```
   - Si no existe coincidencia activa, arroja `HTTP 401 Unauthorized` con detalle `"API Key inválida o inactiva"`.
4. **Trazabilidad No Repudiable:**
   - Todo acceso vía M2M queda registrado de forma indeleble en la tabla de auditoría (`log_action` en `audit_service.py`), registrando como usuario la identidad formateada `m2m:{api_key.name}`, la IP del cliente y el detalle de la operación.

### 4.2. Webhook de Sincronización Cambiaria BCV (`/api/webhooks/bcv-sync`)

Ubicado en `backend/app/routes/webhooks.py`, este router expone los endpoints necesarios para la ingesta y consulta de sincronización cambiaria.

#### 1. Ingesta de Tasas (`POST /api/webhooks/bcv-sync`)
- **Headers:** `X-API-Key: ys_...`, `Content-Type: application/json`.
- **Payload de Entrada (`ExchangeRateBulkSave`):**
  ```json
  {
    "usd": 45.1234,
    "eur": 49.5678
  }
  ```
- **Lógica de Negocio e Idempotencia:**
  - El servicio `save_rates(db, data, api_key_id=api_key.id)` consulta la última tasa registrada en el sistema (`get_latest_rate`).
  - **Idempotencia Estricta:** Si los valores de `usd` y `eur` entrantes son idénticos al último registro activo, el servicio no inserta un duplicado en la base de datos y retorna `(latest, False)`.
  - El endpoint responde con **HTTP 200 OK** si la tasa no varió, o con **HTTP 201 Created** si se persistió una nueva tasa.
  - Al crearse una nueva tasa, se emite inmediatamente un evento SSE a través de `rate_broadcaster.publish()`, notificando en tiempo real a todos los navegadores y terminales POS abiertos sin recargar la página.
- **Respuesta (`ExchangeRateOut`):**
  ```json
  {
    "id": 142,
    "tasa_usd": "45.1234",
    "tasa_eur": "49.5678",
    "fecha_registro": "2026-10-19T14:30:00-04:00",
    "registrado_por_nombre": "Automático"
  }
  ```

#### 2. Comprobación de Estado Diario (`GET /api/webhooks/bcv-sync`)
- Permite al flujo de n8n verificar si el agente ya sincronizó la tasa en el día calendario actual de Caracas antes de ejecutar el scraping web.
- **Respuesta:**
  ```json
  {
    "already_synced_today": true,
    "last_synced_at": "2026-10-19T09:05:12-04:00",
    "current_rate": {
      "usd": "45.1234",
      "eur": "49.5678"
    }
  }
  ```

### 4.3. Pipeline de Scraping Web y Resiliencia (`backend/app/core/bcv_scraper.py`)

El módulo `bcv_scraper.py` implementa el algoritmo de extracción web sobre el portal del Banco Central de Venezuela (`https://www.bcv.org.ve`):

```
                   PIPELINE DE SCRAPING Y RESILIENCIA BCV
                   
    +-----------------------------------------------------------+
    | 1. HTTP GET https://www.bcv.org.ve                        |
    |    - Headers: User-Agent real Chrome/125 + Accept español |
    |    - Timeout: 30 segundos                                 |
    |    - SSL: verify=False + InsecureRequestWarning suprimido |
    +-----------------------------------------------------------+
                                  │
                                  ▼
    +-----------------------------------------------------------+
    | 2. Parseo HTML con BeautifulSoup4                         |
    |    - Busca div#dolar y div#euro                           |
    |    - Extrae texto de strong.strong-tb                     |
    +-----------------------------------------------------------+
                                  │
                                  ▼
    +-----------------------------------------------------------+
    | 3. Normalización Aritmética                               |
    |    - Reemplazo ',' por '.' y eliminación de espacios      |
    |    - Coerción a Decimal con cuantización a 4 decimales:   |
    |      Decimal(norm).quantize(Decimal("0.0001"))            |
    +-----------------------------------------------------------+
                                  │
                 ┌────────────────┴────────────────┐
                 │ ¿Éxito?                         │
           [SÍ]  ▼                           [NO]  ▼
    +-------------------------+       +-------------------------+
    | Retorna dict con tasas: |       | Arroja ConnectionError  |
    | {"USD": ..., "EUR": ...}|       | o RuntimeError          |
    +-------------------------+       +-------------------------+
                 │                                 │
                 ▼                                 ▼
    +-------------------------+       +-------------------------+
    | Ingesta en BD / SSE     |       | POS Fallback: Utiliza   |
    | Notificación a terminales|      | última tasa activa de BD|
    +-------------------------+       +-------------------------+
```

#### Medidas de Resiliencia Implementadas
1. **Bypass de Inconsistencias de Certificados SSL:**
   - Las instituciones bancarias del Estado venezolano sufren con frecuencia de desactualizaciones en sus certificados SSL intermedios, cadenas autofirmadas o incompatibilidades con almacenes raíz de CA occidentales.
   - La petición utiliza `verify=False` y suprime los avisos mediante `warnings.filterwarnings("ignore", category=InsecureRequestWarning)`.
2. **Timeout Riguroso de 30 Segundos:** Evita el bloqueo del proceso worker de Uvicorn si el portal gubernamental experimenta denegación de servicio o latencia severa.
3. **Manejo de Excepciones Específicas:**
   - Errores de transporte de red (`requests.RequestException`) se capturan y re-emiten como `ConnectionError("No se pudo conectar con https://www.bcv.org.ve: ...")`.
   - Modificaciones imprevistas en la maquetación HTML del BCV se detectan si no se extrae ninguna tasa, lanzando `RuntimeError("No se encontraron tasas. La estructura del sitio puede haber cambiado.")`.
4. **Continuidad Operativa en POS (Zero Downtime):**
   - El punto de venta jamás se detiene ante una caída del portal del BCV. Los terminales POS consultan el endpoint `/api/exchange-rates/latest`, el cual opera sobre el registro más reciente en la base de datos local.
   - En la interfaz administrativa (`ExchangeRatesPage.tsx`), si la consulta en vivo falla (HTTP 502 Bad Gateway), el sistema muestra un banner contextual y abre el panel rápido de edición (`RateQuickUpdatePanel.tsx`), permitiendo al gerente ingresar la tasa de forma manual sin interrumpir las ventas.

### 4.4. Diagrama del Workflow de Sincronización en n8n

El flujo implementado en n8n opera con una lógica de pre-chequeo para optimizar el consumo de ancho de banda y evitar peticiones redundantes:

```
[Cron Trigger: Cada 15 min (L-V 13:00 - 19:00 VET)]
                      │
                      ▼
[Nodo 1: HTTP GET http://backend:8000/api/webhooks/bcv-sync]
(Cabecera: X-API-Key: ys_...)
                      │
                      ▼
[Nodo 2: IF (¿json.already_synced_today === true?)]
         ├── [TRUE]  ➔ [Finalizar Flujo - Tasa ya registrada hoy]
         │
         └── [FALSE] ➔ [Nodo 3: HTTP GET https://www.bcv.org.ve]
                                   │
                                   ▼
                       [Nodo 4: HTML Extract (#dolar strong, #euro strong)]
                                   │
                                   ▼
                       [Nodo 5: Code Node (Normalización JavaScript)]
                                   │
                                   ▼
                       [Nodo 6: HTTP POST http://backend:8000/api/webhooks/bcv-sync]
                       (Body: { "usd": usd_val, "eur": eur_val })
```

#### Código del Nodo Normalizador en n8n (`Code Node`)
```javascript
const rawUsd = $input.first().json.usd_raw;
const rawEur = $input.first().json.eur_raw;

if (!rawUsd) {
  throw new Error("No se pudo encontrar el selector '#dolar strong' en la web del BCV");
}

const parseRate = (val) => {
  if (!val) return 0;
  // Reemplaza puntos de miles y sustituye coma decimal por punto
  const cleaned = val.replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const usd = parseRate(rawUsd);
const eur = parseRate(rawEur);

if (usd <= 0) {
  throw new Error(`Valor de tasa USD inválido: ${rawUsd}`);
}

return [{
  json: {
    usd: usd,
    eur: eur,
    timestamp: new Date().toISOString()
  }
}];
```

### 4.5. Endpoints de Reportes Periódicos (`backend/app/routes/n8n_agent.py`)

Para mantener informada a la dirección comercial sin requerir que ingresen a la aplicación web, el backend expone dos endpoints consolidados diseñados para ser consumidos por n8n y enviados a un canal o chat privado de Telegram:

#### 1. Reporte Diario Consolidado (`GET /api/n8n/reports/daily`)
- **Parámetros Opcionales:** `target_date` (formato `YYYY-MM-DD`, por defecto hoy en hora de Caracas vía `ve_today()`).
- **Autenticación:** Requiere `X-API-Key`.
- **Estructura del Payload (`DailyReportOut`):**
  ```json
  {
    "date": "2026-10-19",
    "tasa_bcv": "45.1234",
    "summary": {
      "total_usd": "1840.50",
      "total_bs": "83050.50",
      "transactions_count": 86,
      "average_ticket_usd": "21.40"
    },
    "sales_by_method": {
      "DIVISA_EFECTIVO": { "usd": "1120.00", "bs": "0.00", "tx_count": 48 },
      "PAGO_MOVIL": { "usd": "520.50", "bs": "23487.00", "tx_count": 28 },
      "PUNTO_DE_VENTA": { "usd": "200.00", "bs": "9024.68", "tx_count": 10 }
    },
    "top_products": [
      { "name": "Cerveza Polar Pilsen 222ml Retornable", "qty": 144 },
      { "name": "Ron Cacique 750ml", "qty": 18 },
      { "name": "Hielo en Bolsa 3kg", "qty": 35 }
    ]
  }
  ```
- **Programación Recomendada:** Cron diario a las 9:30 AM (reportando la jornada de ayer) o al cierre de caja a las 10:00 PM.

#### 2. Reporte Semanal Consolidado (`GET /api/n8n/reports/weekly`)
- **Cálculo del Rango Semanal:** Toma como fecha de corte el sábado más reciente respecto a la fecha objetivo y retrocede 5 días hasta el lunes (ciclo comercial estándar lunes a sábado).
- **Estructura del Payload (`WeeklyReportOut`):**
  - Resumen global de la semana (`total_usd`, `total_bs`, número de transacciones, promedio diario en USD).
  - Identificación del mejor día de venta (`best_day`: nombre del día, fecha y total facturado).
  - Desglose consolidado de ingresos por método de pago.
  - Categoría con mayor volumen de facturación (`top_category`).
  - Top 5 de productos más vendidos en la semana.
  - **Módulo de Cuentas por Pagar a Proveedores (`pending_invoices_summary`):**
    - `total_pending_usd`: Saldo acumulado por pagar.
    - `total_invoices_pending`: Cantidad de facturas pendientes o con pagos parciales.
    - `soonest_due_date`: Fecha de vencimiento más próxima para alertas de tesorería.

### 4.6. Suite de Herramientas para Function Calling del Agente Telegram (`/api/n8n/tools/*`)

Para dotar al Bot de Telegram de capacidades conversacionales avanzadas con modelos de lenguaje (LLMs vía n8n AI Agent), el backend proporciona un conjunto de **11 herramientas de consulta especializadas**.

Todas las herramientas validan la cabecera `X-API-Key`, aplican auditoría automática en `log_action` bajo la acción `CONSULTA_M2M` y devuelven respuestas JSON estructuradas con tipos `Decimal` serializados:

| Endpoint de la Herramienta | Parámetros de Consulta | Propósito / Funcionalidad | Schema de Retorno |
| :--- | :--- | :--- | :--- |
| `GET /api/n8n/tools/products/search` | `q` (nombre o código de barra), `low_stock` (booleano), `limit` (1-200) | Búsqueda difusa de productos en inventario y detección de stock crítico (`stock_unidades <= stock_minimo`). | `List[ProductSearchToolItem]` |
| `GET /api/n8n/tools/products/{product_id}/sales-history` | `product_id` (en path), `start_date`, `end_date` | Consulta agregada de unidades vendidas, ingresos brutos en USD y conteo de transacciones de un producto específico. | `ProductSalesHistoryOut` |
| `GET /api/n8n/tools/sales/metrics` | `start_date`, `end_date` | Métricas generales de ventas en un periodo: facturación en USD y VES, total de tickets, categoría líder y desglose por método. | `SalesMetricsOut` |
| `GET /api/n8n/tools/sales/peak-hours` | `start_date`, `end_date` | Distribución horaria de ventas (0 a 23 horas) con conteo de tickets y montos recaudados para análisis de horas pico. | `List[PeakHoursItem]` |
| `GET /api/n8n/tools/sales/search` | `target_date`, `start_time`, `end_time`, `product_name`, `limit` (1-100) | Búsqueda granular de recibos/tickets POS con filtrado por ventana de hora del día o contenido de artículos específicos. | `List[SaleSearchItem]` |
| `GET /api/n8n/tools/invoices/search` | `q` (número factura o proveedor), `product_name`, `status`, `due_after`, `due_before`, `limit` | Búsqueda de facturas de compras a proveedores con cálculo exacto de saldo adeudado (`saldo_pendiente_usd`) en multimoneda. | `List[InvoiceSearchItem]` |
| `GET /api/n8n/tools/system/exchange-rate` | `history` (booleano), `limit` (1-20) | Consulta de la tasa oficial vigente (USD y EUR) o el historial cronológico de cambios y autor de registro. | `ExchangeRateToolOut` (o lista) |
| `GET /api/n8n/tools/system/users` | Ninguno | Directorio de usuarios registrados, roles del sistema (`rol_nombre`) y estado de actividad (`activo`). | `List[UserToolItem]` |
| `GET /api/n8n/tools/system/top-suppliers` | `limit` (1-50) | Ranking de proveedores ordenados por volumen total de facturación en dólares y cantidad de compras realizadas. | `List[TopSupplierItem]` |
| `GET /api/n8n/tools/categories/top` | `order_by` (`sales`, `revenue`, `margin`), `limit` (1-50) | Clasificación de categorías según unidades vendidas, ingresos brutos o margen porcentual promedio de ganancia. | `List[CategoryTopToolItem]` |
| `GET /api/n8n/tools/categories/search` | `q` (nombre de categoría), `limit` (1-20) | Inspección de categorías con desglose analítico de sus productos más vendidos, precios unitarios y rentabilidad individual. | `List[CategorySearchToolItem]` |

#### Ejemplo de Consulta de Facturas y Conciliación Multimoneda en Herramienta
En `backend/app/services/n8n_agent_service.py` (`search_invoices`), el cálculo del saldo adeudado contempla que los abonos a proveedores pueden haberse efectuado en bolívares o dólares:

```python
# Extracto verificado de n8n_agent_service.py (L506-515)
total_con_iva_usd, _ = _calcular_total_con_iva(inv, db)
total_pagado_usd = sum((p.monto_usd or Decimal("0.00")) for p in inv.payments)

pagos_bs_only = [p for p in inv.payments if (p.monto_usd or Decimal("0.00")) <= 0 and (p.monto_bs or Decimal("0.00")) > 0]
if inv.tasa_bs > 0 and pagos_bs_only:
    total_pagado_bs_only = sum((p.monto_bs or Decimal("0.00")) for p in pagos_bs_only)
    total_pagado_usd += (total_pagado_bs_only / inv.tasa_bs).quantize(Decimal("0.01"))

saldo_pendiente = max(Decimal("0.00"), total_con_iva_usd - total_pagado_usd)
```
Esto garantiza que la respuesta devuelta al Bot de Telegram (`saldo_pendiente_usd`) refleje el balance real tras amortizaciones en moneda local convertidas a la tasa contractual de la factura.

### 4.7. Arquitectura del Bot de Telegram en n8n

El bot directivo de Telegram aprovecha la infraestructura contenerizada de n8n:

1. **Recepción en Tiempo Real:** El nodo `Telegram Trigger` escucha eventos a través de Webhook. Al estar configurada la variable `N8N_WEBHOOK_URL=https://n8n.deine32yanera-saiten.com/`, n8n se suscribe automáticamente a la API de Telegram con cifrado TLS.
2. **Seguridad de Acceso:** El flujo de n8n valida el `chat_id` o `user_id` de Telegram contra una lista blanca de administradores autorizados antes de procesar cualquier comando.
3. **Orquestación con LLM:** Se utiliza el nodo `AI Agent` de n8n conectado a OpenAI o Google Gemini, configurando los endpoints de `/api/n8n/tools/*` como herramientas HTTP de *Function Calling*.
4. **Respuestas Ejecutivas:** Los dueños de la licorería pueden interactuar directamente por audio o texto:
   - *"¿Cuánto hemos vendido hoy y cuál es el producto que más ha salido?"*
   - *"¿Qué facturas de Polar se vencen esta semana?"*
   - *"Avísame si nos estamos quedando sin Cacique o Polar Negra."*

---

## 5. Guía de Despliegue en Servidor VPS y Producción

Esta sección formaliza el protocolo estándar de despliegue en un servidor virtual privado (VPS) con sistema operativo Ubuntu 22.04 / 24.04 LTS y dominio comercial (ej. `deine32yanera-saiten.com`).

### 5.1. Matriz de Variables de Entorno de Producción (`.env`)

En la raíz del proyecto, el archivo `.env` consolida los parámetros operativos:

| Variable | Tipo | Ejemplo de Valor | Propósito y Restricción |
| :--- | :--- | :--- | :--- |
| `POSTGRES_USER` | String | `yanesu` | Usuario principal de la base de datos PostgreSQL. |
| `POSTGRES_PASSWORD` | Secret | `xK9#mQ2$vL8!zP4` | Contraseña fuerte de base de datos (mínimo 16 caracteres aleatorios). |
| `POSTGRES_DB` | String | `licoreria` | Nombre de la base de datos relacional. |
| `SECRET_KEY` | Secret | `7f8a9b2c3d4e5f6...` | Semilla criptográfica de 64 bytes para firma de JWT HS256. |
| `ENCRYPTION_KEY` | Secret (Base64) | `K3v9xL2...=` | Clave Fernet de 32 bytes generada vía `Fernet.generate_key()`. |
| `SECURE_COOKIE` | Booleano | `true` | Obliga a que la cookie de sesión solo viaje sobre canales HTTPS. |
| `CORS_ORIGINS` | URL | `https://yanera-saiten.com` | Origen web permitido para interactuar con la API REST. |
| `GEMINI_API_KEY` | Secret | `AIzaSy...` | Llave de API de Google Gemini para procesamiento OCR de facturas. |
| `N8N_HOST` | Dominio | `n8n.yanera-saiten.com` | Host público asignado al panel y webhooks de n8n. |
| `N8N_PORT` | Puerto | `5678` | Puerto interno del contenedor n8n. |
| `N8N_PROTOCOL` | Protocolo | `https` | Protocolo de acceso público. |
| `N8N_WEBHOOK_URL` | URL | `https://n8n.yanera-saiten.com/` | URL base para el registro de webhooks de Telegram y servicios externos. |
| `N8N_BIND_PORT` | IP:Puerto | `127.0.0.1:5678` | Restricción de escucha de n8n a localhost para forzar paso por proxy Nginx. |
| `N8N_ENCRYPTION_KEY` | Secret | `e4b2c1...` | Llave para cifrar credenciales y tokens en la base interna de n8n. |

### 5.2. Configuración de Nginx Host del VPS (Terminación SSL Cloudflare)

En el servidor VPS, se configura un servidor Nginx nativo que actúa como terminador SSL y proxy hacia los contenedores Docker:

#### Bloque de Configuración para n8n (`/etc/nginx/sites-available/n8n`)
```nginx
# Redirección forzada HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name n8n.yanera-saiten.com;

    return 301 https://$host$request_uri;
}

# Bloque SSL principal para n8n
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name n8n.yanera-saiten.com;

    # Certificados Cloudflare Origin CA
    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;

        # Cabeceras requeridas para WebSockets del lienzo y streaming de n8n
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

### 5.3. Procedimiento de Puesta en Marcha en Producción

El protocolo de despliegue inicial se ejecuta en 5 fases secuenciales:

```bash
# Paso 1: Clonar el repositorio y configurar variables de entorno
git clone https://github.com/Jesus-1205/Sistema_inventario.git /opt/yanesu
cd /opt/yanesu
cp .env.example .env
nano .env

# Paso 2: Autenticación en GHCR para descargar imágenes precompiladas
echo "$CR_PAT" | docker login ghcr.io -u Jesus-1205 --password-stdin

# Paso 3: Levantar el stack completo de contenedores en modo detached
docker compose up -d

# Paso 4: Validar el estado de salud de todos los contenedores
docker compose ps
# Salida esperada:
# yanesu-shisutemu-db-1        postgres:16-alpine    Up (healthy)   127.0.0.1:5432->5432/tcp
# yanesu-shisutemu-backend-1   ...-backend:master    Up (healthy)   8000/tcp
# yanesu-shisutemu-nginx-1     ...-frontend:master   Up             0.0.0.0:80->80/tcp
# yanesu-shisutemu-n8n-1       n8n:latest            Up             127.0.0.1:5678->5678/tcp

# Paso 5: Generar la API Key M2M de producción para n8n
docker compose exec backend python scripts/generate_api_key.py "n8n-production-agent"
```

### 5.4. Plan de Recuperación ante Desastres (DRP) y Respaldos

Para salvaguardar la integridad de la base de datos de producción:

1. **Respaldo Lógico Diario Automatizado:**
   Se programa una tarea Cron en el anfitrión que ejecuta `pg_dump` dentro del contenedor `db`:
   ```bash
   0 3 * * * docker compose -f /opt/yanesu/docker-compose.yml exec -T db pg_dump -U yanesu licoreria | gzip > /backups/yanesu_$(date +\%F).sql.gz
   ```
2. **Procedimiento de Restauración:**
   ```bash
   gunzip -c /backups/yanesu_2026-10-19.sql.gz | docker compose exec -T db psql -U yanesu -d licoreria
   ```
3. **Respaldo de Flujos n8n:** El volumen persistente `n8n_data` se incluye en las copias de seguridad de carpetas del servidor para preservar los identificadores de webhooks y credenciales de Telegram configuradas.
