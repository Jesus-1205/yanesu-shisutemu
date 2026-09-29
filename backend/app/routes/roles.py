from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.role import RoleOut
from app.services.role_service import get_roles, get_role

router = APIRouter(prefix="/roles", tags=["roles"])


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

