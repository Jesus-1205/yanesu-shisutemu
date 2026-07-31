from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.system_setting import SystemSetting
from app.services.encryption_service import encrypt_value, decrypt_value


def get_api_key(db: Session, clave: str) -> str | None:
    stmt = select(SystemSetting).where(SystemSetting.clave == clave)
    setting = db.execute(stmt).scalars().first()
    if not setting:
        return None
    return decrypt_value(setting.valor_cifrado)


def get_setting_by_clave(db: Session, clave: str) -> SystemSetting | None:
    stmt = select(SystemSetting).where(SystemSetting.clave == clave)
    return db.execute(stmt).scalars().first()


def set_api_key(
    db: Session,
    clave: str,
    valor: str,
    user_id: int | None = None,
    descripcion: str | None = None,
) -> SystemSetting:
    stmt = select(SystemSetting).where(SystemSetting.clave == clave)
    setting = db.execute(stmt).scalars().first()

    encrypted = encrypt_value(valor)

    if setting:
        setting.valor_cifrado = encrypted
        setting.actualizado_por = user_id
        if descripcion is not None:
            setting.descripcion = descripcion
    else:
        setting = SystemSetting(
            clave=clave,
            valor_cifrado=encrypted,
            descripcion=descripcion,
            actualizado_por=user_id,
        )
        db.add(setting)

    db.commit()
    db.refresh(setting)
    return setting


def delete_api_key(db: Session, clave: str) -> bool:
    stmt = select(SystemSetting).where(SystemSetting.clave == clave)
    setting = db.execute(stmt).scalars().first()
    if not setting:
        return False
    db.delete(setting)
    db.commit()
    return True


def has_api_key(db: Session, clave: str) -> bool:
    stmt = select(SystemSetting).where(SystemSetting.clave == clave)
    return db.execute(stmt).scalars().first() is not None
