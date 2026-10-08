from decimal import Decimal

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductOut,
    ProductPaginationOut,
    ProductRankingItemOut,
    ProductRankingOut,
    ProductUpdate,
)
from app.services.audit_service import log_action
from app.services.product_service import (
    create_product,
    delete_product,
    get_favorites,
    get_low_rotation,
    get_lowest_margin,
    get_product,
    get_products,
    get_top_margin,
    get_top_selling,
    toggle_favorite,
    update_product,
)

router = APIRouter(prefix="/products", tags=["products"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: ProductCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """POST /products - Crear nuevo producto

    Recibe: JSON body con nombre, categoria_ids, precios, stock inicial, cookie access_token
    Hace:   valida esquema, verifica duplicado de codigo_barra, asigna categorias, persiste en DB
    Devuelve: 201 + producto | 422 validación | 409 código de barras duplicado | 401/403 sin permisos
    """
    product = create_product(db, data)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="CREAR", entidad="producto", entidad_id=product.id, detalle=f"Creado producto '{product.nombre}'")
    return ProductOut.model_validate(product)


@router.get("", response_model=ProductPaginationOut, status_code=status.HTTP_200_OK)
def list_all(
    categoria_ids: str | None = None,
    proveedor_id: int | None = None,
    precio_min: Decimal | None = None,
    precio_max: Decimal | None = None,
    sin_stock: bool = False,
    search: str | None = None,
    stock_status: str | None = None,
    sort_by: str | None = None,
    order: str | None = None,
    tipo_iva: str | None = None,
    es_favorito: bool | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """GET /products - Listar productos con filtros opcionales y paginación

    Recibe: query params (categoria_ids, proveedor_id, precio_min, precio_max,
            sin_stock, search, stock_status, sort_by, order, tipo_iva, page, page_size)
    Hace:   consulta productos aplicando filtros con ordenamiento dinámico y paginación
    Devuelve: 200 + ProductPaginationOut | 401/403 sin permisos
    """
    parsed_categoria_ids = None
    if categoria_ids:
        parsed_categoria_ids = [int(id_) for id_ in categoria_ids.split(",") if id_.strip()]

    result = get_products(
        db,
        categoria_ids=parsed_categoria_ids,
        proveedor_id=proveedor_id,
        precio_min=precio_min,
        precio_max=precio_max,
        sin_stock=sin_stock,
        search=search,
        stock_status=stock_status,
        sort_by=sort_by,
        order=order,
        tipo_iva=tipo_iva,
        es_favorito=es_favorito,
        page=page,
        page_size=page_size,
    )
    return {
        "items": [ProductOut.model_validate(p) for p in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "pages": result["pages"],
    }


@router.get("/top-selling", response_model=list[ProductRankingOut], status_code=status.HTTP_200_OK)
def top_selling(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /products/top-selling - Productos más vendidos (solo admin)

    Recibe: query param limit (default 10), cookie access_token
    Hace:   JOIN con detalle_ventas, agrupa, cuenta, ordena descendente
    Devuelve: 200 + lista de {producto, total_vendido} | 401/403 sin permisos
    """
    results = get_top_selling(db, limit=limit)
    return [
        {"producto": ProductRankingItemOut.model_validate(p), "total_vendido": count}
        for p, count in results
    ]


@router.get("/top-margin", status_code=status.HTTP_200_OK)
def top_margin(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /products/top-margin - Productos con mayor margen (solo admin)

    Recibe: query param limit (default 10), cookie access_token
    Hace:   ordena por (precio_unidad_usd - precio_costo_usd) descendente
    Devuelve: 200 + lista de productos | 401/403 sin permisos
    """
    products = get_top_margin(db, limit=limit)
    return [ProductOut.model_validate(p) for p in products]


@router.get("/lowest-margin", status_code=status.HTTP_200_OK)
def lowest_margin(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /products/lowest-margin - Productos con menor margen (solo admin)

    Recibe: query param limit (default 10), cookie access_token
    Hace:   ordena por (precio_unidad_usd - precio_costo_usd) ascendente
    Devuelve: 200 + lista de productos | 401/403 sin permisos
    """
    products = get_lowest_margin(db, limit=limit)
    return [ProductOut.model_validate(p) for p in products]


@router.get("/low-rotation", response_model=list[ProductRankingOut], status_code=status.HTTP_200_OK)
def low_rotation(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /products/low-rotation - Productos con menor rotación (solo admin)

    Recibe: query param limit (default 10), cookie access_token
    Hace:   LEFT JOIN con detalle_ventas, agrupa, cuenta, ordena ascendente
    Devuelve: 200 + lista de {producto, total_vendido} | 401/403 sin permisos
    """
    results = get_low_rotation(db, limit=limit)
    return [
        {"producto": ProductRankingItemOut.model_validate(p), "total_vendido": count}
        for p, count in results
    ]


@router.get("/favorites", response_model=ProductPaginationOut, status_code=status.HTTP_200_OK)
def favorites(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """GET /products/favorites - Productos favoritos para el POS

    Recibe: query param limit (default 10), cookie access_token
    Hace:   busca productos con es_favorito=True, ordenados por nombre
    Devuelve: 200 + ProductPaginationOut con items favoritos | 401/403 sin permisos
    """
    result = get_favorites(db, limit=limit)
    return {
        "items": [ProductOut.model_validate(p) for p in result["items"]],
        "total": result["total"],
        "page": 1,
        "page_size": limit,
        "pages": 1,
    }


@router.patch("/{product_id}/toggle-favorite", status_code=status.HTTP_200_OK)
def toggle_favorite_endpoint(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """PATCH /products/{id}/toggle-favorite - Alternar estado de favorito

    Recibe: product_id en path, cookie access_token
    Hace:   alterna el campo es_favorito del producto
    Devuelve: 200 + producto actualizado | 404 no encontrado | 401/403 sin permisos
    """
    product = toggle_favorite(db, product_id)
    return ProductOut.model_validate(product)


@router.get("/{product_id}", status_code=status.HTTP_200_OK)
def get_by_id(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """GET /products/{product_id} - Obtener producto por ID

    Recibe: product_id en path, cookie access_token
    Hace:   busca producto en DB por ID
    Devuelve: 200 + producto | 404 no encontrado | 401/403 sin permisos
    """
    product = get_product(db, product_id)
    return ProductOut.model_validate(product)


@router.put("/{product_id}", status_code=status.HTTP_200_OK)
def update(
    product_id: int,
    data: ProductUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """PUT /products/{product_id} - Actualizar producto

    Recibe: product_id en path, JSON body con campos a actualizar, cookie access_token
    Hace:   actualiza solo los campos enviados, verifica unicidad de codigo_barra
    Devuelve: 200 + producto actualizado | 404 no encontrado | 409 código duplicado | 401/403 sin permisos
    """
    product = update_product(db, product_id, data)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="EDITAR", entidad="producto", entidad_id=product.id, detalle=f"Editado producto '{product.nombre}'")
    return ProductOut.model_validate(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    product_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """DELETE /products/{product_id} - Eliminar producto (solo admin)

    Recibe: product_id en path, cookie access_token
    Hace:   verifica que no tenga ventas asociadas y elimina
    Devuelve: 204 sin contenido | 404 no encontrado | 409 tiene ventas | 401/403 sin permisos
    """
    delete_product(db, product_id)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="ELIMINAR", entidad="producto", entidad_id=product_id, detalle=f"Eliminado producto ID {product_id}")
