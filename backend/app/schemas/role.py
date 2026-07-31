from pydantic import BaseModel, ConfigDict


class RoleCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
