"""Script para generar y registrar una nueva API Key para integraciones M2M (ej. n8n).

Uso:
    python scripts/generate_api_key.py [nombre_del_agente]

Ejemplo:
    python scripts/generate_api_key.py n8n-bcv-agent
"""

import argparse
import secrets
import sys
import os

# Asegurar que backend está en el PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.core.dependencies import hash_api_key
from app.models.api_key import ApiKey


def create_api_key(name: str) -> tuple[ApiKey, str]:
    raw_key = f"ys_{secrets.token_urlsafe(32)}"
    key_hash = hash_api_key(raw_key)

    db = SessionLocal()
    try:
        api_key = ApiKey(name=name, key_hash=key_hash, is_active=True)
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        return api_key, raw_key
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Generar API Key para agentes M2M")
    parser.add_argument(
        "name",
        nargs="?",
        default="n8n-bcv-agent",
        help="Nombre descriptivo para la API Key (default: n8n-bcv-agent)",
    )
    args = parser.parse_args()

    api_key, raw_key = create_api_key(args.name)
    print("\n" + "=" * 60)
    print("  NUEVA API KEY GENERADA EXITOSAMENTE")
    print("=" * 60)
    print(f"ID:     {api_key.id}")
    print(f"Nombre: {api_key.name}")
    print(f"Token:  {raw_key}")
    print("-" * 60)
    print("IMPORTANTE: Guarda este token en un lugar seguro.")
    print("Debes configurarlo en el header 'X-API-Key' de tu agente n8n.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
