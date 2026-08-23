import hashlib
import logging
import os
import secrets
import sys
from pathlib import Path
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

VE_TZ = ZoneInfo("America/Caracas")


def get_app_data_dir() -> Path:
    """Directorio de datos persistente de la aplicación.

    Windows: %LOCALAPPDATA%/YanesuShisutemu
    macOS:   ~/Library/Application Support/YanesuShisutemu
    Linux:   ~/.local/share/YanesuShisutemu
    Docker:  se sobreescribe con la variable DATA_DIR (volumen montado).
    """
    data_dir_override = os.getenv("DATA_DIR")
    if data_dir_override:
        app_dir = Path(data_dir_override)
    elif sys.platform == "win32":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
        app_dir = base / "YanesuShisutemu"
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
        app_dir = base / "YanesuShisutemu"
    else:
        base = Path.home() / ".local" / "share"
        app_dir = base / "YanesuShisutemu"

    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir


def get_secret_key() -> str:
    """Retorna SECRET_KEY desde env (VPS) o archivo persistente (desktop)."""
    env_key = os.getenv("SECRET_KEY")
    if env_key:
        return env_key
    key_file = get_app_data_dir() / ".secret_key"
    try:
        return key_file.read_text().strip()
    except FileNotFoundError:
        key = secrets.token_hex(32)
        key_file.write_text(key)
        logger.warning("SECRET_KEY generada y guardada en %s", key_file)
        return key
    except Exception:
        logger.exception("Error leyendo .secret_key, usando fallback inseguro")
        return "supersecretkey"


def get_db_path() -> Path:
    db_dir = get_app_data_dir() / "data"
    db_dir.mkdir(parents=True, exist_ok=True)
    return db_dir / "yanesu.db"


def get_uploads_dir() -> Path:
    uploads = get_app_data_dir() / "uploads" / "facturas"
    uploads.mkdir(parents=True, exist_ok=True)
    return uploads


def get_comprobantes_pago_dir() -> Path:
    comprobantes = get_app_data_dir() / "uploads" / "comprobantes_pago"
    comprobantes.mkdir(parents=True, exist_ok=True)
    return comprobantes


def get_log_dir() -> Path:
    log_dir = get_app_data_dir() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def get_audit_log_path() -> Path:
    return get_log_dir() / "audit.log"


AUDIT_MAX_BYTES: int = 5 * 1024 * 1024
AUDIT_MAX_ROTATED: int = 6


class Config:
    SECRET_KEY: str = get_secret_key()
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 240

    DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(get_db_path()))

    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    SECURE_COOKIE: bool = os.getenv("SECURE_COOKIE", "True").lower() == "true"

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    SQLALCHEMY_DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")

    @classmethod
    def is_postgres(cls) -> bool:
        return cls.SQLALCHEMY_DATABASE_URL.startswith("postgresql")

    @classmethod
    def get_fernet_key(cls) -> bytes:
        key = cls.ENCRYPTION_KEY
        if not key:
            key = hashlib.sha256(cls.SECRET_KEY.encode()).hexdigest()
        if isinstance(key, str):
            import base64
            key = base64.urlsafe_b64encode(key.encode()[:32])
        return key
