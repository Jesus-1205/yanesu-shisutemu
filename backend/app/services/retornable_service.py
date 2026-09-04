from __future__ import annotations

import math
from datetime import datetime
from typing import Literal

from sqlalchemy import func, select, desc
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.core.timezone import VE_TZ
from app.models.product import Product
from app.models.retornable import (
    RetornableInventario,
    RetornableMovimiento,
    RetornableProducto,
    RetornableReporte,
    RetornableReporteDetalle,
)
from app.models.user import User
from app.schemas.retornable import (
    DetalleLinea,
    DetalleLineaConDiscrepancia,
    RetornableEstadoOut,
    RetornableMovimientoOut,
    RetornableMovimientoPaginationOut,
    RetornablePresentacionOut,
    RetornableProductoOut,
    RetornableReporteCompletoOut,
    RetornableReporteCreate,
    RetornableReporteDetalleOut,
    RetornableReporteOut,
    RetornableReportePaginationOut,
    RetornableResumenOut,
)

BOTTLES_PER_CASE = 36

ESTADOS = ("CASILLERO", "VACIO", "LLENO")
PRESENTACIONES = ("222", "333")


def _botellas_a_cajas_enteras(botellas: int) -> int:
    return math.floor(botellas / BOTTLES_PER_CASE)


def _botellas_sobran(botellas: int) -> int:
    return botellas % BOTTLES_PER_CASE


# ---------------------------------------------------------------------------
# Inventario base
# ---------------------------------------------------------------------------


def inicializar_inventario(db: Session) -> None:
    """Crea las 6 filas iniciales del inventario si no existen."""
    for pres in PRESENTACIONES:
        for estado in ESTADOS:
            stmt = select(RetornableInventario).where(
                RetornableInventario.presentacion == pres,
                RetornableInventario.estado == estado,
            )
            existente = db.execute(stmt).scalars().first()
            if not existente:
                db.add(
                    RetornableInventario(
                        presentacion=pres,
                        estado=estado,
                        cantidad_botellas=0,
                        cantidad_cajas=0,
                    )
                )
    db.commit()


def _obtener_o_crear_inventario(
    db: Session, presentacion: str, estado: str
) -> RetornableInventario:
    stmt = select(RetornableInventario).where(
        RetornableInventario.presentacion == presentacion,
        RetornableInventario.estado == estado,
    )
    inv = db.execute(stmt).scalars().first()
    if not inv:
        inv = RetornableInventario(
            presentacion=presentacion,
            estado=estado,
            cantidad_botellas=0,
            cantidad_cajas=0,
        )
        db.add(inv)
        db.flush()
    return inv


# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------


def _obtener_ultimo_reporte(
    db: Session,
) -> RetornableReporte | None:
    stmt = (
        select(RetornableReporte)
        .where(RetornableReporte.es_actual == True)  # noqa: E712
        .order_by(desc(RetornableReporte.fecha))
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


def _obtener_detalle_reporte(db: Session, reporte_id: int) -> list[RetornableReporteDetalle]:
    stmt = (
        select(RetornableReporteDetalle)
        .where(RetornableReporteDetalle.reporte_id == reporte_id)
        .order_by(RetornableReporteDetalle.presentacion, RetornableReporteDetalle.estado)
    )
    return list(db.execute(stmt).scalars().all())


def _calcular_movimientos_desde(
    db: Session, fecha_desde: datetime | None
) -> dict[tuple[str, str], int]:
    """Suma delta_botellas de todos los movimientos desde una fecha."""
    stmt = select(RetornableMovimiento)
    if fecha_desde:
        stmt = stmt.where(RetornableMovimiento.fecha > fecha_desde)
    movimientos = db.execute(stmt).scalars().all()

    acumulado: dict[tuple[str, str], int] = {}
    for mov in movimientos:
        clave = (mov.presentacion, mov.estado)
        acumulado[clave] = acumulado.get(clave, 0) + mov.delta_botellas
    return acumulado


def _calcular_lleno_esperado(
    db: Session, movimientos_acumulados: dict[tuple[str, str], int], presentacion: str
) -> int:
    """Calcula el stock de lleno esperado por el sistema (productos asociados)."""
    stmt = select(RetornableProducto).where(
        RetornableProducto.presentacion == presentacion
    )
    asociados = list(db.execute(stmt).scalars().all())
    if not asociados:
        return 0

    total_botellas = 0
    for asoc in asociados:
        prod_stmt = select(Product).where(Product.id == asoc.producto_id)
        product = db.execute(prod_stmt).scalars().first()
        if product:
            total_botellas += product.stock_cajas * BOTTLES_PER_CASE + product.stock_unidades

    return total_botellas


def _construir_estado_out(
    db: Session,
    presentacion: str,
    estado: str,
    movimientos_acumulados: dict[tuple[str, str], int],
    reporte_detalle: dict[tuple[str, str], tuple[int, int]] | None,
) -> RetornableEstadoOut:
    """Construye la vista de un estado desde el inventario del sistema."""
    clave = (presentacion, estado)

    if reporte_detalle and clave in reporte_detalle:
        botellas, cajas = reporte_detalle[clave]
    else:
        inv = _obtener_o_crear_inventario(db, presentacion, estado)
        botellas = inv.cantidad_botellas
        cajas = inv.cantidad_cajas

    delta = movimientos_acumulados.get(clave, 0)
    botellas_sistema = botellas + delta

    if estado == "CASILLERO":
        cajas_sistema = cajas + delta
        return RetornableEstadoOut(
            estado=estado,
            cantidad_botellas=0,
            cantidad_cajas=cajas_sistema,
            total_botellas=0,
            cajas_enteras=cajas_sistema,
            botellas_sueltas=0,
        )

    return RetornableEstadoOut(
        estado=estado,
        cantidad_botellas=botellas_sistema,
        cantidad_cajas=_botellas_a_cajas_enteras(botellas_sistema),
        total_botellas=botellas_sistema,
        cajas_enteras=_botellas_a_cajas_enteras(botellas_sistema),
        botellas_sueltas=_botellas_sobran(botellas_sistema),
    )


def _construir_producto_out(db: Session, asoc: RetornableProducto) -> RetornableProductoOut:
    prod_stmt = select(Product).where(Product.id == asoc.producto_id)
    product = db.execute(prod_stmt).scalars().first()
    return RetornableProductoOut(
        id=asoc.id,
        producto_id=asoc.producto_id,
        presentacion=asoc.presentacion,
        producto_nombre=product.nombre if product else "",
        stock_cajas=product.stock_cajas if product else 0,
        stock_unidades=product.stock_unidades if product else 0,
    )


def _construir_presentacion_out(
    db: Session,
    presentacion: str,
    movimientos_acumulados: dict[tuple[str, str], int],
    reporte_detalle: dict[tuple[str, str], tuple[int, int]] | None,
) -> RetornablePresentacionOut:
    casillero = _construir_estado_out(db, presentacion, "CASILLERO", movimientos_acumulados, reporte_detalle)
    vacio = _construir_estado_out(db, presentacion, "VACIO", movimientos_acumulados, reporte_detalle)
    lleno = _construir_estado_out(db, presentacion, "LLENO", movimientos_acumulados, reporte_detalle)

    total_botellas = vacio.total_botellas + lleno.total_botellas
    total_cajas_enteras = vacio.cajas_enteras + lleno.cajas_enteras

    lleno_esperado = _calcular_lleno_esperado(db, movimientos_acumulados, presentacion)
    discrepancia = lleno_esperado - lleno.total_botellas

    stmt = select(RetornableProducto).where(RetornableProducto.presentacion == presentacion)
    asociados = list(db.execute(stmt).scalars().all())
    productos = [_construir_producto_out(db, a) for a in asociados]

    return RetornablePresentacionOut(
        presentacion=presentacion,
        casillero=casillero,
        vacio=vacio,
        lleno=lleno,
        total_botellas=total_botellas,
        total_cajas_enteras=total_cajas_enteras,
        lleno_esperado_botellas=lleno_esperado,
        discrepancia_botellas=discrepancia,
        productos_asociados=productos,
    )


def obtener_resumen(db: Session) -> RetornableResumenOut:
    ultimo = _obtener_ultimo_reporte(db)
    movimientos = _calcular_movimientos_desde(db, ultimo.fecha if ultimo else None)

    reporte_detalle: dict[tuple[str, str], tuple[int, int]] | None = None
    if ultimo:
        detalles = _obtener_detalle_reporte(db, ultimo.id)
        reporte_detalle = {
            (d.presentacion, d.estado): (d.cantidad_botellas, d.cantidad_cajas)
            for d in detalles
        }

    presentaciones = []
    for pres in PRESENTACIONES:
        presentaciones.append(
            _construir_presentacion_out(db, pres, movimientos, reporte_detalle)
        )

    return RetornableResumenOut(
        ultimo_reporte_fecha=ultimo.fecha if ultimo else None,
        ultimo_reporte_realizado_por=ultimo.realizado_por if ultimo else None,
        presentaciones=presentaciones,
    )


# ---------------------------------------------------------------------------
# Reportes
# ---------------------------------------------------------------------------


def crear_reporte(db: Session, data: RetornableReporteCreate, usuario_id: int) -> RetornableReporte:
    reporte = RetornableReporte(
        realizado_por=data.realizado_por,
        observaciones=data.observaciones,
        usuario_id=usuario_id,
        es_actual=True,
    )
    db.add(reporte)
    db.flush()

    for det in data.detalles:
        detalle = RetornableReporteDetalle(
            reporte_id=reporte.id,
            presentacion=det.presentacion,
            estado=det.estado,
            cantidad_botellas=det.cantidad_botellas,
            cantidad_cajas=det.cantidad_cajas,
        )
        db.add(detalle)

    db.commit()
    db.refresh(reporte)
    return reporte


def confirmar_reporte(db: Session, reporte_id: int) -> None:
    reporte = db.execute(
        select(RetornableReporte).where(RetornableReporte.id == reporte_id)
    ).scalars().first()
    if not reporte:
        raise EntityNotFoundError(f"Reporte ID {reporte_id} no encontrado")

    if not reporte.es_actual:
        raise ConflictError("Solo se puede confirmar un reporte que sea el actual")

    anterior = _obtener_ultimo_reporte(db)
    if anterior and anterior.id != reporte_id:
        raise ConflictError("Ya existe un reporte confirmado mas reciente")

    db.flush()

    for det in reporte.details:
        inv = _obtener_o_crear_inventario(db, det.presentacion, det.estado)
        inv.cantidad_botellas = det.cantidad_botellas
        inv.cantidad_cajas = det.cantidad_cajas

    db.commit()


def listar_reportes(
    db: Session, page: int = 1, page_size: int = 20
) -> RetornableReportePaginationOut:
    total_stmt = select(func.count()).select_from(RetornableReporte)
    total = db.execute(total_stmt).scalar() or 0

    stmt = (
        select(RetornableReporte)
        .order_by(desc(RetornableReporte.fecha))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(db.execute(stmt).scalars().all())
    pages = math.ceil(total / page_size) if total else 0

    return RetornableReportePaginationOut(
        items=items, total=total, page=page, page_size=page_size, pages=pages
    )


def obtener_detalle_reporte(db: Session, reporte_id: int) -> RetornableReporteCompletoOut:
    reporte = db.execute(
        select(RetornableReporte).where(RetornableReporte.id == reporte_id)
    ).scalars().first()
    if not reporte:
        raise EntityNotFoundError(f"Reporte ID {reporte_id} no encontrado")

    detalles_actuales = _obtener_detalle_reporte(db, reporte_id)

    anterior_stmt = (
        select(RetornableReporte)
        .where(RetornableReporte.id < reporte_id)
        .order_by(desc(RetornableReporte.fecha))
        .limit(1)
    )
    anterior = db.execute(anterior_stmt).scalars().first()
    detalles_anterior: dict[tuple[str, str], tuple[int, int]] = {}
    if anterior:
        for d in _obtener_detalle_reporte(db, anterior.id):
            detalles_anterior[(d.presentacion, d.estado)] = (
                d.cantidad_botellas,
                d.cantidad_cajas,
            )

    movimientos_entre = _calcular_movimientos_desde(
        db, anterior.fecha if anterior else None
    )
    movimientos_hasta_actual = _calcular_movimientos_desde(db, reporte.fecha)

    detalles_con_disp: list[DetalleLineaConDiscrepancia] = []
    for det in detalles_actuales:
        clave = (det.presentacion, det.estado)

        esperado_botellas = det.cantidad_botellas
        esperado_cajas = det.cantidad_cajas

        if clave in movimientos_hasta_actual:
            esperado_botellas += movimientos_hasta_actual[clave]

        if clave in movimientos_entre:
            esperado_botellas -= movimientos_entre[clave]

        esperado_cajas_final = _botellas_a_cajas_enteras(esperado_botellas) if det.estado != "CASILLERO" else esperado_cajas

        disp_botellas = esperado_botellas - det.cantidad_botellas
        disp_cajas = esperado_cajas_final - det.cantidad_cajas

        detalles_con_disp.append(
            DetalleLineaConDiscrepancia(
                presentacion=det.presentacion,
                estado=det.estado,
                cantidad_botellas=det.cantidad_botellas,
                cantidad_cajas=det.cantidad_cajas,
                esperado_botellas=esperado_botellas,
                esperado_cajas=esperado_cajas_final,
                discrepancia_botellas=disp_botellas,
                discrepancia_cajas=disp_cajas,
            )
        )

    return RetornableReporteCompletoOut(
        reporte=RetornableReporteOut.model_validate(reporte),
        detalles=detalles_con_disp,
        reporte_anterior_id=anterior.id if anterior else None,
        reporte_anterior_fecha=anterior.fecha if anterior else None,
    )


# ---------------------------------------------------------------------------
# Movimientos
# ---------------------------------------------------------------------------


def registrar_movimiento(
    db: Session,
    *,
    presentacion: str,
    estado: str,
    delta_botellas: int,
    tipo_movimiento: Literal["VENTA", "COMPRA", "REPORTE", "AJUSTE_MANUAL"],
    referencia_id: int | None = None,
    referencia_tipo: str | None = None,
    usuario_id: int,
    observaciones: str | None = None,
) -> RetornableMovimiento:
    inv = _obtener_o_crear_inventario(db, presentacion, estado)
    inv.cantidad_botellas += delta_botellas
    if estado == "CASILLERO":
        inv.cantidad_cajas += delta_botellas
    else:
        inv.cantidad_cajas = _botellas_a_cajas_enteras(inv.cantidad_botellas)

    mov = RetornableMovimiento(
        presentacion=presentacion,
        estado=estado,
        delta_botellas=delta_botellas,
        tipo_movimiento=tipo_movimiento,
        referencia_id=referencia_id,
        referencia_tipo=referencia_tipo,
        usuario_id=usuario_id,
        observaciones=observaciones,
    )
    db.add(mov)
    return mov


def listar_movimientos(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    presentacion: str | None = None,
    tipo_movimiento: str | None = None,
    fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None,
) -> RetornableMovimientoPaginationOut:
    stmt = select(RetornableMovimiento)
    count_stmt = select(func.count()).select_from(RetornableMovimiento)

    if presentacion:
        stmt = stmt.where(RetornableMovimiento.presentacion == presentacion)
        count_stmt = count_stmt.where(RetornableMovimiento.presentacion == presentacion)
    if tipo_movimiento:
        stmt = stmt.where(RetornableMovimiento.tipo_movimiento == tipo_movimiento)
        count_stmt = count_stmt.where(RetornableMovimiento.tipo_movimiento == tipo_movimiento)
    if fecha_desde:
        stmt = stmt.where(RetornableMovimiento.fecha >= fecha_desde)
        count_stmt = count_stmt.where(RetornableMovimiento.fecha >= fecha_desde)
    if fecha_hasta:
        stmt = stmt.where(RetornableMovimiento.fecha <= fecha_hasta)
        count_stmt = count_stmt.where(RetornableMovimiento.fecha <= fecha_hasta)

    total = db.execute(count_stmt).scalar() or 0

    stmt = stmt.order_by(desc(RetornableMovimiento.fecha))
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    items_raw = list(db.execute(stmt).scalars().all())

    items: list[RetornableMovimientoOut] = []
    if items_raw:
        user_ids = list({mov.usuario_id for mov in items_raw})
        users_stmt = select(User).where(User.id.in_(user_ids))
        users_map = {u.id: u for u in db.execute(users_stmt).scalars().all()}

        for mov in items_raw:
            user = users_map.get(mov.usuario_id)
            items.append(
                RetornableMovimientoOut(
                    id=mov.id,
                    fecha=mov.fecha,
                    presentacion=mov.presentacion,
                    estado=mov.estado,
                    delta_botellas=mov.delta_botellas,
                    tipo_movimiento=mov.tipo_movimiento,
                    referencia_id=mov.referencia_id,
                    referencia_tipo=mov.referencia_tipo,
                    usuario_id=mov.usuario_id,
                    usuario_nombre=user.nombre_completo if user else "",
                    observaciones=mov.observaciones,
                )
            )

    pages = math.ceil(total / page_size) if total else 0
    return RetornableMovimientoPaginationOut(
        items=items, total=total, page=page, page_size=page_size, pages=pages
    )


# ---------------------------------------------------------------------------
# Productos asociados
# ---------------------------------------------------------------------------


def asociar_producto(
    db: Session, producto_id: int, presentacion: str
) -> RetornableProducto:
    stmt = select(RetornableProducto).where(
        RetornableProducto.producto_id == producto_id
    )
    existente = db.execute(stmt).scalars().first()
    if existente:
        raise ConflictError(
            f"El producto ID {producto_id} ya esta asociado a la presentacion {existente.presentacion}"
        )

    prod_stmt = select(Product).where(Product.id == producto_id)
    product = db.execute(prod_stmt).scalars().first()
    if not product:
        raise EntityNotFoundError(f"Producto ID {producto_id} no encontrado")

    asoc = RetornableProducto(
        producto_id=producto_id,
        presentacion=presentacion,
    )
    db.add(asoc)
    db.commit()
    db.refresh(asoc)
    return asoc


def desasociar_producto(db: Session, asociacion_id: int) -> None:
    stmt = select(RetornableProducto).where(RetornableProducto.id == asociacion_id)
    asoc = db.execute(stmt).scalars().first()
    if not asoc:
        raise EntityNotFoundError(f"Asociacion ID {asociacion_id} no encontrada")
    db.delete(asoc)
    db.commit()


def listar_productos_asociados(db: Session) -> list[RetornableProductoOut]:
    stmt = select(RetornableProducto).order_by(
        RetornableProducto.presentacion, RetornableProducto.producto_id
    )
    asociados = list(db.execute(stmt).scalars().all())
    return [_construir_producto_out(db, a) for a in asociados]


# ---------------------------------------------------------------------------
# Hooks para ventas y compras
# ---------------------------------------------------------------------------


def procesar_venta(
    db: Session,
    *,
    product: Product,
    botellas_descontadas: int,
    referencia_id: int,
    usuario_id: int,
) -> None:
    """Hook que se llama al final de create_sale() si el producto es retornable."""
    stmt = select(RetornableProducto).where(
        RetornableProducto.producto_id == product.id
    )
    asoc = db.execute(stmt).scalars().first()
    if not asoc:
        return

    registrar_movimiento(
        db,
        presentacion=asoc.presentacion,
        estado="LLENO",
        delta_botellas=-botellas_descontadas,
        tipo_movimiento="VENTA",
        referencia_id=referencia_id,
        referencia_tipo="VENTA",
        usuario_id=usuario_id,
    )
    registrar_movimiento(
        db,
        presentacion=asoc.presentacion,
        estado="VACIO",
        delta_botellas=botellas_descontadas,
        tipo_movimiento="VENTA",
        referencia_id=referencia_id,
        referencia_tipo="VENTA",
        usuario_id=usuario_id,
    )


def procesar_compra(
    db: Session,
    *,
    product: Product,
    botellas_agregadas: int,
    referencia_id: int,
    usuario_id: int,
) -> None:
    """Hook que se llama al final de create_invoice() si el producto es retornable."""
    stmt = select(RetornableProducto).where(
        RetornableProducto.producto_id == product.id
    )
    asoc = db.execute(stmt).scalars().first()
    if not asoc:
        return

    registrar_movimiento(
        db,
        presentacion=asoc.presentacion,
        estado="LLENO",
        delta_botellas=botellas_agregadas,
        tipo_movimiento="COMPRA",
        referencia_id=referencia_id,
        referencia_tipo="FACTURA",
        usuario_id=usuario_id,
    )
    registrar_movimiento(
        db,
        presentacion=asoc.presentacion,
        estado="VACIO",
        delta_botellas=-botellas_agregadas,
        tipo_movimiento="COMPRA",
        referencia_id=referencia_id,
        referencia_tipo="FACTURA",
        usuario_id=usuario_id,
    )
