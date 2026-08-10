from decimal import Decimal, ROUND_FLOOR

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import EntityNotFoundError
from app.models.combo import Combo, ComboGroup, ComboGroupProduct, ComboPaymentMethod
from app.models.product import Product
from app.models.payment_method import PaymentMethod
from app.schemas.combo import ComboCreate, ComboUpdate


def get_combos(db: Session, *, activo: bool | None = None) -> list[Combo]:
    stmt = (
        select(Combo)
        .options(
            selectinload(Combo.groups).selectinload(ComboGroup.products),
            selectinload(Combo.payment_methods),
        )
    )
    if activo is not None:
        stmt = stmt.where(Combo.activo == activo)
    return list(db.execute(stmt).scalars().unique().all())


def get_combo(db: Session, combo_id: int) -> Combo:
    stmt = (
        select(Combo)
        .options(
            selectinload(Combo.groups).selectinload(ComboGroup.products),
            selectinload(Combo.payment_methods),
        )
        .where(Combo.id == combo_id)
    )
    combo = db.execute(stmt).scalars().first()
    if not combo:
        raise EntityNotFoundError("Combo no encontrado")
    return combo


def create_combo(db: Session, data: ComboCreate) -> Combo:
    for grupo in data.grupos:
        for entry in grupo.productos:
            stmt = select(Product).where(Product.id == entry.producto_id)
            if not db.execute(stmt).scalars().first():
                raise EntityNotFoundError(f"Producto ID {entry.producto_id} no encontrado")

    for pm_id in data.metodo_pago_ids:
        stmt = select(PaymentMethod).where(PaymentMethod.id == pm_id)
        if not db.execute(stmt).scalars().first():
            raise EntityNotFoundError(f"Método de pago ID {pm_id} no encontrado")

    combo = Combo(
        nombre=data.nombre,
        descripcion=data.descripcion,
        precio_total_usd=data.precio_total_usd,
    )
    combo.groups = [
        ComboGroup(
            nombre=g.nombre,
            min_cantidad=g.min_cantidad,
            max_cantidad=g.max_cantidad,
            products=[
                ComboGroupProduct(producto_id=ep.producto_id)
                for ep in g.productos
            ],
        )
        for g in data.grupos
    ]
    combo.payment_methods = [
        ComboPaymentMethod(metodo_pago_id=pm_id)
        for pm_id in data.metodo_pago_ids
    ]

    db.add(combo)
    db.commit()
    db.refresh(combo)
    return combo


def update_combo(db: Session, combo_id: int, data: ComboUpdate) -> Combo:
    combo = get_combo(db, combo_id)
    update_data = data.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        combo.nombre = update_data["nombre"]
    if "descripcion" in update_data:
        combo.descripcion = update_data["descripcion"]
    if "precio_total_usd" in update_data:
        combo.precio_total_usd = update_data["precio_total_usd"]
    if "activo" in update_data:
        combo.activo = update_data["activo"]

    if "grupos" in update_data:
        for grupo in update_data["grupos"]:
            for entry in grupo["productos"]:
                stmt = select(Product).where(Product.id == entry.producto_id)
                if not db.execute(stmt).scalars().first():
                    raise EntityNotFoundError(f"Producto ID {entry.producto_id} no encontrado")

        for old in list(combo.groups):
            db.delete(old)
        combo.groups = [
            ComboGroup(
                nombre=g["nombre"],
                min_cantidad=g["min_cantidad"],
                max_cantidad=g["max_cantidad"],
                products=[
                    ComboGroupProduct(producto_id=ep["producto_id"])
                    for ep in g["productos"]
                ],
            )
            for g in update_data["grupos"]
        ]

    if "metodo_pago_ids" in update_data:
        for pm_id in update_data["metodo_pago_ids"]:
            stmt = select(PaymentMethod).where(PaymentMethod.id == pm_id)
            if not db.execute(stmt).scalars().first():
                raise EntityNotFoundError(f"Método de pago ID {pm_id} no encontrado")

        for old in list(combo.payment_methods):
            db.delete(old)
        combo.payment_methods = [
            ComboPaymentMethod(metodo_pago_id=pm_id)
            for pm_id in update_data["metodo_pago_ids"]
        ]

    db.commit()
    db.refresh(combo)
    return combo


def delete_combo(db: Session, combo_id: int) -> None:
    combo = get_combo(db, combo_id)
    db.delete(combo)
    db.commit()


def distribute_combo_price(
    db: Session,
    combo: Combo,
    selections: dict[int, list[tuple[int, int]]],  # {grupo_id: [(producto_id, cantidad)]}
) -> list[dict]:
    """Distribuye el precio total del combo entre los items seleccionados.

    Algoritmo: distribución proporcional + ajuste de centavos por mayor resto.
    El total final SIEMPRE será exactamente combo.precio_total_usd.
    """
    all_items: list[dict] = []
    total_normal = Decimal("0")

    for grupo_id, product_selections in selections.items():
        for producto_id, cantidad in product_selections:
            product = db.execute(
                select(Product).where(Product.id == producto_id)
            ).scalars().first()
            if not product:
                raise EntityNotFoundError(f"Producto ID {producto_id} no encontrado")

            precio_normal = product.precio_unidad_usd
            subtotal_normal = Decimal(cantidad) * precio_normal
            total_normal += subtotal_normal

            all_items.append({
                "producto_id": producto_id,
                "tipo_empaque": "UNIDAD",
                "cantidad": cantidad,
                "precio_normal": precio_normal,
                "subtotal_normal": subtotal_normal,
                "producto_nombre": product.nombre,
                "tipo_iva": product.tipo_iva,
            })

    if total_normal == 0:
        return []

    combo_total = combo.precio_total_usd

    for item in all_items:
        raw_subtotal = (item["subtotal_normal"] / total_normal) * combo_total
        floor_subtotal = (raw_subtotal / Decimal("0.01")).quantize(Decimal("1"), rounding=ROUND_FLOOR) * Decimal("0.01")
        item["floor_subtotal"] = floor_subtotal
        item["remainder"] = raw_subtotal - floor_subtotal

    allocated = sum(item["floor_subtotal"] for item in all_items)
    remaining_cents = int(((combo_total - allocated) / Decimal("0.01")).quantize(Decimal("1")))

    all_items.sort(key=lambda x: x["remainder"], reverse=True)

    for i in range(min(remaining_cents, len(all_items))):
        all_items[i]["floor_subtotal"] += Decimal("0.01")

    for item in all_items:
        item["precio_unitario"] = (item["floor_subtotal"] / Decimal(item["cantidad"])).quantize(Decimal("0.01"))
        item.pop("floor_subtotal", None)
        item.pop("remainder", None)

    return all_items


def get_active_combos(db: Session) -> list[dict]:
    combos = get_combos(db, activo=True)
    result = []
    for combo in combos:
        groups = []
        metodo_pago_ids = [pm.metodo_pago_id for pm in combo.payment_methods]
        for group in combo.groups:
            groups.append({
                "id": group.id,
                "nombre": group.nombre,
                "min_cantidad": group.min_cantidad,
                "max_cantidad": group.max_cantidad,
                "productos": [
                    {
                        "producto_id": gp.producto_id,
                        "nombre": gp.product.nombre,
                        "precio_unidad_usd": gp.product.precio_unidad_usd,
                    }
                    for gp in group.products
                ],
            })
        result.append({
            "id": combo.id,
            "nombre": combo.nombre,
            "precio_total_usd": combo.precio_total_usd,
            "groups": groups,
            "metodo_pago_ids": metodo_pago_ids,
        })
    return result
