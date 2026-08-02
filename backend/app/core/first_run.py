from sqlalchemy.orm import Session

from app.core.database import engine, Base
from app.models.role import Role
from app.models.user import User
from app.models.payment_method import PaymentMethod


def initialize_database(db: Session) -> bool:
    """
    Crea las tablas, roles y métodos de pago por defecto si no existen.
    Retorna True si la BD requiere configuración de Admin (cero usuarios).
    """
    Base.metadata.create_all(bind=engine)

    if db.query(Role).count() == 0:
        db.add_all([
            Role(nombre="ADMINISTRADOR"),
            Role(nombre="OPERADOR"),
        ])
        db.commit()

    if db.query(PaymentMethod).count() == 0:
        db.add_all([
            PaymentMethod(nombre="Pago Móvil", moneda_default="VES", acepta_referencia=True),
            PaymentMethod(nombre="Efectivo", moneda_default="VES", acepta_referencia=False),
            PaymentMethod(nombre="Punto de Venta", moneda_default="VES", acepta_referencia=False),
            PaymentMethod(nombre="Divisas", moneda_default="USD", acepta_referencia=False),
        ])
        db.commit()

    return db.query(User).count() == 0
