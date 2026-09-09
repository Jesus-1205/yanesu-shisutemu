from decimal import Decimal

import pytest

from app.core.exceptions import EntityNotFoundError
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.schemas.price_rule import PriceRuleCreate, PriceRuleProductEntry, PriceRuleUpdate
from app.services.price_rule_service import (
    create_price_rule,
    delete_price_rule,
    get_active_divisas_prices,
    get_divisas_payment_method_ids,
    get_price_rule,
    get_price_rules,
    update_price_rule,
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


def _rule_data(product_id, pm_id, nombre="Regla Divisas", precio="3.50"):
    return PriceRuleCreate(
        nombre=nombre,
        descripcion="Regla de prueba",
        productos=[
            PriceRuleProductEntry(
                producto_id=product_id,
                tipo_empaque="UNIDAD",
                precio_usd=Decimal(precio),
            )
        ],
        metodo_pago_ids=[pm_id],
    )


class TestGetPriceRules:

    def test_empty(self, db):
        result = get_price_rules(db)
        assert result == []

    def test_returns_all(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        create_price_rule(db, _rule_data(p.id, pm.id))
        result = get_price_rules(db)
        assert len(result) == 1
        assert result[0].nombre == "Regla Divisas"

    def test_filter_activo_true(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        create_price_rule(db, _rule_data(p.id, pm.id))
        result = get_price_rules(db, activo=True)
        assert len(result) == 1

    def test_filter_activo_false_returns_empty(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p.id, pm.id))
        rule.activo = False
        db.commit()
        result = get_price_rules(db, activo=True)
        assert result == []


class TestGetPriceRule:

    def test_found(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p.id, pm.id))
        result = get_price_rule(db, rule.id)
        assert result.nombre == "Regla Divisas"
        assert len(result.products) == 1
        assert result.products[0].producto_id == p.id
        assert result.products[0].precio_usd == Decimal("3.50")
        assert len(result.payment_methods) == 1

    def test_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="no encontrada"):
            get_price_rule(db, 999)


class TestCreatePriceRule:

    def test_success(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        result = create_price_rule(db, _rule_data(p.id, pm.id))
        assert result.id is not None
        assert result.nombre == "Regla Divisas"
        assert result.descripcion == "Regla de prueba"
        assert result.activo is True
        assert len(result.products) == 1
        assert result.products[0].tipo_empaque == "UNIDAD"
        assert len(result.payment_methods) == 1

    def test_multiple_products(self, db):
        p1 = _create_product(db, "Cerveza A")
        p2 = _create_product(db, "Cerveza B")
        pm = _create_payment_method(db)
        data = PriceRuleCreate(
            nombre="Regla Multi",
            productos=[
                PriceRuleProductEntry(producto_id=p1.id, tipo_empaque="UNIDAD", precio_usd=Decimal("3.00")),
                PriceRuleProductEntry(producto_id=p2.id, tipo_empaque="CAJA", precio_usd=Decimal("30.00")),
            ],
            metodo_pago_ids=[pm.id],
        )
        result = create_price_rule(db, data)
        assert len(result.products) == 2
        prices = {p.producto_id: p.precio_usd for p in result.products}
        assert prices[p1.id] == Decimal("3.00")
        assert prices[p2.id] == Decimal("30.00")

    def test_multiple_payment_methods(self, db):
        p = _create_product(db)
        pm1 = _create_payment_method(db, "DIVISAS")
        pm2 = _create_payment_method(db, "EFECTIVO")
        data = PriceRuleCreate(
            nombre="Regla Dual",
            productos=[
                PriceRuleProductEntry(producto_id=p.id, tipo_empaque="UNIDAD", precio_usd=Decimal("3.00")),
            ],
            metodo_pago_ids=[pm1.id, pm2.id],
        )
        result = create_price_rule(db, data)
        assert len(result.payment_methods) == 2

    def test_product_not_found(self, db):
        pm = _create_payment_method(db)
        data = PriceRuleCreate(
            nombre="Invalida",
            productos=[
                PriceRuleProductEntry(producto_id=999, tipo_empaque="UNIDAD", precio_usd=Decimal("3.00")),
            ],
            metodo_pago_ids=[pm.id],
        )
        with pytest.raises(EntityNotFoundError, match="Producto ID 999"):
            create_price_rule(db, data)

    def test_payment_method_not_found(self, db):
        p = _create_product(db)
        data = PriceRuleCreate(
            nombre="Invalida",
            productos=[
                PriceRuleProductEntry(producto_id=p.id, tipo_empaque="UNIDAD", precio_usd=Decimal("3.00")),
            ],
            metodo_pago_ids=[999],
        )
        with pytest.raises(EntityNotFoundError, match="Método de pago ID 999"):
            create_price_rule(db, data)


class TestUpdatePriceRule:

    def test_success(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p.id, pm.id))
        result = update_price_rule(db, rule.id, PriceRuleUpdate(nombre="Regla Actualizada"))
        assert result.nombre == "Regla Actualizada"
        assert result.descripcion == "Regla de prueba"

    def test_partial_update_descripcion(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p.id, pm.id))
        result = update_price_rule(db, rule.id, PriceRuleUpdate(descripcion="Nueva desc"))
        assert result.descripcion == "Nueva desc"
        assert result.nombre == "Regla Divisas"

    def test_update_activo(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p.id, pm.id))
        result = update_price_rule(db, rule.id, PriceRuleUpdate(activo=False))
        assert result.activo is False

    def test_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="no encontrada"):
            update_price_rule(db, 999, PriceRuleUpdate(nombre="X"))

    def test_update_productos(self, db):
        p1 = _create_product(db, "A")
        p2 = _create_product(db, "B")
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p1.id, pm.id))
        update_data = PriceRuleUpdate(
            productos=[
                PriceRuleProductEntry(producto_id=p2.id, tipo_empaque="CAJA", precio_usd=Decimal("25.00")),
            ]
        )
        result = update_price_rule(db, rule.id, update_data)
        assert len(result.products) == 1
        assert result.products[0].producto_id == p2.id
        assert result.products[0].precio_usd == Decimal("25.00")

    def test_update_payment_methods(self, db):
        p = _create_product(db)
        pm1 = _create_payment_method(db, "DIVISAS")
        pm2 = _create_payment_method(db, "EFECTIVO")
        rule = create_price_rule(db, _rule_data(p.id, pm1.id))
        result = update_price_rule(db, rule.id, PriceRuleUpdate(metodo_pago_ids=[pm1.id, pm2.id]))
        pm_ids = [pm.metodo_pago_id for pm in result.payment_methods]
        assert sorted(pm_ids) == sorted([pm1.id, pm2.id])

    def test_update_productos_product_not_found(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p.id, pm.id))
        update_data = PriceRuleUpdate(
            productos=[
                PriceRuleProductEntry(producto_id=999, tipo_empaque="UNIDAD", precio_usd=Decimal("3.00")),
            ]
        )
        with pytest.raises(EntityNotFoundError, match="Producto ID 999"):
            update_price_rule(db, rule.id, update_data)

    def test_update_payment_method_not_found(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p.id, pm.id))
        with pytest.raises(EntityNotFoundError, match="Método de pago ID 999"):
            update_price_rule(db, rule.id, PriceRuleUpdate(metodo_pago_ids=[999]))


class TestDeletePriceRule:

    def test_success(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p.id, pm.id))
        delete_price_rule(db, rule.id)
        assert get_price_rules(db) == []

    def test_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="no encontrada"):
            delete_price_rule(db, 999)


class TestGetActiveDivisasPrices:

    def test_empty(self, db):
        result = get_active_divisas_prices(db)
        assert result == {}

    def test_returns_prices_by_product(self, db):
        p1 = _create_product(db, "A")
        p2 = _create_product(db, "B")
        pm = _create_payment_method(db)
        data = PriceRuleCreate(
            nombre="Divisas",
            productos=[
                PriceRuleProductEntry(producto_id=p1.id, tipo_empaque="UNIDAD", precio_usd=Decimal("3.00")),
                PriceRuleProductEntry(producto_id=p2.id, tipo_empaque="CAJA", precio_usd=Decimal("30.00")),
            ],
            metodo_pago_ids=[pm.id],
        )
        create_price_rule(db, data)
        result = get_active_divisas_prices(db)
        assert p1.id in result
        assert result[p1.id]["UNIDAD"] == Decimal("3.00")
        assert p2.id in result
        assert result[p2.id]["CAJA"] == Decimal("30.00")

    def test_excludes_inactive_rules(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p.id, pm.id))
        rule.activo = False
        db.commit()
        result = get_active_divisas_prices(db)
        assert result == {}

    def test_same_product_both_types(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        data = PriceRuleCreate(
            nombre="Ambos tipos",
            productos=[
                PriceRuleProductEntry(producto_id=p.id, tipo_empaque="UNIDAD", precio_usd=Decimal("3.00")),
                PriceRuleProductEntry(producto_id=p.id, tipo_empaque="CAJA", precio_usd=Decimal("30.00")),
            ],
            metodo_pago_ids=[pm.id],
        )
        create_price_rule(db, data)
        result = get_active_divisas_prices(db)
        assert result[p.id]["UNIDAD"] == Decimal("3.00")
        assert result[p.id]["CAJA"] == Decimal("30.00")


class TestGetDivisasPaymentMethodIds:

    def test_empty(self, db):
        result = get_divisas_payment_method_ids(db)
        assert result == set()

    def test_returns_ids(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        create_price_rule(db, _rule_data(p.id, pm.id))
        result = get_divisas_payment_method_ids(db)
        assert pm.id in result

    def test_excludes_inactive_rules(self, db):
        p = _create_product(db)
        pm = _create_payment_method(db)
        rule = create_price_rule(db, _rule_data(p.id, pm.id))
        rule.activo = False
        db.commit()
        result = get_divisas_payment_method_ids(db)
        assert result == set()

    def test_multiple_methods(self, db):
        p = _create_product(db)
        pm1 = _create_payment_method(db, "DIVISAS")
        pm2 = _create_payment_method(db, "EFECTIVO")
        data = PriceRuleCreate(
            nombre="Dual",
            productos=[
                PriceRuleProductEntry(producto_id=p.id, tipo_empaque="UNIDAD", precio_usd=Decimal("3.00")),
            ],
            metodo_pago_ids=[pm1.id, pm2.id],
        )
        create_price_rule(db, data)
        result = get_divisas_payment_method_ids(db)
        assert result == {pm1.id, pm2.id}
