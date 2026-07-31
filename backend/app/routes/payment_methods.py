from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.user import User
from app.schemas.payment_method import PaymentMethodCreate, PaymentMethodOut, PaymentMethodUpdate
from app.services.payment_method_service import (
    actualizar_payment_method,
    crear_payment_method,
    eliminar_payment_method,
    get_payment_method,
    get_payment_methods,
)

router = APIRouter(prefix="/payment-methods", tags=["payment-methods"])


@router.get("", status_code=status.HTTP_200_OK)
def list_all(
    solo_activos: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR", "OPERADOR")),
):
    """GET /payment-methods - Listar métodos de pago

    Recibe: query param solo_activos (bool), cookie access_token
    Hace:   consulta todos los métodos de pago
    Devuelve: 200 + lista de métodos de pago
    """
    methods = get_payment_methods(db, solo_activos=solo_activos)
    return [PaymentMethodOut.model_validate(m) for m in methods]


@router.get("/{metodo_id}", status_code=status.HTTP_200_OK)
def get_by_id(
    metodo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """GET /payment-methods/{metodo_id} - Obtener método de pago por ID (solo admin)

    Recibe: metodo_id en path, cookie access_token
    Hace:   busca método de pago por ID
    Devuelve: 200 + método | 404 no encontrado
    """
    metodo = get_payment_method(db, metodo_id)
    return PaymentMethodOut.model_validate(metodo)


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: PaymentMethodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """POST /payment-methods - Crear nuevo método de pago (solo admin)

    Recibe: JSON body con nombre y activo (opcional)
    Hace:   valida que no exista duplicado, persiste en DB
    Devuelve: 201 + método creado | 409 duplicado
    """
    metodo = crear_payment_method(db, data)
    return PaymentMethodOut.model_validate(metodo)


@router.put("/{metodo_id}", status_code=status.HTTP_200_OK)
def update(
    metodo_id: int,
    data: PaymentMethodUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """PUT /payment-methods/{metodo_id} - Actualizar método de pago (solo admin)

    Recibe: JSON body parcial con nombre y/o activo
    Hace:   busca por ID, actualiza campos, persiste
    Devuelve: 200 + método actualizado | 404 no encontrado | 409 duplicado
    """
    metodo = actualizar_payment_method(db, metodo_id, data)
    return PaymentMethodOut.model_validate(metodo)


@router.delete("/{metodo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    metodo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMINISTRADOR")),
):
    """DELETE /payment-methods/{metodo_id} - Eliminar método de pago (solo admin)

    Recibe: metodo_id en path, cookie access_token
    Hace:   busca y elimina; si tiene ventas asociadas, la FK con RESTRICT evitará la eliminación
    Devuelve: 204 sin contenido | 404 no encontrado | 409 en uso
    """
    eliminar_payment_method(db, metodo_id)