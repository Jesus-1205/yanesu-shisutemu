from datetime import datetime, date
from decimal import Decimal
import enum

from sqlalchemy import String, Integer, DECIMAL, Date, DateTime, Text, ForeignKey, UniqueConstraint, CheckConstraint, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.timezone import VE_NOW, ve_today


class MonedaEnum(str, enum.Enum):
    USD = "USD"
    BS = "BS"


class TipoDocumentoEnum(str, enum.Enum):
    FACTURA = "FACTURA"
    NOTA_ENTREGA = "NOTA_ENTREGA"


class Factura(Base):
    __tablename__ = "facturas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    proveedor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("proveedores.id", ondelete="RESTRICT"), nullable=False
    )
    numero_factura: Mapped[str] = mapped_column(String(50), nullable=False)
    tipo_documento: Mapped[TipoDocumentoEnum] = mapped_column(
        String(15), nullable=False, default=TipoDocumentoEnum.FACTURA
    )
    fecha_factura: Mapped[date] = mapped_column(Date, nullable=False, default=ve_today)
    fecha_limite_pago: Mapped[date | None] = mapped_column(Date, nullable=True)
    image_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    moneda_principal: Mapped[MonedaEnum] = mapped_column(
        String(3), nullable=False, default=MonedaEnum.USD
    )
    tasa_bs: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False, default=Decimal("0"))
    total_usd: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0"))
    total_bs: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, default=Decimal("0"))

    aplica_iva: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    estado_pago: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDIENTE")

    # Campos de auditoría IA
    procesada_por_ia: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    raw_json_ia: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=VE_NOW, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("proveedor_id", "numero_factura", name="uq_factura_por_proveedor"),
    )

    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="facturas")
    user: Mapped["User"] = relationship("User", back_populates="facturas")
    detalles: Mapped[list["DetalleFactura"]] = relationship(
        "DetalleFactura", back_populates="factura", cascade="all, delete-orphan"
    )
    payments: Mapped[list["InvoicePayment"]] = relationship(
        "InvoicePayment", back_populates="factura", cascade="all, delete-orphan"
    )
    obsequios: Mapped[list["ObsequioFactura"]] = relationship(
        "ObsequioFactura", back_populates="factura", cascade="all, delete-orphan"
    )


class TipoEmpaqueFactura(str, enum.Enum):
    UNIDAD = "UNIDAD"
    CAJA = "CAJA"


class DetalleFactura(Base):
    __tablename__ = "detalles_facturas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    factura_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facturas.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False
    )
    tipo_empaque: Mapped[str] = mapped_column(String(10), nullable=False, default="CAJA")
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    costo_unitario_usd: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    costo_unitario_bs: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    tipo_iva: Mapped[str] = mapped_column(String(10), nullable=False, default="GRAVADO")

    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_detalle_factura_cantidad_positivo"),
        CheckConstraint("costo_unitario_usd > 0", name="ck_detalle_factura_costo_usd_positivo"),
        CheckConstraint("costo_unitario_bs > 0", name="ck_detalle_factura_costo_bs_positivo"),
        CheckConstraint(
            "tipo_empaque IN ('UNIDAD', 'CAJA')",
            name="ck_detalle_factura_tipo_empaque_valido",
        ),
        CheckConstraint(
            "tipo_iva IN ('GRAVADO', 'EXENTO')",
            name="ck_detalle_factura_tipo_iva_valido",
        ),
    )

    factura: Mapped["Factura"] = relationship("Factura", back_populates="detalles")
    product: Mapped["Product"] = relationship("Product", back_populates="factura_detalles")


class ObsequioFactura(Base):
    __tablename__ = "obsequios_factura"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    factura_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facturas.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False
    )
    tipo_empaque: Mapped[str] = mapped_column(String(10), nullable=False, default="CAJA")
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    justificacion: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_obsequio_cantidad_positivo"),
        CheckConstraint(
            "tipo_empaque IN ('UNIDAD', 'CAJA')",
            name="ck_obsequio_tipo_empaque_valido",
        ),
    )

    factura: Mapped["Factura"] = relationship("Factura", back_populates="obsequios")
    product: Mapped["Product"] = relationship("Product")
