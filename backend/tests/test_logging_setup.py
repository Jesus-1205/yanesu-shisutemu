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
