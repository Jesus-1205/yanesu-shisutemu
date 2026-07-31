from sqlalchemy import String, Integer, Table, Column, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


producto_categoria = Table(
    "producto_categoria",
    Base.metadata,
    Column("producto_id", Integer, ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True),
    Column("categoria_id", Integer, ForeignKey("categorias.id", ondelete="CASCADE"), primary_key=True),
)


class Category(Base):
    __tablename__ = "categorias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(200), nullable=True)

    products: Mapped[list["Product"]] = relationship(
        "Product", secondary=producto_categoria, back_populates="categories"
    )
