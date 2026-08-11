from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.price_rule import PriceRule, PriceRuleProduct, PriceRulePaymentMethod
from app.models.product import Product
from app.models.payment_method import PaymentMethod
from app.schemas.price_rule import PriceRuleCreate, PriceRuleUpdate


def get_price_rules(db: Session, *, activo: bool | None = None) -> list[PriceRule]:
    stmt = (
        select(PriceRule)
        .options(
            selectinload(PriceRule.products),
            selectinload(PriceRule.payment_methods),
        )
    )
    if activo is not None:
        stmt = stmt.where(PriceRule.activo == activo)
    return list(db.execute(stmt).scalars().unique().all())


def get_price_rule(db: Session, rule_id: int) -> PriceRule:
    stmt = (
        select(PriceRule)
        .options(
            selectinload(PriceRule.products),
            selectinload(PriceRule.payment_methods),
        )
        .where(PriceRule.id == rule_id)
    )
    rule = db.execute(stmt).scalars().first()
    if not rule:
        raise EntityNotFoundError("Regla de precio no encontrada")
    return rule


def create_price_rule(db: Session, data: PriceRuleCreate) -> PriceRule:
    for entry in data.productos:
        stmt = select(Product).where(Product.id == entry.producto_id)
        if not db.execute(stmt).scalars().first():
            raise EntityNotFoundError(f"Producto ID {entry.producto_id} no encontrado")

    for pm_id in data.metodo_pago_ids:
        stmt = select(PaymentMethod).where(PaymentMethod.id == pm_id)
        if not db.execute(stmt).scalars().first():
            raise EntityNotFoundError(f"Método de pago ID {pm_id} no encontrado")

    rule = PriceRule(
        nombre=data.nombre,
        descripcion=data.descripcion,
    )
    rule.products = [
        PriceRuleProduct(
            producto_id=e.producto_id,
            tipo_empaque=e.tipo_empaque,
            precio_usd=e.precio_usd,
        )
        for e in data.productos
    ]
    rule.payment_methods = [
        PriceRulePaymentMethod(metodo_pago_id=pm_id)
        for pm_id in data.metodo_pago_ids
    ]

    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def update_price_rule(db: Session, rule_id: int, data: PriceRuleUpdate) -> PriceRule:
    rule = get_price_rule(db, rule_id)
    update_data = data.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        rule.nombre = update_data["nombre"]
    if "descripcion" in update_data:
        rule.descripcion = update_data["descripcion"]
    if "activo" in update_data:
        rule.activo = update_data["activo"]

    if "productos" in update_data:
        for entry in update_data["productos"]:
            stmt = select(Product).where(Product.id == entry["producto_id"])
            if not db.execute(stmt).scalars().first():
                raise EntityNotFoundError(f"Producto ID {entry['producto_id']} no encontrado")

        for old in list(rule.products):
            db.delete(old)
        db.flush()
        rule.products = [
            PriceRuleProduct(
                producto_id=e["producto_id"],
                tipo_empaque=e["tipo_empaque"],
                precio_usd=e["precio_usd"],
            )
            for e in update_data["productos"]
        ]

    if "metodo_pago_ids" in update_data:
        for pm_id in update_data["metodo_pago_ids"]:
            stmt = select(PaymentMethod).where(PaymentMethod.id == pm_id)
            if not db.execute(stmt).scalars().first():
                raise EntityNotFoundError(f"Método de pago ID {pm_id} no encontrado")

        for old in list(rule.payment_methods):
            db.delete(old)
        db.flush()
        rule.payment_methods = [
            PriceRulePaymentMethod(metodo_pago_id=pm_id)
            for pm_id in update_data["metodo_pago_ids"]
        ]

    db.commit()
    db.refresh(rule)
    return rule


def delete_price_rule(db: Session, rule_id: int) -> None:
    rule = get_price_rule(db, rule_id)
    db.delete(rule)
    db.commit()


def get_active_divisas_prices(db: Session) -> dict[int, dict[str, Decimal]]:
    stmt = (
        select(PriceRule)
        .where(PriceRule.activo == True)
        .options(
            selectinload(PriceRule.products),
            selectinload(PriceRule.payment_methods),
        )
    )
    rules = db.execute(stmt).scalars().unique().all()

    prices: dict[int, dict[str, Decimal]] = {}
    for rule in rules:
        for rp in rule.products:
            prices.setdefault(rp.producto_id, {})[rp.tipo_empaque] = rp.precio_usd
    return prices


def get_divisas_payment_method_ids(db: Session) -> set[int]:
    stmt = (
        select(PriceRulePaymentMethod.metodo_pago_id)
        .join(PriceRule, PriceRule.id == PriceRulePaymentMethod.regla_id)
        .where(PriceRule.activo == True)
        .distinct()
    )
    return {row[0] for row in db.execute(stmt).all()}
