from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DECIMAL, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Combo(Base):
    __tablename__ = "combos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    precio_total_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    groups: Mapped[list["ComboGroup"]] = relationship(
        "ComboGroup", back_populates="combo", cascade="all, delete-orphan"
    )
    payment_methods: Mapped[list["ComboPaymentMethod"]] = relationship(
        "ComboPaymentMethod", back_populates="combo", cascade="all, delete-orphan"
    )

    @property
    def metodo_pago_ids(self) -> list[int]:
        return [pm.metodo_pago_id for pm in self.payment_methods]


class ComboGroup(Base):
    __tablename__ = "combo_groups"
    __table_args__ = (
        CheckConstraint("min_cantidad >= 0", name="ck_grupo_min_no_negativo"),
        CheckConstraint("max_cantidad > 0", name="ck_grupo_max_positivo"),
        CheckConstraint("min_cantidad <= max_cantidad", name="ck_grupo_min_max"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    combo_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("combos.id", ondelete="CASCADE"), nullable=False
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    min_cantidad: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_cantidad: Mapped[int] = mapped_column(Integer, nullable=False)

    combo: Mapped["Combo"] = relationship("Combo", back_populates="groups")
    products: Mapped[list["ComboGroupProduct"]] = relationship(
        "ComboGroupProduct", back_populates="group", cascade="all, delete-orphan"
    )


class ComboGroupProduct(Base):
    __tablename__ = "combo_group_products"
    __table_args__ = (
        UniqueConstraint("grupo_id", "producto_id", name="uq_grupo_producto"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    grupo_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("combo_groups.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False
    )

    group: Mapped["ComboGroup"] = relationship("ComboGroup", back_populates="products")
    product: Mapped["Product"] = relationship("Product", lazy="joined")

    @property
    def producto_nombre(self) -> str:
        return self.product.nombre if self.product else ""


class ComboPaymentMethod(Base):
    __tablename__ = "combo_payment_methods"
    __table_args__ = (
        UniqueConstraint("combo_id", "metodo_pago_id", name="uq_combo_metodo_pago"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    combo_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("combos.id", ondelete="CASCADE"), nullable=False
    )
    metodo_pago_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("metodos_pago.id", ondelete="RESTRICT"), nullable=False
    )

    combo: Mapped["Combo"] = relationship("Combo", back_populates="payment_methods")
    payment_method: Mapped["PaymentMethod"] = relationship("PaymentMethod", lazy="joined")
