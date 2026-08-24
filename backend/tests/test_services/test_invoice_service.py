"""Tests unitarios para invoice_service: CRUD, IVA, pagos y estado."""
import pytest
from decimal import Decimal

from sqlalchemy import select

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.category import Category
from app.models.invoice import Factura, MonedaEnum
from app.models.invoice_payment import InvoicePayment
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.invoice import (
    DetalleFacturaCreate,
    FacturaCreate,
    InvoicePaymentCreate,
)
from app.services.invoice_service import (
    _calcular_total_con_iva,
    create_invoice,
    delete_invoice_payment,
    get_invoice,
    get_invoice_payment_summary,
    get_invoices,
    register_invoice_payment,
)


# ── Helpers ────────────────────────────────────────────────────────────────


def _sup(db, nombre="Proveedor X"):
    s = Supplier(nombre=nombre)
    db.add(s)
    db.commit()
    return s


def _prod(db, nombre="Prod", precio=Decimal("50"), unidades_caja=12, tipo_iva="GRAVADO"):
    cat = db.execute(select(Category).where(Category.nombre == "CAT")).scalar_one()
    p = Product(
        nombre=nombre,
        precio_costo_caja_usd=precio,
        precio_costo_usd=(precio / Decimal(unidades_caja)).quantize(Decimal("0.01")),
        precio_unidad_usd=Decimal("10"),
        precio_caja_usd=Decimal("120"),
        stock_unidades=unidades_caja * 5,
        stock_minimo=5,
        unidades_por_caja=unidades_caja,
        tipo_iva=tipo_iva,
    )
    p.categories.append(cat)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _user(db, username="op"):
    u = User(username=username, email=f"{username}@test.com", hashed_password="x",
             nombre_completo="Op", rol_id=1, is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _metodo_pago(db, nombre="DIVISAS", activo=True):
    mp = PaymentMethod(nombre=nombre, activo=activo)
    db.add(mp)
    db.commit()
    db.refresh(mp)
    return mp


def _factura_data(sup, prod, num, cajas=1, costo_usd=Decimal("50"),
                  moneda=MonedaEnum.USD, aplica_iva=True, tipo_iva="GRAVADO",
                  costo_bs=None):
    if costo_bs is None:
        costo_bs = costo_usd
    return FacturaCreate(
        proveedor_id=sup.id,
        numero_factura=num,
        moneda_principal=moneda,
        tasa_bs=Decimal("1"),
        aplica_iva=aplica_iva,
        detalles=[DetalleFacturaCreate(
            producto_id=prod.id,
            tipo_empaque="CAJA",
            cantidad=cajas,
            costo_unitario_usd=costo_usd,
            costo_unitario_bs=costo_bs,
            tipo_iva=tipo_iva,
        )],
    )


# ── Tests existentes CRUD ─────────────────────────────────────────────────


class TestCreateInvoice:

    def test_create_invoice_updates_stock(self, db):
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)
        data = _factura_data(sup, prod, "F001", cajas=2)
        factura = create_invoice(db, data, usuario_id=user.id)
        db.refresh(prod)

        assert factura.numero_factura == "F001"
        assert len(factura.detalles) == 1
        assert prod.stock_cajas == 2
        assert prod.stock_unidades == 5 * 12
        assert factura.moneda_principal == MonedaEnum.USD
        assert factura.tasa_bs == Decimal("1")
        assert factura.total_usd == Decimal("100.00")
        assert factura.total_bs == Decimal("100.00")

    def test_create_invoice_updates_weighted_average_cost(self, db):
        sup = _sup(db)
        unidades_caja = 12
        stock_inicial_cajas = 5
        precio_caja_anterior = Decimal("50")
        cajas_nuevas = 3
        precio_caja_nuevo = Decimal("70")

        prod = _prod(db, precio=precio_caja_anterior, unidades_caja=unidades_caja)
        prod.stock_unidades = stock_inicial_cajas * unidades_caja
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F002",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("1"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=cajas_nuevas,
                costo_unitario_usd=precio_caja_nuevo,
                costo_unitario_bs=precio_caja_nuevo,
            )],
        )
        create_invoice(db, data, usuario_id=user.id)
        db.refresh(prod)

        promedio_esperado = (
            (Decimal(stock_inicial_cajas) * precio_caja_anterior)
            + (Decimal(cajas_nuevas) * precio_caja_nuevo)
        ) / Decimal(stock_inicial_cajas + cajas_nuevas)
        promedio_esperado = promedio_esperado.quantize(Decimal("0.01"))

        assert prod.precio_costo_caja_usd == promedio_esperado
        assert prod.precio_costo_usd == (promedio_esperado / Decimal(unidades_caja)).quantize(Decimal("0.01"))

    def test_create_invoice_updates_proveedor_id(self, db):
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)
        assert prod.proveedor_id is None

        data = _factura_data(sup, prod, "F003")
        create_invoice(db, data, usuario_id=user.id)
        db.refresh(prod)

        assert prod.proveedor_id == sup.id

    def test_duplicate_invoice_raises_error(self, db):
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)
        data = _factura_data(sup, prod, "F-DUP")
        create_invoice(db, data, usuario_id=user.id)

        with pytest.raises(ConflictError, match="ya está registrada"):
            create_invoice(db, data, usuario_id=user.id)

    def test_product_not_found_raises_error(self, db):
        sup = _sup(db)
        user = _user(db)
        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-NF",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("1"),
            detalles=[DetalleFacturaCreate(
                producto_id=999, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"), costo_unitario_bs=Decimal("50"),
            )],
        )
        with pytest.raises(EntityNotFoundError, match="Producto ID 999 no encontrado"):
            create_invoice(db, data, usuario_id=user.id)


# ── Tests existentes list/get ──────────────────────────────────────────────


class TestGetInvoices:

    def test_get_invoices_empty(self, db):
        result = get_invoices(db)
        assert result["items"] == []

    def test_get_invoices_pagination(self, db):
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)
        for i in range(5):
            data = _factura_data(sup, prod, f"F-{i:03d}")
            create_invoice(db, data, usuario_id=user.id)

        result = get_invoices(db, page=1, page_size=2)
        assert len(result["items"]) == 2
        assert result["total"] == 5
        assert result["pages"] == 3

    def test_get_invoices_filter_proveedor(self, db):
        sup1 = _sup(db, "Sup1")
        sup2 = _sup(db, "Sup2")
        prod = _prod(db)
        user = _user(db)
        data = _factura_data(sup1, prod, "F-S1")
        create_invoice(db, data, usuario_id=user.id)
        data2 = _factura_data(sup2, prod, "F-S2")
        create_invoice(db, data2, usuario_id=user.id)

        result = get_invoices(db, proveedor_id=sup1.id)
        assert len(result["items"]) == 1
        assert result["items"][0].numero_factura == "F-S1"

    def test_get_invoices_search(self, db):
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)
        data = _factura_data(sup, prod, "ABC-123")
        create_invoice(db, data, usuario_id=user.id)

        result = get_invoices(db, search="abc")
        assert len(result["items"]) == 1


class TestGetInvoice:

    def test_get_invoice_returns_detail(self, db):
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)
        data = FacturaCreate(
            proveedor_id=sup.id, numero_factura="F-DET",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("1"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=2,
                costo_unitario_usd=Decimal("55"), costo_unitario_bs=Decimal("55"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        result = get_invoice(db, factura.id)
        assert result.id == factura.id
        assert result.supplier.nombre == "Proveedor X"
        assert len(result.detalles) == 1
        assert result.detalles[0].product.nombre == "Prod"
        assert result.moneda_principal == MonedaEnum.USD
        assert result.total_usd == Decimal("110.00")
        assert result.total_bs == Decimal("110.00")

    def test_get_invoice_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="Factura no encontrada"):
            get_invoice(db, 999)


# ── Tests NUEVOS: _calcular_total_con_iva ─────────────────────────────────


class TestCalcularTotalConIva:
    """Tests para _calcular_total_con_iva: lógica de IVA en facturas BS."""

    def test_bs_invoice_with_iva_gravado(self, db):
        """BS + aplica_iva=True + GRAVADO → IVA se suma al total."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("100"), unidades_caja=12)
        user = _user(db)
        data = _factura_data(
            sup, prod, "F-IVA-001",
            cajas=2, costo_usd=Decimal("100"), costo_bs=Decimal("2000"),
            moneda=MonedaEnum.BS, aplica_iva=True, tipo_iva="GRAVADO",
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        total_usd, total_bs = _calcular_total_con_iva(factura, db)

        # base_bs = 2 * 2000 = 4000; IVA = 4000 * 16% = 640; total = 4640
        assert total_bs == Decimal("4640.00")
        assert total_usd == (Decimal("4640.00") / factura.tasa_bs).quantize(Decimal("0.01"))

    def test_bs_invoice_without_iva(self, db):
        """BS + aplica_iva=False → totals unchanged."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("100"), unidades_caja=12)
        user = _user(db)
        data = _factura_data(
            sup, prod, "F-IVA-002",
            cajas=2, costo_usd=Decimal("100"), costo_bs=Decimal("2000"),
            moneda=MonedaEnum.BS, aplica_iva=False, tipo_iva="GRAVADO",
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        total_usd, total_bs = _calcular_total_con_iva(factura, db)

        # Sin IVA: total_bs = 2 * 2000 = 4000
        assert total_bs == Decimal("4000.00")
        assert total_usd == factura.total_usd

    def test_usd_invoice_ignored(self, db):
        """USD → IVA no aplica, retorna totales originales."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        data = _factura_data(
            sup, prod, "F-IVA-003",
            cajas=2, costo_usd=Decimal("50"), costo_bs=Decimal("50"),
            moneda=MonedaEnum.USD, aplica_iva=True, tipo_iva="GRAVADO",
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        total_usd, total_bs = _calcular_total_con_iva(factura, db)

        assert total_usd == Decimal("100.00")
        assert total_bs == Decimal("100.00")

    def test_bs_mixed_gravado_exento(self, db):
        """BS con items GRAVADO y EXENTO → solo GRAVADO lleva IVA."""
        sup = _sup(db)
        prod_grav = _prod(db, nombre="Gravado", precio=Decimal("100"), unidades_caja=12, tipo_iva="GRAVADO")
        prod_exent = _prod(db, nombre="Exento", precio=Decimal("80"), unidades_caja=12, tipo_iva="EXENTO")
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-MIX-001",
            moneda_principal=MonedaEnum.BS,
            tasa_bs=Decimal("1"),
            aplica_iva=True,
            detalles=[
                DetalleFacturaCreate(
                    producto_id=prod_grav.id, tipo_empaque="CAJA", cantidad=1,
                    costo_unitario_usd=Decimal("100"), costo_unitario_bs=Decimal("2000"),
                    tipo_iva="GRAVADO",
                ),
                DetalleFacturaCreate(
                    producto_id=prod_exent.id, tipo_empaque="CAJA", cantidad=1,
                    costo_unitario_usd=Decimal("80"), costo_unitario_bs=Decimal("1600"),
                    tipo_iva="EXENTO",
                ),
            ],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        total_usd, total_bs = _calcular_total_con_iva(factura, db)

        # GRAVADO: 2000 → IVA = 320; EXENTO: 1600 → sin IVA
        # total_bs = 2000 + 320 + 1600 = 3920
        assert total_bs == Decimal("3920.00")

    def test_bs_zero_tasa_keeps_usd_original(self, db):
        """BS con tasa_bs=0 → total_usd no se recalcula."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-TASA0",
            moneda_principal=MonedaEnum.BS,
            tasa_bs=Decimal("0"),
            aplica_iva=True,
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=2,
                costo_unitario_usd=Decimal("50"), costo_unitario_bs=Decimal("2000"),
                tipo_iva="GRAVADO",
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        total_usd, total_bs = _calcular_total_con_iva(factura, db)

        # tasa=0: IVA se calcula pero USD se mantiene el original
        assert total_bs == Decimal("4640.00")
        assert total_usd == factura.total_usd


# ── Tests NUEVOS: _recalculate_invoice_payment_status ──────────────────────


class TestRecalculateInvoicePaymentStatus:
    """Tests para _recalculate_invoice_payment_status."""

    def _make_factura(self, db, total_usd=Decimal("100"), moneda=MonedaEnum.USD):
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura=f"F-REC-{moneda.value}",
            moneda_principal=moneda,
            tasa_bs=Decimal("36.5") if moneda == MonedaEnum.BS else Decimal("1"),
            aplica_iva=False,
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=total_usd, costo_unitario_bs=total_usd,
            )],
        )
        return create_invoice(db, data, usuario_id=user.id)

    def test_status_pendiente_no_payments(self, db):
        factura = self._make_factura(db)
        assert factura.estado_pago == "PENDIENTE"

    def test_status_parcialmente_pagada(self, db):
        factura = self._make_factura(db)
        mp = _metodo_pago(db)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
            usuario_id=1,
        )
        db.refresh(factura)
        assert factura.estado_pago == "PARCIALMENTE_PAGADA"

    def test_status_pagada_when_fully_paid(self, db):
        factura = self._make_factura(db, total_usd=Decimal("80"))
        mp = _metodo_pago(db)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("80")),
            usuario_id=1,
        )
        db.refresh(factura)
        assert factura.estado_pago == "PAGADA"


# ── Tests NUEVOS: register_invoice_payment ─────────────────────────────────


class TestRegisterInvoicePayment:
    """Tests para register_invoice_payment: validación de montos y comprobantes."""

    def _make_factura(self, db, total_usd=Decimal("100"), aplica_iva=False,
                      moneda=MonedaEnum.USD):
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db, username="payuser")
        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura=f"F-PAY-{moneda.value}-{total_usd}",
            moneda_principal=moneda,
            tasa_bs=Decimal("36.5") if moneda == MonedaEnum.BS else Decimal("1"),
            aplica_iva=aplica_iva,
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=total_usd, costo_unitario_bs=total_usd,
            )],
        )
        return create_invoice(db, data, usuario_id=user.id)

    def test_register_payment_success(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)
        user = _user(db, username="payer")

        pago = register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("60")),
            usuario_id=user.id,
        )

        assert pago.monto_usd == Decimal("60")
        assert pago.factura_id == factura.id

    def test_rejects_overpayment(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)
        user = _user(db, username="overpay")

        with pytest.raises(ConflictError, match="excede el saldo"):
            register_invoice_payment(
                db, factura.id,
                InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("150")),
                usuario_id=user.id,
            )

    def test_rejects_zero_amounts(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        with pytest.raises(ConflictError, match="al menos un monto"):
            register_invoice_payment(
                db, factura.id,
                InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("0")),
                usuario_id=1,
            )

    def test_rejects_already_paid_invoice(self, db):
        factura = self._make_factura(db, total_usd=Decimal("50"))
        mp = _metodo_pago(db)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
            usuario_id=1,
        )
        db.refresh(factura)
        assert factura.estado_pago == "PAGADA"

        with pytest.raises(ConflictError, match="completamente pagada"):
            register_invoice_payment(
                db, factura.id,
                InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("10")),
                usuario_id=1,
            )

    def test_rejects_inactive_payment_method(self, db):
        factura = self._make_factura(db)
        mp = _metodo_pago(db, nombre="INACTIVA", activo=False)

        with pytest.raises(ConflictError, match="inactivo"):
            register_invoice_payment(
                db, factura.id,
                InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
                usuario_id=1,
            )

    def test_rejects_nonexistent_payment_method(self, db):
        factura = self._make_factura(db)

        with pytest.raises(EntityNotFoundError, match="Método de pago no encontrado"):
            register_invoice_payment(
                db, factura.id,
                InvoicePaymentCreate(metodo_pago_id=9999, monto_usd=Decimal("50")),
                usuario_id=1,
            )

    def test_rejects_nonexistent_invoice(self, db):
        mp = _metodo_pago(db)

        with pytest.raises(EntityNotFoundError, match="Factura no encontrada"):
            register_invoice_payment(
                db, 9999,
                InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
                usuario_id=1,
            )

    def test_partial_payment_updates_status(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("40")),
            usuario_id=1,
        )
        db.refresh(factura)
        assert factura.estado_pago == "PARCIALMENTE_PAGADA"

    def test_full_payment_sets_pagada(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("100")),
            usuario_id=1,
        )
        db.refresh(factura)
        assert factura.estado_pago == "PAGADA"

    def test_payment_with_rece(self):
        """Pago con archivo comprobante guardado."""
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        files = [(b"fake image bytes", "image/jpeg", "comprobante.jpg")]
        pago = register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("100")),
            usuario_id=1,
            comprobantes_files=files,
        )

        db.refresh(pago)
        assert len(pago.comprobantes) == 1
        assert pago.comprobantes[0].nombre_original == "comprobante.jpg"
        assert pago.comprobantes[0].tipo_archivo == "image/jpeg"

    def test_overpayment_after_partial(self, db):
        """Segundo pago que excede el saldo pendiente."""
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("80")),
            usuario_id=1,
        )
        db.refresh(factura)
        assert factura.estado_pago == "PARCIALMENTE_PAGADA"

        with pytest.raises(ConflictError, match="excede el saldo"):
            register_invoice_payment(
                db, factura.id,
                InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("30")),
                usuario_id=1,
            )

    def test_bs_payment_with_iva_validates_against_iva_total(self, db):
        """BS invoice con IVA: el pago se valida contra el total con IVA."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db, username="bs_iva")
        mp = _metodo_pago(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-BS-IVA",
            moneda_principal=MonedaEnum.BS,
            tasa_bs=Decimal("36.5"),
            aplica_iva=True,
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"), costo_unitario_bs=Decimal("1825"),
                tipo_iva="GRAVADO",
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        # total_bs = 1825; IVA = 1825 * 16% = 292; total = 2117
        total_usd_iva, _ = _calcular_total_con_iva(factura, db)
        # total_usd = 2117 / 36.5 = 58.00

        # Pago que excede el saldo IVA-inclusive
        with pytest.raises(ConflictError, match="excede el saldo"):
            register_invoice_payment(
                db, factura.id,
                InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("60")),
                usuario_id=1,
            )

    def test_multiple_payments_cumulative(self, db):
        """Varios pagos se acumulan y el estado se recalcula."""
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("30")),
            usuario_id=1,
        )
        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("30")),
            usuario_id=1,
        )
        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("40")),
            usuario_id=1,
        )
        db.refresh(factura)
        assert factura.estado_pago == "PAGADA"


# ── Tests NUEVOS: get_invoice_payment_summary ─────────────────────────────


class TestGetInvoicePaymentSummary:
    """Tests para get_invoice_payment_summary."""

    def _make_factura(self, db, total_usd=Decimal("100"), aplica_iva=False,
                      moneda=MonedaEnum.USD):
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db, username="summary")
        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura=f"F-SUM-{moneda.value}-{total_usd}",
            moneda_principal=moneda,
            tasa_bs=Decimal("36.5") if moneda == MonedaEnum.BS else Decimal("1"),
            aplica_iva=aplica_iva,
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=total_usd, costo_unitario_bs=total_usd,
            )],
        )
        return create_invoice(db, data, usuario_id=user.id)

    def test_summary_no_payments(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        summary = get_invoice_payment_summary(db, factura.id)

        assert summary.estado_pago == "PENDIENTE"
        assert summary.total_factura_usd == Decimal("100.00")
        assert summary.total_pagado_usd == Decimal("0.00")
        assert summary.saldo_pendiente_usd == Decimal("100.00")
        assert summary.cantidad_pagos == 0
        assert summary.porcentaje_pagado == 0.0

    def test_summary_after_partial_payment(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("40")),
            usuario_id=1,
        )

        summary = get_invoice_payment_summary(db, factura.id)
        assert summary.estado_pago == "PARCIALMENTE_PAGADA"
        assert summary.total_pagado_usd == Decimal("40.00")
        assert summary.saldo_pendiente_usd == Decimal("60.00")
        assert summary.cantidad_pagos == 1
        assert summary.porcentaje_pagado == pytest.approx(40.0)

    def test_summary_after_full_payment(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("100")),
            usuario_id=1,
        )

        summary = get_invoice_payment_summary(db, factura.id)
        assert summary.estado_pago == "PAGADA"
        assert summary.saldo_pendiente_usd == Decimal("0.00")
        assert summary.porcentaje_pagado == 100.0

    def test_summary_bs_with_iva(self, db):
        """Summary de BS con IVA incluido en el total."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db, username="sumiva")
        mp = _metodo_pago(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-SUM-BS-IVA",
            moneda_principal=MonedaEnum.BS,
            tasa_bs=Decimal("36.5"),
            aplica_iva=True,
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"), costo_unitario_bs=Decimal("1825"),
                tipo_iva="GRAVADO",
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        summary = get_invoice_payment_summary(db, factura.id)

        # total_bs con IVA = 1825 + 292 = 2117; total_usd = 2117/36.5 = 58.00
        assert summary.total_factura_bs == Decimal("2117.00")
        assert summary.saldo_pendiente_bs == Decimal("2117.00")

    def test_summary_not_found(self, db):
        with pytest.raises(EntityNotFoundError, match="Factura no encontrada"):
            get_invoice_payment_summary(db, 9999)

    def test_summary_multiple_payments(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("30")),
            usuario_id=1,
        )
        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("30")),
            usuario_id=1,
        )

        summary = get_invoice_payment_summary(db, factura.id)
        assert summary.total_pagado_usd == Decimal("60.00")
        assert summary.saldo_pendiente_usd == Decimal("40.00")
        assert summary.cantidad_pagos == 2
        assert summary.porcentaje_pagado == pytest.approx(60.0)


# ── Tests NUEVOS: delete_invoice_payment ───────────────────────────────────


class TestDeleteInvoicePayment:
    """Tests para delete_invoice_payment."""

    def _make_factura(self, db, total_usd=Decimal("100")):
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db, username="deluser")
        data = _factura_data(sup, prod, "F-DEL-001", cajas=1, costo_usd=total_usd)
        return create_invoice(db, data, usuario_id=user.id)

    def test_delete_payment(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        pago = register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("100")),
            usuario_id=1,
        )
        db.refresh(factura)
        assert factura.estado_pago == "PAGADA"

        delete_invoice_payment(db, factura.id, pago.id)
        db.refresh(factura)
        assert factura.estado_pago == "PENDIENTE"

    def test_delete_payment_recalculates_to_parcial(self, db):
        factura = self._make_factura(db, total_usd=Decimal("100"))
        mp = _metodo_pago(db)

        pago1 = register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
            usuario_id=1,
        )
        pago2 = register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
            usuario_id=1,
        )
        db.refresh(factura)
        assert factura.estado_pago == "PAGADA"

        delete_invoice_payment(db, factura.id, pago2.id)
        db.refresh(factura)
        assert factura.estado_pago == "PARCIALMENTE_PAGADA"

    def test_delete_nonexistent_payment(self, db):
        factura = self._make_factura(db)

        with pytest.raises(EntityNotFoundError, match="Pago no encontrado"):
            delete_invoice_payment(db, factura.id, 9999)

    def test_delete_wrong_invoice(self, db):
        factura1 = self._make_factura(db, total_usd=Decimal("100"))
        factura2 = self._make_factura(db, total_usd=Decimal("200"))
        mp = _metodo_pago(db)

        pago = register_invoice_payment(
            db, factura1.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
            usuario_id=1,
        )

        with pytest.raises(EntityNotFoundError, match="Pago no encontrado"):
            delete_invoice_payment(db, factura2.id, pago.id)