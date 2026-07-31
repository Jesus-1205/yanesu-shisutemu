from sqlalchemy import select, text
from app.core.database import SessionLocal
from app.models.role import Role
from app.models.user import User
from app.models.payment_method import PaymentMethod
from app.services.auth_service import hash_password

DEFAULT_ROLES = ["ADMINISTRADOR", "OPERADOR"]

DEFAULT_PAYMENT_METHODS = [
    {"nombre": "DIVISAS", "moneda_default": "USD", "acepta_referencia": False, "activo": True},
    {"nombre": "EFECTIVO", "moneda_default": "VES", "acepta_referencia": False, "activo": True},
    {"nombre": "PUNTO_DE_VENTA", "moneda_default": "VES", "acepta_referencia": False, "activo": True},
    {"nombre": "PAGO_MOVIL", "moneda_default": "VES", "acepta_referencia": True, "activo": True},
]

DEFAULT_USERS = [
    {
        "username": "admin",
        "email": "admin@licoreria.com",
        "password": "admin123",
        "nombre_completo": "Administrador del Sistema",
        "rol_nombre": "ADMINISTRADOR",
    },
    {
        "username": "operator",
        "email": "operator@licoreria.com",
        "password": "op123",
        "nombre_completo": "Operador de Turno",
        "rol_nombre": "OPERADOR",
    },
]


def seed():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        print("Base de datos no disponible. Omitiendo seed.")
        return

    for role_name in DEFAULT_ROLES:
        stmt = select(Role).where(Role.nombre == role_name)
        role = db.execute(stmt).scalar_one_or_none()
        if role:
            print(f"Rol '{role_name}' ya existe.")
        else:
            db.add(Role(nombre=role_name))
            db.commit()
            print(f"Rol '{role_name}' creado.")

    role_cache: dict[str, int] = {}
    for role_name in DEFAULT_ROLES:
        stmt = select(Role).where(Role.nombre == role_name)
        role = db.execute(stmt).scalar_one()
        role_cache[role_name] = role.id

    for pm_data in DEFAULT_PAYMENT_METHODS:
        stmt = select(PaymentMethod).where(PaymentMethod.nombre == pm_data["nombre"])
        existing = db.execute(stmt).scalar_one_or_none()
        if existing:
            print(f" Método de pago '{pm_data['nombre']}' ya existe.")
        else:
            db.add(PaymentMethod(
                nombre=pm_data["nombre"],
                moneda_default=pm_data["moneda_default"],
                acepta_referencia=pm_data["acepta_referencia"],
                activo=pm_data["activo"],
            ))
            db.commit()
            print(f" Método de pago '{pm_data['nombre']}' creado.")

    for user_data in DEFAULT_USERS:
        stmt = select(User).where(User.username == user_data["username"])
        user = db.execute(stmt).scalar_one_or_none()
        if user:
            print(f"Usuario '{user_data['username']}' ya existe.")
            continue

        user = User(
            username=user_data["username"],
            email=user_data["email"],
            hashed_password=hash_password(user_data["password"]),
            nombre_completo=user_data["nombre_completo"],
            rol_id=role_cache[user_data["rol_nombre"]],
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Usuario '{user_data['username']}' creado con rol '{user_data['rol_nombre']}'.")

    db.close()
    print("Seed completado.")


if __name__ == "__main__":
    seed()
