from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.core.exceptions import EntityNotFoundError
from app.core.database import get_db
from app.models.user import User
from app.schemas.system_setting import ApiKeyPayload, ApiKeyStatusResponse, TestConnectionResponse
from app.services import system_setting_service
from app.services.gemini_service import check_gemini_connection

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get(
    "/api-key/{clave}",
    response_model=ApiKeyStatusResponse,
    dependencies=[Depends(require_role("ADMINISTRADOR"))],
)
def get_api_key_status(
    clave: str,
    db: Session = Depends(get_db),
):
    setting = system_setting_service.get_setting_by_clave(db, clave)
    if not setting:
        return ApiKeyStatusResponse(configured=False, clave=clave)
    return ApiKeyStatusResponse(
        configured=True,
        clave=clave,
        descripcion=setting.descripcion,
    )


@router.post(
    "/api-key",
    dependencies=[Depends(require_role("ADMINISTRADOR"))],
)
def save_api_key(
    payload: ApiKeyPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    system_setting_service.set_api_key(
        db,
        clave=payload.clave,
        valor=payload.valor,
        user_id=current_user.id,
        descripcion=payload.descripcion,
    )
    return {"message": "API key guardada correctamente"}


@router.delete(
    "/api-key/{clave}",
    dependencies=[Depends(require_role("ADMINISTRADOR"))],
)
def delete_api_key(
    clave: str,
    db: Session = Depends(get_db),
):
    deleted = system_setting_service.delete_api_key(db, clave)
    if not deleted:
        raise EntityNotFoundError(f"No se encontró la API key con clave '{clave}'")
    return {"message": "API key eliminada correctamente"}


@router.post(
    "/api-key/test",
    response_model=TestConnectionResponse,
    dependencies=[Depends(require_role("ADMINISTRADOR"))],
)
def test_connection(
    payload: ApiKeyPayload,
):
    return check_gemini_connection(payload.valor)
