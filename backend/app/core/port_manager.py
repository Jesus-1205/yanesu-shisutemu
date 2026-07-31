import socket

from app.core.config import get_app_data_dir


def find_free_port(start: int = 8000, end: int = 8010) -> int:
    """Busca un puerto libre en el rango [start, end]."""
    for port in range(start, end + 1):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("127.0.0.1", port))
                return port
        except OSError:
            continue
    raise RuntimeError(f"Ningún puerto libre en el rango {start}-{end}")


def save_port_info(port: int) -> None:
    """Escribe el puerto en AppData/Local/SistemaLicoreria/.port"""
    port_file = get_app_data_dir() / ".port"
    with open(port_file, "w") as f:
        f.write(str(port))
