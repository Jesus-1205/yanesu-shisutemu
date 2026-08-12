from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ExchangeRateBulkSave(BaseModel):
    usd: Decimal = Field(gt=0, max_digits=10, decimal_places=4)
    eur: Decimal = Field(gt=0, max_digits=10, decimal_places=4)


class ExchangeRateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tasa_usd: Decimal
    tasa_eur: Decimal
    fecha_registro: datetime
    registrado_por: int | None


class ExchangeRatePaginationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[ExchangeRateOut]
    total: int
    page: int
    page_size: int
    pages: int
