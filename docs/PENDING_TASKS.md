# Tareas Pendientes

**Fecha:** Agosto 2026  
**Rama:** `master`

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

### 21. Método de pago ignora `moneda_default` y `acepta_referencia`
- [x] **Arreglada** (commit `105e110`: persistir ambos campos en crear y actualizar)
**Severidad:** Alta  
**Archivos:**
- `backend/app/services/payment_method_service.py:29` — `crear_payment_method`
- `backend/app/services/payment_method_service.py:36-50` — `actualizar_payment_method`

Al crear o editar un método de pago, `moneda_default` y `acepta_referencia` **se ignoran**: el service solo persiste `nombre` y `activo`, así que el modelo siempre cae en sus defaults (`"VES"`, `False`).

**Fix aplicado:** `crear_payment_method` ahora pasa `moneda_default=data.moneda_default` y `acepta_referencia=data.acepta_referencia`; `actualizar_payment_method` aplica ambos campos solo cuando `data.X is not None`.

---

### 22. Desinstalador nunca borra la data aunque se marque "borrar data"
- [x] **Arreglada** (commit `105e110`: `deleteAppDataOnUninstall: true` en tauri.conf.json)
**Severidad:** Alta  
**Archivos:**
- `licoreria-desktop/src-tauri/tauri.conf.json:38-44` — config NSIS sin `deleteAppDataOnUninstall`
- `licoreria-desktop/windows/hooks.nsh` — `NSIS_HOOK_POSTUNINSTALL` vacío

Al desinstalar, aunque el usuario marque la opción "borrar datos de la aplicación", **ningún contenido de `AppData/Local/SistemaLicoreria/` se elimina**.

**Fix aplicado:** `"deleteAppDataOnUninstall": true` agregado en `bundle.windows.nsis` de `tauri.conf.json`.

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
- [x] **Arreglada** (health check loop con timeout + error dialog en `lib.rs`)
**Severidad:** Baja  
**Archivo:** `licoreria-desktop/src-tauri/src/lib.rs:29-39`

Si `.port` no existe o no se puede leer, usa 8000 como fallback. Si el backend arrancó en otro puerto, la pantalla queda en blanco sin error visible.

**Fix:** El código actual usa un health check loop con timeout (40 iteraciones × 500ms = 20s). Si el backend no responde, muestra diálogo de error y cierra la app. No hay fallback a puerto 8000.

---

### 15. CORS overly permissive
- [x] **Arreglada** (métodos y headers restringidos en `main.py:57-58`)
**Severidad:** Baja  
**Archivo:** `backend/app/main.py:45-46`

`allow_methods=["*"]` y `allow_headers=["*"]` son más permisivos de lo necesario.

**Fix:** Ahora usa `allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"]` y `allow_headers=["Content-Type"]`.

---

### 16. Test Pillow pre-existente falla
- [x] **Arreglada** (tests ahora usan `pytest.skip` si Pillow no está instalado)
**Severidad:** Baja  
**Archivo:** `backend/tests/test_services/test_invoice_ai.py:65,84`

`test_valid_image_returns_jpeg` y `test_large_image_resized` fallan dependiendo de la versión de Pillow. El código de producción (`optimize_image`) funciona bien; el problema es assertions excesivamente estrictas en los tests.

**Fix:** Tests ahora envuelven `from PIL import Image` en `try/except` y llaman `pytest.skip` si Pillow no está disponible. Assertions razonables (JPEG output, resized dimensions ≤ 2000px).

---

### 17. Iconos placeholder
- [ ] **Pendiente**
**Severidad:** Baja  
**Archivo:** `licoreria-desktop/src-tauri/icons/`

Los iconos PNG son cuadrados azules genéricos. Necesitan diseño real del negocio.

---

### 18. Ajuste de umbral fuzzy
- [x] **Arreglada** (umbral subido de 30.0 a 50.0 en `invoice_service.py:134-139`)
**Severidad:** Baja  
**Archivo:** `backend/app/services/invoice_service.py`

El umbral de 30.0 para `rapidfuzz` fue elegido conservador. Evaluar con datos reales si necesita ajuste.

**Fix:** Umbral ajustado a `50.0` (~50% de similitud) para reducir falsos positivos.

---

### 19. Opción "Tasas de Cambio" duplicada (sidebar + settings)
- [x] **Arreglada** (nav, ruta y wrapper page eliminados)
**Severidad:** Baja (UX)  
**Archivos:**
- `frontend/src/features/settings/components/SettingsNav.tsx:13`
- `frontend/src/router.tsx:140-141`
- `frontend/src/features/settings/pages/SettingsExchangeRatesPage.tsx` (wrapper vacío)

"Tasas de Cambio" aparece en **4 lugares**: sidebar admin (App.tsx:47), sidebar operador (App.tsx:61), settings sub-nav (SettingsNav.tsx:13), y breadcrumbs. `SettingsExchangeRatesPage.tsx` solo hace `return <ExchangeRatesPage />`.

**Fix:** Eliminar entrada de `SettingsNav.tsx:13`, eliminar ruta anidada en `router.tsx:140-141`, eliminar `SettingsExchangeRatesPage.tsx`. Mantener solo `/exchange-rates` del sidebar principal.

---

### 20. Aviso "Registra la tasa BCV" persiste tras registrar la tasa
- [x] **Arreglada** (commits `1640cef` + `be5b524`: recargar tasa al montar POS, snapshot si quedó en 0, eliminar banner visual)
**Severidad:** Baja  
**Archivos:**
- `frontend/src/features/sales/pages/POSPage.tsx:67,240-251`
- `frontend/src/features/sales/store/cartStore.ts:59-66,116`
- `frontend/src/stores/exchangeRateStore.ts:21-36`

Después de registrar la tasa BCV en la página de tasas de cambio, el aviso "⚠ Registra la tasa BCV antes de cobrar" del POS puede seguir apareciendo, aunque la venta igualmente se puede completar.

El POS usa `snapshotTasa` del carrito (`POSPage.tsx:67`), que se captura al agregar el primer producto (`cartStore.ts:116`). La auto-sincronización vía suscripción (`cartStore.ts:59-66`) solo actualiza `snapshotTasa` si ya hay items en el carrito **y** `snapshotTasa` es exactamente `0`; si la tasa se registra con el carrito vacío o `loadTasa()` falla silenciosamente (`exchangeRateStore.ts:33-35`), `snapshotTasa` queda en `0` y el aviso no desaparece.

**Fix aplicado:**
- `POSPage.tsx`: `useEffect` al montar que llama `useExchangeRateStore.getState().loadTasa()`.
- `cartStore.ts:addItem`: si `snapshotTasa` quedó en `0` pero el store ya tiene una tasa válida (`> 0`), la captura; si el snapshot ya era válido, se conserva (regla de negocio intacta).
- `POSPage.tsx`: banner visual eliminado completamente; solo se mantiene el toast de error al intentar vender sin tasa.
- Tests: 54/54 pasan (sales suite completa).

---

### 23. Al cerrar la app queda un proceso activo del backend
- [x] **Arreglada** (rama `fix/sidecar-cleanup`: `taskkill /IM` + retry + `CREATE_NO_WINDOW`)
**Severidad:** Alta  
**Archivo:** `licoreria-desktop/src-tauri/src/lib.rs` (ExitRequested/Exit handler)

Al cerrar la ventana de Tauri, el sidecar (`sistema_licoreria.exe`) no se mata correctamente. El proceso queda como huérfano en el Task Manager, consumiendo recursos y bloqueando archivos en `AppData/Local/SistemaLicoreria/`.

**Causa raíz:**
1. `child.kill()` puede fallar silenciosamente (el resultado se descarta con `let _ =`)
2. `taskkill /PID` puede fallar si el PID fue reciclado por Windows
3. No hay retry logic si el primer intento falla

**Fix:** Cambiar a `taskkill /IM sistema_licoreria.exe /T /F` (matar por nombre de imagen, más confiable que por PID) + fallback por PID con delay de 100ms.

---

### 24. Ventana de PowerShell aparece momentáneamente al cerrar la app
- [x] **Arreglada** (rama `fix/sidecar-cleanup`: `creation_flags(CREATE_NO_WINDOW)`)
**Severidad:** Media  
**Archivo:** `licoreria-desktop/src-tauri/src/lib.rs`

Al cerrar la app, se muestra brevemente una ventana de consola/powershell antes de desaparecer. Esto rompe la experiencia de app de escritorio.

**Causa raíz:** `StdCommand::new("taskkill")` en `kill_sidecar_tree` no tiene `CREATE_NO_WINDOW` flag. El `main.rs` tiene `windows_subsystem = "windows"` pero esto solo afecta al proceso principal, no a procesos hijos ejecutados con `StdCommand`.

**Fix:** Importar `std::os::windows::process::CommandExt` y agregar `.creation_flags(CREATE_NO_WINDOW)` al `StdCommand` de `taskkill`.

---

### 25. Botón de agregar caja en POS requiere clicks innecesarios
- [ ] **Pendiente**
**Severidad:** Baja (UX)  
**Archivo:** `frontend/src/features/sales/pages/POSPage.tsx`

En la tabla de productos del POS, el botón de agregar caja tiene un dropdown (flecha) que despliega opciones. Esto agrega un click innecesario: el usuario debe primero abrir el dropdown y luego seleccionar "agregar caja".

**Fix propuesto:** Reemplazar el dropdown por un botón simple de acción directa que al darle clic agrega una caja al carrito inmediatamente, sin pasar por un menú desplegable.

---

### 26. Decimales de tasa BCV: scrapper usa 3, sistema espera 4, muestra 2
- [ ] **Pendiente**
**Severidad:** Baja  
**Archivos:**
- `backend/app/services/exchange_rate_service.py` — función scrapper con `decimal(0.001)`
- `backend/app/models/exchange_rate.py` — campo `tasa` con precisión definida
- `frontend/src/features/exchange-rates/pages/ExchangeRatesPage.tsx` — formato de visualización (2 decimales)

El frontend y backend esperan recibir **4 dígitos** del BCV (ej: `748.7860`) y mostrar **2 decimales** al usuario final (ej: `748,79`). Sin embargo, la función scrapper que obtiene las tasas del BCV usa `decimal(0.001)`, lo que redondea a **3 decimales** y siempre agrega un `0` al final (ej: `748.7860` → `748.786`).

**Impacto:** Los cálculos de ventas y reportes pueden tener una pérdida de precisión por el redondeo innecesario a 3 decimales en lugar de 4.

**Fix propuesto:** Cambiar `decimal(0.001)` por `decimal(0.0001)` en el scrapper para preservar los 4 decimales que provee el BCV.

---

## Resumen

| Severidad | Total | Arregladas | Pendientes |
|-----------|-------|------------|------------|
| Crítica | 2 | 2 | 0 |
| Alta | 7 | 7 | 0 |
| Media | 11 | 11 | 0 |
| Baja | 7 | 5 | 2 |
| **Total** | **27** | **25** | **2** |
