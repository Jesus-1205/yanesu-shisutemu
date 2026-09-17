from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator


class ExchangeRateBulkSave(BaseModel):
    usd: Decimal
    eur: Decimal

    @field_validator("usd", "eur", mode="before")
    @classmethod
    def validate_and_quantize_rate(cls, v: Any) -> Decimal:
        if v is None:
            raise ValueError("La tasa es obligatoria")
        try:
            dec = Decimal(str(v).strip().replace(",", "."))
        except (InvalidOperation, TypeError):
            raise ValueError(f"Valor numérico inválido: {v}")
        if dec <= Decimal("0"):
            raise ValueError("La tasa debe ser mayor a 0")
        return dec.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


class ExchangeRateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tasa_usd: Decimal
    tasa_eur: Decimal
    fecha_registro: datetime
    registrado_por: int | None
    registrado_por_nombre: str | None = None


class ExchangeRatePaginationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[ExchangeRateOut]
    total: int
    page: int
    page_size: int
    pages: int
