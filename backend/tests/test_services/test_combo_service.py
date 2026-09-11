from decimal import Decimal

import pytest

from app.core.exceptions import EntityNotFoundError
from app.models.combo import Combo, ComboGroup, ComboGroupProduct, ComboPaymentMethod
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.schemas.combo import ComboCreate, ComboGroupEntry, ComboGroupProductEntry, ComboUpdate
from app.services.combo_service import (
    create_combo,
    delete_combo,
    distribute_combo_price,
    get_active_combos,
    get_combo,
    get_combos,
    update_combo,
)


def _create_product(db, nombre="Cerveza Premium", precio_unidad_usd="5.00"):
    p = Product(
        nombre=nombre,
        precio_costo_caja_usd=Decimal("60"),
        precio_costo_usd=Decimal("5"),
        precio_unidad_usd=Decimal(precio_unidad_usd),
        precio_caja_usd=Decimal("60"),
        stock_unidades=100,
        unidades_por_caja=12,
    )
    db.add(p)
    db.flush()
    return p


def _create_payment_method(db, nombre="DIVISAS"):
    pm = PaymentMethod(nombre=nombre, activo=True)
    db.add(pm)
    db.flush()
    return pm


def _combo_data(product_id, pm_id, nombre="Combo Mix", precio="10.00"):
    return ComboCreate(
        nombre=nombre,
        descripcion="Descripcion test",
        precio_total_usd=Decimal(precio),
        grupos=[
            ComboGroupEntry(
                nombre="Grupo A",
                min_cantidad=1,
                max_cantidad=5,
                productos=[ComboGroupProductEntry(producto_id=product_id)],
            )
        ],
        metodo_pago_ids=[pm_id],
    )


class TestGetCombos:

    def test_empty(self, db):
        result = get_combos(db)
        assert result == []

    def test_returns_all(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        create_combo(db, _combo_data(p.id, pm.id))
        result = get_combos(db)
        assert len(result) == 1
        assert result[0].nombre == "Combo Mix"

    def test_filter_activo_true(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        create_combo(db, _combo_data(p.id, pm.id))
        result = get_combos(db, activo=True)
        assert len(result) == 1

    def test_filter_activo_false_returns_empty(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        combo.activo = False
        db.commit()
        result = get_combos(db, activo=True)
        assert result == []


class TestGetCombo:

    def test_found(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        result = get_combo(db, combo.id)
        assert result.nombre == "Combo Mix"
        assert len(result.groups) == 1
        assert len(result.payment_methods) == 1

    def test_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="no encontrado"):
            get_combo(db, 999)


class TestCreateCombo:

    def test_success(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        result = create_combo(db, _combo_data(p.id, pm.id))
        assert result.id is not None
        assert result.nombre == "Combo Mix"
        assert result.precio_total_usd == Decimal("10.00")
        assert result.activo is True
        assert len(result.groups) == 1
        assert result.groups[0].nombre == "Grupo A"
        assert len(result.groups[0].products) == 1
        assert len(result.payment_methods) == 1

    def test_multiple_groups(self, db):
        p1 = _create_product(db, "Cerveza A")
        p2 = _create_product(db, "Cerveza B")
        pm = _create_payment_method(db)
        data = ComboCreate(
            nombre="Combo Doble",
            precio_total_usd=Decimal("15.00"),
            grupos=[
                ComboGroupEntry(
                    nombre="Grupo 1",
                    min_cantidad=1,
                    max_cantidad=3,
                    productos=[ComboGroupProductEntry(producto_id=p1.id)],
                ),
                ComboGroupEntry(
                    nombre="Grupo 2",
                    min_cantidad=2,
                    max_cantidad=6,
                    productos=[ComboGroupProductEntry(producto_id=p2.id)],
                ),
            ],
            metodo_pago_ids=[pm.id],
        )
        result = create_combo(db, data)
        assert len(result.groups) == 2
        assert result.groups[0].nombre == "Grupo 1"
        assert result.groups[1].nombre == "Grupo 2"

    def test_product_not_found(self, db):
        pm = _create_payment_method(db)
        data = ComboCreate(
            nombre="Combo Invalido",
            precio_total_usd=Decimal("10.00"),
            grupos=[
                ComboGroupEntry(
                    nombre="G",
                    min_cantidad=1,
                    max_cantidad=1,
                    productos=[ComboGroupProductEntry(producto_id=999)],
                )
            ],
            metodo_pago_ids=[pm.id],
        )
        with pytest.raises(EntityNotFoundError, match="Producto ID 999"):
            create_combo(db, data)

    def test_payment_method_not_found(self, db):
        p = _create_product(db)
        data = ComboCreate(
            nombre="Combo Invalido",
            precio_total_usd=Decimal("10.00"),
            grupos=[
                ComboGroupEntry(
                    nombre="G",
                    min_cantidad=1,
                    max_cantidad=1,
                    productos=[ComboGroupProductEntry(producto_id=p.id)],
                )
            ],
            metodo_pago_ids=[999],
        )
        with pytest.raises(EntityNotFoundError, match="Método de pago ID 999"):
            create_combo(db, data)


class TestUpdateCombo:

    def test_success(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        result = update_combo(db, combo.id, ComboUpdate(nombre="Combo Actualizado"))
        assert result.nombre == "Combo Actualizado"
        assert result.descripcion == "Descripcion test"

    def test_partial_update_precio(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        result = update_combo(db, combo.id, ComboUpdate(precio_total_usd=Decimal("20.00")))
        assert result.precio_total_usd == Decimal("20.00")
        assert result.nombre == "Combo Mix"

    def test_update_activo(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        result = update_combo(db, combo.id, ComboUpdate(activo=False))
        assert result.activo is False

    def test_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="no encontrado"):
            update_combo(db, 999, ComboUpdate(nombre="X"))

    def test_update_grupos(self, db):
        p1 = _create_product(db, "A")
        p2 = _create_product(db, "B")
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p1.id, pm.id))
        update_data = ComboUpdate(
            grupos=[
                ComboGroupEntry(
                    nombre="Nuevo Grupo",
                    min_cantidad=2,
                    max_cantidad=10,
                    productos=[ComboGroupProductEntry(producto_id=p2.id)],
                )
            ]
        )
        result = update_combo(db, combo.id, update_data)
        assert len(result.groups) == 1
        assert result.groups[0].nombre == "Nuevo Grupo"
        assert result.groups[0].products[0].producto_id == p2.id

    def test_update_payment_methods(self, db):
        p = _create_product(db)
        pm1 = _create_payment_method(db, "DIVISAS")
        pm2 = _create_payment_method(db, "EFECTIVO")
        combo = create_combo(db, _combo_data(p.id, pm1.id))
        result = update_combo(db, combo.id, ComboUpdate(metodo_pago_ids=[pm1.id, pm2.id]))
        assert sorted(result.metodo_pago_ids) == sorted([pm1.id, pm2.id])

    def test_update_grupos_product_not_found(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        update_data = ComboUpdate(
            grupos=[
                ComboGroupEntry(
                    nombre="G",
                    min_cantidad=1,
                    max_cantidad=1,
                    productos=[ComboGroupProductEntry(producto_id=999)],
                )
            ]
        )
        with pytest.raises(EntityNotFoundError, match="Producto ID 999"):
            update_combo(db, combo.id, update_data)

    def test_update_payment_method_not_found(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        with pytest.raises(EntityNotFoundError, match="Método de pago ID 999"):
            update_combo(db, combo.id, ComboUpdate(metodo_pago_ids=[999]))


class TestDeleteCombo:

    def test_success(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        delete_combo(db, combo.id)
        assert get_combos(db) == []

    def test_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="no encontrado"):
            delete_combo(db, 999)


class TestDistributeComboPrice:

    def test_single_item_exact(self, db):
        p = _create_product(db, precio_unidad_usd="5.00")
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id, precio="5.00"))
        selections = {combo.groups[0].id: [(p.id, 1)]}
        result = distribute_combo_price(db, combo, selections)
        assert len(result) == 1
        assert result[0]["precio_unitario"] == Decimal("5.00")
        total = sum(item["precio_unitario"] * item["cantidad"] for item in result)
        assert total == Decimal("5.00")

    def test_two_items_proportional(self, db):
        p1 = _create_product(db, "A", "10.00")
        p2 = _create_product(db, "B", "20.00")
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p1.id, pm.id, precio="15.00"))
        selections = {combo.groups[0].id: [(p1.id, 1), (p2.id, 1)]}
        result = distribute_combo_price(db, combo, selections)
        total = sum(item["precio_unitario"] * item["cantidad"] for item in result)
        assert total == Decimal("15.00")

    def test_three_items_remainder_distribution(self, db):
        p1 = _create_product(db, "A", "10.00")
        p2 = _create_product(db, "B", "10.00")
        p3 = _create_product(db, "C", "10.00")
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p1.id, pm.id, precio="10.00"))
        selections = {combo.groups[0].id: [(p1.id, 1), (p2.id, 1), (p3.id, 1)]}
        result = distribute_combo_price(db, combo, selections)
        total = sum(item["precio_unitario"] * item["cantidad"] for item in result)
        assert total == Decimal("10.00")

    def test_multiple_quantities(self, db):
        p = _create_product(db, precio_unidad_usd="5.00")
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id, precio="10.00"))
        selections = {combo.groups[0].id: [(p.id, 2)]}
        result = distribute_combo_price(db, combo, selections)
        assert len(result) == 1
        total = result[0]["precio_unitario"] * result[0]["cantidad"]
        assert total == Decimal("10.00")

    def test_product_not_found(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        selections = {combo.groups[0].id: [(999, 1)]}
        with pytest.raises(EntityNotFoundError, match="Producto ID 999"):
            distribute_combo_price(db, combo, selections)

    def test_empty_selections_returns_empty(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        result = distribute_combo_price(db, combo, {})
        assert result == []


class TestGetActiveCombos:

    def test_empty(self, db):
        result = get_active_combos(db)
        assert result == []

    def test_returns_active_only(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        result = get_active_combos(db)
        assert len(result) == 1
        assert result[0]["nombre"] == "Combo Mix"
        assert result[0]["id"] == combo.id
        assert result[0]["metodo_pago_ids"] == [pm.id]

    def test_excludes_inactive(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        combo = create_combo(db, _combo_data(p.id, pm.id))
        combo.activo = False
        db.commit()
        result = get_active_combos(db)
        assert result == []

    def test_includes_product_names(self, db):
        p = _create_product(db, "Cerveza Artesanal")
        pm = _create_payment_method(db)
        create_combo(db, _combo_data(p.id, pm.id))
        result = get_active_combos(db)
        assert result[0]["groups"][0]["productos"][0]["nombre"] == "Cerveza Artesanal"
        assert result[0]["groups"][0]["productos"][0]["precio_unidad_usd"] == Decimal("5.00")
