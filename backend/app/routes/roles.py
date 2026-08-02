from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.role import RoleCreate, RoleOut
from app.services.audit_service import log_action
from app.services.role_service import get_roles, get_role, create_role, update_role, delete_role

router = APIRouter(prefix="/roles", tags=["roles"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: RoleCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """POST /roles - Crear nuevo rol

    Recibe: JSON body con nombre, cookie access_token
    Hace:   valida esquema, verifica duplicados, persiste en DB
    Devuelve: 201 + rol creado | 422 validación | 409 duplicado | 401/403 sin permisos
    """
    role = create_role(db, data)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="CREAR", entidad="rol", entidad_id=role.id, detalle=f"Creado rol '{role.nombre}'")
    return RoleOut.model_validate(role)


@router.get("", status_code=status.HTTP_200_OK)
def list_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /roles - Listar todos los roles

    Recibe: cookie access_token
    Hace:   consulta todos los roles ordenados por nombre
    Devuelve: 200 + lista de roles | 401 no autenticado | 403 no admin
    """
    roles = get_roles(db)
    return [RoleOut.model_validate(r) for r in roles]


@router.get("/{role_id}", status_code=status.HTTP_200_OK)
def get_by_id(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /roles/{role_id} - Obtener rol por ID

    Recibe: role_id en path, cookie access_token
    Hace:   busca rol en DB por ID
    Devuelve: 200 + rol | 404 no encontrado | 401/403 sin permisos
    """
    role = get_role(db, role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado",
        )
    return RoleOut.model_validate(role)


@router.put("/{role_id}", status_code=status.HTTP_200_OK)
def update(
    role_id: int,
    data: RoleCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """PUT /roles/{role_id} - Actualizar rol

    Recibe: role_id en path, JSON body con nombre, cookie access_token
    Hace:   actualiza el nombre del rol
    Devuelve: 200 + rol actualizado | 404 no encontrado | 409 duplicado | 401/403 sin permisos
    """
    role = update_role(db, role_id, data)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="EDITAR", entidad="rol", entidad_id=role.id, detalle=f"Editado rol '{role.nombre}'")
    return RoleOut.model_validate(role)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    role_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """DELETE /roles/{role_id} - Eliminar rol

    Recibe: role_id en path, cookie access_token
    Hace:   verifica que no tenga usuarios asociados y elimina
    Devuelve: 204 sin contenido | 404 no encontrado | 409 tiene usuarios | 401/403 sin permisos
    """
    delete_role(db, role_id)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="ELIMINAR", entidad="rol", entidad_id=role_id, detalle=f"Eliminado rol ID {role_id}")
