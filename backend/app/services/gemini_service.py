import httpx

from app.schemas.system_setting import TestConnectionResponse

GOOGLE_GEMINI_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models"

_GOOGLE_ERRORS_ES = {
    "API key not valid. Please pass a valid API key.":
        "API key no válida. Por favor, proporciona una API key válida.",
    "The request is missing a valid API key.":
        "La solicitud no contiene una API key válida.",
    "Request had invalid authentication credentials.":
        "Las credenciales de autenticación de la solicitud son inválidas.",
    "Permission denied. Please enable the corresponding API in Google Cloud Console.":
        "Permiso denegado. Habilita la API correspondiente en la consola de Google Cloud.",
}


def check_gemini_connection(api_key: str) -> TestConnectionResponse:
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(
                GOOGLE_GEMINI_MODELS_URL,
                params={"key": api_key},
            )

            if response.status_code != 200:
                error_data = response.json().get("error", {})
                raw_message = error_data.get("message", response.text)
                message = _GOOGLE_ERRORS_ES.get(raw_message, raw_message)
                return TestConnectionResponse(
                    success=False,
                    message=f"Error de autenticación: {message}",
                )

            return TestConnectionResponse(
                success=True,
                message="Conexión exitosa con Google Gemini",
            )

    except httpx.TimeoutException:
        return TestConnectionResponse(
            success=False,
            message="Timeout: no se pudo conectar con la API de Gemini",
        )
    except httpx.ConnectError:
        return TestConnectionResponse(
            success=False,
            message="Error de conexión: no se pudo alcanzar la API de Gemini",
        )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"Error inesperado: {str(e)}",
        )
