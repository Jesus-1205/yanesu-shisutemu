"""Tests para funciones puras de invoice_service: optimize_image, _save_invoice_image."""
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.invoice_service import optimize_image, _save_invoice_image


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

        import random
        random.seed(42)
        img = Image.new("RGB", (2000, 2000))
        pixels = img.load()
        for x in range(2000):
            for y in range(2000):
                pixels[x, y] = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
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
        with patch("app.services.invoice_service.get_uploads_dir", return_value=tmp_path):
            path = _save_invoice_image(
                b"fake data", "test.jpg", "DISTRIBUIDORA CAMACHO", "027533"
            )
            saved = Path(path)
            assert saved.exists()
            assert "DISTRIBUIDORA_CAMACHO" in saved.name
            assert "027533" in saved.name
            assert saved.suffix == ".jpg"

    def test_saves_without_proveedor(self, tmp_path):
        with patch("app.services.invoice_service.get_uploads_dir", return_value=tmp_path):
            path = _save_invoice_image(b"fake", "test.jpg", "", "F001")
            saved = Path(path)
            assert saved.exists()
            assert saved.name.startswith("FACTURA_F001_")

    def test_saves_without_any_info(self, tmp_path):
        with patch("app.services.invoice_service.get_uploads_dir", return_value=tmp_path):
            path = _save_invoice_image(b"fake", "test.jpg", "", "")
            saved = Path(path)
            assert saved.exists()
            assert saved.name.startswith("FACTURA_")

    def test_preserves_extension(self, tmp_path):
        with patch("app.services.invoice_service.get_uploads_dir", return_value=tmp_path):
            path = _save_invoice_image(b"fake", "photo.png", "SUP", "001")
            assert Path(path).suffix == ".png"

    def test_unknown_extension_defaults_to_jpg(self, tmp_path):
        with patch("app.services.invoice_service.get_uploads_dir", return_value=tmp_path):
            path = _save_invoice_image(b"fake", "file.bmp", "SUP", "001")
            assert Path(path).suffix == ".jpg"

    def test_strips_special_chars_from_proveedor(self, tmp_path):
        with patch("app.services.invoice_service.get_uploads_dir", return_value=tmp_path):
            path = _save_invoice_image(b"fake", "test.jpg", "C.A. VENEZOLANA", "001")
            saved = Path(path)
            assert "C_A__VENEZOLANA" in saved.name


class TestCallGeminiAndAnalyze:

    def test_optimize_image_rgba_palette(self):
        try:
            from io import BytesIO
            import random
            from PIL import Image
        except ImportError:
            pytest.skip("Pillow not installed")

        random.seed(42)
        img_rgba = Image.new("RGBA", (500, 500))
        pixels = img_rgba.load()
        for x in range(500):
            for y in range(500):
                pixels[x, y] = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255), 255)

        buf_rgba = BytesIO()
        img_rgba.save(buf_rgba, format="PNG")
        res, ct = optimize_image(buf_rgba.getvalue(), "image/png")
        assert ct == "image/jpeg"

        img_p = Image.new("P", (10, 10))
        buf_p = BytesIO()
        img_p.save(buf_p, format="PNG")
        res, ct = optimize_image(buf_p.getvalue(), "image/png")
        assert len(res) > 0

    def test_call_gemini_missing_api_key(self):
        from app.services.invoice_service import _call_gemini
        with patch("app.core.config.Config.GEMINI_API_KEY", ""):
            with pytest.raises(ValueError, match="API Key de Gemini no configurada"):
                _call_gemini([], "prompt", "user_msg", db=None)

    def test_call_gemini_http_errors(self):
        from app.services.invoice_service import _call_gemini
        from unittest.mock import MagicMock

        with patch("app.core.config.Config.GEMINI_API_KEY", "fake-key"):
            cases = [
                (401, r"API Key de Gemini inválida o revocada"),
                (429, r"Se excedió la cuota de Gemini"),
                (500, r"Gemini no está disponible en este momento"),
                (400, r"Gemini devolvió un error \(400\)"),
            ]
            for status_code, err_msg in cases:
                mock_resp = MagicMock()
                mock_resp.status_code = status_code
                with patch("httpx.Client.post", return_value=mock_resp):
                    with pytest.raises(ValueError, match=err_msg):
                        _call_gemini([(b"bytes", "image/jpeg")], "prompt", "msg")

    def test_call_gemini_safety_block_and_empty(self):
        from app.services.invoice_service import _call_gemini
        from unittest.mock import MagicMock

        with patch("app.core.config.Config.GEMINI_API_KEY", "fake-key"):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {"promptFeedback": {"blockReason": "SAFETY"}}
            with patch("httpx.Client.post", return_value=mock_resp):
                with pytest.raises(ValueError, match="La IA bloqueó la respuesta"):
                    _call_gemini([(b"bytes", "image/jpeg")], "prompt", "msg")

            mock_resp.json.return_value = {"candidates": []}
            with patch("httpx.Client.post", return_value=mock_resp):
                with pytest.raises(ValueError, match="Gemini no retornó contenido"):
                    _call_gemini([(b"bytes", "image/jpeg")], "prompt", "msg")

            mock_resp.json.return_value = {
                "candidates": [{"content": {"parts": [{"text": '{"error": "imagen borrosa"}'}]}}]
            }
            with patch("httpx.Client.post", return_value=mock_resp):
                with pytest.raises(ValueError, match="La IA no pudo leer la factura: imagen borrosa"):
                    _call_gemini([(b"bytes", "image/jpeg")], "prompt", "msg")

    def test_analyze_invoice_from_image_flow(self, db):
        from app.services.invoice_service import analyze_invoice_from_image
        from app.models.supplier import Supplier

        sup = Supplier(nombre="DISTRIBUIDORA POLAR")
        db.add(sup)
        db.commit()

        mock_meta = {
            "proveedor": {"nombre": "DISTRIBUIDORA POLAR", "rif": "J-12345678-9"},
            "numero_factura": "FACT-0099",
            "fecha_factura": "2026-05-10",
            "moneda": "USD",
            "tipo_documento": "FACTURA",
        }
        mock_prods = {
            "productos": [
                {
                    "nombre": "Cerveza Polar Pilsen",
                    "cantidad": 5,
                    "tipo_empaque": "CAJA",
                    "precio_unitario": 15.50,
                    "precio_total": 77.50,
                    "exento": False,
                }
            ]
        }

        with patch("app.services.invoice_service._call_gemini") as mock_gemini:
            mock_gemini.side_effect = [mock_meta, mock_prods]
            res = analyze_invoice_from_image(db, [(b"fake_image_bytes", "image/jpeg")])
            assert res.proveedor_nombre == "DISTRIBUIDORA POLAR"
            assert res.numero_factura == "FACT-0099"
            assert len(res.productos) == 1
            assert res.productos[0].nombre == "Cerveza Polar Pilsen"
