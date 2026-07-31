import pytest
from decimal import Decimal

from sqlalchemy import select

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.supplier import Supplier
from app.models.product import Product
from app.models.user import User
from app.models.invoice import Factura, DetalleFactura, MonedaEnum
from app.schemas.invoice import FacturaCreate, DetalleFacturaCreate
from app.services.invoice_service import create_invoice, get_invoice, get_invoices


def _sup(db, nombre="Proveedor X"):
    s = Supplier(nombre=nombre)
    db.add(s)
    db.commit()
    return s


def _prod(db, nombre="Prod", precio=Decimal("50"), unidades_caja=12):
    from app.models.category import Category
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
        tipo_iva="GRAVADO",
    )
    p.categories.append(cat)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _user(db):
    u = User(username="op", email="op@test.com", hashed_password="x",
             nombre_completo="Op", rol_id=1, is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _factura_data(sup, prod, num, cajas=1, costo_usd=Decimal("50")):
    return FacturaCreate(
        proveedor_id=sup.id,
        numero_factura=num,
        moneda_principal=MonedaEnum.USD,
        tasa_bs=Decimal("1"),
        detalles=[DetalleFacturaCreate(
            producto_id=prod.id,
            cantidad_cajas=cajas,
            costo_caja_usd=costo_usd,
            costo_caja_bs=costo_usd,
        )],
    )


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
        assert prod.stock_unidades == (5 * 12) + (2 * 12)
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
                producto_id=prod.id, cantidad_cajas=cajas_nuevas,
                costo_caja_usd=precio_caja_nuevo,
                costo_caja_bs=precio_caja_nuevo,
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
                producto_id=999, cantidad_cajas=1,
                costo_caja_usd=Decimal("50"), costo_caja_bs=Decimal("50"),
            )],
        )
        with pytest.raises(EntityNotFoundError, match="Producto ID 999 no encontrado"):
            create_invoice(db, data, usuario_id=user.id)


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
                producto_id=prod.id, cantidad_cajas=2,
                costo_caja_usd=Decimal("55"), costo_caja_bs=Decimal("55"),
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
