from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.audit_service import log_action
from app.services.auth_service import create_user
from app.services.user_service import get_users, get_user, update_user, toggle_user_active, delete_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """POST /users - Crear nuevo usuario (solo admin)

    Recibe: JSON body con username, email, password, nombre_completo, rol_id
    Hace:   crea el usuario en DB, NO genera sesión (a diferencia de register)
    Devuelve: 201 + usuario creado | 409 duplicado | 422 validación | 401/403 sin permisos
    """
    user = create_user(db, data)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="CREAR", entidad="usuario", entidad_id=user.id, detalle=f"Creado usuario '{user.username}'")
    return UserOut.model_validate(user)


@router.get("", status_code=status.HTTP_200_OK)
def list_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /users - Listar todos los usuarios

    Recibe: cookie access_token (automática mediante Depends)
    Hace:   consulta todos los usuarios ordenados por username
    Devuelve: 200 + lista de usuarios | 401 no autenticado | 403 no admin
    """
    users = get_users(db)
    return [UserOut.model_validate(u) for u in users]


@router.get("/{user_id}", status_code=status.HTTP_200_OK)
def get_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /users/{user_id} - Obtener usuario por ID

    Recibe: user_id en path, cookie access_token
    Hace:   busca usuario en DB por ID
    Devuelve: 200 + usuario | 404 no encontrado | 401/403 sin permisos
    """
    user = get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return UserOut.model_validate(user)


@router.put("/{user_id}", status_code=status.HTTP_200_OK)
def update(
    user_id: int,
    data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """PUT /users/{user_id} - Actualizar usuario

    Recibe: user_id en path, JSON body con campos a actualizar, cookie access_token
    Hace:   actualiza solo los campos enviados (parcial)
    Devuelve: 200 + usuario actualizado | 404 no encontrado | 409 conflicto | 401/403 sin permisos
    """
    user = update_user(db, user_id, data)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="EDITAR", entidad="usuario", entidad_id=user.id, detalle=f"Editado usuario '{user.username}'")
    return UserOut.model_validate(user)


@router.patch("/{user_id}/toggle-active", status_code=status.HTTP_200_OK)
def toggle_active(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """PATCH /users/{user_id}/toggle-active - Activar/desactivar usuario

    Recibe: user_id en path, cookie access_token
    Hace:   cambia el estado is_active del usuario (true→false o false→true)
    Devuelve: 200 + usuario con nuevo estado | 404 no encontrado | 401/403 sin permisos
    """
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivarte a ti mismo",
        )
    user = toggle_user_active(db, user_id)
    ip = request.client.host if request.client else "local"
    accion = "DESACTIVAR" if user.is_active else "ACTIVAR"
    log_action(usuario=current_user.username, ip=ip, accion=accion, entidad="usuario", entidad_id=user.id, detalle=f"Usuario '{user.username}' {'activado' if user.is_active else 'desactivado'}")
    return UserOut.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """DELETE /users/{user_id} - Eliminar usuario

    Recibe: user_id en path, cookie access_token
    Hace:   elimina el usuario de DB (si no tiene ventas/facturas asociadas)
    Devuelve: 204 sin contenido | 404 no encontrado | 409 tiene ventas/facturas | 401/403 sin permisos
    """
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminarte a ti mismo",
        )
    delete_user(db, user_id)
    ip = request.client.host if request.client else "local"
    log_action(usuario=current_user.username, ip=ip, accion="ELIMINAR", entidad="usuario", entidad_id=user_id, detalle=f"Eliminado usuario ID {user_id}")
