import logging
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.user import User
from app.models.payment_method import PaymentMethod

logger = logging.getLogger(__name__)


def heal_sales_totals(db: Session) -> None:
    """Repara ventas históricas que tengan total_usd o subtotal_usd en 0 por falta de persistencia."""
    try:
        # 1. Reparar subtotales en detalle_ventas
        db.execute(text("""
            UPDATE detalle_ventas
            SET subtotal_usd = ROUND(cantidad * precio_unitario_usd, 2)
            WHERE (subtotal_usd = 0 OR subtotal_usd IS NULL)
              AND cantidad > 0
              AND precio_unitario_usd > 0
        """))

        # 2. Reparar ventas con total_usd en 0
        db.execute(text("""
            UPDATE ventas
            SET 
                total_usd = ROUND(monto_exento_usd + base_imponible_usd + monto_iva_usd, 2),
                monto_exento_ves = ROUND(monto_exento_usd * tasa_bcv_aplicada, 2),
                base_imponible_ves = ROUND(base_imponible_usd * tasa_bcv_aplicada, 2),
                monto_iva_ves = ROUND(monto_iva_usd * tasa_bcv_aplicada, 2),
                total_ves = ROUND((monto_exento_usd + base_imponible_usd + monto_iva_usd) * tasa_bcv_aplicada, 2)
            WHERE (total_usd = 0 OR total_usd IS NULL)
              AND (monto_exento_usd > 0 OR base_imponible_usd > 0 OR monto_iva_usd > 0)
        """))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"No se pudo ejecutar heal_sales_totals (ignorado): {e}")


def initialize_database(db: Session) -> bool:
    """Semillas por defecto. Retorna True si la BD requiere configuración de Admin."""
    if db.execute(select(func.count()).select_from(Role)).scalar() == 0:
        db.add_all([
            Role(nombre="ADMINISTRADOR"),
            Role(nombre="OPERADOR"),
        ])
        db.commit()

    if db.execute(select(func.count()).select_from(PaymentMethod)).scalar() == 0:
        db.add_all([
            PaymentMethod(nombre="Pago Móvil", moneda_default="VES", acepta_referencia=True),
            PaymentMethod(nombre="Efectivo", moneda_default="VES", acepta_referencia=False),
            PaymentMethod(nombre="Punto de Venta", moneda_default="VES", acepta_referencia=False),
            PaymentMethod(nombre="Divisas", moneda_default="USD", acepta_referencia=False),
        ])
        db.commit()

    heal_sales_totals(db)

    return db.execute(select(func.count()).select_from(User)).scalar() == 0
