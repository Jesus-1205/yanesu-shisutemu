import json
import os
import queue

import pytest

from app.services.audit_service import (
    _append_line,
    log_action,
    _queue,
)


def _drain_queue():
    while not _queue.empty():
        try:
            _queue.get_nowait()
        except queue.Empty:
            break


@pytest.fixture
def audit_file(tmp_path):
    path = tmp_path / "audit.log"
    return str(path)


def test_log_action_enqueues_json():
    _drain_queue()

    log_action(
        usuario="admin",
        ip="127.0.0.1",
        accion="CREAR",
        entidad="producto",
        entidad_id=1,
        detalle="Creado producto test",
    )

    item = _queue.get(timeout=2.0)
    data = json.loads(item)

    assert data["nivel"] == "AUDIT"
    assert data["usuario"] == "admin"
    assert data["ip"] == "127.0.0.1"
    assert data["accion"] == "CREAR"
    assert data["entidad"] == "producto"
    assert data["entidad_id"] == 1
    assert data["detalle"] == "Creado producto test"
    assert "ts" in data


def test_log_action_with_usuario_intentado():
    _drain_queue()

    log_action(
        usuario=None,
        ip="192.168.1.1",
        accion="LOGIN_FALLIDO",
        entidad="auth",
        usuario_intentado="admin_fake",
        detalle="Intento fallido",
    )

    item = _queue.get(timeout=2.0)
    data = json.loads(item)

    assert data["usuario"] is None
    assert data["usuario_intentado"] == "admin_fake"
    assert data["accion"] == "LOGIN_FALLIDO"


def test_append_creates_file(audit_file):
    _append_line(audit_file, '{"ts":"test","nivel":"AUDIT","usuario":"admin","accion":"CREAR","entidad":"producto"}')

    assert os.path.exists(audit_file)
    with open(audit_file, "r", encoding="utf-8") as f:
        content = f.read()
    assert '"nivel":"AUDIT"' in content
    assert '"accion":"CREAR"' in content


def test_append_multiple_lines(audit_file):
    _append_line(audit_file, '{"ts":"t1","nivel":"AUDIT","accion":"CREAR"}')
    _append_line(audit_file, '{"ts":"t2","nivel":"AUDIT","accion":"EDITAR"}')

    with open(audit_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
    assert len(lines) == 2
    assert '"CREAR"' in lines[0]
    assert '"EDITAR"' in lines[1]


def test_rotate_if_needed(audit_file):
    with open(audit_file, "w", encoding="utf-8") as f:
        f.write("x" * (6 * 1024 * 1024))

    from app.services.audit_service import _rotate_if_needed
    _rotate_if_needed(audit_file)

    assert not os.path.exists(audit_file)
    rotated_files = [f for f in os.listdir(os.path.dirname(audit_file)) if f.startswith("audit.log.")]
    assert len(rotated_files) >= 1


def test_cleanup_old(tmp_path):
    for i in range(10):
        p = tmp_path / f"audit.log.{i:03d}"
        p.write_text(f"line {i}")
        os.utime(str(p), (i, i))

    from app.services.audit_service import _cleanup_old
    _cleanup_old(str(tmp_path / "audit.log"))

    remaining = [f for f in tmp_path.iterdir() if f.name.startswith("audit.log.")]
    assert len(remaining) <= 6


def test_drain_and_write(audit_file):
    _drain_queue()

    _queue.put_nowait('{"ts":"drain1","nivel":"AUDIT","accion":"CREAR"}')
    _queue.put_nowait('{"ts":"drain2","nivel":"AUDIT","accion":"EDITAR"}')

    from app.services.audit_service import _drain_and_write
    _drain_and_write(audit_file)

    with open(audit_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
    assert len(lines) == 2
    assert "drain1" in lines[0]
    assert "drain2" in lines[1]


def test_audit_queue_full_handled():
    from unittest.mock import patch
    with patch.object(_queue, "put_nowait", side_effect=queue.Full):
        # No debería levantar excepción, sólo loguear warning
        log_action(usuario="admin", ip="127.0.0.1", accion="TEST", entidad="test")


def test_rotate_if_needed_exceptions(audit_file):
    from unittest.mock import patch
    from app.services.audit_service import _rotate_if_needed

    # Archivo no existe -> retorna sin error
    _rotate_if_needed("/ruta/inexistente/audit.log")

    # Error al renombrar
    with open(audit_file, "w", encoding="utf-8") as f:
        f.write("x" * (6 * 1024 * 1024))

    with patch("os.rename", side_effect=OSError("Permiso denegado")):
        _rotate_if_needed(audit_file)


def test_cleanup_old_oserror(tmp_path):
    from unittest.mock import patch
    from app.services.audit_service import _cleanup_old

    for i in range(10):
        p = tmp_path / f"audit.log.{i:03d}"
        p.write_text(f"line {i}")
        os.utime(str(p), (i, i))

    with patch("os.remove", side_effect=OSError("Lock")):
        _cleanup_old(str(tmp_path / "audit.log"))


def test_append_exceptions():
    from app.services.audit_service import _append_line, _append_lines
    # Intentar escribir a una ruta inválida o donde falle open
    _append_line("invalid_dir_nonexistent://audit.log", "test")
    _append_lines("invalid_dir_nonexistent://audit.log", ["test1", "test2"])

