from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import ConflictError
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, LoginRequest
from app.services.audit_service import log_action
from app.services.auth_service import register_user, login_user, set_token_cookie, clear_token_cookie, hash_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/setup-status")
def setup_status(db: Session = Depends(get_db)):
    """Indica si el sistema necesita configuración inicial (sin usuarios)."""
    from app.core.first_run import initialize_database
    needs_setup = initialize_database(db)
    return {"needs_setup": needs_setup}


@router.post("/setup")
def setup_admin(data: UserCreate, response: Response, request: Request, db: Session = Depends(get_db)):
    """Crea el primer usuario administrador. Solo funciona si no hay usuarios."""
    if db.execute(select(func.count()).select_from(User)).scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El sistema ya tiene usuarios configurados",
        )

    admin_role = db.execute(
        select(Role).where(Role.nombre == "ADMINISTRADOR")
    ).scalars().first()

    if not admin_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Rol ADMINISTRADOR no encontrado",
        )

    if _exists(db, "username", data.username):
        raise ConflictError("El nombre de usuario ya está registrado")
    if _exists(db, "email", data.email):
        raise ConflictError("El email ya está registrado")

    hashed = hash_password(data.password)
    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hashed,
        nombre_completo=data.nombre_completo,
        rol_id=admin_role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    set_token_cookie(response, token)
    ip = request.client.host if request.client else "local"
    log_action(usuario=user.username, ip=ip, accion="SETUP", entidad="usuario", entidad_id=user.id, detalle=f"Setup inicial: administrador '{user.username}' creado")
    return UserOut.model_validate(user)


def _exists(db: Session, field: str, value: str) -> bool:
    column = getattr(User, field)
    stmt = select(User).where(column == value)
    return db.execute(stmt).scalars().first() is not None


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, response: Response, request: Request, db: Session = Depends(get_db)):
    """POST /auth/register - Registrar nuevo usuario

    Recibe: JSON body con username, email, password, nombre_completo, rol_id
    Hace:   valida datos con UserCreate, verifica duplicados, crea usuario, genera token y lo setea en cookie
    Devuelve: 201 + usuario creado + Set-Cookie | 422 si validación falla | 409 si username/email duplicado
    """
    user, token = register_user(db, data)
    set_token_cookie(response, token)
    ip = request.client.host if request.client else "local"
    log_action(usuario=user.username, ip=ip, accion="REGISTRO", entidad="usuario", entidad_id=user.id, detalle=f"Registro de usuario '{user.username}'")
    return UserOut.model_validate(user)


@router.post("/login", status_code=status.HTTP_200_OK)
def login(data: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    """POST /auth/login - Iniciar sesión

    Recibe: JSON body con username y password
    Hace:   autentica credenciales, genera token JWT y lo setea en cookie httpOnly
    Devuelve: 200 + usuario + Set-Cookie | 422 si validación falla | 401 si credenciales inválidas
    """
    result = login_user(db, data.username, data.password)
    if not result:
        ip = request.client.host if request.client else "local"
        log_action(usuario=None, ip=ip, accion="LOGIN_FALLIDO", entidad="auth", usuario_intentado=data.username, detalle=f"Intento de login fallido para '{data.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    user, token = result
    set_token_cookie(response, token)
    ip = request.client.host if request.client else "local"
    log_action(usuario=user.username, ip=ip, accion="LOGIN", entidad="auth", entidad_id=user.id, detalle=f"Login exitoso de '{user.username}'")
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
def logout(response: Response, request: Request):
    """POST /auth/logout - Cerrar sesión

    Recibe: cookie access_token (automática)
    Hace:   limpia la cookie access_token (Max-Age=0)
    Devuelve: 200 + mensaje de confirmación
    """
    clear_token_cookie(response)
    ip = request.client.host if request.client else "local"
    log_action(usuario=None, ip=ip, accion="LOGOUT", entidad="auth", detalle="Sesión cerrada")
    return {"message": "Sesión cerrada"}
