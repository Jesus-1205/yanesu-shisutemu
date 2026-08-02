import json
import logging
import os
import queue
import threading
from datetime import datetime, timezone

from app.core.config import AUDIT_MAX_BYTES, AUDIT_MAX_ROTATED, VE_TZ, get_audit_log_path

logger = logging.getLogger(__name__)

_queue: queue.Queue[str] = queue.Queue(maxsize=10000)
_writer_thread: threading.Thread | None = None
_running = threading.Event()

_SENTINEL = ""


def log_action(
    usuario: str | None,
    ip: str | None,
    accion: str,
    entidad: str,
    entidad_id: int | None = None,
    detalle: str = "",
    *,
    usuario_intentado: str | None = None,
) -> None:
    now = datetime.now(timezone.utc).astimezone(VE_TZ)
    entry: dict = {
        "ts": now.isoformat(),
        "nivel": "AUDIT",
        "usuario": usuario,
        "ip": ip,
        "accion": accion,
        "entidad": entidad,
        "entidad_id": entidad_id,
        "detalle": detalle,
    }
    if usuario_intentado is not None:
        entry["usuario_intentado"] = usuario_intentado
    try:
        _queue.put_nowait(json.dumps(entry, ensure_ascii=False))
    except queue.Full:
        logger.warning("Cola de auditoría llena, evento perdido: %s %s", accion, entidad)


def _rotate_if_needed(path: str) -> None:
    try:
        size = os.path.getsize(path)
    except OSError:
        return
    if size < AUDIT_MAX_BYTES:
        return
    ts = datetime.now(VE_TZ).strftime("%Y-%m-%d-%H%M%S")
    rotated = f"{path}.{ts}"
    try:
        os.rename(path, rotated)
    except OSError:
        logger.exception("Error rotando audit.log a %s", rotated)
        return
    _cleanup_old(path)


def _cleanup_old(base_path: str) -> None:
    import glob

    pattern = f"{base_path}.*"
    files = sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)
    for old in files[AUDIT_MAX_ROTATED:]:
        try:
            os.remove(old)
        except OSError:
            logger.warning("No se pudo eliminar log antiguo: %s", old)


def _writer_loop() -> None:
    path = str(get_audit_log_path())
    while True:
        try:
            item = _queue.get(timeout=2.0)
        except queue.Empty:
            continue
        if item is _SENTINEL:
            _drain_and_write(path)
            break
        _append_line(path, item)
        _drain_and_write(path)


def _drain_and_write(path: str) -> None:
    lines: list[str] = []
    while True:
        try:
            lines.append(_queue.get_nowait())
        except queue.Empty:
            break
    if lines:
        _append_lines(path, lines)


def _append_line(path: str, line: str) -> None:
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(line + "\n")
            f.flush()
        _rotate_if_needed(path)
    except Exception:
        logger.exception("Error escribiendo en audit.log")


def _append_lines(path: str, lines: list[str]) -> None:
    try:
        with open(path, "a", encoding="utf-8") as f:
            for line in lines:
                f.write(line + "\n")
            f.flush()
        _rotate_if_needed(path)
    except Exception:
        logger.exception("Error escribiendo líneas en audit.log")


def start_writer() -> None:
    global _writer_thread
    if _writer_thread is not None and _writer_thread.is_alive():
        return
    _running.set()
    _writer_thread = threading.Thread(target=_writer_loop, daemon=True, name="audit-writer")
    _writer_thread.start()
    logger.info("Hilo escritor de auditoría iniciado")


def stop_writer() -> None:
    if _writer_thread is None:
        return
    _running.clear()
    try:
        _queue.put_nowait(_SENTINEL)
    except queue.Full:
        logger.warning("Cola llena al enviar centinela de apagado")
    _writer_thread.join(timeout=5.0)
    logger.info("Hilo escritor de auditoría detenido")
