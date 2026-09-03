"""
Entry point para PyInstaller.
Inicialización DB → puerto libre → uvicorn → serve frontend.
"""
import logging
import os
import sys
from pathlib import Path

if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).resolve().parent

sys.path.insert(0, str(BASE_DIR))

# PyInstaller onefile con console=False deja sys.stdout/sys.stderr en None.
# uvicorn dictConfig llama stream.isatty() y revienta con 'NoneType' object.
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

from app.core.config import get_db_path
from app.core.database import SessionLocal
from app.core.first_run import initialize_database
from app.core.logging_setup import ensure_logging
from app.core.port_manager import find_free_port, save_port_info
from app.main import app


def setup_frontend():
    """Monta el build de React como archivos estáticos y catch-all para SPA."""
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    frontend_dist = BASE_DIR / "frontend" / "dist"
    if not frontend_dist.exists():
        return

    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))


def run_migrations():
    """Ejecuta migraciones de Alembic. Funciona en código plano y binario PyInstaller."""
    from alembic.config import Config
    from alembic import command

    logger = logging.getLogger(__name__)
    alembic_cfg = Config(str(BASE_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BASE_DIR / "alembic"))

    try:
        command.upgrade(alembic_cfg, "head")
    except Exception:
        logger.exception("Fallo en migraciones de Alembic")
        sys.exit(1)


def main():
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


if __name__ == "__main__":
    main()
