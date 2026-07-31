from pydantic import BaseModel


class ApiKeyPayload(BaseModel):
    clave: str
    valor: str
    descripcion: str | None = None


class ApiKeyStatusResponse(BaseModel):
    configured: bool
    clave: str
    descripcion: str | None = None


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
