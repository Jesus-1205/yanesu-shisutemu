from sqlalchemy import String, Integer, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PaymentMethod(Base):
    __tablename__ = "metodos_pago"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    moneda_default: Mapped[str] = mapped_column(
        SAEnum("USD", "VES", name="moneda_pago"),
        nullable=False,
        default="VES",
    )
    acepta_referencia: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    sale_payments: Mapped[list["SalePayment"]] = relationship("SalePayment", back_populates="payment_method")