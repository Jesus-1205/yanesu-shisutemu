# Arquitectura del Repositorio

```
Sistema_inventario/
├── .opencode/
│   ├── rules/
│   │   ├── architecture.md      # Este archivo
│   │   ├── backend_rules.md     # Reglas de backend FastAPI
│   │   ├── frontend_rules.md    # Reglas de frontend React
│   │   └── git_commit.md        # Conventional commits
├── AGENTS.md                    # Contexto inicial para el agente OpenCode
├── docs/
│   ├── MIGRATION_SQLITE.md      # Migración PostgreSQL → SQLite
│   ├── PENDING_TASKS.md         # Tareas pendientes
│   └── DESKTOP_BUILD_LOG.md     # Logs de build desktop
├── backend/                     # Organización por capas técnicas
│   ├── app/
│   │   ├── core/                # Config, DB (SQLite), JWT, hash, errores
│   │   │   ├── config.py        #   Configuración global y rutas de datos
│   │   │   ├── database.py      #   Motor SQLite + sessionmaker
│   │   │   ├── dependencies.py  #   get_current_user, require_role
│   │   │   ├── exceptions.py    #   ConflictError, EntityNotFoundError
│   │   │   ├── error_handler.py #   Handlers globales de errores
│   │   │   ├── logging_setup.py #   Logging / auditoría
│   │   │   ├── first_run.py     #   Inicialización en primer arranque
│   │   │   ├── port_manager.py  #   Gestión de puertos
│   │   │   ├── timezone.py      #   Zona horaria (America/Caracas)
│   │   │   └── bcv_scraper.py   #   Scraping de tasa BCV
│   │   ├── models/              # Modelos SQLAlchemy 2.0 (Mapped/mapped_column)
│   │   ├── schemas/             # Validaciones Pydantic v2 (BaseModel)
│   │   ├── routes/              # Routers de FastAPI (auth, products, sales, ...)
│   │   └── services/            # Lógica de negocio (gemini, auditoría, ventas, ...)
│   ├── tests/                   # Tests de backend (pytest + httpx)
│   │   ├── conftest.py          # Fixtures (app FastAPI, DB SQLite)
│   │   ├── test_auth.py         # Tests de integración de rutas
│   │   └── test_services/       # Tests unitarios de servicios
│   ├── alembic/                 # Migraciones Alembic (SQLite + PostgreSQL)
│   │   ├── env.py               #   Config: render_as_batch=True, naming_convention
│   │   └── versions/            #   Archivos de migración
│   ├── alembic.ini              # Configuración de Alembic
│   ├── .env.example
│   ├── run.py                   # Entrada de desarrollo (FastAPI / uvicorn)
│   ├── build.bat / build.spec   # Build empaquetado
│   └── requirements.txt         # Dependencias exclusivas de Python
├── frontend/                    # Organización por dominios (features)
│   ├── src/
│   │   ├── features/            # 19 módulos autocontenidos por dominio:
│   │   │   ├── auth/            #   Autenticación
│   │   │   ├── users/           #   Usuarios
│   │   │   ├── roles/           #   Roles y permisos
│   │   │   ├── suppliers/       #   Proveedores
│   │   │   ├── categories/      #   Categorías
│   │   │   ├── products/        #   Productos
│   │   │   ├── combos/          #   Combos
│   │   │   ├── sales/           #   Ventas / POS
│   │   │   ├── invoices/        #   Facturas
│   │   │   ├── payment-methods/ #   Métodos de pago
│   │   │   ├── price-rules/     #   Reglas de precio
│   │   │   ├── exchange-rates/  #   Tasas de cambio (BCV)
│   │   │   ├── reports/         #   Reportes
│   │   │   ├── dashboard/       #   Panel principal
│   │   │   ├── settings/        #   Configuración general
│   │   │   ├── system-settings/ #   Ajustes del sistema
│   │   │   ├── design-system/   #   Guía de componentes
│   │   │   ├── not-found/       #   Página 404
│   │   │   └── shared/          #   Componentes compartidos por features
│   │   ├── ui-components/       # Componentes UI reutilizables (Button, Input, Modal, Table)
│   │   ├── components/ui/       # Componentes UI base
│   │   ├── stores/              # Estado global (Zustand)
│   │   ├── hooks/               # Custom hooks globales
│   │   ├── services/            # Cliente HTTP base (api.ts)
│   │   ├── lib/                 # Utilidades (exportToExcel, tauri, text, utils)
│   │   ├── types/               # Tipos globales compartidos
│   │   ├── __tests__/           # Tests de frontend (vitest)
│   │   │   ├── setup.ts         #   Config testing-library
│   │   │   └── features/        #   Tests por feature
│   │   ├── App.tsx
│   │   ├── router.tsx           # Definición de rutas
│   │   └── main.tsx
│   ├── vitest.config.ts         # Configuración Vitest
│   ├── vite.config.ts           # Configuración Vite 6
│   └── package.json
└── licoreria-desktop/           # App desktop (Tauri 2)
    ├── src-tauri/
    └── package.json
```

## Instrucciones para Agentes de IA (OpenCode)

- **SQLAlchemy 2.0**: Antes de generar código Python, verifica que usas `select()`, `scalars()`, `Mapped`/`mapped_column`. Prohibido `session.query()`.
- **Pydantic v2**: Usar `model_dump()` (no `.dict()`), `ConfigDict` en vez de dict literal.
- **TypeScript**: Nunca usar `any`. Exportar interfaces en `frontend/src/types/` o `features/*/types.ts`.
- **SQLite**: La base de datos es SQLite, no PostgreSQL. No generar SQL de dialecto PostgreSQL ni dependencias de driver psycopg.
- **Errores**: Rutas FastAPI responden con `HTTPException` y código HTTP adecuado (400 validación, 401 no autenticado, 403 sin permisos, 404 no encontrado, 409 conflicto).
- **Resguardo de datos**: No generar comandos SQL destructivos (`DROP TABLE`, `TRUNCATE`) sin advertencia previa.
- **Testing**: Antes de generar nuevo código, verifica si existe un test asociado y mantenlo actualizado. Nueva funcionalidad = nuevo test.
- **Prohibido `create_all()` en producción**: Solo en tests. Alembic es el único mecanismo de creación de tablas.
