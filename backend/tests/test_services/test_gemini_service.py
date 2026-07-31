from unittest.mock import patch, MagicMock

from app.services.gemini_service import check_gemini_connection


def test_check_gemini_connection_success():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "models": [
            {"name": "models/gemini-2.0-flash", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-1.5-pro", "supportedGenerationMethods": ["generateContent"]},
        ]
    }

    with patch("app.services.gemini_service.httpx.Client") as mock_client:
        mock_client.return_value.__enter__ = MagicMock(return_value=mock_client)
        mock_client.return_value.__exit__ = MagicMock(return_value=False)
        mock_client.get.return_value = mock_response

        result = check_gemini_connection("valid-key")

    assert result.success is True
    assert "Conexión exitosa" in result.message


def test_check_gemini_connection_invalid_key():
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.json.return_value = {
        "error": {
            "message": "API key not valid. Please pass a valid API key.",
            "status": "INVALID_ARGUMENT",
        }
    }
    mock_response.text = "API key not valid"

    with patch("app.services.gemini_service.httpx.Client") as mock_client:
        mock_client.return_value.__enter__ = MagicMock(return_value=mock_client)
        mock_client.return_value.__exit__ = MagicMock(return_value=False)
        mock_client.get.return_value = mock_response

        result = check_gemini_connection("invalid-key")

    assert result.success is False
    assert "API key no válida" in result.message


def test_check_gemini_connection_timeout():
    import httpx

    with patch("app.services.gemini_service.httpx.Client") as mock_client:
        mock_client.return_value.__enter__ = MagicMock(return_value=mock_client)
        mock_client.return_value.__exit__ = MagicMock(return_value=False)
        mock_client.get.side_effect = httpx.TimeoutException("timeout")

        result = check_gemini_connection("key")

    assert result.success is False
    assert "Timeout" in result.message


def test_check_gemini_connection_error():
    import httpx

    with patch("app.services.gemini_service.httpx.Client") as mock_client:
        mock_client.return_value.__enter__ = MagicMock(return_value=mock_client)
        mock_client.return_value.__exit__ = MagicMock(return_value=False)
        mock_client.get.side_effect = httpx.ConnectError("connection refused")

        result = check_gemini_connection("key")

    assert result.success is False
    assert "conexión" in result.message.lower()


def test_check_gemini_connection_unexpected_error():
    with patch("app.services.gemini_service.httpx.Client") as mock_client:
        mock_client.return_value.__enter__ = MagicMock(return_value=mock_client)
        mock_client.return_value.__exit__ = MagicMock(return_value=False)
        mock_client.get.side_effect = RuntimeError("something broke")

        result = check_gemini_connection("key")

    assert result.success is False
    assert "Error inesperado" in result.message
