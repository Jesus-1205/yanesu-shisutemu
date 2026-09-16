from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import verify_api_key
from app.models.api_key import ApiKey
from app.schemas.exchange_rate import ExchangeRateBulkSave, ExchangeRateOut
from app.services.audit_service import log_action
from app.services.exchange_rate_service import save_rates

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/bcv-sync", status_code=status.HTTP_201_CREATED, response_model=ExchangeRateOut)
def sync_bcv_rate(
    data: ExchangeRateBulkSave,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    """POST /webhooks/bcv-sync - Sincronización automática de tasa BCV vía Agente (n8n / M2M)

    Recibe: Header X-API-Key y JSON body con usd (>0) y eur (>0)
    Hace:   autentica la API Key, verifica idempotencia contra la última tasa registrada,
            persiste la nueva tasa si cambió y registra en auditoría.
    Devuelve: 201 + tasa creada (o 200 si la tasa no varió) | 401 si API Key inválida | 422 si datos inválidos
    """
    rate, created = save_rates(db, data, api_key_id=api_key.id)
    ip = request.client.host if request.client else "m2m"
    if created:
        log_action(
            usuario=f"m2m:{api_key.name}",
            ip=ip,
            accion="CONFIGURAR",
            entidad="tasa_cambio",
            entidad_id=rate.id,
            detalle=f"Tasa sincronizada por M2M ({api_key.name}): USD={rate.tasa_usd} EUR={rate.tasa_eur}",
        )
    else:
        response.status_code = status.HTTP_200_OK

    return ExchangeRateOut.model_validate(rate)
