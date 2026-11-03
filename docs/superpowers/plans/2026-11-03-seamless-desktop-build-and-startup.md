# Seamless Desktop Build and Startup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure out-of-the-box, 100% reliable build and launch of the desktop installer on any Windows machine while maintaining strict dual-dialect compatibility with PostgreSQL on the VPS.

**Architecture:** 
1. Guard legacy constraint renamings in Alembic migration `0b042186523d` so PostgreSQL maintains identical historical behavior while SQLite skips dropping nonexistent `*_key` constraints.
2. Add an unbuffered emergency crash logger in `backend/app/core/logging_setup.py` and top-level exception capture in `backend/run.py` to guarantee zero "silent deaths" on desktop.
3. Automatically detect and load `vcvarsall.bat x64` in `backend/build.bat` via `vswhere.exe` so developers and CI do not need a Developer Command Prompt.

**Tech Stack:** Python 3.12+ | Alembic 1.14 | SQLAlchemy 2.0 | FastAPI | Windows Batch | Rust (Tauri 2) | NSIS

**Spec:** Dual-dialect architecture documented in `.opencode/rules/architecture.md`, `.opencode/rules/backend_rules.md`, and `.opencode/skills/alembic-workflow/`.

## Global Constraints

- **PostgreSQL VPS zero-regression:** VPS database behavior and generated PostgreSQL DDL must not change.
- **SQLite dual-dialect compatibility:** A fresh SQLite database must migrate from empty to `head` (`alembic upgrade head`) without errors.
- **No float for money or stock:** Maintain `Decimal` across all backend models and schemas.
- **Strict Conventional Commits:** Use format `fix(db): ...`, `fix(desktop): ...`, `test(db): ...`.
- **No placeholders:** All steps contain full, self-contained code.

---

### Task 1: Dual-Dialect Compatibility in Migration `0b042186523d`

**Files:**
- Modify: `backend/alembic/versions/0b042186523d_add_retornable_inventory_tables.py:84-120`
- Test: `backend/tests/test_migrations_sqlite.py`

**Interfaces:**
- Consumes: `op.get_bind().dialect.name` from Alembic/SQLAlchemy runtime.
- Produces: SQLite-safe migration that skips PostgreSQL-specific `_key` constraint drops while preserving them on PostgreSQL.

- [ ] **Step 1: Write the failing test for clean SQLite migration**

Create `backend/tests/test_migrations_sqlite.py`:

```python
import os
import tempfile
from pathlib import Path
from alembic.config import Config
from alembic import command
import sqlalchemy as sa


def test_clean_sqlite_migration_to_head():
    """Verifica que una base de datos SQLite limpia pueda migrar de 0 a head sin fallos."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_db_path = Path(tmpdir) / "test_migration.db"
        sqlite_url = f"sqlite:///{tmp_db_path.as_posix()}"

        backend_dir = Path(__file__).resolve().parent.parent
        alembic_cfg = Config(str(backend_dir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
        alembic_cfg.set_main_option("sqlalchemy.url", sqlite_url)

        # Debe ejecutarse sin lanzar ValueError: No such constraint
        command.upgrade(alembic_cfg, "head")

        # Verificar que las tablas principales y las retornables existen
        engine = sa.create_engine(sqlite_url)
        inspector = sa.inspect(engine)
        tables = inspector.get_table_names()

        assert "roles" in tables
        assert "users" in tables
        assert "categorias" in tables
        assert "productos" in tables
        assert "retornable_inventario" in tables
        assert "api_keys" in tables
        assert "alembic_version" in tables

        # Verificar downgrade hasta base
        command.downgrade(alembic_cfg, "base")
        inspector_post = sa.inspect(engine)
        assert "retornable_inventario" not in inspector_post.get_table_names()
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
pytest backend/tests/test_migrations_sqlite.py -v
```
Expected: FAIL with `ValueError: No such constraint: 'categorias_nombre_key'` on SQLite batch alter.

- [ ] **Step 3: Modify `0b042186523d_add_retornable_inventory_tables.py` with dialect guard**

In `backend/alembic/versions/0b042186523d_add_retornable_inventory_tables.py`, update `upgrade()` and `downgrade()` around lines 84-120:

```python
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.batch_alter_table('categorias', schema=None) as batch_op:
            batch_op.drop_constraint('categorias_nombre_key', type_='unique')
            batch_op.create_unique_constraint(batch_op.f('uq_categorias_nombre'), ['nombre'])

        with op.batch_alter_table('metodos_pago', schema=None) as batch_op:
            batch_op.drop_constraint('metodos_pago_nombre_key', type_='unique')
            batch_op.create_unique_constraint(batch_op.f('uq_metodos_pago_nombre'), ['nombre'])

        with op.batch_alter_table('productos', schema=None) as batch_op:
            batch_op.drop_constraint('productos_codigo_barra_key', type_='unique')
            batch_op.create_unique_constraint(batch_op.f('uq_productos_codigo_barra'), ['codigo_barra'])

        with op.batch_alter_table('roles', schema=None) as batch_op:
            batch_op.drop_constraint('roles_nombre_key', type_='unique')
            batch_op.create_unique_constraint(batch_op.f('uq_roles_nombre'), ['nombre'])

    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.batch_alter_table('roles', schema=None) as batch_op:
            batch_op.drop_constraint(batch_op.f('uq_roles_nombre'), type_='unique')
            batch_op.create_unique_constraint('roles_nombre_key', ['nombre'])

        with op.batch_alter_table('productos', schema=None) as batch_op:
            batch_op.drop_constraint(batch_op.f('uq_productos_codigo_barra'), type_='unique')
            batch_op.create_unique_constraint('productos_codigo_barra_key', ['codigo_barra'])

        with op.batch_alter_table('metodos_pago', schema=None) as batch_op:
            batch_op.drop_constraint(batch_op.f('uq_metodos_pago_nombre'), type_='unique')
            batch_op.create_unique_constraint('metodos_pago_nombre_key', ['nombre'])

        with op.batch_alter_table('categorias', schema=None) as batch_op:
            batch_op.drop_constraint(batch_op.f('uq_categorias_nombre'), type_='unique')
            batch_op.create_unique_constraint('categorias_nombre_key', ['nombre'])

    op.drop_table('retornable_reporte_detalles')
    op.drop_table('retornable_reportes')
    op.drop_table('retornable_productos')
    op.drop_table('retornable_movimientos')
    op.drop_table('retornable_inventario')
    # ### end Alembic commands ###
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
pytest backend/tests/test_migrations_sqlite.py -v
```
Expected: PASS (1 passed in ~0.8s).

- [ ] **Step 5: Commit**

```bash
git add backend/alembic/versions/0b042186523d_add_retornable_inventory_tables.py backend/tests/test_migrations_sqlite.py
git commit -m "fix(db): proteger renambrado de constraints de postgresql en migracion 0b042186523d"
```

---

### Task 2: Robust Crash Reporting & Logging Flush in `logging_setup.py` & `run.py`

**Files:**
- Modify: `backend/app/core/logging_setup.py`
- Modify: `backend/run.py`
- Test: `backend/tests/test_logging_setup.py`

**Interfaces:**
- Produces: `write_emergency_crash_log(exc: BaseException) -> Path` which writes unbuffered tracebacks to `%LOCALAPPDATA%/YanesuShisutemu/logs/crash_startup.log`.
- Consumes: `get_log_dir()` from `app.core.config`.

- [ ] **Step 1: Write unit test for emergency crash logger**

Create `backend/tests/test_logging_setup.py`:

```python
import os
import tempfile
from pathlib import Path
from unittest.mock import patch
from app.core.logging_setup import write_emergency_crash_log


def test_write_emergency_crash_log():
    with tempfile.TemporaryDirectory() as tmpdir:
        fake_log_dir = Path(tmpdir) / "logs"
        with patch("app.core.logging_setup.get_log_dir", return_value=fake_log_dir):
            try:
                raise RuntimeError("Simulated startup failure")
            except RuntimeError as exc:
                crash_file = write_emergency_crash_log(exc)

            assert crash_file.exists()
            content = crash_file.read_text(encoding="utf-8")
            assert "Simulated startup failure" in content
            assert "Traceback" in content
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
pytest backend/tests/test_logging_setup.py -v
```
Expected: FAIL with `ImportError: cannot import name 'write_emergency_crash_log'`.

- [ ] **Step 3: Implement `write_emergency_crash_log` and enhance `ensure_logging`**

In `backend/app/core/logging_setup.py`:

```python
import datetime
import logging
import traceback
from logging.handlers import RotatingFileHandler
from pathlib import Path
from app.core.config import get_log_dir


def write_emergency_crash_log(exc: BaseException) -> Path:
    """Escribe un volcado de error de emergencia fuera de la configuracion de logging.
    Garantiza que la traza quede guardada incluso si logging esta silenciado o roto."""
    log_dir = get_log_dir()
    log_dir.mkdir(parents=True, exist_ok=True)
    crash_file = log_dir / "crash_startup.log"

    timestamp = datetime.datetime.now().isoformat()
    tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))

    with open(crash_file, "a", encoding="utf-8") as f:
        f.write(f"\n==================== CRASH REPORT [{timestamp}] ====================\n")
        f.write(tb_str)
        f.write("====================================================================\n")
        f.flush()

    return crash_file


def ensure_logging() -> None:
    root = logging.getLogger()
    if root.handlers:
        return

    log_dir = get_log_dir()
    log_dir.mkdir(parents=True, exist_ok=True)

    file_handler = RotatingFileHandler(
        log_dir / "sistema.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )

    root.setLevel(logging.INFO)
    root.addHandler(file_handler)
    root.addHandler(stream_handler)
```

In `backend/run.py`, wrap `main()` and `run_migrations()` with emergency logging:

```python
def run_migrations():
    """Ejecuta migraciones de Alembic. Funciona en código plano y binario PyInstaller."""
    from alembic.config import Config
    from alembic import command

    logger = logging.getLogger(__name__)
    alembic_cfg = Config(str(BASE_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BASE_DIR / "alembic"))

    try:
        command.upgrade(alembic_cfg, "head")
    except Exception as exc:
        logger.exception("Fallo en migraciones de Alembic")
        write_emergency_crash_log(exc)
        sys.exit(1)


def main():
    try:
        ensure_logging()
        logger = logging.getLogger(__name__)

        run_migrations()

        db = SessionLocal()
        needs_setup = initialize_database(db)
        db.close()

        port = find_free_port(8000, 8010)
        save_port_info(port)

        setup_frontend()

        import uvicorn

        logger.info("Yanesu Shisutemu iniciado en http://127.0.0.1:%s", port)
        logger.info("Base de datos: %s", get_db_path())
        if needs_setup:
            logger.info("Primera ejecución: crea el usuario administrador desde la app.")

        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    except BaseException as exc:
        write_emergency_crash_log(exc)
        sys.exit(1)
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
pytest backend/tests/test_logging_setup.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/logging_setup.py backend/run.py backend/tests/test_logging_setup.py
git commit -m "fix(desktop): agregar logger de emergencia y captura de excepciones en arranque"
```

---

### Task 3: Automatic MSVC Toolchain Detection in `backend/build.bat`

**Files:**
- Modify: `backend/build.bat:60-120`

**Interfaces:**
- Consumes: `%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe`
- Produces: Automatic execution of `vcvarsall.bat x64` into active shell before Cargo/Tauri invocations.

- [ ] **Step 1: Inspect and enhance toolchain detection logic in `backend/build.bat`**

In `backend/build.bat`, in section `1. Verificar herramientas requeridas`, right after checking `cargo`, add automated MSVC environment discovery:

```bat
where link >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] MSVC linker link.exe detectado
) else (
    set "VSWHERE_PATH=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
    set "VCVARSALL="
    if exist "!VSWHERE_PATH!" (
        for /f "usebackq tokens=*" %%i in (`"!VSWHERE_PATH!" -latest -products * -property installationPath 2^>nul`) do (
            if exist "%%i\VC\Auxiliary\Build\vcvarsall.bat" (
                set "VCVARSALL=%%i\VC\Auxiliary\Build\vcvarsall.bat"
            )
        )
    )
    if not "!VCVARSALL!"=="" (
        echo [INFO] Inicializando entorno MSVC x64 desde !VCVARSALL!
        call "!VCVARSALL!" x64 >nul 2>&1
        where link >nul 2>&1
        if !errorlevel! equ 0 (
            echo [OK] MSVC x64 inicializado exitosamente
        ) else (
            echo [WARN] vcvarsall.bat se ejecuto pero link.exe no quedo disponible
        )
    ) else (
        echo [ERROR] link.exe no encontrado y no se pudo localizar Visual Studio Build Tools.
        echo         Para instalar las herramientas requeridas, ejecuta en PowerShell Administrador:
        echo         winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
        set "HAS_ERROR=1"
    )
)
```

- [ ] **Step 2: Test `build.bat` tool verification step**

Run in a clean CMD session without developer prompt:
```bat
cmd /c "cd /d backend && build.bat --help"
```
Expected: The batch file checks tools, outputs `[OK] MSVC linker link.exe detectado` (or initializes it automatically), and does not report `[ERROR] link.exe no encontrado`.

- [ ] **Step 3: Commit**

```bash
git add backend/build.bat
git commit -m "fix(build): detectar e inicializar entorno MSVC x64 automaticamente en build.bat"
```

---

### Task 4: Comprehensive End-to-End Verification

**Files:**
- Execute verification commands across backend and database.

- [ ] **Step 1: Run all backend unit and integration tests**

```powershell
pytest backend/tests/ -v
```
Expected: 100% tests passing.

- [ ] **Step 2: Verify dual-dialect PostgreSQL migration compatibility**

Run Alembic in offline SQL generation mode to guarantee no PostgreSQL syntax errors:
```powershell
cmd /c "cd /d backend && python -m alembic upgrade head --sql"
```
Expected: Outputs standard SQL without exceptions.

- [ ] **Step 3: Verify clean build packaging**

Run the build script:
```powershell
cmd /c "cd /d backend && build.bat"
```
Expected: Completes all 4 steps:
`[1/4] Frontend` -> `[2/4] Backend PyInstaller` -> `[3/4] Sidecar copy` -> `[4/4] Tauri build`
NSIS installer generated in `licoreria-desktop/src-tauri/target/release/bundle/nsis/`.

- [ ] **Step 4: Final commit and summary**

```bash
git status
```
Verify working tree is clean.

---

### Execution Choice

The plan has been created and saved to `docs/superpowers/plans/2026-11-03-seamless-desktop-build-and-startup.md`.

We have two execution options:
1. **Subagent-Driven (recommended)**: Dispatches a subagent per task with review checkpoints between tasks.
2. **Inline Execution**: Executes each task step directly in this session with verification gates.

Which approach would you like to proceed with?