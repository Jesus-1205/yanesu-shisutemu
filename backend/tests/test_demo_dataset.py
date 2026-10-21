from decimal import Decimal
import pytest
from scripts.demo_dataset import DEMO_SUPPLIERS, DEMO_CATEGORIES, DEMO_PRODUCTS


def test_demo_suppliers():
    assert isinstance(DEMO_SUPPLIERS, list)
    assert len(DEMO_SUPPLIERS) >= 4

    supplier_names = set()
    for supplier in DEMO_SUPPLIERS:
        assert isinstance(supplier, dict)
        assert "nombre" in supplier and isinstance(supplier["nombre"], str) and supplier["nombre"].strip()
        assert "telefono" in supplier and isinstance(supplier["telefono"], str) and supplier["telefono"].strip()
        assert "email" in supplier and isinstance(supplier["email"], str) and "@" in supplier["email"]
        assert supplier["nombre"] not in supplier_names, f"Duplicate supplier: {supplier['nombre']}"
        supplier_names.add(supplier["nombre"])


def test_demo_categories():
    assert isinstance(DEMO_CATEGORIES, list)
    assert len(DEMO_CATEGORIES) >= 5

    category_names = set()
    for category in DEMO_CATEGORIES:
        assert isinstance(category, dict)
        assert "nombre" in category and isinstance(category["nombre"], str) and category["nombre"].strip()
        assert "descripcion" in category and isinstance(category["descripcion"], str)
        assert category["nombre"] not in category_names, f"Duplicate category: {category['nombre']}"
        category_names.add(category["nombre"])

    required_categories = {
        "Rones",
        "Cervezas",
        "Whiskies",
        "Vinos",
        "Refrescos y Mezcladores",
        "Snacks",
    }
    assert required_categories.issubset(category_names)


def test_demo_products_count_and_keys():
    assert isinstance(DEMO_PRODUCTS, list)
    assert 38 <= len(DEMO_PRODUCTS) <= 44

    expected_keys = {
        "nombre",
        "codigo_barra",
        "categoria",
        "unidades_por_caja",
        "stock_cajas",
        "stock_unidades",
        "stock_minimo",
        "precio_costo_caja_usd",
        "precio_costo_usd",
        "precio_unidad_usd",
        "precio_caja_usd",
        "tipo_iva",
        "es_favorito",
        "proveedor_nombre",
    }

    product_names = set()
    barcodes = set()

    for product in DEMO_PRODUCTS:
        assert isinstance(product, dict)
        assert expected_keys.issubset(product.keys())
        assert product["nombre"] not in product_names, f"Duplicate product: {product['nombre']}"
        product_names.add(product["nombre"])

        barcode = product["codigo_barra"]
        if barcode:
            assert isinstance(barcode, str)
            assert barcode not in barcodes, f"Duplicate barcode: {barcode}"
            barcodes.add(barcode)


def test_demo_products_pricing_and_decimals():
    for product in DEMO_PRODUCTS:
        for key in (
            "precio_costo_caja_usd",
            "precio_costo_usd",
            "precio_unidad_usd",
            "precio_caja_usd",
        ):
            val = product[key]
            assert isinstance(val, Decimal), f"Product {product['nombre']} field {key} is not Decimal: {type(val)}"

        # Verify no floats anywhere in the dict
        for k, v in product.items():
            assert not isinstance(v, float), f"Product {product['nombre']} contains float at {k}"

        # Unit price >= unit cost
        assert product["precio_unidad_usd"] >= product["precio_costo_usd"], (
            f"Product {product['nombre']}: selling unit price ({product['precio_unidad_usd']}) "
            f"< cost unit price ({product['precio_costo_usd']})"
        )

        # Box cost == unit cost * units per box
        expected_box_cost = product["precio_costo_usd"] * product["unidades_por_caja"]
        assert product["precio_costo_caja_usd"] == expected_box_cost, (
            f"Product {product['nombre']}: box cost {product['precio_costo_caja_usd']} "
            f"!= expected {expected_box_cost}"
        )

        # Box price >= box cost
        assert product["precio_caja_usd"] >= product["precio_costo_caja_usd"], (
            f"Product {product['nombre']}: box price {product['precio_caja_usd']} "
            f"< box cost {product['precio_costo_caja_usd']}"
        )


def test_demo_products_stock_and_constraints():
    zero_stock_count = 0
    favorites_count = 0

    for product in DEMO_PRODUCTS:
        assert isinstance(product["unidades_por_caja"], int) and product["unidades_por_caja"] >= 1
        assert isinstance(product["stock_cajas"], int) and product["stock_cajas"] >= 0
        assert isinstance(product["stock_unidades"], int) and product["stock_unidades"] >= 0
        assert isinstance(product["stock_minimo"], int) and product["stock_minimo"] >= 0
        assert product["tipo_iva"] in ("GRAVADO", "EXENTO")
        assert isinstance(product["es_favorito"], bool)

        if product["stock_cajas"] == 0 and product["stock_unidades"] == 0:
            zero_stock_count += 1

        if product["es_favorito"]:
            favorites_count += 1

    assert zero_stock_count >= 2, f"Expected at least 2 products with 0 stock, got {zero_stock_count}"
    assert 4 <= favorites_count <= 5, f"Expected 4-5 favorite products, got {favorites_count}"


def test_demo_products_relationships():
    supplier_names = {s["nombre"] for s in DEMO_SUPPLIERS}
    category_names = {c["nombre"] for c in DEMO_CATEGORIES}

    for product in DEMO_PRODUCTS:
        assert product["categoria"] in category_names, (
            f"Category {product['categoria']} not found in DEMO_CATEGORIES"
        )
        assert product["proveedor_nombre"] in supplier_names, (
            f"Supplier {product['proveedor_nombre']} not found in DEMO_SUPPLIERS"
        )
