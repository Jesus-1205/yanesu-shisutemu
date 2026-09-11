import pytest

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.payment_method import PaymentMethod
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate
from app.services.payment_method_service import (
    actualizar_payment_method,
    crear_payment_method,
    eliminar_payment_method,
    get_payment_method,
    get_payment_methods,
)


def _create_pm(db, nombre="DIVISAS", moneda_default="VES", acepta_referencia=False, activo=True):
    data = PaymentMethodCreate(
        nombre=nombre,
        moneda_default=moneda_default,
        acepta_referencia=acepta_referencia,
        activo=activo,
    )
    return crear_payment_method(db, data)


class TestGetPaymentMethods:

    def test_empty(self, db):
        result = get_payment_methods(db)
        assert result == []

    def test_returns_all(self, db):
        _create_pm(db, "DIVISAS")
        _create_pm(db, "EFECTIVO")
        result = get_payment_methods(db)
        assert len(result) == 2

    def test_solo_activos(self, db):
        _create_pm(db, "DIVISAS", activo=True)
        _create_pm(db, "INACTIVO", activo=False)
        result = get_payment_methods(db, solo_activos=True)
        assert len(result) == 1
        assert result[0].nombre == "DIVISAS"

    def test_ordered_by_id(self, db):
        _create_pm(db, "ZULU")
        _create_pm(db, "ALFA")
        result = get_payment_methods(db)
        assert result[0].nombre == "ZULU"
        assert result[1].nombre == "ALFA"


class TestGetPaymentMethod:

    def test_found(self, db):
        pm = _create_pm(db, "DIVISAS")
        result = get_payment_method(db, pm.id)
        assert result.nombre == "DIVISAS"
        assert result.moneda_default == "VES"

    def test_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="no encontrado"):
            get_payment_method(db, 999)


class TestCrearPaymentMethod:

    def test_success(self, db):
        result = _create_pm(db, "PAGO_MOVIL", moneda_default="USD", acepta_referencia=True)
        assert result.id is not None
        assert result.nombre == "PAGO_MOVIL"
        assert result.moneda_default == "USD"
        assert result.acepta_referencia is True
        assert result.activo is True

    def test_default_values(self, db):
        result = _create_pm(db, "EFECTIVO")
        assert result.moneda_default == "VES"
        assert result.acepta_referencia is False
        assert result.activo is True

    def test_duplicate_nombre(self, db):
        _create_pm(db, "DIVISAS")
        with pytest.raises(ConflictError, match="Ya existe"):
            _create_pm(db, "DIVISAS")


class TestActualizarPaymentMethod:

    def test_success(self, db):
        pm = _create_pm(db, "DIVISAS")
        result = actualizar_payment_method(db, pm.id, PaymentMethodUpdate(nombre="DIVISAS ACTUALIZADO"))
        assert result.nombre == "DIVISAS ACTUALIZADO"

    def test_update_activo(self, db):
        pm = _create_pm(db, "DIVISAS")
        result = actualizar_payment_method(db, pm.id, PaymentMethodUpdate(activo=False))
        assert result.activo is False

    def test_update_moneda_default(self, db):
        pm = _create_pm(db, "DIVISAS", moneda_default="VES")
        result = actualizar_payment_method(db, pm.id, PaymentMethodUpdate(moneda_default="USD"))
        assert result.moneda_default == "USD"

    def test_update_acepta_referencia(self, db):
        pm = _create_pm(db, "DIVISAS", acepta_referencia=False)
        result = actualizar_payment_method(db, pm.id, PaymentMethodUpdate(acepta_referencia=True))
        assert result.acepta_referencia is True

    def test_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="no encontrado"):
            actualizar_payment_method(db, 999, PaymentMethodUpdate(nombre="X"))

    def test_duplicate_nombre(self, db):
        _create_pm(db, "DIVISAS")
        pm2 = _create_pm(db, "EFECTIVO")
        with pytest.raises(ConflictError, match="Ya existe"):
            actualizar_payment_method(db, pm2.id, PaymentMethodUpdate(nombre="DIVISAS"))

    def test_same_nombre_no_conflict(self, db):
        pm = _create_pm(db, "DIVISAS")
        result = actualizar_payment_method(db, pm.id, PaymentMethodUpdate(nombre="DIVISAS"))
        assert result.nombre == "DIVISAS"


class TestEliminarPaymentMethod:

    def test_success(self, db):
        pm = _create_pm(db, "DIVISAS")
        eliminar_payment_method(db, pm.id)
        assert get_payment_methods(db) == []

    def test_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="no encontrado"):
            eliminar_payment_method(db, 999)
