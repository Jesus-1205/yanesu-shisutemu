from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    DECIMAL,
    Enum as SAEnum,
    event,
    ForeignKey,
    func,
    Index,
    Integer,
    select,
    Text,
)
from sqlalchemy.orm import Mapped, column_property, mapped_column, relationship

from app.core.database import Base
from app.core.timezone import VE_NOW


class Sale(Base):
    __tablename__ = "ventas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fecha_venta: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=VE_NOW)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    tasa_bcv_aplicada: Mapped[Decimal] = mapped_column(DECIMAL(10, 4), nullable=False)
    historico_tasa_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("historico_tasas.id", ondelete="SET NULL"), nullable=True
    )
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    monto_exento_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0.00"))
    base_imponible_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0.00"))
    monto_iva_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0.00"))
    total_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0.00"))

    monto_exento_ves: Mapped[Decimal] = mapped_column(DECIMAL(14, 2), nullable=False, default=Decimal("0.00"))
    base_imponible_ves: Mapped[Decimal] = mapped_column(DECIMAL(14, 2), nullable=False, default=Decimal("0.00"))
    monto_iva_ves: Mapped[Decimal] = mapped_column(DECIMAL(14, 2), nullable=False, default=Decimal("0.00"))
    total_ves: Mapped[Decimal] = mapped_column(DECIMAL(14, 2), nullable=False, default=Decimal("0.00"))

    __table_args__ = (
        Index("idx_fecha_venta", "fecha_venta"),
    )

    @property
    def metodo_pago(self) -> str:
        if not self.payments:
            return "-"
        names = [p.payment_method.nombre for p in self.payments if p.payment_method]
        return ", ".join(names) if names else "-"

    @property
    def usuario_nombre(self) -> str:
        return self.user.nombre_completo if self.user else ""

    user: Mapped["User"] = relationship("User", back_populates="sales")
    exchange_rate: Mapped["ExchangeRate | None"] = relationship("ExchangeRate", back_populates="sales")
    items: Mapped[list["SaleItem"]] = relationship(
        "SaleItem", back_populates="sale", cascade="all, delete-orphan"
    )
    payments: Mapped[list["SalePayment"]] = relationship(
        "SalePayment", back_populates="sale", cascade="all, delete-orphan"
    )


class SaleItem(Base):
    __tablename__ = "detalle_ventas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    venta_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ventas.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False)
    tipo_empaque: Mapped[str] = mapped_column(SAEnum("UNIDAD", "CAJA", name="tipo_empaque"), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    unidades_descontadas: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    subtotal_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0.00"))
    iva_porcentaje: Mapped[Decimal] = mapped_column(DECIMAL(5, 2), nullable=False, default=Decimal("16.00"))
    usa_precio_divisas: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    combo_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("combos.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_detalle_cantidad_positivo"),
        CheckConstraint("unidades_descontadas > 0", name="ck_detalle_unidades_positivo"),
    )

    @property
    def producto_nombre(self) -> str:
        return self.product.nombre if self.product else ""

    @property
    def combo_nombre(self) -> str | None:
        return self.combo.nombre if self.combo else None

    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="sale_items")
    combo: Mapped["Combo | None"] = relationship("Combo")


Sale.items_count = column_property(
    select(func.count(SaleItem.id))
    .where(SaleItem.venta_id == Sale.id)
    .correlate_except(SaleItem)
    .scalar_subquery()
)


@event.listens_for(SaleItem, "before_insert")
def _calculate_sale_item_subtotal(mapper, connection, target):
    if not target.subtotal_usd or target.subtotal_usd == Decimal("0.00"):
        if target.cantidad and target.precio_unitario_usd:
            target.subtotal_usd = (Decimal(str(target.cantidad)) * Decimal(str(target.precio_unitario_usd))).quantize(Decimal("0.01"))


@event.listens_for(Sale, "before_insert")
def _calculate_sale_totals(mapper, connection, target):
    exento = Decimal(str(target.monto_exento_usd)) if target.monto_exento_usd is not None else Decimal("0.00")
    base = Decimal(str(target.base_imponible_usd)) if target.base_imponible_usd is not None else Decimal("0.00")
    iva = Decimal(str(target.monto_iva_usd)) if target.monto_iva_usd is not None else Decimal("0.00")
    tasa = Decimal(str(target.tasa_bcv_aplicada)) if target.tasa_bcv_aplicada is not None else Decimal("1.0000")

    if not target.total_usd or target.total_usd == Decimal("0.00"):
        target.total_usd = (exento + base + iva).quantize(Decimal("0.01"))
    if not target.monto_exento_ves or target.monto_exento_ves == Decimal("0.00"):
        target.monto_exento_ves = (exento * tasa).quantize(Decimal("0.01"))
    if not target.base_imponible_ves or target.base_imponible_ves == Decimal("0.00"):
        target.base_imponible_ves = (base * tasa).quantize(Decimal("0.01"))
    if not target.monto_iva_ves or target.monto_iva_ves == Decimal("0.00"):
        target.monto_iva_ves = (iva * tasa).quantize(Decimal("0.01"))
    if not target.total_ves or target.total_ves == Decimal("0.00"):
        target.total_ves = (target.total_usd * tasa).quantize(Decimal("0.01"))

