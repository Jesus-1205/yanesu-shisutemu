from decimal import Decimal

from sqlalchemy import Integer, String, DECIMAL, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SalePayment(Base):
    __tablename__ = "detalle_pagos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    venta_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ventas.id", ondelete="CASCADE"), nullable=False
    )
    metodo_pago_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("metodos_pago.id", ondelete="RESTRICT"), nullable=False
    )
    referencia: Mapped[str | None] = mapped_column(String(50), nullable=True)
    monto_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=0.00)
    monto_ves: Mapped[Decimal] = mapped_column(DECIMAL(14, 2), nullable=False, default=0.00)

    @property
    def metodo_pago_nombre(self) -> str:
        return self.payment_method.nombre if self.payment_method else ""

    sale: Mapped["Sale"] = relationship("Sale", back_populates="payments")
    payment_method: Mapped["PaymentMethod"] = relationship("PaymentMethod", back_populates="sale_payments")