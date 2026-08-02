"""Tests para fuzzy matching con rapidfuzz (reemplaza pg_trgm)."""
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.category import Category
from app.models.product import Product
from app.models.role import Role
from app.models.supplier import Supplier
from app.services.invoice_service import (
    _similarity_threshold,
    _strip_unidades,
    fuzzy_match_productos_batch,
    fuzzy_match_proveedor,
)


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    session.add_all([
        Role(nombre="ADMINISTRADOR"),
        Role(nombre="OPERADOR"),
        Category(nombre="LICORES"),
        Supplier(nombre="DISTRIBUIDORA CAMACHO MIRANDA, C.A."),
        Supplier(nombre="IMPORTACIONES DEL CARIBE S.R.L."),
        Supplier(nombre="BEBIDAS PREMIUM C.A."),
        Product(
            nombre="CERVEZA POLAR PILSEN 355ML",
            unidades_por_caja=24,
            stock_unidades=100,
            stock_minimo=10,
            precio_costo_caja_usd=Decimal("24"),
            precio_costo_usd=Decimal("1"),
            precio_unidad_usd=Decimal("1.25"),
            precio_caja_usd=Decimal("30"),
            tipo_iva="EXENTO",
        ),
        Product(
            nombre="RON DIPLOMATICO ANEJO 750ML",
            unidades_por_caja=6,
            stock_unidades=50,
            stock_minimo=5,
            precio_costo_caja_usd=Decimal("72"),
            precio_costo_usd=Decimal("12"),
            precio_unidad_usd=Decimal("14"),
            precio_caja_usd=Decimal("84"),
            tipo_iva="GRAVADO",
        ),
    ])
    session.commit()
    yield session
    session.close()


class TestSimilarityThreshold:

    def test_threshold_is_50(self):
        assert _similarity_threshold() == 50.0


class TestStripUnidades:

    def test_removes_24unid(self):
        assert _strip_unidades("MEDIA ANIS CARTUJO 350ML 24UNID.") == "MEDIA ANIS CARTUJO 350ML"

    def test_removes_12_unid(self):
        assert _strip_unidades("L/R CARTA ROJA 1L 12 UNID.") == "L/R CARTA ROJA 1L"

    def test_removes_12und(self):
        assert _strip_unidades("CANELITA 1L 12UND") == "CANELITA 1L"

    def test_no_change_when_no_units(self):
        assert _strip_unidades("CERVEZA POLAR 355ML") == "CERVEZA POLAR 355ML"

    def test_empty_string(self):
        assert _strip_unidades("") == ""


class TestFuzzyMatchProveedor:

    def test_exact_match(self, db):
        result = fuzzy_match_proveedor(db, "DISTRIBUIDORA CAMACHO MIRANDA, C.A.")
        assert result.match_status == "EXACT"
        assert result.confidence == 1.0
        assert result.nombre == "DISTRIBUIDORA CAMACHO MIRANDA, C.A."

    def test_exact_match_case_insensitive(self, db):
        result = fuzzy_match_proveedor(db, "distribuidora camacho miranda, c.a.")
        assert result.match_status == "EXACT"
        assert result.confidence == 1.0

    def test_partial_match_reordered_words(self, db):
        # "CAMACHO DISTRIBUIDORA" vs "DISTRIBUIDORA CAMACHO MIRANDA, C.A."
        result = fuzzy_match_proveedor(db, "CAMACHO DISTRIBUIDORA")
        assert result.match_status == "PARTIAL"
        assert result.confidence >= 0.3
        assert result.id > 0

    def test_partial_match_similar_name(self, db):
        result = fuzzy_match_proveedor(db, "IMPORTACIONES CARIBE")
        assert result.match_status == "PARTIAL"
        assert result.confidence >= 0.3

    def test_not_found(self, db):
        result = fuzzy_match_proveedor(db, "ZZZZZ WWWWWW QQQQQ")
        assert result.match_status == "NOT_FOUND"

    def test_empty_db(self, db):
        db.query(Supplier).delete()
        db.commit()
        result = fuzzy_match_proveedor(db, "PROVEEDOR TEST")
        assert result.match_status == "NOT_FOUND"


class TestFuzzyMatchProductosBatch:

    def test_exact_match(self, db):
        items = [
            {"nombre": "CERVEZA POLAR PILSEN 355ML", "cantidad": 1, "precio_unitario": 1.25}
        ]
        result = fuzzy_match_productos_batch(db, items)
        assert len(result) == 1
        assert result[0].match_status == "EXACT"
        assert result[0].producto_id is not None

    def test_partial_match_reordered_words(self, db):
        # "POLAR CERVEZA" vs "CERVEZA POLAR PILSEN 355ML"
        items = [
            {"nombre": "POLAR CERVEZA 355ML", "cantidad": 2, "precio_unitario": 1.25}
        ]
        result = fuzzy_match_productos_batch(db, items)
        assert len(result) == 1
        assert result[0].match_status in ("PARTIAL", "EXACT")

    def test_partial_match_ocr_error(self, db):
        # Error OCR: "POLR PLSN" en lugar de "POLAR PILSEN"
        items = [
            {"nombre": "POLR PLSN 355ML", "cantidad": 1, "precio_unitario": 1.25}
        ]
        result = fuzzy_match_productos_batch(db, items)
        assert len(result) == 1
        # Debe encontrar al menos un match con confianza razonable
        assert result[0].confidence > 0.0

    def test_not_found(self, db):
        items = [
            {"nombre": "ZZZZZ WWWWWW QQQQQ 999", "cantidad": 1, "precio_unitario": 5}
        ]
        result = fuzzy_match_productos_batch(db, items)
        assert len(result) == 1
        assert result[0].match_status == "NOT_FOUND"

    def test_empty_input(self, db):
        result = fuzzy_match_productos_batch(db, [])
        assert result == []

    def test_multiple_items(self, db):
        items = [
            {"nombre": "CERVEZA POLAR PILSEN 355ML", "cantidad": 1, "precio_unitario": 1.25},
            {"nombre": "RON DIPLOMATICO 750ML", "cantidad": 2, "precio_unitario": 14},
        ]
        result = fuzzy_match_productos_batch(db, items)
        assert len(result) == 2

    def test_strip_unidades_integration(self, db):
        items = [
            {"nombre": "CERVEZA POLAR 355ML 24UNID.", "cantidad": 1, "precio_unitario": 1.25}
        ]
        result = fuzzy_match_productos_batch(db, items)
        assert len(result) == 1
        # Debe encontrar match a pesar de las unidades
        assert result[0].confidence > 0.0

    def test_suggestions_populated_on_partial(self, db):
        items = [
            {"nombre": "POLAR CERVEZA 355ML", "cantidad": 1, "precio_unitario": 1.25}
        ]
        result = fuzzy_match_productos_batch(db, items)
        assert len(result) == 1
        if result[0].match_status == "PARTIAL":
            assert len(result[0].suggestions) > 0
            assert result[0].suggestions[0].nombre == "CERVEZA POLAR PILSEN 355ML"

    def test_empty_catalog(self, db):
        db.query(Product).delete()
        db.commit()
        items = [
            {"nombre": "CERVEZA POLAR", "cantidad": 1, "precio_unitario": 1.25}
        ]
        result = fuzzy_match_productos_batch(db, items)
        assert len(result) == 1
        assert result[0].match_status == "NOT_FOUND"
