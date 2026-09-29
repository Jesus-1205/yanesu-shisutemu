from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.role import Role


def get_roles(db: Session) -> list[Role]:
    stmt = select(Role).order_by(Role.nombre)
    return list(db.execute(stmt).scalars().all())


def get_role(db: Session, role_id: int) -> Role | None:
    stmt = select(Role).where(Role.id == role_id)
    return db.execute(stmt).scalars().first()

