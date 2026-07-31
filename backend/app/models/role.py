from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

    users: Mapped[list["User"]] = relationship("User", back_populates="role")
