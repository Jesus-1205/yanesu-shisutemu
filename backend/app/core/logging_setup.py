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
