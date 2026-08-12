from datetime import datetime
from decimal import Decimal

from sqlalchemy import Integer, DECIMAL, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.timezone import VE_NOW


class ExchangeRate(Base):
    __tablename__ = "historico_tasas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tasa_usd: Mapped[Decimal] = mapped_column(DECIMAL(10, 4), nullable=False)
    tasa_eur: Mapped[Decimal] = mapped_column(DECIMAL(10, 4), nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=VE_NOW)
    registrado_por: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    registered_by: Mapped["User | None"] = relationship("User", back_populates="exchange_rates")
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="exchange_rate")

    @property
    def registrado_por_nombre(self) -> str | None:
        return self.registered_by.nombre_completo if self.registered_by else None
