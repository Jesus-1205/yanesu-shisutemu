from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.combo import ComboCreate, ComboOut, ComboUpdate
from app.services.combo_service import (
    create_combo,
    delete_combo,
    get_active_combos,
    get_combo,
    get_combos,
    update_combo,
)

router = APIRouter(prefix="/combos", tags=["combos"])


@router.get("", status_code=status.HTTP_200_OK)
def list_all(
    activo: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    rules = get_combos(db, activo=activo)
    return [ComboOut.model_validate(r) for r in rules]


@router.get("/active", status_code=status.HTTP_200_OK)
def active_combos(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    return get_active_combos(db)


@router.get("/{combo_id}", status_code=status.HTTP_200_OK)
def get_by_id(
    combo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    combo = get_combo(db, combo_id)
    return ComboOut.model_validate(combo)


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: ComboCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    combo = create_combo(db, data)
    return ComboOut.model_validate(combo)


@router.put("/{combo_id}", status_code=status.HTTP_200_OK)
def update(
    combo_id: int,
    data: ComboUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    combo = update_combo(db, combo_id, data)
    return ComboOut.model_validate(combo)


@router.delete("/{combo_id}", status_code=status.HTTP_200_OK)
def delete(
    combo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    delete_combo(db, combo_id)
    return {"detail": "Combo eliminado"}
