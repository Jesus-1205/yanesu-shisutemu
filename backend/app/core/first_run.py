from sqlalchemy.orm import Session

from app.core.database import engine, Base
from app.models.role import Role
from app.models.user import User


def initialize_database(db: Session) -> bool:
    """
    Crea las tablas y los roles básicos si no existen.
    Retorna True si la BD requiere configuración de Admin (cero usuarios).
    """
    Base.metadata.create_all(bind=engine)

    if db.query(Role).count() == 0:
        db.add_all([
            Role(nombre="ADMINISTRADOR"),
            Role(nombre="OPERADOR"),
        ])
        db.commit()

    return db.query(User).count() == 0
