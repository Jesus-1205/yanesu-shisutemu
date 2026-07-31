from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExchangeRateCreate(BaseModel):
    moneda: Literal["USD", "EUR"]
    tasa_ves: Decimal = Field(gt=0, max_digits=10, decimal_places=4)


class ExchangeRateBulkSave(BaseModel):
    usd: Decimal = Field(ge=0, max_digits=10, decimal_places=4)
    eur: Decimal = Field(ge=0, max_digits=10, decimal_places=4)


class ExchangeRateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    moneda: str
    tasa_ves: Decimal
    fecha_registro: datetime
    registrado_por: int | None


class ExchangeRatePaginationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[ExchangeRateOut]
    total: int
    page: int
    page_size: int
    pages: int
