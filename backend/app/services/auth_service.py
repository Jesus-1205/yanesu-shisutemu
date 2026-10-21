from datetime import datetime, timedelta, timezone

from fastapi import Response
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Config
from app.core.exceptions import ConflictError
from app.models.user import User
from app.schemas.user import UserCreate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


get_password_hash = hash_password


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=Config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, Config.SECRET_KEY, algorithm=Config.ALGORITHM)


def _exists(db: Session, field: str, value: str) -> bool:
    column = getattr(User, field)
    stmt = select(User).where(column == value)
    return db.execute(stmt).scalars().first() is not None


def create_user(db: Session, user_data: UserCreate) -> User:
    if _exists(db, "username", user_data.username):
        raise ConflictError("El nombre de usuario ya está registrado")
    if _exists(db, "email", user_data.email):
        raise ConflictError("El email ya está registrado")

    hashed = hash_password(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed,
        nombre_completo=user_data.nombre_completo,
        rol_id=user_data.rol_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    stmt = select(User).options(selectinload(User.role)).where(User.username == username)
    user = db.execute(stmt).scalars().first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def set_token_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=Config.SECURE_COOKIE,
        samesite="lax",
        max_age=Config.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def clear_token_cookie(response: Response):
    response.set_cookie(key="access_token", value="", httponly=True, path="/", max_age=0)


def register_user(db: Session, user_data: UserCreate) -> tuple[User, str]:
    user = create_user(db, user_data)
    token = create_access_token({"sub": str(user.id)})
    return user, token


def setup_first_admin(db: Session, data: UserCreate) -> tuple[User, str]:
    from sqlalchemy import func
    from app.models.role import Role
    from app.core.exceptions import EntityNotFoundError

    if db.execute(select(func.count()).select_from(User)).scalar() > 0:
        raise ValueError("El sistema ya tiene usuarios configurados")

    admin_role = db.execute(
        select(Role).where(Role.nombre == "ADMINISTRADOR")
    ).scalars().first()

    if not admin_role:
        raise EntityNotFoundError("Rol ADMINISTRADOR no encontrado")

    if _exists(db, "username", data.username):
        raise ConflictError("El nombre de usuario ya está registrado")
    if _exists(db, "email", data.email):
        raise ConflictError("El email ya está registrado")

    hashed = hash_password(data.password)
    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hashed,
        nombre_completo=data.nombre_completo,
        rol_id=admin_role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return user, token


def login_user(db: Session, username: str, password: str) -> tuple[User, str] | None:
    user = authenticate_user(db, username, password)
    if not user or not user.is_active:
        return None
    token = create_access_token({"sub": str(user.id)})
    return user, token
