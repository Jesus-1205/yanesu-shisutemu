# Integración y Configuración de n8n (Yanesu Shisutemu)

Este documento detalla la arquitectura, configuración, pruebas locales y despliegue del contenedor de **n8n** para la automatización de tareas (agente de sincronización de tasa BCV y futuros bots como Telegram).

---

## 1. Arquitectura de Red y Flujo de Comunicación

El contenedor `n8n` se integra dentro de la misma red bridge `yanesu_net` en Docker Compose:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Docker Host (VPS o Local)                                              │
│                                                                        │
│   Red interna: yanesu_net                                              │
│                                                                        │
│   ┌───────────────────┐               ┌───────────────────────────┐    │
│   │   n8n Container   │ ──(HTTP POST)─▶   FastAPI Backend (8000)  │    │
│   │   Puerto: 5678    │               │   /api/webhooks/bcv-sync  │    │
│   └─────────▲─────────┘               └─────────────┬─────────────┘    │
│             │                                       │                  │
│             │ (WebSockets / HTTP)                   ▼                  │
│   ┌─────────┴─────────┐               ┌───────────────────────────┐    │
│   │  Nginx Host / SSL │               │   PostgreSQL DB (5432)    │    │
│   └───────────────────┘               └───────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

* **Comunicación Interna M2M:** n8n no necesita salir a internet para hablar con el backend. Utiliza el DNS interno de Docker: `http://backend:8000/api/webhooks/bcv-sync`.
* **Seguridad:** Autenticación por cabecera `X-API-Key` (SHA-256 en base de datos).
* **Persistencia:** Volumen `n8n_data:/home/node/.n8n` para almacenar workflows, ejecuciones y credenciales.

---

## 2. Guía de Pruebas en Local (Docker Compose)

Puedes probar todo el stack idéntico a producción en tu máquina de desarrollo.

### Paso 2.1: Preparar el archivo `.env` local

Copia el archivo de ejemplo en la raíz del repositorio:
```bash
cp .env.example .env
```

Asegúrate de tener las siguientes variables en `.env` para entorno local:
```env
# Base de datos
POSTGRES_USER=yanesu
POSTGRES_PASSWORD=changeme
POSTGRES_DB=licoreria

# Seguridad backend (en local sin HTTPS poner false)
SECRET_KEY=clave-secreta-local-muy-segura-12345
SECURE_COOKIE=false
CORS_ORIGINS=http://localhost

# n8n local
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_WEBHOOK_URL=http://localhost:5678/
N8N_BIND_PORT=127.0.0.1:5678
N8N_ENCRYPTION_KEY=clave-encriptacion-n8n-local-segura
```

### Paso 2.2: Levantar el Stack Docker

Ejecuta en tu terminal:
```bash
docker compose up -d
```

Verifica que los 4 contenedores estén corriendo (`db`, `backend`, `nginx`, `n8n`):
```bash
docker compose ps
```

### Paso 2.3: Generar la API Key para n8n

Dentro del contenedor del backend, ejecuta el script generador:
```bash
docker compose exec backend python scripts/generate_api_key.py "n8n-local-agent"
```
*Guarda la clave generada (ejemplo: `yn_live_abc123...`).*

### Paso 2.4: Acceder a n8n y Crear el Primer Flujo

1. Abre tu navegador en: **`http://localhost:5678`**
2. Configura tu cuenta inicial de administrador de n8n.
3. En el lienzo de n8n, crea el flujo de sincronización BCV descrito en la Sección 3.

---

## 3. Configuración del Workflow BCV en n8n

### Estructura de Nodos

```
[Schedule Trigger] ➔ [HTTP Request (BCV)] ➔ [HTML (Extract DOM)] ➔ [Code (Normalizer)] ➔ [HTTP Request (Webhook)]
```

---

### Nodo 1: Schedule Trigger (Disparador)
* **Trigger Interval:** `Custom (Cron)`
* **Cron Expression:** `0 9,13,17 * * 1-5` (Lunes a Viernes: 9:00 AM, 1:00 PM y 5:30 PM).
* **Timezone:** `America/Caracas`.

---

### Nodo 2: HTTP Request (Consultar Web BCV)
* **Method:** `GET`
* **URL:** `https://www.bcv.org.ve/`
* **Authentication:** `None`
* **Options:**
  * **Ignore SSL Issues:** `true`
  * **Response Format:** `String` (o Text)
  * **Headers:**
    * `User-Agent`: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`

---

### Nodo 3: HTML Node (Extraer contenido con Selectores CSS)
Este nodo parsea el árbol DOM igual que BeautifulSoup:
* **Operation:** `Extract HTML Content`
* **Source Data:** `JSON`
* **Data Property Name:** `data`
* **Extraction Values:**
  * **Elemento 1:**
    * **Key:** `usd_raw`
    * **CSS Selector:** `#dolar strong`
    * **Return Value:** `Text`
  * **Elemento 2:**
    * **Key:** `eur_raw`
    * **CSS Selector:** `#euro strong`
    * **Return Value:** `Text`

---

### Nodo 4: Code Node (Normalización y validación)
* **Language:** `JavaScript`
* **Code:**
```javascript
const rawUsd = $input.first().json.usd_raw;
const rawEur = $input.first().json.eur_raw;

if (!rawUsd) {
  throw new Error("No se pudo encontrar el selector '#dolar strong' en la web del BCV");
}

const parseRate = (val) => {
  if (!val) return 0;
  // Quitar puntos de miles y sustituir coma por punto
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

---

### Nodo 5: HTTP Request (Sincronizar con Yanesu Shisutemu)
* **Method:** `POST`
* **URL:** `http://backend:8000/api/webhooks/bcv-sync`
* **Authentication:** `Predefined Credential Type` ➔ `Header Auth` (Seleccionar `X-API-Key`).
* **Send Headers:**
  * `Content-Type`: `application/json`
* **Send Body:** `JSON`
* **Specify Body:** `Using JSON`
* **JSON:**
```json
{
  "usd": {{ $json.usd }},
  "eur": {{ $json.eur }}
}
```
* **Options:**
  * **Never Error:** `true`

---

## 4. Despliegue en VPS (Producción con Nginx y Cloudflare SSL)

Cuando decidas desplegar en tu servidor VPS (`tu-dominio.com`):

### 4.1 DNS en Cloudflare
Crea un registro DNS para el subdominio:
* **Tipo:** `CNAME` o `A`
* **Nombre:** `n8n` (apunta a `n8n.tu-dominio.com`)
* **Destino:** IP pública de tu VPS
* **Proxy Status:** `Proxied` (Nube Naranja activa)

### 4.2 Configuración del Nginx del VPS

Crea el archivo `/etc/nginx/sites-available/n8n`:
```nginx
# Redirección HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name n8n.tu-dominio.com;

    return 301 https://$host$request_uri;
}

# Bloque SSL principal de n8n
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name n8n.tu-dominio.com;

    # Certificados Cloudflare Origin existentes
    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;

        # Requerido para WebSockets del lienzo y streaming de n8n
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

Activa el sitio y recarga Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4.3 Variables en el `.env` del VPS
```env
N8N_HOST=n8n.tu-dominio.com
N8N_PROTOCOL=https
N8N_WEBHOOK_URL=https://n8n.tu-dominio.com/
N8N_BIND_PORT=127.0.0.1:5678
N8N_ENCRYPTION_KEY=clave-secreta-fija-de-produccion
```

Genera la API key en producción:
```bash
docker compose exec backend python scripts/generate_api_key.py "n8n-bcv-production"
```

---

## 5. Preparación para el Futuro Bot de Telegram

Gracias a esta infraestructura, crear el agente de Telegram es directo:

1. **Telegram Trigger en n8n:** Conecta el nodo `Telegram Trigger` usando el Bot Token de BotFather.
2. **Recepción en Tiempo Real:** Al estar configurado `N8N_WEBHOOK_URL=https://n8n.tu-dominio.com/`, n8n registrará automáticamente el Webhook en Telegram sin necesidad de polling.
3. **Consumo de la API:** El bot de Telegram puede consultar productos, ventas o inventario haciendo peticiones HTTP internas a `http://backend:8000/api/...` usando la API Key M2M.
