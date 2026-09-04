from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.timezone import VE_NOW


class RetornableProducto(Base):
    """Asocia un producto a una presentacion retornable (222 o 333)."""

    __tablename__ = "retornable_productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    producto_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("productos.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )
    presentacion: Mapped[str] = mapped_column(String(3), nullable=False)

    product: Mapped["Product"] = relationship("Product")

    __table_args__ = (
        CheckConstraint("presentacion IN ('222', '333')", name="ck_retornable_productos_presentacion"),
    )


class RetornableReporte(Base):
    """Encabezado de un reporte de conteo fisico."""

    __tablename__ = "retornable_reportes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fecha = mapped_column(
        "fecha",
        DateTime(timezone=True),
        nullable=False,
        server_default=VE_NOW,
    )
    realizado_por: Mapped[str] = mapped_column(String(150), nullable=False)
    usuario_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    es_actual: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    details: Mapped[list["RetornableReporteDetalle"]] = relationship(
        "RetornableReporteDetalle", back_populates="reporte", cascade="all, delete-orphan"
    )


class RetornableReporteDetalle(Base):
    """Linea de un reporte de conteo fisico."""

    __tablename__ = "retornable_reporte_detalles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reporte_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("retornable_reportes.id", ondelete="CASCADE"),
        nullable=False,
    )
    presentacion: Mapped[str] = mapped_column(String(3), nullable=False)
    estado: Mapped[str] = mapped_column(String(12), nullable=False)
    cantidad_botellas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cantidad_cajas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    reporte: Mapped["RetornableReporte"] = relationship("RetornableReporte", back_populates="details")

    __table_args__ = (
        UniqueConstraint("reporte_id", "presentacion", "estado", name="uq_reporte_det"),
        CheckConstraint("presentacion IN ('222', '333')", name="ck_det_presentacion"),
        CheckConstraint(
            "estado IN ('CASILLERO', 'VACIO', 'LLENO')",
            name="ck_det_estado",
        ),
    )


class RetornableInventario(Base):
    """Estado actual del inventario retornable (sistema)."""

    __tablename__ = "retornable_inventario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    presentacion: Mapped[str] = mapped_column(String(3), nullable=False)
    estado: Mapped[str] = mapped_column(String(12), nullable=False)
    cantidad_botellas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cantidad_cajas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("presentacion", "estado", name="uq_inventario_pres_est"),
        CheckConstraint("presentacion IN ('222', '333')", name="ck_inv_presentacion"),
        CheckConstraint(
            "estado IN ('CASILLERO', 'VACIO', 'LLENO')",
            name="ck_inv_estado",
        ),
    )


class RetornableMovimiento(Base):
    """Historico de movimientos del inventario retornable."""

    __tablename__ = "retornable_movimientos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fecha = mapped_column(
        "fecha",
        DateTime(timezone=True),
        nullable=False,
        server_default=VE_NOW,
    )
    presentacion: Mapped[str] = mapped_column(String(3), nullable=False)
    estado: Mapped[str] = mapped_column(String(12), nullable=False)
    delta_botellas: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo_movimiento: Mapped[str] = mapped_column(String(20), nullable=False)
    referencia_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    referencia_tipo: Mapped[str | None] = mapped_column(String(10), nullable=True)
    usuario_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("presentacion IN ('222', '333')", name="ck_mov_presentacion"),
        CheckConstraint(
            "estado IN ('CASILLERO', 'VACIO', 'LLENO')",
            name="ck_mov_estado",
        ),
        CheckConstraint(
            "tipo_movimiento IN ('VENTA', 'COMPRA', 'REPORTE', 'AJUSTE_MANUAL')",
            name="ck_mov_tipo",
        ),
        CheckConstraint(
            "referencia_tipo IS NULL OR referencia_tipo IN ('VENTA', 'FACTURA', 'REPORTE')",
            name="ck_mov_ref_tipo",
        ),
    )
