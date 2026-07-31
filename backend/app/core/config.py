import hashlib
import os
import sys
from pathlib import Path
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()

VE_TZ = ZoneInfo("America/Caracas")


def get_app_data_dir() -> Path:
    """Directorio de datos persistente de la aplicación.

    Windows: %LOCALAPPDATA%/SistemaLicoreria
    macOS:   ~/Library/Application Support/SistemaLicoreria
    Linux:   ~/.local/share/SistemaLicoreria
    """
    if sys.platform == "win32":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path.home() / ".local" / "share"

    app_dir = base / "SistemaLicoreria"
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir


def get_db_path() -> Path:
    db_dir = get_app_data_dir() / "data"
    db_dir.mkdir(parents=True, exist_ok=True)
    return db_dir / "licoreria.db"


def get_uploads_dir() -> Path:
    uploads = get_app_data_dir() / "uploads" / "facturas"
    uploads.mkdir(parents=True, exist_ok=True)
    return uploads


class Config:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(get_db_path()))

    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    SECURE_COOKIE: bool = os.getenv("SECURE_COOKIE", "False").lower() == "true"

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    SQLALCHEMY_DATABASE_URL: str = f"sqlite:///{DATABASE_PATH}"

    @classmethod
    def get_fernet_key(cls) -> bytes:
        key = cls.ENCRYPTION_KEY
        if not key:
            key = hashlib.sha256(cls.SECRET_KEY.encode()).hexdigest()
        if isinstance(key, str):
            import base64
            key = base64.urlsafe_b64encode(key.encode()[:32])
        return key
