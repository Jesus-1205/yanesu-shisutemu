import hashlib
import os
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

load_dotenv()

VE_TZ = ZoneInfo("America/Caracas")


class Config:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", 5432))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "licoreria")

    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    SECURE_COOKIE: bool = os.getenv("SECURE_COOKIE", "False").lower() == "true"

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    SQLALCHEMY_DATABASE_URL: str = (
        f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
        f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
    )

    @classmethod
    def get_fernet_key(cls) -> bytes:
        key = cls.ENCRYPTION_KEY
        if not key:
            key = hashlib.sha256(cls.SECRET_KEY.encode()).hexdigest()
        if isinstance(key, str):
            import base64
            key = base64.urlsafe_b64encode(key.encode()[:32])
        return key
