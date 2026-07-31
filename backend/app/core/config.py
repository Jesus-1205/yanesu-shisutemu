import hashlib
import os
from pathlib import Path
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()

VE_TZ = ZoneInfo("America/Caracas")

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Config:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(BASE_DIR / "licoreria.db"))

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
