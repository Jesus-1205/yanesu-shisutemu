from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.role import Role
from app.schemas.role import RoleCreate


def get_roles(db: Session) -> list[Role]:
    stmt = select(Role).order_by(Role.nombre)
    return list(db.execute(stmt).scalars().all())


def get_role(db: Session, role_id: int) -> Role | None:
    stmt = select(Role).where(Role.id == role_id)
    return db.execute(stmt).scalars().first()


def create_role(db: Session, data: RoleCreate) -> Role:
    stmt = select(Role).where(Role.nombre == data.nombre)
    if db.execute(stmt).scalars().first():
        raise ConflictError("El rol ya existe")

    role = Role(nombre=data.nombre)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def update_role(db: Session, role_id: int, data: RoleCreate) -> Role:
    role = get_role(db, role_id)
    if not role:
        raise EntityNotFoundError("Rol no encontrado")

    stmt = select(Role).where(Role.nombre == data.nombre, Role.id != role_id)
    if db.execute(stmt).scalars().first():
        raise ConflictError("El nombre del rol ya está en uso")

    role.nombre = data.nombre
    db.commit()
    db.refresh(role)
    return role


def delete_role(db: Session, role_id: int) -> None:
    role = get_role(db, role_id)
    if not role:
        raise EntityNotFoundError("Rol no encontrado")

    if role.users:
        raise ConflictError("No se puede eliminar un rol con usuarios asociados")

    db.delete(role)
    db.commit()
