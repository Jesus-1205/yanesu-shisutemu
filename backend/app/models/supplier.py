from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Supplier(Base):
    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)

    products: Mapped[list["Product"]] = relationship("Product", back_populates="supplier")
    facturas: Mapped[list["Factura"]] = relationship("Factura", back_populates="supplier")
