import logging
import os
import socket

from app.core.config import get_app_data_dir

logger = logging.getLogger(__name__)


def _cleanup_stale_port() -> None:
    """Elimina el archivo .port si el proceso que lo creó ya no existe."""
    port_file = get_app_data_dir() / ".port"
    try:
        content = port_file.read_text().strip()
        if not content.isdigit():
            port_file.unlink(missing_ok=True)
            return
        pid_file = get_app_data_dir() / ".port.pid"
        if pid_file.exists():
            pid = int(pid_file.read_text().strip())
            try:
                os.kill(pid, 0)
            except OSError:
                port_file.unlink(missing_ok=True)
                pid_file.unlink(missing_ok=True)
                logger.info("Limpiado .port stale (proceso %d ya no existe)", pid)
    except OSError:
        pass


def find_free_port(start: int = 8000, end: int = 8010) -> int:
    """Busca un puerto libre en el rango [start, end]."""
    _cleanup_stale_port()
    for port in range(start, end + 1):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("127.0.0.1", port))
                return port
        except OSError:
            continue
    raise RuntimeError(f"Ningún puerto libre en el rango {start}-{end}")


def save_port_info(port: int) -> None:
    """Escribe el puerto y el PID en AppData/Local/SistemaLicoreria/.port"""
    app_dir = get_app_data_dir()
    port_file = app_dir / ".port"
    pid_file = app_dir / ".port.pid"
    with open(port_file, "w") as f:
        f.write(str(port))
    with open(pid_file, "w") as f:
        f.write(str(os.getpid()))
