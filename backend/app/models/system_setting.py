from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.timezone import VE_NOW


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    clave: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    valor_cifrado: Mapped[str] = mapped_column(Text, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    actualizado_por: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at = mapped_column(DateTime(timezone=True), server_default=VE_NOW, onupdate=VE_NOW)

    user: Mapped["User | None"] = relationship("User")
