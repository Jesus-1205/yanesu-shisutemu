# Log de Desarrollo: Empaquetado de Escritorio (PyInstaller + Tauri)

**Fecha:** Julio 2026  
**Rama:** `feature/sqlite-migration`  
**Objetivo:** Generar un instalador `.exe` único para Windows usando PyInstaller (backend Python) + Tauri (ventana nativa).

---

## 1. Arquitectura final

```
Sistema Licoreria_1.0.0_x64-setup.exe (NSIS, ~56 MB)
├── licoreria-desktop.exe          ← Tauri (ventana webview, ~11 MB)
├── sistema_licoreria.exe          ← PyInstaller onefile (~54 MB)
│   ├── FastAPI + uvicorn
│   ├── SQLite (AppData/Local/SistemaLicoreria/licoreria.db)
│   ├── Frontend React compilado (embebido en el .exe)
│   └── uploads/ (imágenes de facturas)
└── uninstall.exe
```

**Flujo de ejecución:**
1. Usuario ejecuta `Sistema Licoreria_1.0.0_x64-setup.exe` → instala en `AppData/Local/Programs/Sistema Licoreria/`
2. Al abrir la app, Tauri lanza `sistema_licoreria.exe` como sidecar
3. El sidecar crea la BD SQLite si no existe, busca puerto libre (8000-8010)
4. Tauri lee el archivo `.port` y navega el webview al backend
5. El usuario interactúa con la app web embebida

---

## 2. Commits realizados

| Hash | Tipo | Descripción |
|------|------|-------------|
| `2227ef6` | chore | Clon del proyecto original |
| `92581cf` | refactor | Migración PostgreSQL → SQLite |
| `08a59f5` | refactor | pg_trgm → rapidfuzz fuzzy matching |
| `f12896b` | docs | Documentación migración SQLite |
| `12374bc` | feat | Empaquetamiento PyInstaller + Tauri |
| `2bd564b` | fix | Paths Tauri, warnings, iconos, schemas |
| `47b3a04` | fix | build.bat copia sidecar con target-triple |
| `59ada95` | docs | Arquitectura desktop en MIGRATION_SQLITE.md |
| `e0d8885` | fix | PyInstaller onefile + NSIS single-exe installer |
| `6ef5836` | fix | Quitar prefijo /api del frontend |

---

## 3. Errores y soluciones

### 3.1 MSI installer falló (WiX)

**Error:**
```
Downloading https://github.com/tauri-apps/binary-releases/releases/download/nsis-3.11/nsis-3.11.zip
os error 11001
```

**Causa:** El usuario tenía problemas de DNS/conexión para descargar WiX desde GitHub.

**Solución:** Cambiar de bundler `msi` a `nsis` en `tauri.conf.json`. NSIS es el bundler por defecto de Tauri v2 para Windows, genera un solo `.exe` instalador, y no necesita WiX.

```json
"targets": ["nsis"]
```

---

### 3.2 `ERR_CONNECTION_REFUSED` — Sidecar no empaquetado

**Error:** La app abría la ventana pero mostraba "Vaya... no se puede acceder a esta página" en `127.0.0.1`.

**Causa:** Se ejecutó `cargo build --release` en vez de `cargo tauri build`. El primero solo compila el ejecutable Rust; el segundo empaqueta el sidecar + frontend + genera el instalador.

**Solución:** Usar `cargo tauri build` para generar el instalador NSIS con todo empaquetado.

---

### 3.3 Sidecar PyInstaller en modo directorio

**Error:**
```
[PYI-3220:ERROR] Failed to load Python DLL
'C:\...\sistema_licoreria\_internal\python314.dll'.
LoadLibrary: No se puede encontrar el módulo especificado.
```

**Causa:** PyInstaller estaba configurado en modo `onedir` (genera una carpeta con archivos sueltos). El sidecar `.exe` necesitaba `_internal/python314.dll` y otros archivos que Tauri no empaquetaba.

**Solución:** Cambiar `build.spec` de `onedir` a `onefile`:

```python
# ANTES (onedir)
exe = EXE(
    pyz, a.scripts, [],
    exclude_binaries=True,  # ← modo directorio
    name='sistema_licoreria',
)
coll = COLLECT(exe, a.binaries, a.zipfiles, a.datas, ...)

# DESPUÉS (onefile)
exe = EXE(
    pyz, a.scripts, a.binaries, a.zipfiles, a.datas, [],
    name='sistema_licoreria',  # ← un solo .exe autocontenido
)
```

---

### 3.4 `ModuleNotFoundError: No module named 'passlib.handlers.bcrypt'`

**Error:**
```
File "app\services\auth_service.py", line 14, in <module>
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ModuleNotFoundError: No module named 'passlib.handlers.bcrypt'
```

**Causa:** PyInstaller no detecta automáticamente los módulos de `passlib.handlers` porque se cargan dinámicamente.

**Solución:** Agregar a `hiddenimports` en `build.spec`:
```python
'passlib.handlers',
'passlib.handlers.bcrypt',
```

---

### 3.5 Tauri no encuentra sidecar por target-triple

**Error:**
```
resource path `..\..\backend\dist\sistema_licoreria-x86_64-pc-windows-msvc.exe` doesn't exist
```

**Causa:** PyInstaller genera `sistema_licoreria.exe`, pero Tauri espera el sidecar con el sufijo del target triple: `sistema_licoreria-x86_64-pc-windows-msvc.exe`.

**Solución:** Copiar el `.exe` después de PyInstaller:
```bat
copy /Y "dist\sistema_licoreria.exe" "dist\sistema_licoreria-x86_64-pc-windows-msvc.exe"
```

---

### 3.6 `Method Not Allowed` en login

**Error:** El formulario de login mostraba "Method Not Allowed" al enviar credenciales.

**Causa:** El frontend usaba `API_BASE = "/api"`, entonces las peticiones iban a `/api/auth/login`. En Docker, nginx quitaba el prefijo `/api` antes de pasar al backend. Sin nginx, la ruta `/api/auth/login` no existía en FastAPI (la ruta real era `/auth/login`). El SPA catch-all (`@app.get("/{full_path:path}")`) capturaba el GET y retornaba `index.html`, pero el POST no matcheaba ninguna ruta → 405 Method Not Allowed.

**Solución:** Quitar el prefijo `/api` del frontend:
```typescript
// ANTES
const API_BASE = "/api";

// DESPUÉS
const API_BASE = "";
```

---

### 3.7 No redirige a pantalla de Setup (primera ejecución)

**Error:** Al instalar por primera vez, la app mostraba login en vez de la pantalla de configuración inicial.

**Causa:** Misma que el error 3.6. La petición `GET /api/auth/setup-status` caía en el SPA catch-all (retornaba HTML). El `request()` intentaba parsear como JSON, fallaba, el `.catch()` ignoraba el error, y `needsSetup` quedaba en `false`.

**Solución:** Se resolvió con el fix 3.6 (quitar `/api`). Ahora `GET /auth/setup-status` llega correctamente al backend.

---

### 3.8 `useBreakpoint.ts` — Error TypeScript

**Error:** TypeScript compilaba pero con un error silencioso en `useBreakpoint.ts`.

**Causa:** Typo: `string]` en vez de `string>` al cerrar el tipo genérico.

```typescript
// ANTES
const queries: Record<Breakpoint, string] = {

// DESPUÉS
const queries: Record<Breakpoint, string> = {
```

---

### 3.9 Warning en `lib.rs` — Result no utilizado

**Error:** `cargo build` mostraba warning sobre `Result` no utilizado.

**Causa:** `window.navigate()` retorna un `Result` que no se consumía.

**Solución:**
```rust
// ANTES
window.navigate(url.parse().expect("Invalid URL"));

// DESPUÉS
let _ = window.navigate(url.parse().expect("Invalid URL"));
```

---

### 3.10 Paths incorrectos en `tauri.conf.json`

**Error:** Tauri no encontraba el frontend build ni el sidecar.

**Causa:** Las rutas relativas estaban mal calculadas desde `src-tauri/`.

**Solución:**
```json
// ANTES
"frontendDist": "../backend/frontend/dist",
"externalBin": ["../backend/dist/sistema_licoreria/sistema_licoreria"]

// DESPUÉS
"frontendDist": "../../frontend/dist",
"externalBin": ["../../backend/dist/sistema_licoreria"]
```

---

## 4. Archivos clave

| Archivo | Función |
|---------|---------|
| `backend/build.spec` | Configuración PyInstaller (onefile) |
| `backend/build.bat` | Script de build completo (frontend + PyInstaller + sidecar) |
| `backend/run.py` | Entry point PyInstaller: init DB → find port → mount frontend → uvicorn |
| `backend/app/core/first_run.py` | Inicialización pasiva de BD + roles + needs_setup check |
| `backend/app/core/port_manager.py` | Búsqueda de puerto libre + archivo `.port` |
| `licoreria-desktop/src-tauri/tauri.conf.json` | Config Tauri: NSIS bundler, sidecar, frontend |
| `licoreria-desktop/src-tauri/src/lib.rs` | Lógica: lanzar sidecar → leer .port → navegar webview |
| `frontend/src/services/api.ts` | API client (`API_BASE = ""`) |
| `frontend/src/features/auth/pages/SetupPage.tsx` | Pantalla de primer inicio |
| `frontend/src/features/auth/context/AuthContext.tsx` | Manejo de auth + `needsSetup` |

---

## 5. Comandos para reconstruir

```bat
:: 1. Frontend
cd frontend
pnpm install
pnpm build

:: 2. Backend (PyInstaller onefile)
cd ..\backend
pyinstaller build.spec --clean --noconfirm
copy /Y dist\sistema_licoreria.exe dist\sistema_licoreria-x86_64-pc-windows-msvc.exe

:: 3. Instalador NSIS
cd ..\licoreria-desktop\src-tauri
cargo tauri build

:: Resultado:
:: licoreria-desktop\src-tauri\target\release\bundle\nsis\Sistema Licoreria_1.0.0_x64-setup.exe
```

---

## 6. Datos de la aplicación

| Ubicación | Contenido |
|-----------|-----------|
| `AppData/Local/SistemaLicoreria/licoreria.db` | Base de datos SQLite |
| `AppData/Local/SistemaLicoreria/uploads/` | Imágenes de facturas |
| `AppData/Local/SistemaLicoreria/.port` | Puerto del servidor |
| `AppData/Local/Programs/Sistema Licoreria/` | Instalación de la app |

---

## 7. Acceso dual (app + navegador)

- Mientras la app de escritorio esté abierta, el backend corre en `http://127.0.0.1:{port}`
- Se puede acceder desde cualquier navegador en la misma máquina
- Al cerrar la app de escritorio, el backend se apaga (el sidecar se detiene)
- La base de datos es compartida (misma ubicación en disco)
