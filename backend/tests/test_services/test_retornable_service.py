"""Tests unitarios para retornable_service.py.

Cubre las 13 funciones publicas + helpers privados criticos.
"""
import math
from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.category import Category
from app.models.product import Product
from app.models.retornable import (
    RetornableInventario,
    RetornableMovimiento,
    RetornableProducto,
    RetornableReporte,
    RetornableReporteDetalle,
)
from app.models.role import Role
from app.models.user import User
from app.services.retornable_service import (
    BOTELLAS_POR_CAJA,
    _botellas_a_cajas_enteras,
    _botellas_sobran,
    _calcular_lleno_esperado,
    _calcular_movimientos_desde,
    _construir_estado_out,
    _detalle_a_dict,
    _obtener_o_crear_inventario,
    _obtener_detalle_reporte,
    _obtener_ultimo_reporte,
    _stock_productos,
    asociar_producto,
    confirmar_reporte,
    crear_reporte,
    desasociar_producto,
    listar_movimientos,
    listar_productos_asociados,
    listar_reportes,
    obtener_comparacion,
    obtener_detalle_reporte,
    obtener_resumen,
    procesar_compra,
    procesar_venta,
    registrar_movimiento,
)
from app.schemas.retornable import DetalleLinea, RetornableReporteCreate


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    session.add_all([
        Role(nombre="ADMINISTRADOR"),
        Role(nombre="OPERADOR"),
        Category(nombre="CERVEZAS"),
    ])
    session.commit()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user(db):
    u = User(
        username="admin",
        email="admin@test.com",
        hashed_password="x",
        nombre_completo="Admin Test",
        rol_id=1,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def product_222(db):
    p = Product(
        nombre="Polar 222ml",
        unidades_por_caja=36,
        stock_cajas=10,
        stock_unidades=18,
        stock_minimo=5,
        precio_costo_caja_usd=Decimal("10.00"),
        precio_costo_usd=Decimal("0.30"),
        precio_unidad_usd=Decimal("0.50"),
        precio_caja_usd=Decimal("18.00"),
        tipo_iva="GRAVADO",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@pytest.fixture
def product_333(db):
    p = Product(
        nombre="Polar 333ml",
        unidades_por_caja=24,
        stock_cajas=5,
        stock_unidades=12,
        stock_minimo=3,
        precio_costo_caja_usd=Decimal("12.00"),
        precio_costo_usd=Decimal("0.50"),
        precio_unidad_usd=Decimal("0.70"),
        precio_caja_usd=Decimal("16.80"),
        tipo_iva="GRAVADO",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _make_detalles():
    """6 detalles base (222/333 x CASILLERO/VACIO/LLENO)."""
    return [
        DetalleLinea(presentacion="222", estado="CASILLERO", cantidad_botellas=0, cantidad_cajas=5),
        DetalleLinea(presentacion="222", estado="VACIO", cantidad_botellas=100, cantidad_cajas=2),
        DetalleLinea(presentacion="222", estado="LLENO", cantidad_botellas=200, cantidad_cajas=5),
        DetalleLinea(presentacion="333", estado="CASILLERO", cantidad_botellas=0, cantidad_cajas=3),
        DetalleLinea(presentacion="333", estado="VACIO", cantidad_botellas=50, cantidad_cajas=2),
        DetalleLinea(presentacion="333", estado="LLENO", cantidad_botellas=100, cantidad_cajas=4),
    ]


def _crear_reporte(db, user_id, realizado_por="Test User", offset_hours=0):
    """Helper: crea un reporte y lo retorna."""
    data = RetornableReporteCreate(
        realizado_por=realizado_por,
        observaciones="Test",
        detalles=_make_detalles(),
    )
    return crear_reporte(db, data, user_id)


# ===========================================================================
# Helpers privados
# ===========================================================================


class TestBotellasACajasEnteras:
    def test_division_exacta_222(self):
        assert _botellas_a_cajas_enteras(36, "222") == 1

    def test_division_exacta_333(self):
        assert _botellas_a_cajas_enteras(24, "333") == 1

    def test_con_residuo_222(self):
        assert _botellas_a_cajas_enteras(50, "222") == 1  # 50/36 = 1.38

    def test_con_residuo_333(self):
        assert _botellas_a_cajas_enteras(50, "333") == 2  # 50/24 = 2.08

    def test_cero_botellas(self):
        assert _botellas_a_cajas_enteras(0, "222") == 0

    def test_menos_que_una_caja(self):
        assert _botellas_a_cajas_enteras(10, "222") == 0


class TestBotellasSobran:
    def test_sin_residuo_222(self):
        assert _botellas_sobran(72, "222") == 0  # 72 % 36 = 0

    def test_con_residuo_222(self):
        assert _botellas_sobran(50, "222") == 14  # 50 % 36 = 14

    def test_sin_residuo_333(self):
        assert _botellas_sobran(48, "333") == 0

    def test_con_residuo_333(self):
        assert _botellas_sobran(50, "333") == 2  # 50 % 24 = 2

    def test_cero_botellas(self):
        assert _botellas_sobran(0, "222") == 0


class TestObtenerOCrearInventario:
    def test_crea_nuevo(self, db):
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        assert inv.presentacion == "222"
        assert inv.estado == "LLENO"
        assert inv.cantidad_botellas == 0
        assert inv.cantidad_cajas == 0
        assert inv.id is not None

    def test_retorna_existente(self, db):
        inv1 = _obtener_o_crear_inventario(db, "333", "VACIO")
        inv1.cantidad_botellas = 50
        db.commit()

        inv2 = _obtener_o_crear_inventario(db, "333", "VACIO")
        assert inv2.id == inv1.id
        assert inv2.cantidad_botellas == 50

    def test_diferentes_combinaciones(self, db):
        inv1 = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv2 = _obtener_o_crear_inventario(db, "222", "VACIO")
        inv3 = _obtener_o_crear_inventario(db, "333", "LLENO")
        assert inv1.id != inv2.id != inv3.id


class TestObtenerUltimoReporte:
    def test_sin_reportes(self, db):
        assert _obtener_ultimo_reporte(db) is None

    def test_con_reporte(self, db, user):
        r = _crear_reporte(db, user.id)
        ultimo = _obtener_ultimo_reporte(db)
        assert ultimo is not None
        assert ultimo.id == r.id

    def test_multiples_reportes_retorna_el_mas_reciente(self, db, user):
        r1 = _crear_reporte(db, user.id)
        r2 = _crear_reporte(db, user.id)
        ultimo = _obtener_ultimo_reporte(db)
        assert ultimo.id == r2.id


class TestCalcularMovimientosDesde:
    def test_sin_movimientos(self, db):
        resultado = _calcular_movimientos_desde(db, None)
        assert resultado == {}

    def test_con_fecha_none_acumula_todos(self, db, user):
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv.cantidad_botellas = 100
        db.commit()

        registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-5,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        db.commit()

        resultado = _calcular_movimientos_desde(db, None)
        assert resultado[("222", "LLENO")] == -15

    def test_con_fecha_filtra(self, db, user):
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv.cantidad_botellas = 100
        db.commit()

        registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        db.commit()

        fecha_futura = datetime.now() + timedelta(hours=1)
        resultado = _calcular_movimientos_desde(db, fecha_futura)
        assert resultado == {}

    def test_acumula_por_clave(self, db, user):
        inv_lleno_222 = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv_lleno_222.cantidad_botellas = 100
        inv_lleno_333 = _obtener_o_crear_inventario(db, "333", "LLENO")
        inv_lleno_333.cantidad_botellas = 50
        db.commit()

        registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        registrar_movimiento(
            db, presentacion="222", estado="VACIO", delta_botellas=10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        registrar_movimiento(
            db, presentacion="333", estado="LLENO", delta_botellas=-5,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        db.commit()

        resultado = _calcular_movimientos_desde(db, None)
        assert resultado[("222", "LLENO")] == -10
        assert resultado[("222", "VACIO")] == 10
        assert resultado[("333", "LLENO")] == -5


class TestDetalleADict:
    def test_con_reporte(self, db, user):
        r = _crear_reporte(db, user.id)
        resultado = _detalle_a_dict(db, r.id)
        assert ("222", "CASILLERO") in resultado
        assert ("222", "VACIO") in resultado
        assert ("222", "LLENO") in resultado
        assert ("333", "CASILLERO") in resultado
        assert ("333", "VACIO") in resultado
        assert ("333", "LLENO") in resultado
        assert resultado[("222", "VACIO")] == (100, 2)


# ===========================================================================
# obtener_resumen
# ===========================================================================


class TestObtenerResumen:
    def test_sin_reportes(self, db):
        resumen = obtener_resumen(db)
        assert resumen.ultimo_reporte_fecha is None
        assert resumen.ultimo_reporte_realizado_por is None
        assert len(resumen.presentaciones) == 2

    def test_con_reporte(self, db, user):
        _crear_reporte(db, user.id)
        resumen = obtener_resumen(db)
        assert resumen.ultimo_reporte_fecha is not None
        assert resumen.ultimo_reporte_realizado_por == "Test User"

    def test_dos_presentaciones(self, db, user):
        _crear_reporte(db, user.id)
        resumen = obtener_resumen(db)
        pres = [p.presentacion for p in resumen.presentaciones]
        assert "222" in pres
        assert "333" in pres

    def test_tres_estados_por_presentacion(self, db, user):
        _crear_reporte(db, user.id)
        resumen = obtener_resumen(db)
        for pres in resumen.presentaciones:
            assert pres.casillero.estado == "CASILLERO"
            assert pres.vacio.estado == "VACIO"
            assert pres.lleno.estado == "LLENO"

    def test_con_movimientos_posteriores(self, db, user):
        r = _crear_reporte(db, user.id)
        mov = registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        # Ensure movement fecha is after report fecha (SQLite datetime('now')
        # returns same timestamp within same transaction)
        mov.fecha = r.fecha + timedelta(seconds=1)
        db.commit()
        resumen = obtener_resumen(db)
        pres_222 = [p for p in resumen.presentaciones if p.presentacion == "222"][0]
        assert pres_222.lleno.total_botellas == 190  # 200 - 10


# ===========================================================================
# crear_reporte
# ===========================================================================


class TestCrearReporte:
    def test_creacion_exitosa(self, db, user):
        r = _crear_reporte(db, user.id)
        assert r.id is not None
        assert r.realizado_por == "Test User"
        assert r.es_actual is True

    def test_seis_detalles_persistidos(self, db, user):
        r = _crear_reporte(db, user.id)
        stmt = (
            select(RetornableReporteDetalle)
            .where(RetornableReporteDetalle.reporte_id == r.id)
        )
        detalles = list(db.execute(stmt).scalars().all())
        assert len(detalles) == 6

    def test_desmarca_anterior(self, db, user):
        r1 = _crear_reporte(db, user.id, "User 1")
        assert r1.es_actual is True

        r2 = _crear_reporte(db, user.id, "User 2")
        assert r2.es_actual is True

        db.refresh(r1)
        assert r1.es_actual is False

    def test_actualiza_inventario(self, db, user):
        _crear_reporte(db, user.id)
        inv = _obtener_o_crear_inventario(db, "222", "VACIO")
        assert inv.cantidad_botellas == 100

    def test_casillero_usa_cajas_directamente(self, db, user):
        _crear_reporte(db, user.id)
        inv = _obtener_o_crear_inventario(db, "222", "CASILLERO")
        assert inv.cantidad_cajas == 5

    def test_vacio_lleno_calcula_cajas_desde_botellas(self, db, user):
        _crear_reporte(db, user.id)
        inv_vacio = _obtener_o_crear_inventario(db, "222", "VACIO")
        assert inv_vacio.cantidad_cajas == _botellas_a_cajas_enteras(100, "222")

        inv_lleno = _obtener_o_crear_inventario(db, "222", "LLENO")
        assert inv_lleno.cantidad_cajas == _botellas_a_cajas_enteras(200, "222")


# ===========================================================================
# confirmar_reporte
# ===========================================================================


class TestConfirmarReporte:
    def test_confirmar_exitoso(self, db, user):
        r = _crear_reporte(db, user.id)
        confirmar_reporte(db, r.id)
        db.refresh(r)
        assert r.es_actual is True

        # Verificar que el inventario se actualizo con los valores del reporte
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        assert inv.cantidad_botellas == 200  # valor del reporte

    def test_confirmar_genera_movimientos_si_hay_delta(self, db, user):
        r = _crear_reporte(db, user.id)
        # Alterar el inventario para crear un delta
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv.cantidad_botellas = 180  # reporte dice 200, inventario tiene 180
        db.commit()

        confirmar_reporte(db, r.id)

        from app.models.retornable import RetornableMovimiento
        movimientos = db.execute(
            select(RetornableMovimiento).where(
                RetornableMovimiento.tipo_movimiento == "REPORTE"
            )
        ).scalars().all()
        assert len(movimientos) > 0  # delta=20, se crea movimiento

    def test_reporte_no_existe(self, db):
        with pytest.raises(EntityNotFoundError):
            confirmar_reporte(db, 9999)

    def test_reporte_no_es_actual(self, db, user):
        r1 = _crear_reporte(db, user.id)
        _crear_reporte(db, user.id)  # r2 es el actual
        db.refresh(r1)
        with pytest.raises(ConflictError):
            confirmar_reporte(db, r1.id)


# ===========================================================================
# listar_reportes
# ===========================================================================


class TestListarReportes:
    def test_sin_reportes(self, db):
        result = listar_reportes(db)
        assert result.total == 0
        assert result.items == []
        assert result.pages == 0

    def test_con_reportes(self, db, user):
        _crear_reporte(db, user.id)
        _crear_reporte(db, user.id)
        result = listar_reportes(db)
        assert result.total == 2
        assert len(result.items) == 2

    def test_paginacion(self, db, user):
        for _ in range(5):
            _crear_reporte(db, user.id)
        result = listar_reportes(db, page=1, page_size=2)
        assert len(result.items) == 2
        assert result.total == 5
        assert result.pages == 3

    def test_orden_descendente(self, db, user):
        r1 = _crear_reporte(db, user.id, "First")
        r2 = _crear_reporte(db, user.id, "Second")
        # SQLite datetime('now') returns same timestamp in same transaction;
        # manually set different timestamps to guarantee ordering
        r1.fecha = datetime(2026, 1, 1, tzinfo=r1.fecha.tzinfo)
        r2.fecha = datetime(2026, 1, 2, tzinfo=r2.fecha.tzinfo)
        db.commit()
        result = listar_reportes(db)
        assert result.items[0].id == r2.id
        assert result.items[1].id == r1.id


# ===========================================================================
# obtener_detalle_reporte
# ===========================================================================


class TestObtenerDetalleReporte:
    def test_reporte_no_existe(self, db):
        with pytest.raises(EntityNotFoundError):
            obtener_detalle_reporte(db, 9999)

    def test_con_detalle(self, db, user):
        r = _crear_reporte(db, user.id)
        detalle = obtener_detalle_reporte(db, r.id)
        assert len(detalle.detalles) == 6
        assert detalle.reporte.id == r.id

    def test_sin_reporte_anterior(self, db, user):
        r = _crear_reporte(db, user.id)
        detalle = obtener_detalle_reporte(db, r.id)
        assert detalle.reporte_anterior_id is None
        assert detalle.reporte_anterior_fecha is None

    def test_con_reporte_anterior(self, db, user):
        r1 = _crear_reporte(db, user.id)
        r2 = _crear_reporte(db, user.id)
        detalle = obtener_detalle_reporte(db, r2.id)
        assert detalle.reporte_anterior_id == r1.id

    def test_difs_vs_anterior(self, db, user):
        r1 = _crear_reporte(db, user.id)
        r2 = _crear_reporte(db, user.id)
        detalle = obtener_detalle_reporte(db, r2.id)
        for det in detalle.detalles:
            assert det.esperado_botellas == det.cantidad_botellas  # mismos valores


# ===========================================================================
# registrar_movimiento
# ===========================================================================


class TestRegistrarMovimiento:
    def test_registro_exitoso(self, db, user):
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv.cantidad_botellas = 100
        db.commit()

        mov = registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        db.commit()
        assert mov.id is not None
        assert mov.delta_botellas == -10

    def test_casillero_actualiza_cajas(self, db, user):
        registrar_movimiento(
            db, presentacion="222", estado="CASILLERO", delta_botellas=5,
            tipo_movimiento="AJUSTE_MANUAL", usuario_id=user.id,
        )
        db.commit()
        inv = _obtener_o_crear_inventario(db, "222", "CASILLERO")
        assert inv.cantidad_cajas == 5

    def test_vacio_lleno_recalcula_cajas(self, db, user):
        registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=50,
            tipo_movimiento="COMPRA", usuario_id=user.id,
        )
        db.commit()
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        assert inv.cantidad_botellas == 50
        assert inv.cantidad_cajas == _botellas_a_cajas_enteras(50, "222")

    def test_con_referencia(self, db, user):
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv.cantidad_botellas = 100
        db.commit()

        mov = registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", referencia_id=1,
            referencia_tipo="VENTA", usuario_id=user.id,
        )
        db.commit()
        assert mov.referencia_id == 1
        assert mov.referencia_tipo == "VENTA"

    def test_con_observaciones(self, db, user):
        mov = registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=10,
            tipo_movimiento="AJUSTE_MANUAL", usuario_id=user.id,
            observaciones="Ajuste por merma",
        )
        db.commit()
        assert mov.observaciones == "Ajuste por merma"


# ===========================================================================
# listar_movimientos
# ===========================================================================


class TestListarMovimientos:
    def _setup_stock(self, db):
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv.cantidad_botellas = 100
        inv2 = _obtener_o_crear_inventario(db, "333", "LLENO")
        inv2.cantidad_botellas = 50
        db.commit()

    def test_sin_movimientos(self, db):
        result = listar_movimientos(db)
        assert result.total == 0
        assert result.items == []

    def test_con_movimientos(self, db, user):
        self._setup_stock(db)
        registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        db.commit()
        result = listar_movimientos(db)
        assert result.total == 1

    def test_filtro_por_presentacion(self, db, user):
        self._setup_stock(db)
        registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        registrar_movimiento(
            db, presentacion="333", estado="LLENO", delta_botellas=-5,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        db.commit()
        result = listar_movimientos(db, presentacion="222")
        assert result.total == 1
        assert result.items[0].presentacion == "222"

    def test_filtro_por_tipo(self, db, user):
        self._setup_stock(db)
        registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        registrar_movimiento(
            db, presentacion="222", estado="VACIO", delta_botellas=10,
            tipo_movimiento="COMPRA", usuario_id=user.id,
        )
        db.commit()
        result = listar_movimientos(db, tipo_movimiento="VENTA")
        assert result.total == 1

    def test_usuario_nombre(self, db, user):
        self._setup_stock(db)
        registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        db.commit()
        result = listar_movimientos(db)
        assert result.items[0].usuario_nombre == "Admin Test"

    def test_paginacion(self, db, user):
        self._setup_stock(db)
        for _ in range(5):
            registrar_movimiento(
                db, presentacion="222", estado="LLENO", delta_botellas=-10,
                tipo_movimiento="VENTA", usuario_id=user.id,
            )
        db.commit()
        result = listar_movimientos(db, page=1, page_size=2)
        assert len(result.items) == 2
        assert result.total == 5


# ===========================================================================
# asociar_producto / desasociar_producto / listar_productos_asociados
# ===========================================================================


class TestAsociarProducto:
    def test_asociacion_exitosa(self, db, product_222):
        asoc = asociar_producto(db, product_222.id, "222")
        assert asoc.id is not None
        assert asoc.producto_id == product_222.id
        assert asoc.presentacion == "222"

    def test_producto_ya_asociado(self, db, product_222):
        asociar_producto(db, product_222.id, "222")
        with pytest.raises(ConflictError):
            asociar_producto(db, product_222.id, "333")

    def test_producto_no_existe(self, db):
        with pytest.raises(EntityNotFoundError):
            asociar_producto(db, 9999, "222")


class TestDesasociarProducto:
    def test_desasociacion_exitosa(self, db, product_222):
        asoc = asociar_producto(db, product_222.id, "222")
        desasociar_producto(db, asoc.id)
        result = listar_productos_asociados(db)
        assert len(result) == 0

    def test_asociacion_no_existe(self, db):
        with pytest.raises(EntityNotFoundError):
            desasociar_producto(db, 9999)


class TestListarProductosAsociados:
    def test_sin_asociaciones(self, db):
        result = listar_productos_asociados(db)
        assert result == []

    def test_con_asociaciones(self, db, product_222, product_333):
        asociar_producto(db, product_222.id, "222")
        asociar_producto(db, product_333.id, "333")
        result = listar_productos_asociados(db)
        assert len(result) == 2

    def test_orden_por_presentacion(self, db, product_222, product_333):
        asociar_producto(db, product_333.id, "333")
        asociar_producto(db, product_222.id, "222")
        result = listar_productos_asociados(db)
        assert result[0].presentacion == "222"
        assert result[1].presentacion == "333"


# ===========================================================================
# procesar_venta / procesar_compra
# ===========================================================================


class TestProcesarVenta:
    def test_producto_asociado_genera_movimientos(self, db, user, product_222):
        asociar_producto(db, product_222.id, "222")
        # Set up initial stock so sale doesn't go negative
        inv_lleno = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv_lleno.cantidad_botellas = 100
        db.commit()

        procesar_venta(
            db, product=product_222, botellas_descontadas=10,
            referencia_id=1, usuario_id=user.id,
        )
        db.commit()
        result = listar_movimientos(db)
        assert result.total == 2  # LLENO -10, VACIO +10

    def test_producto_no_asociado_no_hace_nada(self, db, user, product_222):
        procesar_venta(
            db, product=product_222, botellas_descontadas=10,
            referencia_id=1, usuario_id=user.id,
        )
        db.commit()
        result = listar_movimientos(db)
        assert result.total == 0

    def test_lleno_delta_negativo(self, db, user, product_222):
        asociar_producto(db, product_222.id, "222")
        inv_lleno = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv_lleno.cantidad_botellas = 50
        db.commit()

        procesar_venta(
            db, product=product_222, botellas_descontadas=10,
            referencia_id=1, usuario_id=user.id,
        )
        db.commit()
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        assert inv.cantidad_botellas == 40  # 50 - 10

    def test_vacio_delta_positivo(self, db, user, product_222):
        asociar_producto(db, product_222.id, "222")
        inv_lleno = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv_lleno.cantidad_botellas = 100
        db.commit()

        procesar_venta(
            db, product=product_222, botellas_descontadas=10,
            referencia_id=1, usuario_id=user.id,
        )
        db.commit()
        inv = _obtener_o_crear_inventario(db, "222", "VACIO")
        assert inv.cantidad_botellas == 10


class TestProcesarCompra:
    def test_producto_asociado_genera_movimientos(self, db, user, product_333):
        asociar_producto(db, product_333.id, "333")
        inv_vacio = _obtener_o_crear_inventario(db, "333", "VACIO")
        inv_vacio.cantidad_botellas = 50
        db.commit()

        procesar_compra(
            db, product=product_333, botellas_agregadas=24,
            referencia_id=1, usuario_id=user.id,
        )
        db.commit()
        result = listar_movimientos(db)
        assert result.total == 2  # LLENO +24, VACIO -24

    def test_producto_no_asociado_no_hace_nada(self, db, user, product_333):
        procesar_compra(
            db, product=product_333, botellas_agregadas=24,
            referencia_id=1, usuario_id=user.id,
        )
        db.commit()
        result = listar_movimientos(db)
        assert result.total == 0

    def test_lleno_delta_positivo(self, db, user, product_333):
        asociar_producto(db, product_333.id, "333")
        inv_vacio = _obtener_o_crear_inventario(db, "333", "VACIO")
        inv_vacio.cantidad_botellas = 50
        db.commit()

        procesar_compra(
            db, product=product_333, botellas_agregadas=24,
            referencia_id=1, usuario_id=user.id,
        )
        db.commit()
        inv = _obtener_o_crear_inventario(db, "333", "LLENO")
        assert inv.cantidad_botellas == 24

    def test_vacio_delta_negativo(self, db, user, product_333):
        asociar_producto(db, product_333.id, "333")
        inv_vacio = _obtener_o_crear_inventario(db, "333", "VACIO")
        inv_vacio.cantidad_botellas = 50
        db.commit()

        procesar_compra(
            db, product=product_333, botellas_agregadas=24,
            referencia_id=1, usuario_id=user.id,
        )
        db.commit()
        inv = _obtener_o_crear_inventario(db, "333", "VACIO")
        assert inv.cantidad_botellas == 26  # 50 - 24


# ===========================================================================
# obtener_comparacion
# ===========================================================================


class TestObtenerComparacion:
    def test_sin_reportes(self, db):
        comp = obtener_comparacion(db)
        assert comp.ultimo_reporte is None
        assert comp.reporte_anterior is None
        assert len(comp.lineas_sistema) == 6
        assert len(comp.lineas_anterior) == 6

    def test_con_un_reporte(self, db, user):
        r = _crear_reporte(db, user.id)
        comp = obtener_comparacion(db)
        assert comp.ultimo_reporte.id == r.id
        assert comp.reporte_anterior is None

    def test_con_dos_reportes(self, db, user):
        r1 = _crear_reporte(db, user.id)
        r2 = _crear_reporte(db, user.id)
        comp = obtener_comparacion(db)
        assert comp.ultimo_reporte.id == r2.id
        assert comp.reporte_anterior.id == r1.id

    def test_sistema_basado_en_anterior(self, db, user):
        """Sistema esperado = anterior + movimientos entre ambos."""
        r1 = _crear_reporte(db, user.id)  # LLENO=200
        r2 = _crear_reporte(db, user.id)  # also LLENO=200 (overwrites inventario)
        # Movement AFTER both reports — appears in comparacion since r1.fecha
        mov = registrar_movimiento(
            db, presentacion="222", estado="LLENO", delta_botellas=-10,
            tipo_movimiento="VENTA", usuario_id=user.id,
        )
        mov.fecha = r2.fecha + timedelta(seconds=1)
        db.commit()

        comp = obtener_comparacion(db)
        # anterior=r1(200), mov=-10, sistema=190, actual=r2(200)
        linea_222_lleno = [l for l in comp.lineas_sistema if l.presentacion == "222" and l.estado == "LLENO"][0]
        assert linea_222_lleno.comparado_botellas == 190  # 200 + (-10)
        assert linea_222_lleno.dif_botellas == -10  # 190 - 200

    def test_casillero_usa_cajas_en_comparacion(self, db, user):
        r1 = _crear_reporte(db, user.id)  # CASILLERO=5 cajas
        r2 = _crear_reporte(db, user.id)  # also 5 cajas
        # Movement AFTER both reports
        mov = registrar_movimiento(
            db, presentacion="222", estado="CASILLERO", delta_botellas=3,
            tipo_movimiento="AJUSTE_MANUAL", usuario_id=user.id,
        )
        mov.fecha = r2.fecha + timedelta(seconds=1)
        db.commit()

        comp = obtener_comparacion(db)
        linea = [l for l in comp.lineas_sistema if l.presentacion == "222" and l.estado == "CASILLERO"][0]
        assert linea.comparado_botellas == 0  # CASILLERO siempre 0
        assert linea.comparado_cajas == 8  # 5 + 3

    def test_diferencias_correctas(self, db, user):
        r1 = _crear_reporte(db, user.id)
        r2 = _crear_reporte(db, user.id)

        comp = obtener_comparacion(db)
        for l in comp.lineas_sistema:
            # Sin movimientos entre reportes, sistema = anterior = actual
            assert l.dif_botellas == 0
            assert l.dif_cajas == 0


# ===========================================================================
# _calcular_lleno_esperado
# ===========================================================================


class TestCalcularLlenoEsperado:
    def test_sin_productos(self, db):
        assert _calcular_lleno_esperado(db, "222") == 0

    def test_con_producto(self, db, product_222):
        asociar_producto(db, product_222.id, "222")
        # stock_cajas=10, stock_unidades=18, 222ml=36 botellas/caja
        esperado = 10 * 36 + 18  # 378
        assert _calcular_lleno_esperado(db, "222") == esperado

    def test_dos_productos_misma_presentacion(self, db, product_222, product_333):
        asociar_producto(db, product_222.id, "222")
        asociar_producto(db, product_333.id, "222")
        esperado_222 = 10 * 36 + 18  # 378
        esperado_333 = 5 * 36 + 12  # 192
        assert _calcular_lleno_esperado(db, "222") == esperado_222 + esperado_333


# ===========================================================================
# _stock_productos
# ===========================================================================


class TestStockProductos:
    def test_sin_productos(self, db):
        botellas, cajas = _stock_productos(db, "222")
        assert botellas == 0
        assert cajas == 0

    def test_con_producto(self, db, product_222):
        asociar_producto(db, product_222.id, "222")
        botellas, cajas = _stock_productos(db, "222")
        assert botellas == 10 * 36 + 18  # 378
        assert cajas == 10  # 378 // 36 = 10


# ===========================================================================
# _construir_estado_out
# ===========================================================================


class TestConstruirEstadoOut:
    def test_casillero(self, db, user):
        _crear_reporte(db, user.id)
        inv = _obtener_o_crear_inventario(db, "222", "CASILLERO")
        inv.cantidad_cajas = 5
        db.commit()

        reporte_detalle = {("222", "CASILLERO"): (0, 5)}
        out = _construir_estado_out(db, "222", "CASILLERO", {}, reporte_detalle)
        assert out.estado == "CASILLERO"
        assert out.cantidad_botellas == 0
        assert out.cantidad_cajas == 5

    def test_vacio(self, db, user):
        reporte_detalle = {("222", "VACIO"): (100, 2)}
        out = _construir_estado_out(db, "222", "VACIO", {}, reporte_detalle)
        assert out.estado == "VACIO"
        assert out.cantidad_botellas == 100
        assert out.cajas_enteras == _botellas_a_cajas_enteras(100, "222")
        assert out.botellas_sueltas == _botellas_sobran(100, "222")

    def test_con_movimientos(self, db, user):
        reporte_detalle = {("222", "LLENO"): (200, 5)}
        movimientos = {("222", "LLENO"): -10}
        out = _construir_estado_out(db, "222", "LLENO", movimientos, reporte_detalle)
        assert out.cantidad_botellas == 190  # 200 + (-10)

    def test_sin_reporte_detalle_usa_inventario(self, db):
        inv = _obtener_o_crear_inventario(db, "222", "LLENO")
        inv.cantidad_botellas = 50
        inv.cantidad_cajas = 1
        db.commit()

        out = _construir_estado_out(db, "222", "LLENO", {}, None)
        assert out.cantidad_botellas == 50
