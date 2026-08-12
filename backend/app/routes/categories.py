from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryOut, CategoryAnalyticsResponse, CategoryDetailAnalyticsOut, CategoryPaginationOut
from app.services.audit_service import log_action
from app.services.category_service import (
    create_category,
    delete_category,
    get_categories,
    get_categories_paginated,
    get_category,
    get_category_analytics,
    get_category_detail_analytics,
    get_low_rotation_categories,
    get_lowest_margin_categories,
    get_top_margin_categories,
    get_top_selling_categories,
    update_category,
)

router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: CategoryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """POST /categories - Crear nueva categoría

    Recibe: JSON body con nombre, descripcion(opcional), cookie access_token
    Hace:   valida esquema, verifica duplicados, persiste en DB
    Devuelve: 201 + categoría creada | 422 validación | 409 duplicado | 401/403 sin permisos
    """
    category = create_category(db, data)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="CREAR", entidad="categoria", entidad_id=category.id, detalle=f"Creada categoría '{category.nombre}'")
    return CategoryOut.model_validate(category)


@router.get("", status_code=status.HTTP_200_OK)
def list_all(
    page: int | None = None,
    page_size: int | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    if page is not None and page_size is not None:
        result = get_categories_paginated(db, page=page, page_size=page_size, search=search)
        return CategoryPaginationOut(
            items=[CategoryOut.model_validate(c) for c in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            pages=result["pages"],
        )
    categories = get_categories(db)
    return [CategoryOut.model_validate(c) for c in categories]


@router.get("/analytics", status_code=status.HTTP_200_OK)
def analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /categories/analytics - Métricas de evaluación de categorías (solo admin)

    Recibe: cookie access_token
    Hace:   agrega volumen stock, margen promedio, unidades vendidas e ingresos
            por cada categoría mediante subconsultas SQL
    Devuelve: 200 + CategoryAnalyticsResponse | 401 no autenticado | 403 no admin
    """
    result = get_category_analytics(db)
    return result


@router.get("/top-selling", status_code=status.HTTP_200_OK)
def top_selling(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /categories/top-selling - Categorías más vendidas (solo admin)

    Recibe: query param limit (default 10), cookie access_token
    Hace:   JOIN con producto_categoria y detalle_ventas, agrupa, cuenta, ordena descendente
    Devuelve: 200 + lista de {categoria, total_vendido} | 401/403 sin permisos
    """
    results = get_top_selling_categories(db, limit=limit)
    return [
        {"categoria": CategoryOut.model_validate(c), "total_vendido": count}
        for c, count in results
    ]


@router.get("/top-margin", status_code=status.HTTP_200_OK)
def top_margin(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /categories/top-margin - Categorías con mayor margen promedio (solo admin)

    Recibe: query param limit (default 10), cookie access_token
    Hace:   agrupa por categoría, ordena por AVG(margen) descendente
    Devuelve: 200 + lista de categorías | 401/403 sin permisos
    """
    categories = get_top_margin_categories(db, limit=limit)
    return [CategoryOut.model_validate(c) for c in categories]


@router.get("/lowest-margin", status_code=status.HTTP_200_OK)
def lowest_margin(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /categories/lowest-margin - Categorías con menor margen promedio (solo admin)

    Recibe: query param limit (default 10), cookie access_token
    Hace:   agrupa por categoría, ordena por AVG(margen) ascendente
    Devuelve: 200 + lista de categorías | 401/403 sin permisos
    """
    categories = get_lowest_margin_categories(db, limit=limit)
    return [CategoryOut.model_validate(c) for c in categories]


@router.get("/low-rotation", status_code=status.HTTP_200_OK)
def low_rotation(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /categories/low-rotation - Categorías con menor rotación (solo admin)

    Recibe: query param limit (default 10), cookie access_token
    Hace:   LEFT JOIN con producto_categoria y detalle_ventas, agrupa, cuenta, ordena ascendente
    Devuelve: 200 + lista de {categoria, total_vendido} | 401/403 sin permisos
    """
    results = get_low_rotation_categories(db, limit=limit)
    return [
        {"categoria": CategoryOut.model_validate(c), "total_vendido": count}
        for c, count in results
    ]


@router.get("/{category_id}/analytics", status_code=status.HTTP_200_OK)
def detail_analytics(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /categories/{category_id}/analytics - Analítica detallada de una categoría (solo admin)

    Recibe: category_id en path, cookie access_token
    Hace:   consulta productos de la categoría, agrega ventas, ingresos y margen porcentual
    Devuelve: 200 + CategoryDetailAnalyticsOut | 404 no encontrada | 401/403 sin permisos
    """
    result = get_category_detail_analytics(db, category_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada",
        )
    return result


@router.get("/{category_id}", status_code=status.HTTP_200_OK)
def get_by_id(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """GET /categories/{category_id} - Obtener categoría por ID

    Recibe: category_id en path, cookie access_token
    Hace:   busca categoría en DB por ID
    Devuelve: 200 + categoría | 404 no encontrada | 401/403 sin permisos
    """
    category = get_category(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada",
        )
    return CategoryOut.model_validate(category)


@router.put("/{category_id}", status_code=status.HTTP_200_OK)
def update(
    category_id: int,
    data: CategoryUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """PUT /categories/{category_id} - Actualizar categoría

    Recibe: category_id en path, JSON body con campos a actualizar, cookie access_token
    Hace:   actualiza solo los campos enviados
    Devuelve: 200 + categoría actualizada | 404 no encontrada | 409 duplicado | 401/403 sin permisos
    """
    category = update_category(db, category_id, data)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="EDITAR", entidad="categoria", entidad_id=category.id, detalle=f"Editada categoría '{category.nombre}'")
    return CategoryOut.model_validate(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    category_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """DELETE /categories/{category_id} - Eliminar categoría

    Recibe: category_id en path, cookie access_token
    Hace:   elimina la categoría (CASCADE libera la relación con productos)
    Devuelve: 204 sin contenido | 404 no encontrada | 401/403 sin permisos
    """
    delete_category(db, category_id)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="ELIMINAR", entidad="categoria", entidad_id=category_id, detalle=f"Eliminada categoría ID {category_id}")
