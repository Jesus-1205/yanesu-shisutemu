from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Config
from app.core.database import get_db
from app.models.user import User


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=[Config.ALGORITHM])
    except JWTError:
        return None


def get_current_user(
    access_token: str = Cookie(None),
    db: Session = Depends(get_db),
) -> User:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado",
        )

    payload = decode_access_token(access_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    stmt = select(User).options(selectinload(User.role)).where(User.id == int(user_id))
    user = db.execute(stmt).scalars().first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
        )

    return user


def require_role(*roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.nombre not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return current_user
    return role_checker
