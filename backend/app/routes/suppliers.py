from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierOut, SupplierAnalyticsResponse, SupplierDetailAnalyticsOut, SupplierPaginationOut
from app.services.supplier_service import get_suppliers, get_suppliers_paginated, get_supplier, create_supplier, update_supplier, delete_supplier, get_supplier_analytics, get_supplier_detail_analytics

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """POST /suppliers - Crear nuevo proveedor

    Recibe: JSON body con nombre, telefono(opcional), email(opcional), cookie access_token
    Hace:   valida esquema, verifica duplicados, persiste en DB
    Devuelve: 201 + proveedor creado | 422 validación | 409 duplicado | 401/403 sin permisos
    """
    supplier = create_supplier(db, data)
    return SupplierOut.model_validate(supplier)


@router.get("", status_code=status.HTTP_200_OK)
def list_all(
    page: int | None = None,
    page_size: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    if page is not None and page_size is not None:
        result = get_suppliers_paginated(db, page=page, page_size=page_size)
        return SupplierPaginationOut(
            items=[SupplierOut.model_validate(s) for s in result["items"]],
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"],
            pages=result["pages"],
        )
    suppliers = get_suppliers(db)
    return [SupplierOut.model_validate(s) for s in suppliers]


@router.get("/analytics", status_code=status.HTTP_200_OK)
def analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /suppliers/analytics - Métricas de evaluación de proveedores (solo admin)

    Recibe: cookie access_token
    Hace:   agrega volumen stock, margen promedio, unidades vendidas e ingresos
            por cada proveedor mediante subconsultas SQL
    Devuelve: 200 + SupplierAnalyticsResponse | 401 no autenticado | 403 no admin
    """
    result = get_supplier_analytics(db)
    return result


@router.get("/{supplier_id}/analytics", status_code=status.HTTP_200_OK)
def detail_analytics(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /suppliers/{supplier_id}/analytics - Analítica detallada de un proveedor (solo admin)

    Recibe: supplier_id en path, cookie access_token
    Hace:   consulta productos del proveedor, agrega ventas, ingresos y margen porcentual
    Devuelve: 200 + SupplierDetailAnalyticsOut | 404 no encontrado | 401/403 sin permisos
    """
    result = get_supplier_detail_analytics(db, supplier_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proveedor no encontrado",
        )
    return result


@router.get("/{supplier_id}", status_code=status.HTTP_200_OK)
def get_by_id(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """GET /suppliers/{supplier_id} - Obtener proveedor por ID

    Recibe: supplier_id en path, cookie access_token
    Hace:   busca proveedor en DB por ID
    Devuelve: 200 + proveedor | 404 no encontrado | 401/403 sin permisos
    """
    supplier = get_supplier(db, supplier_id)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proveedor no encontrado",
        )
    return SupplierOut.model_validate(supplier)


@router.put("/{supplier_id}", status_code=status.HTTP_200_OK)
def update(
    supplier_id: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """PUT /suppliers/{supplier_id} - Actualizar proveedor

    Recibe: supplier_id en path, JSON body con campos a actualizar, cookie access_token
    Hace:   actualiza solo los campos enviados
    Devuelve: 200 + proveedor actualizado | 404 no encontrado | 409 duplicado | 401/403 sin permisos
    """
    supplier = update_supplier(db, supplier_id, data)
    return SupplierOut.model_validate(supplier)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """DELETE /suppliers/{supplier_id} - Eliminar proveedor

    Recibe: supplier_id en path, cookie access_token
    Hace:   verifica que no tenga productos asociados y elimina
    Devuelve: 204 sin contenido | 404 no encontrado | 409 tiene productos | 401/403 sin permisos
    """
    delete_supplier(db, supplier_id)
