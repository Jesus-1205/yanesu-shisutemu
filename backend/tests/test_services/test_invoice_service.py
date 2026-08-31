"""Tests unitarios para invoice_service: CRUD, IVA, pagos y estado."""
import pytest
from datetime import date
from decimal import Decimal

from sqlalchemy import select

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.category import Category
from app.models.invoice import DetalleFactura, Factura, MonedaEnum, ObsequioFactura, TipoDocumentoEnum, TipoEmpaqueFactura
from app.models.invoice_payment import InvoicePayment
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.invoice import (
    DetalleFacturaCreate,
    FacturaCreate,
    InvoicePaymentCreate,
    ObsequioFacturaCreate,
)
from app.services.invoice_service import (
    _calcular_total_con_iva,
    create_invoice,
    delete_invoice_payment,
    get_invoice,
    get_invoice_payment_summary,
    get_invoices,
    get_invoice_stats,
    get_pending_invoices_summary,
    get_top_suppliers_by_purchases,
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

    def test_create_invoice_updates_cost_with_invoice_price(self, db):
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

        assert prod.precio_costo_caja_usd == precio_caja_nuevo
        assert prod.precio_costo_usd == (precio_caja_nuevo / Decimal(unidades_caja)).quantize(Decimal("0.01"))

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
        """BS con tasa_bs=0 → _calcular_total_con_iva retorna total_bs sin conversión USD."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        # Creamos factura directamente en la DB para bypass la validación de tasa_bs>0
        from app.models.invoice import Factura, MonedaEnum as ME, TipoDocumentoEnum as TDE
        from datetime import date
        factura = Factura(
            proveedor_id=sup.id, numero_factura="F-TASA0",
            tipo_documento=TDE.FACTURA, fecha_factura=date.today(),
            usuario_id=user.id, moneda_principal=ME.BS,
            tasa_bs=Decimal("0"), aplica_iva=True,
        )
        db.add(factura)
        db.flush()

        from app.models.invoice import DetalleFactura, TipoEmpaqueFactura as TEF
        db.add(DetalleFactura(
            factura_id=factura.id, producto_id=prod.id,
            tipo_empaque=TEF.CAJA, cantidad=2,
            costo_unitario_usd=Decimal("50"), costo_unitario_bs=Decimal("2000"),
            tipo_iva="GRAVADO",
        ))
        db.commit()
        db.refresh(factura)

        total_usd, total_bs = _calcular_total_con_iva(factura, db)

        # total_bs = 2000*2 + IVA(4000*0.16) = 4640
        assert total_bs == Decimal("4640.00")
        # tasa=0: total_usd se mantiene el original de la DB
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

    def test_payment_with_rece(self, db):
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
        # Crear factura2 con numero diferente
        sup = _sup(db, nombre="Proveedor Y")
        prod = _prod(db)
        user = _user(db, username="deluser2")
        data2 = _factura_data(sup, prod, "F-DEL-002", cajas=1, costo_usd=Decimal("200"))
        factura2 = create_invoice(db, data2, usuario_id=user.id)
        mp = _metodo_pago(db)

        pago = register_invoice_payment(
            db, factura1.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
            usuario_id=1,
        )

        with pytest.raises(EntityNotFoundError, match="Pago no encontrado"):
            delete_invoice_payment(db, factura2.id, pago.id)


# ── Tests NUEVOS: CreateInvoice - Monedas y conversiones ──────────────────


class TestCreateInvoiceCurrencyConversion:
    """Tests de creación de factura con conversión real USD/BS."""

    def test_create_invoice_bs_moneda_converts_costs(self, db):
        """BS primaria: costo_usd = costo_bs / tasa."""
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)
        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-BS-CONV-001",
            moneda_principal=MonedaEnum.BS,
            tasa_bs=Decimal("36.5"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("1825"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        assert factura.moneda_principal == MonedaEnum.BS
        assert factura.total_bs == Decimal("1825.00")
        assert factura.total_usd == Decimal("50.00")

        detalle = factura.detalles[0]
        assert detalle.costo_unitario_bs == Decimal("1825.00")
        assert detalle.costo_unitario_usd == Decimal("50.00")

    def test_create_invoice_usd_moneda_with_real_tasa(self, db):
        """USD primaria con tasa real: total_bs = total_usd * tasa."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-USD-CONV-001",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("36.5"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=2,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("1825"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        assert factura.total_usd == Decimal("100.00")
        assert factura.total_bs == Decimal("3650.00")

        detalle = factura.detalles[0]
        assert detalle.costo_unitario_usd == Decimal("50.00")
        assert detalle.costo_unitario_bs == Decimal("1825.00")

    def test_create_invoice_bs_real_tasa_iva(self, db):
        """BS + IVA + tasa real: IVA se calcula en BS, total_usd = total_bs / tasa."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12, tipo_iva="GRAVADO")
        user = _user(db)
        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-BS-IVA-REAL",
            moneda_principal=MonedaEnum.BS,
            tasa_bs=Decimal("36.5"),
            aplica_iva=True,
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("1825"),
                tipo_iva="GRAVADO",
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        total_usd_iva, total_bs_iva = _calcular_total_con_iva(factura, db)
        # base_bs=1825, IVA=292, total_bs=2117, total_usd=2117/36.5=58.00
        assert total_bs_iva == Decimal("2117.00")
        assert total_usd_iva == Decimal("58.00")


# ── Tests NUEVOS: CreateInvoice - Empaque UNIDAD ──────────────────────────


class TestCreateInvoiceUnidadEmpaque:
    """Tests de creación de factura con tipo_empaque=UNIDAD."""

    def test_unidad_empaque_updates_stock_unidades(self, db):
        """UNIDAD incrementa stock_unidades, no stock_cajas."""
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)
        db.refresh(prod)
        stock_inicial = prod.stock_unidades

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-UNI-001",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("36.5"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="UNIDAD", cantidad=10,
                costo_unitario_usd=Decimal("5"),
                costo_unitario_bs=Decimal("182.5"),
            )],
        )
        create_invoice(db, data, usuario_id=user.id)
        db.refresh(prod)

        assert prod.stock_unidades == stock_inicial + 10
        assert prod.stock_cajas == 0

    def test_unidad_empaque_updates_cost(self, db):
        """UNIDAD: precio_costo_usd = costo_usd, precio_costo_caja = costo_usd * upc."""
        sup = _sup(db)
        prod = _prod(db, unidades_caja=12)
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-UNI-002",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("1"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="UNIDAD", cantidad=5,
                costo_unitario_usd=Decimal("7.50"),
                costo_unitario_bs=Decimal("7.50"),
            )],
        )
        create_invoice(db, data, usuario_id=user.id)
        db.refresh(prod)

        assert prod.precio_costo_usd == Decimal("7.50")
        assert prod.precio_costo_caja_usd == (Decimal("7.50") * Decimal("12")).quantize(Decimal("0.01"))


# ── Tests NUEVOS: CreateInvoice - unidades_por_caja override ─────────────


class TestCreateInvoiceUnidadesPorCaja:
    """Tests de override de unidades_por_caja en producto."""

    def test_unidades_por_caja_override_updates_product(self, db):
        """Cuando item.unidades_por_caja difiere, se actualiza en producto."""
        sup = _sup(db)
        prod = _prod(db, unidades_caja=12)
        user = _user(db)
        assert prod.unidades_por_caja == 12

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-UPC-001",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("1"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("50"),
                unidades_por_caja=24,
            )],
        )
        create_invoice(db, data, usuario_id=user.id)
        db.refresh(prod)

        assert prod.unidades_por_caja == 24

    def test_unidades_por_caja_same_does_not_change(self, db):
        """Cuando item.unidades_por_caja es igual, no cambia el producto."""
        sup = _sup(db)
        prod = _prod(db, unidades_caja=12)
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-UPC-002",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("1"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("50"),
                unidades_por_caja=12,
            )],
        )
        create_invoice(db, data, usuario_id=user.id)
        db.refresh(prod)

        assert prod.unidades_por_caja == 12


# ── Tests NUEVOS: CreateInvoice - Múltiples productos ─────────────────────


class TestCreateInvoiceMultipleProducts:
    """Tests de factura con múltiples productos."""

    def test_multiple_products_all_stock_increments(self, db):
        """Cada producto recibe su incremento de stock independiente."""
        sup = _sup(db)
        prod1 = _prod(db, nombre="Prod1", precio=Decimal("50"), unidades_caja=12)
        prod2 = _prod(db, nombre="Prod2", precio=Decimal("30"), unidades_caja=6)
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-MULTI-001",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("36.5"),
            detalles=[
                DetalleFacturaCreate(
                    producto_id=prod1.id, tipo_empaque="CAJA", cantidad=2,
                    costo_unitario_usd=Decimal("50"),
                    costo_unitario_bs=Decimal("1825"),
                ),
                DetalleFacturaCreate(
                    producto_id=prod2.id, tipo_empaque="CAJA", cantidad=3,
                    costo_unitario_usd=Decimal("30"),
                    costo_unitario_bs=Decimal("1095"),
                ),
            ],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        db.refresh(prod1)
        db.refresh(prod2)
        assert prod1.stock_cajas == 2
        assert prod2.stock_cajas == 3
        assert factura.total_usd == Decimal("190.00")
        assert factura.total_bs == Decimal("6935.00")

    def test_multiple_products_iva_mixed(self, db):
        """Múltiples productos con IVA mixto: solo GRAVADO lleva IVA."""
        sup = _sup(db)
        prod_grav = _prod(db, nombre="Gravado", precio=Decimal("100"), unidades_caja=12, tipo_iva="GRAVADO")
        prod_exent = _prod(db, nombre="Exento", precio=Decimal("50"), unidades_caja=12, tipo_iva="EXENTO")
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-MIX-IVA-001",
            moneda_principal=MonedaEnum.BS,
            tasa_bs=Decimal("36.5"),
            aplica_iva=True,
            detalles=[
                DetalleFacturaCreate(
                    producto_id=prod_grav.id, tipo_empaque="CAJA", cantidad=1,
                    costo_unitario_usd=Decimal("100"),
                    costo_unitario_bs=Decimal("3650"),
                    tipo_iva="GRAVADO",
                ),
                DetalleFacturaCreate(
                    producto_id=prod_exent.id, tipo_empaque="CAJA", cantidad=1,
                    costo_unitario_usd=Decimal("50"),
                    costo_unitario_bs=Decimal("1825"),
                    tipo_iva="EXENTO",
                ),
            ],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        total_usd_iva, total_bs_iva = _calcular_total_con_iva(factura, db)
        # GRAVADO: 3650, IVA=584; EXENTO: 1825; total_bs=6059
        # total_usd = 6059/36.5 = 166.00
        assert total_bs_iva == Decimal("6059.00")
        assert total_usd_iva == Decimal("166.00")


# ── Tests NUEVOS: CreateInvoice - Obsequios ───────────────────────────────


class TestCreateInvoiceObsequios:
    """Tests de obsequios (productos gratis) en facturas."""

    def test_obsequios_add_stock_without_affecting_total(self, db):
        """Obsequios incrementan stock pero NO afectan total_usd/total_bs."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-OBS-001",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("36.5"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=2,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("1825"),
            )],
            obsequios=[ObsequioFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                justificacion="Promoción del proveedor",
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)
        db.refresh(prod)

        assert factura.total_usd == Decimal("100.00")
        assert factura.total_bs == Decimal("3650.00")
        assert prod.stock_cajas == 3  # 2 (factura) + 1 (obsequio)
        assert len(factura.obsequios) == 1

    def test_obsequios_unidad_stock(self, db):
        """Obsequios en UNIDAD incrementan stock_unidades."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        db.refresh(prod)
        stock_inicial = prod.stock_unidades

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-OBS-002",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("1"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("50"),
            )],
            obsequios=[ObsequioFacturaCreate(
                producto_id=prod.id, tipo_empaque="UNIDAD", cantidad=5,
                justificacion="Muestra gratis",
            )],
        )
        create_invoice(db, data, usuario_id=user.id)
        db.refresh(prod)

        assert prod.stock_unidades == stock_inicial + 5


# ── Tests NUEVOS: CreateInvoice - Persistencia de campos ──────────────────


class TestCreateInvoiceFieldPersistence:
    """Tests de persistencia de campos opcionales en factura."""

    def test_observaciones_persisted(self, db):
        """Campo observaciones se guarda correctamente."""
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-OBS-003",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("1"),
            observaciones="Nota de entrega pendiente de revisión",
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("50"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)
        assert factura.observaciones == "Nota de entrega pendiente de revisión"

    def test_fecha_limite_pago_persisted(self, db):
        """Campo fecha_limite_pago se guarda correctamente."""
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-FLP-001",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("1"),
            fecha_limite_pago=date(2026, 12, 31),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("50"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)
        assert factura.fecha_limite_pago == date(2026, 12, 31)

    def test_proveedor_id_overwrites_previous_supplier(self, db):
        """Si producto ya tiene proveedor, la factura lo reasigna."""
        sup1 = _sup(db, nombre="Proveedor A")
        sup2 = _sup(db, nombre="Proveedor B")
        prod = _prod(db)
        user = _user(db)

        data1 = _factura_data(sup1, prod, "F-SUP-001")
        create_invoice(db, data1, usuario_id=user.id)
        db.refresh(prod)
        assert prod.proveedor_id == sup1.id

        data2 = _factura_data(sup2, prod, "F-SUP-002")
        create_invoice(db, data2, usuario_id=user.id)
        db.refresh(prod)
        assert prod.proveedor_id == sup2.id


# ── Tests NUEVOS: _calcular_total_con_iva - Edge cases ────────────────────


class TestCalcularTotalConIvaEdgeCases:
    """Tests de edge cases en cálculo de IVA."""

    def test_iva_rounding_boundary(self, db):
        """Redondeo en límite .005: IVA = base * 16%."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12, tipo_iva="GRAVADO")
        user = _user(db)
        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-IVA-ROUND-001",
            moneda_principal=MonedaEnum.BS,
            tasa_bs=Decimal("36.5"),
            aplica_iva=True,
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=3,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("1825"),
                tipo_iva="GRAVADO",
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        total_usd_iva, total_bs_iva = _calcular_total_con_iva(factura, db)
        # base_bs = 3 * 1825 = 5475; IVA = 5475 * 0.16 = 876.00
        # total_bs = 5475 + 876 = 6351
        assert total_bs_iva == Decimal("6351.00")
        assert total_usd_iva == (Decimal("6351.00") / Decimal("36.5")).quantize(Decimal("0.01"))

    def test_iva_multiple_gravado_products(self, db):
        """Múltiples productos GRAVADO: IVA se suma sobre la base total."""
        sup = _sup(db)
        prod1 = _prod(db, nombre="G1", precio=Decimal("100"), unidades_caja=12, tipo_iva="GRAVADO")
        prod2 = _prod(db, nombre="G2", precio=Decimal("50"), unidades_caja=12, tipo_iva="GRAVADO")
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-IVA-MULTI-G",
            moneda_principal=MonedaEnum.BS,
            tasa_bs=Decimal("36.5"),
            aplica_iva=True,
            detalles=[
                DetalleFacturaCreate(
                    producto_id=prod1.id, tipo_empaque="CAJA", cantidad=1,
                    costo_unitario_usd=Decimal("100"),
                    costo_unitario_bs=Decimal("3650"),
                    tipo_iva="GRAVADO",
                ),
                DetalleFacturaCreate(
                    producto_id=prod2.id, tipo_empaque="CAJA", cantidad=2,
                    costo_unitario_usd=Decimal("50"),
                    costo_unitario_bs=Decimal("1825"),
                    tipo_iva="GRAVADO",
                ),
            ],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        total_usd_iva, total_bs_iva = _calcular_total_con_iva(factura, db)
        # base_bs = 3650 + (2*1825) = 7300; IVA = 7300 * 0.16 = 1168
        # total_bs = 7300 + 1168 = 8468
        assert total_bs_iva == Decimal("8468.00")
        assert total_usd_iva == (Decimal("8468.00") / Decimal("36.5")).quantize(Decimal("0.01"))


# ── Tests NUEVOS: get_invoices - Filtros y ordenamiento ───────────────────


class TestGetInvoicesFiltersAndSorting:
    """Tests de filtros avanzados y ordenamiento de facturas."""

    def test_filter_estado_pago(self, db):
        """Filtrar por estado_pago retorna solo los que coinciden."""
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)

        data1 = _factura_data(sup, prod, "F-FIL-001", cajas=1, costo_usd=Decimal("50"))
        f1 = create_invoice(db, data1, usuario_id=user.id)
        assert f1.estado_pago == "PENDIENTE"

        data2 = _factura_data(sup, prod, "F-FIL-002", cajas=1, costo_usd=Decimal("50"))
        f2 = create_invoice(db, data2, usuario_id=user.id)
        mp = _metodo_pago(db)
        register_invoice_payment(
            db, f2.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
            usuario_id=user.id,
        )
        db.refresh(f2)
        assert f2.estado_pago == "PAGADA"

        result = get_invoices(db, estado_pago="PENDIENTE")
        assert len(result["items"]) == 1
        assert result["items"][0].numero_factura == "F-FIL-001"

        result = get_invoices(db, estado_pago="PAGADA")
        assert len(result["items"]) == 1
        assert result["items"][0].numero_factura == "F-FIL-002"

    def test_filter_fecha_desde_hasta(self, db):
        """Filtrar por rango de fechas."""
        from datetime import date as _date
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)

        for i, fecha in enumerate([date(2026, 1, 15), date(2026, 6, 20), date(2026, 12, 25)]):
            data = FacturaCreate(
                proveedor_id=sup.id,
                numero_factura=f"F-DATE-{i:03d}",
                moneda_principal=MonedaEnum.USD,
                tasa_bs=Decimal("1"),
                fecha_factura=fecha,
                detalles=[DetalleFacturaCreate(
                    producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                    costo_unitario_usd=Decimal("50"),
                    costo_unitario_bs=Decimal("50"),
                )],
            )
            create_invoice(db, data, usuario_id=user.id)

        result = get_invoices(db, fecha_desde="2026-03-01", fecha_hasta="2026-09-30")
        assert len(result["items"]) == 1
        assert result["items"][0].numero_factura == "F-DATE-001"

    def test_sort_precio_desc(self, db):
        """Ordenar por precio descendente."""
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)

        for i, precio in enumerate([Decimal("30"), Decimal("100"), Decimal("60")]):
            data = _factura_data(sup, prod, f"F-SORT-{i:03d}", cajas=1, costo_usd=precio)
            create_invoice(db, data, usuario_id=user.id)

        result = get_invoices(db, sort_by="precio_desc")
        precios = [item.total_usd for item in result["items"]]
        assert precios == [Decimal("100.00"), Decimal("60.00"), Decimal("30.00")]

    def test_sort_precio_asc(self, db):
        """Ordenar por precio ascendente."""
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)

        for i, precio in enumerate([Decimal("30"), Decimal("100"), Decimal("60")]):
            data = _factura_data(sup, prod, f"F-SORTA-{i:03d}", cajas=1, costo_usd=precio)
            create_invoice(db, data, usuario_id=user.id)

        result = get_invoices(db, sort_by="precio_asc")
        precios = [item.total_usd for item in result["items"]]
        assert precios == [Decimal("30.00"), Decimal("60.00"), Decimal("100.00")]

    def test_sort_fecha_limite_pago(self, db):
        """Ordenar por fecha_limite_pago: primero sin fecha, luego por fecha ascendente."""
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)

        data1 = FacturaCreate(
            proveedor_id=sup.id, numero_factura="F-SORT-FLP-001",
            moneda_principal=MonedaEnum.USD, tasa_bs=Decimal("1"),
            fecha_limite_pago=date(2026, 12, 31),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"), costo_unitario_bs=Decimal("50"),
            )],
        )
        data2 = FacturaCreate(
            proveedor_id=sup.id, numero_factura="F-SORT-FLP-002",
            moneda_principal=MonedaEnum.USD, tasa_bs=Decimal("1"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"), costo_unitario_bs=Decimal("50"),
            )],
        )
        data3 = FacturaCreate(
            proveedor_id=sup.id, numero_factura="F-SORT-FLP-003",
            moneda_principal=MonedaEnum.USD, tasa_bs=Decimal("1"),
            fecha_limite_pago=date(2026, 6, 15),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"), costo_unitario_bs=Decimal("50"),
            )],
        )
        create_invoice(db, data1, usuario_id=user.id)
        create_invoice(db, data2, usuario_id=user.id)
        create_invoice(db, data3, usuario_id=user.id)

        result = get_invoices(db, sort_by="fecha_limite_pago")
        nums = [item.numero_factura for item in result["items"]]
        assert nums[0] == "F-SORT-FLP-003"  # 2026-06-15 (más pronto)
        assert nums[1] == "F-SORT-FLP-001"  # 2026-12-31


# ── Tests NUEVOS: get_invoice_stats ───────────────────────────────────────


class TestGetInvoiceStats:
    """Tests para get_invoice_stats: conteo por estado de pago."""

    def test_stats_empty(self, db):
        """Sin facturas: todos los conteos en 0."""
        stats = get_invoice_stats(db)
        assert stats == {"pendientes": 0, "parciales": 0, "pagadas": 0, "total": 0}

    def test_stats_mixed_statuses(self, db):
        """Conteo correcto por estado de pago."""
        sup = _sup(db)
        prod = _prod(db)
        user = _user(db)
        mp = _metodo_pago(db)

        # PENDIENTE
        data1 = _factura_data(sup, prod, "F-STAT-001", cajas=1, costo_usd=Decimal("100"))
        f1 = create_invoice(db, data1, usuario_id=user.id)

        # PAGADA
        data2 = _factura_data(sup, prod, "F-STAT-002", cajas=1, costo_usd=Decimal("50"))
        f2 = create_invoice(db, data2, usuario_id=user.id)
        register_invoice_payment(
            db, f2.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
            usuario_id=user.id,
        )

        # PARCIAL
        data3 = _factura_data(sup, prod, "F-STAT-003", cajas=1, costo_usd=Decimal("200"))
        f3 = create_invoice(db, data3, usuario_id=user.id)
        register_invoice_payment(
            db, f3.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50")),
            usuario_id=user.id,
        )

        stats = get_invoice_stats(db)
        assert stats["pendientes"] == 1
        assert stats["pagadas"] == 1
        assert stats["parciales"] == 1
        assert stats["total"] == 3


# ── Tests NUEVOS: get_top_suppliers_by_purchases ──────────────────────────


class TestGetTopSuppliers:
    """Tests para get_top_suppliers_by_purchases."""

    def test_top_suppliers_empty(self, db):
        """Sin facturas: lista vacía."""
        result = get_top_suppliers_by_purchases(db)
        assert result == []

    def test_top_suppliers_ranking(self, db):
        """Ranking correcto por cantidad de facturas."""
        sup1 = _sup(db, nombre="Proveedor Mayorista")
        sup2 = _sup(db, nombre="Proveedor Menorista")
        prod = _prod(db)
        user = _user(db)

        # 3 facturas de sup1, 1 de sup2
        for i in range(3):
            data = _factura_data(sup1, prod, f"F-TOP-1-{i}")
            create_invoice(db, data, usuario_id=user.id)
        data = _factura_data(sup2, prod, "F-TOP-2-0")
        create_invoice(db, data, usuario_id=user.id)

        result = get_top_suppliers_by_purchases(db)
        assert len(result) == 2
        assert result[0]["supplier_id"] == sup1.id
        assert result[0]["invoice_count"] == 3
        assert result[1]["supplier_id"] == sup2.id
        assert result[1]["invoice_count"] == 1

    def test_top_suppliers_limit(self, db):
        """Respeta el parámetro limit."""
        sup1 = _sup(db, nombre="S1")
        sup2 = _sup(db, nombre="S2")
        sup3 = _sup(db, nombre="S3")
        prod = _prod(db)
        user = _user(db)

        for sup in [sup1, sup2, sup3]:
            for i in range(2):
                data = _factura_data(sup, prod, f"F-LIM-{sup.id}-{i}")
                create_invoice(db, data, usuario_id=user.id)

        result = get_top_suppliers_by_purchases(db, limit=2)
        assert len(result) == 2


# ── Tests NUEVOS: get_pending_invoices_summary ────────────────────────────


class TestGetPendingInvoicesSummary:
    """Tests para get_pending_invoices_summary (incluyendo bug fix BS-only)."""

    def test_pending_summary_empty(self, db):
        """Sin facturas: total pendiente en 0."""
        result = get_pending_invoices_summary(db)
        assert result["total_pendiente_usd"] == Decimal("0.00")

    def test_pending_summary_usd_invoice(self, db):
        """Factura USD pendiente: total = total_usd."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)

        data = _factura_data(sup, prod, "F-PEND-SUM-001", cajas=2, costo_usd=Decimal("50"))
        create_invoice(db, data, usuario_id=user.id)

        result = get_pending_invoices_summary(db)
        assert result["total_pendiente_usd"] == Decimal("100.00")

    def test_pending_summary_bs_invoice_with_iva(self, db):
        """Factura BS + IVA: pendiente = total con IVA en USD."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-PEND-IVA-001",
            moneda_principal=MonedaEnum.BS,
            tasa_bs=Decimal("36.5"),
            aplica_iva=True,
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("50"),
                costo_unitario_bs=Decimal("1825"),
                tipo_iva="GRAVADO",
            )],
        )
        create_invoice(db, data, usuario_id=user.id)

        result = get_pending_invoices_summary(db)
        # total_bs=1825, IVA=292, total=2117, USD=2117/36.5=58.00
        assert result["total_pendiente_usd"] == Decimal("58.00")

    def test_pending_summary_with_partial_payment(self, db):
        """Pago parcial reduce el pendiente."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        mp = _metodo_pago(db)

        data = _factura_data(sup, prod, "F-PEND-PART-001", cajas=2, costo_usd=Decimal("50"))
        factura = create_invoice(db, data, usuario_id=user.id)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("40")),
            usuario_id=user.id,
        )

        result = get_pending_invoices_summary(db)
        assert result["total_pendiente_usd"] == Decimal("60.00")

    def test_pending_summary_bs_only_payment_bug_fix(self, db):
        """Bug fix: pago BS-only se convierte a USD para el cálculo de pendiente."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        mp = _metodo_pago(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-PEND-BS-001",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("36.5"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("100"),
                costo_unitario_bs=Decimal("3650"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        # Pago BS-only: 3650 BS = 100 USD a tasa 36.5
        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("0"),
                                  monto_bs=Decimal("3650")),
            usuario_id=user.id,
        )

        result = get_pending_invoices_summary(db)
        assert result["total_pendiente_usd"] == Decimal("0.00")

    def test_pending_summary_excludes_paid(self, db):
        """Facturas PAGADA no aparecen en el resumen de pendientes."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        mp = _metodo_pago(db)

        data = _factura_data(sup, prod, "F-PEND-PAID-001", cajas=1, costo_usd=Decimal("100"))
        factura = create_invoice(db, data, usuario_id=user.id)
        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("100")),
            usuario_id=user.id,
        )

        result = get_pending_invoices_summary(db)
        assert result["total_pendiente_usd"] == Decimal("0.00")

    def test_pending_summary_multiple_invoices(self, db):
        """Múltiples facturas se suman correctamente."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)

        for i in range(3):
            data = _factura_data(sup, prod, f"F-PEND-MULTI-{i}", cajas=1, costo_usd=Decimal("100"))
            create_invoice(db, data, usuario_id=user.id)

        result = get_pending_invoices_summary(db)
        assert result["total_pendiente_usd"] == Decimal("300.00")


# ── Tests NUEVOS: register_invoice_payment - Monedas ──────────────────────


class TestRegisterInvoicePaymentCurrency:
    """Tests de pagos con diferentes combinaciones de moneda."""

    def test_payment_bs_only(self, db):
        """Pago solo en BS (monto_usd=0)."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        mp = _metodo_pago(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-PAY-BS-ONLY",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("36.5"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("100"),
                costo_unitario_bs=Decimal("3650"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        pago = register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("0"),
                                  monto_bs=Decimal("3650")),
            usuario_id=user.id,
        )

        assert pago.monto_usd == Decimal("0")
        assert pago.monto_bs == Decimal("3650.00")

    def test_payment_mixed_usd_and_bs(self, db):
        """Pago mixto USD+BS en una transacción."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        mp = _metodo_pago(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-PAY-MIXED",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("1"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("100"),
                costo_unitario_bs=Decimal("100"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        pago = register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("50"),
                                  monto_bs=Decimal("50")),
            usuario_id=user.id,
        )

        assert pago.monto_usd == Decimal("50.00")
        assert pago.monto_bs == Decimal("50.00")

    def test_payment_with_different_tasa(self, db):
        """Pago con tasa diferente a la de la factura: se guarda la tasa del pago."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        mp = _metodo_pago(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-PAY-TASA-DIF",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("800"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("10"),
                costo_unitario_bs=Decimal("8000"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        pago = register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("10"),
                                  tasa_bs=Decimal("900")),
            usuario_id=user.id,
        )

        assert pago.tasa_bs == Decimal("900.00")
        assert pago.monto_bs == Decimal("9000.00")


# ── Tests NUEVOS: get_invoice_payment_summary - Monedas ───────────────────


class TestGetInvoicePaymentSummaryCurrency:
    """Tests de summary con diferentes combinaciones de moneda."""

    def test_summary_bs_only_payments(self, db):
        """Summary con pagos BS-only: se convierten a USD."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        mp = _metodo_pago(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-SUM-BS-ONLY",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("36.5"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("100"),
                costo_unitario_bs=Decimal("3650"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("0"),
                                  monto_bs=Decimal("1825")),
            usuario_id=user.id,
        )

        summary = get_invoice_payment_summary(db, factura.id)
        assert summary.total_pagado_bs == Decimal("1825.00")
        # 1825 / 36.5 = 50.00 USD
        assert summary.total_pagado_usd == Decimal("50.00")
        assert summary.saldo_pendiente_usd == Decimal("50.00")

    def test_summary_mixed_payments(self, db):
        """Summary con pagos mixtos USD + BS."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        mp = _metodo_pago(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-SUM-MIXED",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("36.5"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("100"),
                costo_unitario_bs=Decimal("3650"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        # Pago 1: USD
        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("30")),
            usuario_id=user.id,
        )
        # Pago 2: BS-only
        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("0"),
                                  monto_bs=Decimal("1825")),
            usuario_id=user.id,
        )

        summary = get_invoice_payment_summary(db, factura.id)
        # 30 USD + (1825/36.5=50 USD) = 80 USD pagado
        assert summary.total_pagado_usd == Decimal("80.00")
        assert summary.saldo_pendiente_usd == Decimal("20.00")

    def test_summary_diferencia_cambiaria(self, db):
        """Diferencia cambiaria se calcula correctamente."""
        sup = _sup(db)
        prod = _prod(db, precio=Decimal("50"), unidades_caja=12)
        user = _user(db)
        mp = _metodo_pago(db)

        data = FacturaCreate(
            proveedor_id=sup.id,
            numero_factura="F-SUM-DIF-CAMB",
            moneda_principal=MonedaEnum.USD,
            tasa_bs=Decimal("800"),
            detalles=[DetalleFacturaCreate(
                producto_id=prod.id, tipo_empaque="CAJA", cantidad=1,
                costo_unitario_usd=Decimal("10"),
                costo_unitario_bs=Decimal("8000"),
            )],
        )
        factura = create_invoice(db, data, usuario_id=user.id)

        register_invoice_payment(
            db, factura.id,
            InvoicePaymentCreate(metodo_pago_id=mp.id, monto_usd=Decimal("10"),
                                  tasa_bs=Decimal("900")),
            usuario_id=user.id,
        )

        summary = get_invoice_payment_summary(db, factura.id)
        # Pago BS = 10*900 = 9000; esperado BS = 10*800 = 8000; diferencia = 1000
        assert summary.diferencia_cambiaria_bs == Decimal("1000.00")