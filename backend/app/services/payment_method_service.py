from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.payment_method import PaymentMethod
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate


def get_payment_methods(db: Session, solo_activos: bool = False) -> list[PaymentMethod]:
    stmt = select(PaymentMethod).order_by(PaymentMethod.id)
    if solo_activos:
        stmt = stmt.where(PaymentMethod.activo.is_(True))
    return list(db.execute(stmt).scalars().all())


def get_payment_method(db: Session, metodo_id: int) -> PaymentMethod:
    stmt = select(PaymentMethod).where(PaymentMethod.id == metodo_id)
    metodo = db.execute(stmt).scalars().first()
    if not metodo:
        raise EntityNotFoundError("Método de pago no encontrado")
    return metodo


def crear_payment_method(db: Session, data: PaymentMethodCreate) -> PaymentMethod:
    stmt = select(PaymentMethod).where(PaymentMethod.nombre == data.nombre)
    existing = db.execute(stmt).scalars().first()
    if existing:
        raise ConflictError(f"Ya existe un método de pago con nombre '{data.nombre}'")
    metodo = PaymentMethod(
        nombre=data.nombre,
        moneda_default=data.moneda_default,
        acepta_referencia=data.acepta_referencia,
        activo=data.activo,
    )
    db.add(metodo)
    db.commit()
    db.refresh(metodo)
    return metodo


def actualizar_payment_method(db: Session, metodo_id: int, data: PaymentMethodUpdate) -> PaymentMethod:
    metodo = get_payment_method(db, metodo_id)
    if data.nombre is not None and data.nombre != metodo.nombre:
        stmt = select(PaymentMethod).where(
            PaymentMethod.nombre == data.nombre, PaymentMethod.id != metodo_id
        )
        existing = db.execute(stmt).scalars().first()
        if existing:
            raise ConflictError(f"Ya existe un método de pago con nombre '{data.nombre}'")
        metodo.nombre = data.nombre
    if data.activo is not None:
        metodo.activo = data.activo
    if data.moneda_default is not None:
        metodo.moneda_default = data.moneda_default
    if data.acepta_referencia is not None:
        metodo.acepta_referencia = data.acepta_referencia
    db.commit()
    db.refresh(metodo)
    return metodo


def eliminar_payment_method(db: Session, metodo_id: int) -> None:
    metodo = get_payment_method(db, metodo_id)
    db.delete(metodo)
    db.commit()