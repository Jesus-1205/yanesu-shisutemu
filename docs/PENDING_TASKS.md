# Tareas Pendientes

**Fecha:** Julio 2026  
**Rama:** `fix/critical-bugs`

Leyenda: `- [x]` = arreglada · `- [ ]` = pendiente

---

## Críticas

### 1. Pantalla negra al primera venta sin tasa BCV
- [x] **Arreglada** (commit `0a1e359`: guard en POS + CheckoutDrawer)
**Severidad:** Crítica  
**Ubicación:** Cadena completa (ver abajo)

Al instalar por primera vez, si no se ha registrado ninguna tasa de cambio BCV, intentar crear una venta produce un error 422 de Pydantic y una pantalla negra con JSON de error.

**Cadena de fallo:**

| Paso | Archivo | Qué pasa |
|------|---------|----------|
| 1 | `exchangeRateStore.ts:15` | `tasa` se inicializa en `0` |
| 2 | `exchange_rate_service.py:51-58` | `/exchange-rates/latest` retorna `{ rates: {} }` cuando no hay tasas guardadas |
| 3 | `exchangeRateStore.ts:25` | `Number(undefined) \|\| 0` = `0`, `tasa` queda en `0` |
| 4 | `cartStore.ts:116` | Al agregar primer producto, `snapshotTasa` captura `0` |
| 5 | `cartStore.ts:59-66` | Suscripción nunca actualiza porque `state.tasa > 0` es falso |
| 6 | `CheckoutDrawer.tsx:52,112` | `tasaNum` = `0`, se envía `tasa_bcv_aplicada: 0` |
| 7 | `sale.py:53` (schema Pydantic) | `Field(gt=0)` rechaza `0` → error 422 |
| 8 | `sales.py:36` (ruta) | FastAPI retorna error antes de llegar a `create_sale` |

**Fix aplicado:**
- Frontend: Bloquear botón "Cobrar" si `snapshotTasa <= 0` con mensaje claro ("Registra la tasa BCV antes de vender")
- Backend: Mensaje de error claro en vez de 422 genérico

---

### 2. SECRET_KEY hardcodeada
- [x] **Arreglada** (commit `0a1e359`: `get_secret_key()` persistente en AppData)
**Severidad:** Crítica (si se expone en red)  
**Archivo:** `backend/app/core/config.py:45`

```python
SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
```

Si no hay variable de entorno, la app usa `"supersecretkey"`. JWTs firmados con esta clave son falsificables.

**Fix:** Generar clave aleatoria al primer inicio y guardarla en `AppData/Local/SistemaLicoreria/.secret_key`.

---

## Altas

### 3. Tauri no maneja fallo del sidecar
- [x] **Arreglada** (commit `b8444c2`: diálogo de error fatal + `process::exit(1)`)
**Severidad:** Alta  
**Archivo:** `licoreria-desktop/src-tauri/src/lib.rs:18-22`

Si el sidecar no se puede ejecutar (DLL faltante, permisos), la app crashea con panic de Rust sin mensaje útil para el usuario.

```rust
// Actual: panic sin contexto
sidecar.spawn().expect("Failed to spawn sidecar");

// Debería: mostrar diálogo de error y cerrar graceful
```

---

### 4. Backend queda corriendo al cerrar la app
- [x] **Arreglada** (commit `b8444c2`: `kill()` del sidecar en `ExitRequested`/`Exit` + hook NSIS pre-uninstall)
**Severidad:** Alta  
**Archivo:** `licoreria-desktop/src-tauri/src/lib.rs:23`

Al cerrar la ventana de Tauri, el sidecar (`sistema_licoreria.exe`) **no se mata**: `sidecar.spawn()` no está asociado al ciclo de vida de la ventana. Cada apertura/cierre deja un proceso Python huérfano compitiendo por puertos. Además, el proceso mantiene bloqueados `inventario.db` y los archivos de `AppData/Local/SistemaLicoreria/`, por lo que la desinstalación no puede borrar la data aunque el usuario marque "eliminar datos".

**Fix:**
- Manejar `RunEvent::ExitRequested`/`RunEvent::Exit` en `lib.rs` y matar el sidecar (guardar el `CommandChild` y llamar a `kill()`).
- Verificar en el desinstalador NSIS que ningún proceso `sistema_licoreria.exe` quede vivo antes de borrar archivos.

---

## Medias

### 5. Consola visible del sidecar
- [x] **Arreglada** (commit `ac5678b`: `console=False` + logging a AppData/logs/sistema.log)
**Severidad:** Media  
**Archivo:** `backend/build.spec:70`

`console=True` hace que `sistema_licoreria.exe` abra una ventana de consola negra cada vez que se ejecuta. Para una app de escritorio, debe ser `console=False`.

---

### 6. SetupPage demasiado grande (scroll vertical)
- [x] **Arreglada** (commit `bb6d496`: grid `md:grid-cols-2` + `max-w-2xl`)
**Severidad:** Media (UX)  
**Archivo:** `frontend/src/features/auth/pages/SetupPage.tsx`

El formulario de 5 campos en una sola columna (`max-w-md`) requiere scroll vertical en pantallas pequeñas.

**Fix:** Distribuir en 2 columnas (izquierda: usuario/email, derecha: nombre/password/confirmación), ampliar el contenedor a `max-w-2xl`.

---

### 7. Sleep hardcodeado de 3 segundos
- [x] **Arreglada** (commit `78dfac8`: polling de `.port` cada 500ms)
**Severidad:** Media  
**Archivo:** `licoreria-desktop/src-tauri/src/lib.rs:25`

`std::thread::sleep(Duration::from_secs(3))` asume que el backend tarda menos de 3s. En primera ejecución (creación de BD) puede tardar más, causando que Tauri lea `.port` antes de que exista y navegue al puerto incorrecto.

**Fix:** Polling con timeout (leer `.port` cada 500ms hasta 15s max).

---

### 8. SECURE_COOKIE = False por defecto
- [x] **Arreglada** (commit `ac5678b`: `SECURE_COOKIE` default `True`; tests lo desactivan vía env)
**Severidad:** Media  
**Archivo:** `backend/app/core/config.py:52`

Cookies JWT se envían sin flag `Secure`. Aceptable para localhost, pero si el backend se expone en red, los tokens viajan en texto plano.

---

### 9. CSP script-src unsafe-inline
- [x] **Arreglada** (commit `b8444c2`: `script-src 'self'` sin `'unsafe-inline'`)
**Severidad:** Media  
**Archivo:** `licoreria-desktop/src-tauri/tauri.conf.json:22`

`script-src 'unsafe-inline'` debilita protección XSS. Si un campo (nombre de producto, factura) contiene HTML/JS inyectado, podría ejecutarse.

---

### 10. Email sin truncamiento en tabla de usuarios (scroll horizontal)
- [x] **Arreglada** (commit `bb6d496`: `max-w-[200px] truncate` + `title`)
**Severidad:** Media (UX)  
**Archivo:** `frontend/src/features/users/pages/UsersPage.tsx:110`

La columna email se renderiza como texto plano (`whitespace-nowrap`) sin límite de ancho. Emails largos como `usuario.ejemplo@gmail.com` empujan la tabla y generan scroll horizontal.

**Fix:** Agregar función `render` con truncamiento:
```tsx
{ key: "email", header: "Email", render: (u: User) => (
  <span className="block max-w-[200px] truncate" title={u.email}>{u.email}</span>
)},
```

---

### 11. Filtro de fechas en ventas no inclusivo (timezone)
- [x] **Arreglada** (commit `4a5b713`: helper `_to_ve_boundary` + tests de bordes VE)
**Severidad:** Media  
**Archivos:**
- `frontend/src/features/sales/pages/SalesPage.tsx:27-28` — envía `"2025-07-31"` (string plano)
- `backend/app/routes/sales.py:40-44` — parsea como `datetime` naive (sin timezone)
- `backend/app/services/sale_service.py:98-101,115-118` — compara contra `fecha_venta` (timezone-aware VE)
- `backend/app/models/sale.py:15` — `DateTime(timezone=True)` con `VE_NOW`

El frontend envía fechas como `"2025-07-31"`. FastAPI las parsea como `datetime(2025, 7, 31, 0, 0)` naive. La DB almacena en VE (UTC-4). La comparación `<=` contra columna timezone-aware produce resultados impredecibles en bordes de día.

**Fix:** En `sale_service.py`, convertir la fecha recibida antes de comparar:
```python
from app.core.timezone import VE_TZ
from datetime import datetime, time

if fecha_desde:
    fd = datetime.combine(fecha_desde.date() if isinstance(fecha_desde, datetime) else fecha_desde, time.min, tzinfo=VE_TZ)
    stmt = stmt.where(Sale.fecha_venta >= fd)
if fecha_hasta:
    fh = datetime.combine(fecha_hasta.date() if isinstance(fecha_hasta, datetime) else fecha_hasta, time.max, tzinfo=VE_TZ)
    stmt = stmt.where(Sale.fecha_venta <= fh)
```

---

### 12. Sin retroalimentación visual al descargar archivos
- [x] **Arreglada** (commit `58db7aa`: toast de confirmación en 16 tablas + descarga blob de imagen con toast)
**Severidad:** Media  
**Archivos:**
- `frontend/src/lib/exportToExcel.ts:34-61` — `XLSX.writeFile`
- `frontend/src/features/invoices/pages/InvoiceDetailPage.tsx:135` — `window.open` para imagen de factura

En el navegador web el usuario ve el ícono de descarga del navegador, pero al embeber en Tauri (WebView2) la descarga es **silenciosa**: el archivo se guarda en `Downloads` sin ninguna indicación visual. El usuario no sabe si la exportación funcionó.

**Fix:** Mostrar un toast de confirmación ("Archivo descargado: Ventas_2026-07-31.xlsx") al completar la exportación, o usar un plugin Tauri (`tauri-plugin-dialog`/`tauri-plugin-fs`) con selector de destino visible. Para la imagen de factura, reemplazar `window.open` por un flujo de descarga con confirmación.

---

### 13. Link "Google AI Studio" no abre en la app de escritorio
- [x] **Arreglada** (commit `bb6d496`: `@tauri-apps/plugin-opener` vía `openExternal` con fallback `window.open`)
**Severidad:** Media  
**Archivo:** `frontend/src/features/system-settings/pages/SystemSettingsPage.tsx:224`

El link `<a href="https://aistudio.google.com/apikey" target="_blank">` funciona en el navegador, pero en Tauri `target="_blank"` no abre el navegador externo: el click no hace nada.

**Fix:** Abrir el link con el plugin `tauri-plugin-opener` (o la API `open` de `tauri-plugin-shell`) para abrir en el navegador por defecto.

---

## Bajas

### 14. Fallback silencioso a puerto 8000
- [ ] **Pendiente**
**Severidad:** Baja  
**Archivo:** `licoreria-desktop/src-tauri/src/lib.rs:29-39`

Si `.port` no existe o no se puede leer, usa 8000 como fallback. Si el backend arrancó en otro puerto, la pantalla queda en blanco sin error visible.

---

### 15. CORS overly permissive
- [ ] **Pendiente**
**Severidad:** Baja  
**Archivo:** `backend/app/main.py:45-46`

`allow_methods=["*"]` y `allow_headers=["*"]` son más permisivos de lo necesario.

---

### 16. Test Pillow pre-existente falla
- [ ] **Pendiente**
**Severidad:** Baja  
**Archivo:** `backend/tests/test_services/test_invoice_ai.py:65,84`

`test_valid_image_returns_jpeg` y `test_large_image_resized` fallan dependiendo de la versión de Pillow. El código de producción (`optimize_image`) funciona bien; el problema es assertions excesivamente estrictas en los tests.

---

### 17. Iconos placeholder
- [ ] **Pendiente**
**Severidad:** Baja  
**Archivo:** `licoreria-desktop/src-tauri/icons/`

Los iconos PNG son cuadrados azules genéricos. Necesitan diseño real del negocio.

---

### 18. Ajuste de umbral fuzzy
- [ ] **Pendiente**
**Severidad:** Baja  
**Archivo:** `backend/app/services/invoice_service.py`

El umbral de 30.0 para `rapidfuzz` fue elegido conservador. Evaluar con datos reales si necesita ajuste.

---

### 19. Opción "Tasas de Cambio" duplicada (sidebar + settings)
- [ ] **Pendiente**
**Severidad:** Baja (UX)  
**Archivos:**
- `frontend/src/features/settings/components/SettingsNav.tsx:13`
- `frontend/src/router.tsx:140-141`
- `frontend/src/features/settings/pages/SettingsExchangeRatesPage.tsx` (wrapper vacío)

"Tasas de Cambio" aparece en **4 lugares**: sidebar admin (App.tsx:47), sidebar operador (App.tsx:61), settings sub-nav (SettingsNav.tsx:13), y breadcrumbs. `SettingsExchangeRatesPage.tsx` solo hace `return <ExchangeRatesPage />`.

**Fix:** Eliminar entrada de `SettingsNav.tsx:13`, eliminar ruta anidada en `router.tsx:140-141`, eliminar `SettingsExchangeRatesPage.tsx`. Mantener solo `/exchange-rates` del sidebar principal.

---

### 20. Aviso "Registra la tasa BCV" persiste tras registrar la tasa
- [ ] **Pendiente**
**Severidad:** Baja  
**Archivos:**
- `frontend/src/features/sales/pages/POSPage.tsx:67,240-251`
- `frontend/src/features/sales/store/cartStore.ts:59-66,116`
- `frontend/src/stores/exchangeRateStore.ts:21-36`

Después de registrar la tasa BCV en la página de tasas de cambio, el aviso "⚠ Registra la tasa BCV antes de cobrar" del POS puede seguir apareciendo, aunque la venta igualmente se puede completar.

El POS usa `snapshotTasa` del carrito (`POSPage.tsx:67`), que se captura al agregar el primer producto (`cartStore.ts:116`). La auto-sincronización vía suscripción (`cartStore.ts:59-66`) solo actualiza `snapshotTasa` si ya hay items en el carrito **y** `snapshotTasa` es exactamente `0`; si la tasa se registra con el carrito vacío o `loadTasa()` falla silenciosamente (`exchangeRateStore.ts:33-35`), `snapshotTasa` queda en `0` y el aviso no desaparece.

**Fix sugerido:** Sincronizar `snapshotTasa` desde `useExchangeRateStore.getState().tasa` al montar el POS / al abrir el checkout, y no depender únicamente de la suscripción frágil.

---

## Resumen

| Severidad | Total | Arregladas | Pendientes |
|-----------|-------|------------|------------|
| Crítica | 2 | 2 | 0 |
| Alta | 2 | 2 | 0 |
| Media | 10 | 10 | 0 |
| Baja | 6 | 0 | 6 |
| **Total** | **20** | **14** | **6** |
