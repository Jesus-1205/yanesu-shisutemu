from decimal import Decimal

from sqlalchemy import String, Integer, DECIMAL, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.category import producto_categoria


class Product(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_barra: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    unidades_por_caja: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    stock_unidades: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stock_minimo: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    precio_costo_caja_usd: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    precio_costo_usd: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    precio_unidad_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    precio_caja_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    proveedor_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("proveedores.id", ondelete="RESTRICT"), nullable=True)
    tipo_iva: Mapped[str] = mapped_column(SAEnum("GRAVADO", "EXENTO", name="tipo_iva"), nullable=False, default="GRAVADO")

    supplier: Mapped["Supplier | None"] = relationship("Supplier", back_populates="products")
    sale_items: Mapped[list["SaleItem"]] = relationship("SaleItem", back_populates="product")
    factura_detalles: Mapped[list["DetalleFactura"]] = relationship("DetalleFactura", back_populates="product")
    categories: Mapped[list["Category"]] = relationship(
        "Category", secondary=producto_categoria, back_populates="products"
    )
