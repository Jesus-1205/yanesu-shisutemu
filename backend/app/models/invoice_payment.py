from datetime import datetime
from decimal import Decimal

from sqlalchemy import Integer, String, DECIMAL, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.timezone import VE_NOW


class InvoicePayment(Base):
    __tablename__ = "pagos_facturas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    factura_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facturas.id", ondelete="CASCADE"), nullable=False
    )
    metodo_pago_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("metodos_pago.id", ondelete="RESTRICT"), nullable=False
    )
    monto_usd: Mapped[Decimal] = mapped_column(
        DECIMAL(12, 2), nullable=False, default=Decimal("0.00")
    )
    monto_bs: Mapped[Decimal] = mapped_column(
        DECIMAL(14, 2), nullable=False, default=Decimal("0.00")
    )
    tasa_bs: Mapped[Decimal | None] = mapped_column(
        DECIMAL(10, 2), nullable=True, default=None
    )
    monto_mora: Mapped[Decimal] = mapped_column(
        DECIMAL(14, 2), nullable=False, default=Decimal("0.00")
    )
    referencia: Mapped[str | None] = mapped_column(String(100), nullable=True)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_pago: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=VE_NOW, nullable=False
    )
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    factura: Mapped["Factura"] = relationship("Factura", back_populates="payments")
    payment_method: Mapped["PaymentMethod"] = relationship("PaymentMethod")
    user: Mapped["User"] = relationship("User")
    comprobantes: Mapped[list["InvoicePaymentReceipt"]] = relationship(
        "InvoicePaymentReceipt", back_populates="pago", cascade="all, delete-orphan"
    )

    @property
    def metodo_pago_nombre(self) -> str:
        return self.payment_method.nombre if self.payment_method else ""

    @property
    def usuario_nombre(self) -> str:
        return self.user.username if self.user else ""


class InvoicePaymentReceipt(Base):
    __tablename__ = "comprobantes_pago_facturas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pago_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pagos_facturas.id", ondelete="CASCADE"), nullable=False
    )
    archivo_path: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_original: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_archivo: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=VE_NOW, nullable=False
    )

    pago: Mapped["InvoicePayment"] = relationship("InvoicePayment", back_populates="comprobantes")
