from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, LoginRequest
from app.services.auth_service import register_user, login_user, set_token_cookie, clear_token_cookie

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, response: Response, db: Session = Depends(get_db)):
    """POST /auth/register - Registrar nuevo usuario

    Recibe: JSON body con username, email, password, nombre_completo, rol_id
    Hace:   valida datos con UserCreate, verifica duplicados, crea usuario, genera token y lo setea en cookie
    Devuelve: 201 + usuario creado + Set-Cookie | 422 si validación falla | 409 si username/email duplicado
    """
    user, token = register_user(db, data)
    set_token_cookie(response, token)
    return UserOut.model_validate(user)


@router.post("/login", status_code=status.HTTP_200_OK)
def login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """POST /auth/login - Iniciar sesión

    Recibe: JSON body con username y password
    Hace:   autentica credenciales, genera token JWT y lo setea en cookie httpOnly
    Devuelve: 200 + usuario + Set-Cookie | 422 si validación falla | 401 si credenciales inválidas
    """
    result = login_user(db, data.username, data.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    user, token = result
    set_token_cookie(response, token)
    return UserOut.model_validate(user)


@router.get("/me", status_code=status.HTTP_200_OK)
def me(current_user: User = Depends(get_current_user)):
    """GET /auth/me - Obtener usuario autenticado

    Recibe: cookie access_token (automática mediante Depends)
    Hace:   decodifica token, busca usuario en DB, retorna sus datos con nombre del rol
    Devuelve: 200 + usuario con rol_nombre | 401 si token ausente/inválido/expirado
    """
    return UserOut.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(response: Response):
    """POST /auth/logout - Cerrar sesión

    Recibe: cookie access_token (automática)
    Hace:   limpia la cookie access_token (Max-Age=0)
    Devuelve: 200 + mensaje de confirmación
    """
    clear_token_cookie(response)
    return {"message": "Sesión cerrada"}
