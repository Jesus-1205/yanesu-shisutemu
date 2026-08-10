from decimal import Decimal

from sqlalchemy import Boolean, DECIMAL, Enum as SAEnum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PriceRule(Base):
    __tablename__ = "price_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    products: Mapped[list["PriceRuleProduct"]] = relationship(
        "PriceRuleProduct", back_populates="rule", cascade="all, delete-orphan"
    )
    payment_methods: Mapped[list["PriceRulePaymentMethod"]] = relationship(
        "PriceRulePaymentMethod", back_populates="rule", cascade="all, delete-orphan"
    )


class PriceRuleProduct(Base):
    __tablename__ = "price_rule_products"
    __table_args__ = (
        UniqueConstraint("regla_id", "producto_id", "tipo_empaque", name="uq_regla_producto_empaque"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    regla_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("price_rules.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False
    )
    tipo_empaque: Mapped[str] = mapped_column(
        SAEnum("UNIDAD", "CAJA", name="tipo_empaque_regla"), nullable=False
    )
    precio_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)

    rule: Mapped["PriceRule"] = relationship("PriceRule", back_populates="products")
    product: Mapped["Product"] = relationship("Product", lazy="joined")


class PriceRulePaymentMethod(Base):
    __tablename__ = "price_rule_payment_methods"
    __table_args__ = (
        UniqueConstraint("regla_id", "metodo_pago_id", name="uq_regla_metodo_pago"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    regla_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("price_rules.id", ondelete="CASCADE"), nullable=False
    )
    metodo_pago_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("metodos_pago.id", ondelete="RESTRICT"), nullable=False
    )

    rule: Mapped["PriceRule"] = relationship("PriceRule", back_populates="payment_methods")
    payment_method: Mapped["PaymentMethod"] = relationship("PaymentMethod", lazy="joined")
