"""
Script para generar datos de prueba masivos (últimos 60 días).
15 categorías, 15 proveedores, 50 productos, 20 facturas, ~200 ventas.

Uso: cd backend && python seed_sales.py
"""
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.supplier import Supplier
from app.models.category import Category, producto_categoria
from app.models.product import Product
from app.models.user import User
from app.models.exchange_rate import ExchangeRate
from app.models.sale import Sale, SaleItem
from app.models.sale_payment import SalePayment
from app.models.payment_method import PaymentMethod

# ── Datos base ───────────────────────────────────────────────

SUPPLIERS_DATA = [
    {"nombre": "Distribuidora Nacional C.A.", "telefono": "+58-212-5551234", "email": "ventas@distnacional.com.ve"},
    {"nombre": "Importaciones Del Caribe S.R.L.", "telefono": "+58-212-5559876", "email": "pedidos@delcaribe.com.ve"},
    {"nombre": "Bebidas Premium C.A.", "telefono": "+58-241-5554321", "email": "ventas@premium.com.ve"},
    {"nombre": "Cerveceras Unidas S.A.", "telefono": "+58-212-5557654", "email": "distribucion@cerveceras.com.ve"},
    {"nombre": "Licores Orientales C.A.", "telefono": "+58-261-5553456", "email": "ventas@orientales.com.ve"},
    {"nombre": "Comercializadora Central S.R.L.", "telefono": "+58-212-5558765", "email": "info@central.com.ve"},
    {"nombre": "Alimentos y Bebidas del Sur C.A.", "telefono": "+58-276-5552345", "email": "ventas@delsur.com.ve"},
    {"nombre": "Importadora Europea S.A.", "telefono": "+58-212-5556789", "email": "pedidos@europea.com.ve"},
    {"nombre": "Distribuidora Andina C.A.", "telefono": "+58-274-5555678", "email": "ventas@andina.com.ve"},
    {"nombre": "Bebidas del Litoral C.A.", "telefono": "+58-261-5551234", "email": "info@litoral.com.ve"},
    {"nombre": "Comercial Los Andes S.R.L.", "telefono": "+58-274-5559876", "email": "ventas@andes.com.ve"},
    {"nombre": "Almacenes Provincia C.A.", "telefono": "+58-241-5553456", "email": "distribucion@provincia.com.ve"},
    {"nombre": "Exportaciones del Norte S.A.", "telefono": "+58-212-5554567", "email": "ventas@norte.com.ve"},
    {"nombre": "Gourmet Select C.A.", "telefono": "+58-212-5557890", "email": "info@gourmet.com.ve"},
    {"nombre": "Bebidas Variadas S.R.L.", "telefono": "+58-241-5550123", "email": "ventas@variadas.com.ve"},
]

CATEGORIES_DATA = [
    {"nombre": "LICORES", "descripcion": "Destilados y licores varios"},
    {"nombre": "VINOS", "descripcion": "Vinos tintos, blancos y rosados"},
    {"nombre": "CERVEZAS", "descripcion": "Cervezas nacionales e importadas"},
    {"nombre": "REFRESCOS", "descripcion": "Bebidas gaseosas y jugos"},
    {"nombre": "AGUAS", "descripcion": "Aguas minerales y purificadas"},
    {"nombre": "ENERGIZANTES", "descripcion": "Bebidas energéticas"},
    {"nombre": "WHISKY", "descripcion": "Whiskies importados y nacionales"},
    {"nombre": "RON", "descripcion": "Ronescaribeños y artesanales"},
    {"nombre": "VODKA", "descripcion": "Vodkas premium y estándar"},
    {"nombre": "GINEBRA", "descripcion": "Ginebras clásicas y modernas"},
    {"nombre": "TEQUILA", "descripcion": "Tequilas 100% agave"},
    {"nombre": "CHAMPAGNE", "descripcion": "Champagnes y espumantes"},
    {"nombre": "SNACKS", "descripcion": "Snacks y botanas"},
    {"nombre": "HIELO", "descripcion": "Hielo para consumo"},
    {"nombre": "ACCESORIOS", "descripcion": "Cristalería y accesorios de bar"},
]

PRODUCTS_DATA = [
    # (nombre, unidades_por_caja, precio_caja_usd, precio_unidad_usd, tipo_iva, categoria, proveedor_idx)
    # ── LICORES (0) ──
    ("Ron Diplomático Añejo 750ml", 6, 72.00, 14.00, "GRAVADO", "LICORES", 0),
    ("Vodka Smirnoff No.21 750ml", 6, 54.00, 10.50, "GRAVADO", "LICORES", 0),
    ("Whisky Johnnie Walker Red 750ml", 6, 90.00, 17.50, "GRAVADO", "LICORES", 2),
    ("Tequila Sauza Hacienda 750ml", 6, 60.00, 12.00, "GRAVADO", "LICORES", 4),
    ("Ginebra Bombay Sapphire 750ml", 6, 84.00, 16.00, "GRAVADO", "LICORES", 2),
    # ── VINOS (1) ──
    ("Vino Tinto Santa Carolina 750ml", 12, 48.00, 5.00, "GRAVADO", "VINOS", 7),
    ("Vino Blanco Concha y Toro 750ml", 12, 54.00, 5.50, "GRAVADO", "VINOS", 7),
    ("Vino Rosé Montes Classic 750ml", 12, 60.00, 6.00, "GRAVADO", "VINOS", 7),
    # ── CERVEZAS (2) ──
    ("Cerveza Pilsen Callao 355ml", 24, 28.80, 1.50, "EXENTO", "CERVEZAS", 3),
    ("Cerveza Polar Pilsen 355ml", 24, 24.00, 1.25, "EXENTO", "CERVEZAS", 3),
    ("Cerveza Corona Extra 355ml", 24, 36.00, 2.00, "EXENTO", "CERVEZAS", 1),
    ("Cerveza Brahma 355ml", 24, 26.40, 1.40, "EXENTO", "CERVEZAS", 3),
    ("Cerveza Heineken 330ml", 24, 38.40, 2.00, "EXENTO", "CERVEZAS", 1),
    # ── REFRESCOS (3) ──
    ("Coca-Cola 500ml", 12, 9.60, 1.00, "EXENTO", "REFRESCOS", 0),
    ("Sprite 500ml", 12, 9.60, 1.00, "EXENTO", "REFRESCOS", 0),
    ("Fanta Naranja 500ml", 12, 9.60, 1.00, "EXENTO", "REFRESCOS", 0),
    ("Pepsi 500ml", 12, 9.60, 1.00, "EXENTO", "REFRESCOS", 6),
    ("7UP PET 1.25L", 6, 5.70, 0.95, "EXENTO", "REFRESCOS", 6),
    # ── AGUAS (4) ──
    ("Agua Minalba 600ml", 24, 14.40, 0.75, "EXENTO", "AGUAS", 6),
    ("Agua Dasani 500ml", 24, 16.80, 0.85, "EXENTO", "AGUAS", 6),
    ("Agua San Cristóbal 1.5L", 12, 12.00, 1.25, "EXENTO", "AGUAS", 6),
    # ── ENERGIZANTES (5) ──
    ("Red Bull 250ml", 24, 48.00, 2.50, "EXENTO", "ENERGIZANTES", 1),
    ("Monster Energy 473ml", 12, 36.00, 3.50, "EXENTO", "ENERGIZANTES", 1),
    ("Burn 250ml", 24, 36.00, 1.80, "EXENTO", "ENERGIZANTES", 8),
    # ── WHISKY (6) ──
    ("Whisky Chivas Regal 12 años 750ml", 6, 168.00, 32.00, "GRAVADO", "WHISKY", 2),
    ("Whisky Jack Daniel's 750ml", 6, 132.00, 25.00, "GRAVADO", "WHISKY", 2),
    ("Whisky Buchanan's 12 años 750ml", 6, 144.00, 28.00, "GRAVADO", "WHISKY", 7),
    # ── RON (7) ──
    ("Ron Santa Teresa 1796 750ml", 6, 120.00, 23.00, "GRAVADO", "RON", 4),
    ("Ron Pampero Especial 750ml", 6, 54.00, 10.50, "GRAVADO", "RON", 4),
    ("Ron Cacique 500ml", 12, 42.00, 4.50, "GRAVADO", "RON", 0),
    # ── VODKA (8) ──
    ("Vodka Absolut Original 750ml", 6, 78.00, 15.00, "GRAVADO", "VODKA", 7),
    ("Vodka Grey Goose 750ml", 6, 150.00, 28.00, "GRAVADO", "VODKA", 7),
    ("Vodka Cîroc 750ml", 6, 120.00, 23.00, "GRAVADO", "VODKA", 8),
    # ── GINEBRA (9) ──
    ("Ginebra Hendrick's 750ml", 6, 132.00, 25.00, "GRAVADO", "GINEBRA", 8),
    ("Ginebra Tanqueray 750ml", 6, 72.00, 14.00, "GRAVADO", "GINEBRA", 2),
    # ── TEQUILA (10) ──
    ("Tequila Jose Cuervo Especial 750ml", 6, 72.00, 14.00, "GRAVADO", "TEQUILA", 4),
    ("Tequila Patrón Silver 750ml", 6, 180.00, 34.00, "GRAVADO", "TEQUILA", 8),
    # ── CHAMPAGNE (11) ──
    ("Champagne Moët & Chandon 750ml", 6, 300.00, 56.00, "GRAVADO", "CHAMPAGNE", 7),
    ("Cava Freixenet Brut 750ml", 12, 96.00, 9.50, "GRAVADO", "CHAMPAGNE", 7),
    # ── SNACKS (12) ──
    ("Papas Margarita 170g", 12, 18.00, 1.80, "EXENTO", "SNACKS", 6),
    ("Caciquitas 100g", 24, 12.00, 0.60, "EXENTO", "SNACKS", 6),
    ("Chizos 85g", 24, 14.40, 0.75, "EXENTO", "SNACKS", 6),
    ("Bon Bon Bum 24 und", 12, 12.00, 1.25, "EXENTO", "SNACKS", 10),
    # ── HIELO (13) ──
    ("Hielo Bolsa 2kg", 10, 15.00, 1.80, "EXENTO", "HIELO", 9),
    ("Hielo Bolsa 1kg", 20, 10.00, 0.60, "EXENTO", "HIELO", 9),
    # ── ACCESORIOS (14) ──
    ("Vaso Cristal 250ml", 24, 36.00, 2.00, "EXENTO", "ACCESORIOS", 11),
    ("Botella Térmica 1L", 6, 54.00, 10.50, "EXENTO", "ACCESORIOS", 11),
    ("Copa Mariscos 300ml", 12, 48.00, 5.00, "EXENTO", "ACCESORIOS", 11),
]

# ── Helpers ──────────────────────────────────────────────────

def ensure_suppliers(db: Session) -> list[Supplier]:
    suppliers = []
    for data in SUPPLIERS_DATA:
        stmt = select(Supplier).where(Supplier.nombre == data["nombre"])
        existing = db.execute(stmt).scalar_one_or_none()
        if existing:
            suppliers.append(existing)
            continue
        s = Supplier(**data)
        db.add(s)
        db.commit()
        db.refresh(s)
        suppliers.append(s)
        print(f"  Proveedor '{s.nombre}' creado.")
    return suppliers


def ensure_categories(db: Session) -> dict[str, Category]:
    cache = {}
    for data in CATEGORIES_DATA:
        stmt = select(Category).where(Category.nombre == data["nombre"])
        existing = db.execute(stmt).scalar_one_or_none()
        if existing:
            cache[data["nombre"]] = existing
            continue
        cat = Category(**data)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        cache[cat.nombre] = cat
        print(f"  Categoría '{cat.nombre}' creada.")
    return cache


def ensure_products(db: Session, suppliers: list[Supplier], categories: dict[str, Category]) -> list[Product]:
    products = []
    for p_data in PRODUCTS_DATA:
        nombre = p_data[0]
        stmt = select(Product).where(Product.nombre == nombre)
        existing = db.execute(stmt).scalar_one_or_none()
        if existing:
            products.append(existing)
            continue
        cat = categories[p_data[5]]
        supplier = suppliers[p_data[6]]
        precio_caja = Decimal(str(p_data[2]))
        precio_unidad = Decimal(str(p_data[3]))
        precio_costo = (precio_caja / p_data[1]).quantize(Decimal("0.01"))
        product = Product(
            nombre=nombre,
            unidades_por_caja=p_data[1],
            stock_unidades=random.randint(50, 350),
            stock_minimo=10,
            precio_costo_caja_usd=precio_caja,
            precio_costo_usd=precio_costo,
            precio_unidad_usd=precio_unidad,
            precio_caja_usd=precio_caja,
            proveedor_id=supplier.id,
            tipo_iva=p_data[4],
        )
        product.categories.append(cat)
        db.add(product)
        db.commit()
        db.refresh(product)
        products.append(product)
        print(f"  Producto '{product.nombre}' creado.")
    return products


def ensure_user(db: Session) -> User:
    stmt = select(User).where(User.username == "operator")
    user = db.execute(stmt).scalar_one_or_none()
    if user:
        return user
    from app.services.auth_service import hash_password
    from app.models.role import Role
    stmt_role = select(Role).where(Role.nombre == "OPERADOR")
    role = db.execute(stmt_role).scalar_one()
    user = User(
        username="operator",
        email="operator@licoreria.com",
        hashed_password=hash_password("op123"),
        nombre_completo="Operador de Turno",
        rol_id=role.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def ensure_payment_methods(db: Session) -> dict[str, PaymentMethod]:
    cache = {}
    for nombre in ["EFECTIVO", "DIVISAS"]:
        stmt = select(PaymentMethod).where(PaymentMethod.nombre == nombre)
        pm = db.execute(stmt).scalar_one_or_none()
        if pm:
            cache[nombre] = pm
    return cache


def create_exchange_rates(db: Session, user_id: int, days: int = 60) -> list[ExchangeRate]:
    stmt = select(ExchangeRate).where(ExchangeRate.moneda == "USD")
    existing = db.execute(stmt).scalars().all()
    if len(existing) >= days:
        print(f"  Ya existen {len(existing)} tasas USD. Omitiendo creación.")
        return list(existing)

    rates = []
    base_rate = Decimal("38.50")
    now = datetime.now(timezone.utc)
    for i in range(days, 0, -1):
        fecha = now - timedelta(days=i)
        variation = Decimal(str(random.uniform(-1.5, 1.5))).quantize(Decimal("0.01"))
        tasa = (base_rate + variation).quantize(Decimal("0.01"))
        rate = ExchangeRate(
            moneda="USD",
            tasa_ves=tasa,
            fecha_registro=fecha,
            registrado_por=user_id,
        )
        db.add(rate)
        rates.append(rate)
    db.commit()
    print(f"  {len(rates)} tasas USD creadas.")
    return rates


# ── Facturas ─────────────────────────────────────────────────

def generate_invoices(
    db: Session,
    user_id: int,
    products: list[Product],
    rates: list[ExchangeRate],
    num_invoices: int = 20,
    days: int = 60,
):
    """Genera facturas de compra a proveedores."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    from app.models.supplier import Supplier
    from app.models.invoice import Factura, DetalleFactura
    stmt_sup = select(Supplier)
    suppliers = list(db.execute(stmt_sup).scalars().all())

    print(f"  Generando {num_invoices} facturas de compra...")
    for i in range(num_invoices):
        day_offset = random.randint(0, days - 1)
        fecha = start + timedelta(days=day_offset, hours=random.randint(8, 17))

        supplier = random.choice(suppliers)
        rate = random.choice(rates)
        num_items = random.randint(3, 8)
        chosen = random.sample(products, min(num_items, len(products)))

        total_usd = Decimal("0.00")
        items_data = []

        for product in chosen:
            cantidad = random.randint(5, 30)
            costo_caja = product.precio_costo_caja_usd
            costo_bs = (costo_caja * rate.tasa_ves).quantize(Decimal("0.01"))
            total_usd += Decimal(str(cantidad)) * costo_caja
            items_data.append({
                "producto_id": product.id,
                "cantidad_cajas": cantidad,
                "costo_caja_usd": costo_caja,
                "costo_caja_bs": costo_bs,
            })

        total_bs = (total_usd * rate.tasa_ves).quantize(Decimal("0.01"))

        factura = Factura(
            numero_factura=f"FC-{1000 + i:05d}",
            fecha_factura=fecha.date(),
            proveedor_id=supplier.id,
            usuario_id=user_id,
            moneda_principal="USD",
            tasa_bs=rate.tasa_ves,
            total_usd=total_usd.quantize(Decimal("0.01")),
            total_bs=total_bs,
        )
        db.add(factura)
        db.flush()

        for item in items_data:
            db.add(DetalleFactura(factura_id=factura.id, **item))

    db.commit()
    print(f"  {num_invoices} facturas creadas.")


# ── Ventas ───────────────────────────────────────────────────

def generate_sales(
    db: Session,
    user_id: int,
    products: list[Product],
    payment_methods: dict[str, PaymentMethod],
    rates: list[ExchangeRate],
    num_sales: int = 200,
    days: int = 60,
):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    product_prices = {}
    for p in products:
        stmt = select(Product).where(Product.id == p.id)
        prod = db.execute(stmt).scalar_one()
        product_prices[p.id] = {
            "unidad": prod.precio_unidad_usd,
            "caja": prod.precio_caja_usd,
            "unidades_por_caja": prod.unidades_por_caja,
            "tipo_iva": prod.tipo_iva,
        }

    print(f"  Generando {num_sales} ventas...")
    for _ in range(num_sales):
        day_offset = random.randint(0, days - 1)
        hour = random.choices(
            range(8, 22),
            weights=[1, 1, 2, 2, 3, 3, 4, 3, 3, 2, 2, 1, 1, 1],
        )[0]
        minute = random.randint(0, 59)
        fecha_venta = start + timedelta(days=day_offset, hours=hour - 8, minutes=minute)

        rate = random.choice(rates)
        tasa = rate.tasa_ves

        num_items = random.randint(1, 5)
        chosen_products = random.sample(products, min(num_items, len(products)))

        monto_exento = Decimal("0.00")
        base_imponible = Decimal("0.00")
        monto_iva = Decimal("0.00")

        sale_items = []
        for product in chosen_products:
            info = product_prices[product.id]
            cantidad = random.randint(1, 6)
            emp = random.choice(["UNIDAD", "CAJA"])

            if emp == "CAJA":
                precio = info["caja"]
                unidades_descontadas = cantidad * info["unidades_por_caja"]
            else:
                precio = info["unidad"]
                unidades_descontadas = cantidad

            subtotal = (Decimal(str(cantidad)) * precio).quantize(Decimal("0.01"))
            iva_pct = Decimal("16.00") if info["tipo_iva"] == "GRAVADO" else Decimal("0.00")
            iva_monto = (subtotal * iva_pct / Decimal("100")).quantize(Decimal("0.01"))

            if info["tipo_iva"] == "EXENTO":
                monto_exento += subtotal
            else:
                base_imponible += subtotal
                monto_iva += iva_monto

            sale_items.append({
                "producto_id": product.id,
                "tipo_empaque": emp,
                "cantidad": cantidad,
                "unidades_descontadas": unidades_descontadas,
                "precio_unitario_usd": precio,
                "iva_porcentaje": iva_pct,
            })

        sale = Sale(
            fecha_venta=fecha_venta,
            usuario_id=user_id,
            tasa_bcv_aplicada=tasa,
            historico_tasa_id=rate.id,
            monto_exento_usd=monto_exento,
            base_imponible_usd=base_imponible,
            monto_iva_usd=monto_iva,
        )
        db.add(sale)
        db.flush()

        for item_data in sale_items:
            db.add(SaleItem(venta_id=sale.id, **item_data))

        pm = random.choice(list(payment_methods.values()))
        total_usd = monto_exento + base_imponible + monto_iva
        db.add(SalePayment(
            venta_id=sale.id,
            metodo_pago_id=pm.id,
            monto_usd=total_usd,
            monto_ves=(total_usd * tasa).quantize(Decimal("0.01")),
        ))

    db.commit()
    print(f"  {num_sales} ventas creadas.")


def update_stock(db: Session, products: list[Product]):
    print("  Actualizando stock de productos...")
    for product in products:
        stmt = select(Product).where(Product.id == product.id)
        p = db.execute(stmt).scalar_one()
        stock = p.stock_unidades
        items_stmt = select(SaleItem).where(SaleItem.producto_id == p.id)
        items = db.execute(items_stmt).scalars().all()
        total_sold = sum(item.unidades_descontadas for item in items)
        new_stock = max(0, stock - total_sold + random.randint(50, 150))
        p.stock_unidades = new_stock
    db.commit()
    print("  Stock actualizado.")


# ── Main ─────────────────────────────────────────────────────

def main():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        print("Error: Base de datos no disponible.")
        return

    print("=== Seed de datos masivos ===\n")

    print("1. Verificando datos base...")
    suppliers = ensure_suppliers(db)
    categories = ensure_categories(db)
    products = ensure_products(db, suppliers, categories)
    user = ensure_user(db)
    payment_methods = ensure_payment_methods(db)

    print("\n2. Generando historial de tasas...")
    rates = create_exchange_rates(db, user.id)

    print("\n3. Generando facturas de compra...")
    generate_invoices(db, user.id, products, rates)

    print("\n4. Generando ventas...")
    generate_sales(db, user.id, products, payment_methods, rates)

    print("\n5. Actualizando stock...")
    update_stock(db, products)

    print("\n=== Seed completado ===")
    db.close()


if __name__ == "__main__":
    main()
