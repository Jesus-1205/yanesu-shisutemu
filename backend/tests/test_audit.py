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
    return str(tmp_path / "audit.log")


def test_log_action_creates_json_line(audit_file):
    _drain_queue()

    log_action(
        usuario="admin",
        ip="127.0.0.1",
        accion="CREAR",
        entidad="producto",
        entidad_id=42,
        detalle="Creado producto 'Ron'",
    )

    item = _queue.get(timeout=2.0)
    data = json.loads(item)

    assert data["nivel"] == "AUDIT"
    assert data["usuario"] == "admin"
    assert data["ip"] == "127.0.0.1"
    assert data["accion"] == "CREAR"
    assert data["entidad"] == "producto"
    assert data["entidad_id"] == 42
    assert data["detalle"] == "Creado producto 'Ron'"
    assert "ts" in data


def test_log_action_login_fallido(audit_file):
    _drain_queue()

    log_action(
        usuario=None,
        ip="192.168.1.50",
        accion="LOGIN_FALLIDO",
        entidad="auth",
        usuario_intentado="admin_fake",
        detalle="Credenciales inválidas",
    )

    item = _queue.get(timeout=2.0)
    data = json.loads(item)

    assert data["usuario"] is None
    assert data["usuario_intentado"] == "admin_fake"
    assert data["accion"] == "LOGIN_FALLIDO"
    assert data["ip"] == "192.168.1.50"


def test_append_line_writes_to_file(audit_file):
    _append_line(audit_file, '{"ts":"2026-07-31","nivel":"AUDIT","accion":"CREAR","entidad":"producto"}')

    assert os.path.exists(audit_file)
    with open(audit_file, "r", encoding="utf-8") as f:
        content = f.read()
    assert '"accion":"CREAR"' in content


def test_append_multiple_lines(audit_file):
    _append_line(audit_file, '{"ts":"t1","accion":"CREAR"}')
    _append_line(audit_file, '{"ts":"t2","accion":"EDITAR"}')

    with open(audit_file, "r", encoding="utf-8") as f:
        lines = f.readlines()
    assert len(lines) == 2
    assert '"CREAR"' in lines[0]
    assert '"EDITAR"' in lines[1]


def test_rotate_and_cleanup(tmp_path):
    log_path = str(tmp_path / "audit.log")
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("x" * (6 * 1024 * 1024))

    from app.services.audit_service import _rotate_if_needed, _cleanup_old
    _rotate_if_needed(log_path)
    assert not os.path.exists(log_path)

    for i in range(10):
        p = tmp_path / f"audit.log.{i:03d}"
        p.write_text(f"line {i}")
        os.utime(str(p), (i, i))

    _cleanup_old(log_path)
    remaining = [f for f in tmp_path.iterdir() if f.name.startswith("audit.log.")]
    assert len(remaining) <= 6
