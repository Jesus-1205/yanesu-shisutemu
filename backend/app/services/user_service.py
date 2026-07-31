from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.user import User
from app.schemas.user import UserUpdate
from app.services.auth_service import hash_password


def get_users(db: Session) -> list[User]:
    stmt = select(User).options(selectinload(User.role)).order_by(User.username)
    return list(db.execute(stmt).scalars().all())


def get_user(db: Session, user_id: int) -> User | None:
    stmt = select(User).options(selectinload(User.role)).where(User.id == user_id)
    return db.execute(stmt).scalars().first()


def update_user(db: Session, user_id: int, data: UserUpdate) -> User:
    user = get_user(db, user_id)
    if not user:
        raise EntityNotFoundError("Usuario no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    if "password" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


def toggle_user_active(db: Session, user_id: int) -> User:
    user = get_user(db, user_id)
    if not user:
        raise EntityNotFoundError("Usuario no encontrado")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> None:
    user = get_user(db, user_id)
    if not user:
        raise EntityNotFoundError("Usuario no encontrado")

    if user.sales:
        raise ConflictError("No se puede eliminar: el usuario tiene ventas registradas")

    if user.facturas:
        raise ConflictError("No se puede eliminar: el usuario tiene facturas registradas")

    db.delete(user)
    db.commit()
