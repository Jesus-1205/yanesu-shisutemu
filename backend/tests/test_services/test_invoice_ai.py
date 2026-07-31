"""Tests para funciones puras de invoice_service: _strip_unidades, optimize_image, _save_invoice_image."""
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.invoice_service import _strip_unidades, optimize_image, _save_invoice_image


class TestStripUnidades:

    def test_removes_24unid(self):
        assert _strip_unidades("MEDIA ANIS CARTUJO 350ML 24UNID.") == "MEDIA ANIS CARTUJO 350ML"

    def test_removes_12_unid(self):
        assert _strip_unidades("L/R CARTA ROJA 1L 12 UNID.") == "L/R CARTA ROJA 1L"

    def test_removes_12und(self):
        assert _strip_unidades("CANELITA 1L 12UND") == "CANELITA 1L"

    def test_removes_6_unidades(self):
        assert _strip_unidades("SANGRIA 1.5L 6 UNIDADES") == "SANGRIA 1.5L"

    def test_removes_12_uds(self):
        assert _strip_unidades("DRAGON 1L 12 uds.") == "DRAGON 1L"

    def test_no_change_when_no_units(self):
        assert _strip_unidades("MEDIA ANIS CARTUJO 350ML") == "MEDIA ANIS CARTUJO 350ML"

    def test_empty_string(self):
        assert _strip_unidades("") == ""

    def test_only_units(self):
        assert _strip_unidades(" 24UNID.") == ""

    def test_case_insensitive(self):
        assert _strip_unidades("prod 1L 12unid.") == "prod 1L"

    def test_preserves_internal_numbers(self):
        assert _strip_unidades("350ML 24UNID.") == "350ML"


class TestOptimizeImage:

    def test_returns_same_when_no_pillow(self):
        with patch("app.services.invoice_service._HAS_PILLOW", False):
            data = b"fake"
            result, ct = optimize_image(data, "image/jpeg")
            assert result == data
            assert ct == "image/jpeg"

    def test_pdf_passthrough(self):
        data = b"fake pdf"
        result, ct = optimize_image(data, "application/pdf")
        assert result == data
        assert ct == "application/pdf"

    def test_invalid_image_returns_original(self):
        data = b"not an image"
        result, ct = optimize_image(data, "image/jpeg")
        assert result == data
        assert ct == "image/jpeg"

    def test_valid_image_returns_jpeg(self):
        try:
            from io import BytesIO
            from PIL import Image
        except ImportError:
            pytest.skip("Pillow not installed")

        img = Image.new("RGB", (1000, 1000), color="red")
        for x in range(0, 1000, 5):
            for y in range(0, 1000, 5):
                img.putpixel((x, y), ((x * 7) % 256, (y * 3) % 256, (x + y) % 256))
        buf = BytesIO()
        img.save(buf, format="PNG")
        png_bytes = buf.getvalue()

        result, ct = optimize_image(png_bytes, "image/png")
        assert ct == "image/jpeg"
        assert len(result) > 0

    def test_large_image_resized(self):
        try:
            from io import BytesIO
            from PIL import Image
        except ImportError:
            pytest.skip("Pillow not installed")

        img = Image.new("RGB", (4000, 3000), color="blue")
        buf = BytesIO()
        img.save(buf, format="PNG")
        png_bytes = buf.getvalue()

        result, ct = optimize_image(png_bytes, "image/png")
        result_img = Image.open(BytesIO(result))
        assert max(result_img.size) <= 2000


class TestSaveInvoiceImage:

    def test_saves_with_descriptive_name(self, tmp_path):
        with patch("app.services.invoice_service.UPLOAD_DIR", tmp_path):
            path = _save_invoice_image(
                b"fake data", "test.jpg", "DISTRIBUIDORA CAMACHO", "027533"
            )
            saved = Path(path)
            assert saved.exists()
            assert "DISTRIBUIDORA_CAMACHO" in saved.name
            assert "027533" in saved.name
            assert saved.suffix == ".jpg"

    def test_saves_without_proveedor(self, tmp_path):
        with patch("app.services.invoice_service.UPLOAD_DIR", tmp_path):
            path = _save_invoice_image(b"fake", "test.jpg", "", "F001")
            saved = Path(path)
            assert saved.exists()
            assert saved.name.startswith("FACTURA_F001_")

    def test_saves_without_any_info(self, tmp_path):
        with patch("app.services.invoice_service.UPLOAD_DIR", tmp_path):
            path = _save_invoice_image(b"fake", "test.jpg", "", "")
            saved = Path(path)
            assert saved.exists()
            assert saved.name.startswith("FACTURA_")

    def test_preserves_extension(self, tmp_path):
        with patch("app.services.invoice_service.UPLOAD_DIR", tmp_path):
            path = _save_invoice_image(b"fake", "photo.png", "SUP", "001")
            assert Path(path).suffix == ".png"

    def test_unknown_extension_defaults_to_jpg(self, tmp_path):
        with patch("app.services.invoice_service.UPLOAD_DIR", tmp_path):
            path = _save_invoice_image(b"fake", "file.bmp", "SUP", "001")
            assert Path(path).suffix == ".jpg"

    def test_strips_special_chars_from_proveedor(self, tmp_path):
        with patch("app.services.invoice_service.UPLOAD_DIR", tmp_path):
            path = _save_invoice_image(b"fake", "test.jpg", "C.A. VENEZOLANA", "001")
            saved = Path(path)
            assert "C_A__VENEZOLANA" in saved.name
