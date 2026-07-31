# Arquitectura del Repositorio

```
SRC/
├── .opencode/
│   ├── config.json
│   └── rules/
│       ├── architecture.md      # Este archivo
│       ├── backend_rules.md     # Reglas de backend FastAPI
│       ├── frontend_rules.md    # Reglas de frontend React
│       └── git_commit.md        # Convencional commits
├── AGENTS.md                    # Contexto inicial para el agente OpenCode
├── docs/
│   └── requirements.md          # Especificaciones funcionales del inventario
├── backend/                     # Organización por capas técnicas
│   ├── app/
│   │   ├── core/                # Configuración de JWT, hash, DB y dependencias
│   │   ├── models/              # Modelos SQLAlchemy 2.0 (Mapped/mapped_column)
│   │   ├── schemas/             # Validaciones Pydantic v2 (BaseModel)
│   │   ├── routes/              # Routers de FastAPI
│   │   └── services/            # Lógica de negocio e inventario
│   ├── tests/                   # Tests de backend (pytest)
│   │   ├── conftest.py          # Fixtures (app FastAPI, DB SQLite)
│   │   ├── test_auth.py         # Tests de integración de rutas
│   │   └── test_services/       # Tests unitarios de servicios
│   ├── .env.example
│   ├── main.py                  # Entrada de la app (FastAPI / uvicorn)
│   └── requirements.txt         # Dependencias exclusivas de Python
└── frontend/                    # Organización por dominios (features)
    ├── src/
    │   ├── features/             # Módulos autocontenidos por dominio
    │   │   ├── auth/             #   Autenticación
    │   │   │   ├── api/          #     Llamadas al backend
    │   │   │   ├── components/   #     UI específica
    │   │   │   ├── hooks/        #     Estado y lógica
    │   │   │   └── types.ts      #     Interfaces del dominio
    │   │   ├── suppliers/        # Proveedores
    │   │   │   ├── api/
    │   │   │   ├── components/
    │   │   │   ├── hooks/
    │   │   │   └── types.ts
    │   │   ├── products/         # Productos
    │   │   │   ├── api/
    │   │   │   ├── components/
    │   │   │   ├── hooks/
    │   │   │   └── types.ts
    │   │   ├── sales/            # Ventas
    │   │   │   ├── api/
    │   │   │   ├── components/
    │   │   │   ├── hooks/
    │   │   │   └── types.ts
    │   │   └── exchange-rates/   # Tasas de cambio
    │   │       ├── api/
    │   │       ├── components/
    │   │       ├── hooks/
    │   │       └── types.ts
    │   ├── shared/               # Componentes UI reutilizables (Button, Input, Modal, Table)
    │   ├── hooks/                # Custom hooks globales
    │   ├── services/             # Cliente HTTP base (axios/fetch configurado)
    │   ├── types/                # Tipos globales compartidos
    │   ├── __tests__/            # Tests de frontend (vitest)
    │   │   ├── setup.ts          #   Config testing-library
    │   │   └── features/         #   Tests por feature
    │   └── main.tsx
    ├── vitest.config.ts          # Configuración Vitest
    ├── vite.config.ts            # Configuración Vite 6
    └── package.json
```

## Instrucciones para Agentes de IA (OpenCode)

- **SQLAlchemy 2.0**: Antes de generar código Python, verifica que usas `select()`, `scalars()`, `Mapped`/`mapped_column`. Prohibido `session.query()`.
- **Pydantic v2**: Usar `model_dump()` (no `.dict()`), `ConfigDict` en vez de dict literal.
- **TypeScript**: Nunca usar `any`. Exportar interfaces en `frontend/src/types/`.
- **Errores**: Rutas FastAPI responden con `HTTPException` y código HTTP adecuado (400 validación, 401 no autenticado, 403 sin permisos, 404 no encontrado, 409 conflicto).
- **Resguardo de datos**: No generar comandos SQL destructivos (`DROP TABLE`, `TRUNCATE`) sin advertencia previa.
- **Testing**: Antes de generar nuevo código, verifica si existe un test asociado y mantenlo actualizado. Nueva funcionalidad = nuevo test.
