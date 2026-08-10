from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.price_rule import PriceRuleCreate, PriceRuleOut, PriceRuleUpdate
from app.services.price_rule_service import (
    create_price_rule,
    delete_price_rule,
    get_price_rule,
    get_price_rules,
    update_price_rule,
)

router = APIRouter(prefix="/price-rules", tags=["price-rules"])


@router.get("", status_code=status.HTTP_200_OK)
def list_all(
    activo: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    rules = get_price_rules(db, activo=activo)
    return [PriceRuleOut.model_validate(r) for r in rules]


@router.get("/{rule_id}", status_code=status.HTTP_200_OK)
def get_by_id(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    rule = get_price_rule(db, rule_id)
    return PriceRuleOut.model_validate(rule)


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: PriceRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    rule = create_price_rule(db, data)
    return PriceRuleOut.model_validate(rule)


@router.put("/{rule_id}", status_code=status.HTTP_200_OK)
def update(
    rule_id: int,
    data: PriceRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    rule = update_price_rule(db, rule_id, data)
    return PriceRuleOut.model_validate(rule)


@router.delete("/{rule_id}", status_code=status.HTTP_200_OK)
def delete(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    delete_price_rule(db, rule_id)
    return {"detail": "Regla de precio eliminada"}
