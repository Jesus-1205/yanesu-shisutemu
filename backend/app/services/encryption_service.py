from cryptography.fernet import Fernet

from app.core.config import Config

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(Config.get_fernet_key())
    return _fernet


def encrypt_value(plain: str) -> str:
    f = _get_fernet()
    return f.encrypt(plain.encode()).decode()


def decrypt_value(cipher: str) -> str:
    f = _get_fernet()
    return f.decrypt(cipher.encode()).decode()
