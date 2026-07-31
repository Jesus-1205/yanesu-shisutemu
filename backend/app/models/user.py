from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.timezone import VE_NOW


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_completo: Mapped[str] = mapped_column(String(100), nullable=False)
    rol_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at = mapped_column(DateTime(timezone=True), server_default=VE_NOW)
    updated_at = mapped_column(DateTime(timezone=True), server_default=VE_NOW, onupdate=VE_NOW)

    role: Mapped["Role"] = relationship("Role", back_populates="users")
    sales: Mapped[list["Sale"]] = relationship("Sale", back_populates="user")
    exchange_rates: Mapped[list["ExchangeRate"]] = relationship("ExchangeRate", back_populates="registered_by")
    facturas: Mapped[list["Factura"]] = relationship("Factura", back_populates="user")

    @property
    def rol_nombre(self) -> str:
        return self.role.nombre
