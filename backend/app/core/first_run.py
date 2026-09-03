from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.user import User
from app.models.payment_method import PaymentMethod


def initialize_database(db: Session) -> bool:
    """Semillas por defecto. Retorna True si la BD requiere configuración de Admin."""
    if db.execute(select(func.count()).select_from(Role)).scalar() == 0:
        db.add_all([
            Role(nombre="ADMINISTRADOR"),
            Role(nombre="OPERADOR"),
        ])
        db.commit()

    if db.execute(select(func.count()).select_from(PaymentMethod)).scalar() == 0:
        db.add_all([
            PaymentMethod(nombre="Pago Móvil", moneda_default="VES", acepta_referencia=True),
            PaymentMethod(nombre="Efectivo", moneda_default="VES", acepta_referencia=False),
            PaymentMethod(nombre="Punto de Venta", moneda_default="VES", acepta_referencia=False),
            PaymentMethod(nombre="Divisas", moneda_default="USD", acepta_referencia=False),
        ])
        db.commit()

    return db.execute(select(func.count()).select_from(User)).scalar() == 0
