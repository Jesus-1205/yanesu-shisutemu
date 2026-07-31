from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    username: str
    email: EmailStr
    password: str
    nombre_completo: str
    rol_id: int


class UserUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    nombre_completo: str | None = None
    rol_id: int | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    nombre_completo: str
    rol_id: int
    rol_nombre: str
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str
