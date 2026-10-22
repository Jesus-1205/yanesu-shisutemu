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
├── README.md                    # Documentación principal del proyecto
├── LICENSE                      # Licencia MIT
├── docker-compose.yml           # Orquestación VPS (Postgres 16, FastAPI, Nginx, n8n)
├── docs/
│   ├── specs/                   # Especificaciones de ingeniería (Capítulos 01 al 07)
│   ├── PERFORMANCE_OPTIMIZATION_REPORT.md # Informe de rendimiento y latencias
│   ├── DEPLOY_VPS.md            # Guía de despliegue en VPS (Docker + SSL)
│   ├── N8N_INTEGRATION.md       # Automatizaciones M2M y bot Telegram
│   ├── MIGRATION_SQLITE.md      # Referencia de migración relacional
│   ├── PENDING_TASKS.md         # Tareas pendientes
│   └── DESKTOP_BUILD_LOG.md     # Logs de compilación desktop
├── backend/                     # Organización por capas técnicas
│   ├── app/
│   │   ├── core/                # Config, DB (SQLite/PostgreSQL), JWT, hash, errores
│   │   │   ├── config.py        #   Configuración global y rutas de datos
│   │   │   ├── database.py      #   Motor dual SQLite/Postgres + sessionmaker
│   │   │   ├── dependencies.py  #   get_current_user, require_role
│   │   │   ├── exceptions.py    #   ConflictError, EntityNotFoundError
│   │   │   ├── error_handler.py #   Handlers globales de errores
│   │   │   ├── logging_setup.py #   Logging / auditoría
│   │   │   ├── first_run.py     #   Inicialización en primer arranque
│   │   │   ├── port_manager.py  #   Gestión de puertos (Desktop)
│   │   │   ├── timezone.py      #   Zona horaria (America/Caracas)
│   │   │   └── bcv_scraper.py   #   Scraping de tasa BCV
│   │   ├── models/              # Modelos SQLAlchemy 2.0 (Mapped/mapped_column)
│   │   ├── schemas/             # Validaciones Pydantic v2 (BaseModel)
│   │   ├── routes/              # Routers de FastAPI (auth, products, sales, ...)
│   │   └── services/            # Lógica de negocio (gemini, auditoría, ventas, ...)
│   ├── scripts/                 # Herramientas y utilidades CLI
│   │   ├── seed_demo_data.py    #   Orquestador CLI de datos demo
│   │   ├── demo_dataset.py      #   Catálogo base de demostración
│   │   ├── generate_api_key.py  #   Generación de API Keys M2M (SHA-256)
│   │   ├── benchmark_suite.py   #   Suite de telemetría y latencias
│   │   └── migrate_sqlite_to_postgres.py # Utilidad de migración relacional
│   ├── tests/                   # Tests de backend (pytest + httpx)
│   │   ├── conftest.py          # Fixtures (app FastAPI, DB SQLite efímera)
│   │   ├── test_auth.py         # Tests de integración de rutas
│   │   └── test_services/       # Tests unitarios de servicios
│   ├── alembic/                 # Migraciones Alembic (SQLite + PostgreSQL)
│   │   ├── env.py               #   Config: render_as_batch=True, naming_convention
│   │   └── versions/            #   Archivos de migración
│   ├── alembic.ini              # Configuración de Alembic
│   ├── Dockerfile               # Contenedor de backend (Python 3.12-slim)
│   ├── entrypoint.sh            # Script de inicio (migraciones + seed inicial + uvicorn)
│   ├── pytest.ini               # Configuración de suites pytest
│   ├── .env.example
│   ├── run.py                   # Entrada de desarrollo (FastAPI / uvicorn)
│   ├── build.bat / build.spec   # Build empaquetado (PyInstaller)
│   └── requirements.txt         # Dependencias de Python
├── frontend/                    # Organización por dominios (features)
│   ├── src/
│   │   ├── features/            # 19 módulos autocontenidos por dominio:
│   │   │   ├── auth/            #   Autenticación
│   │   │   ├── users/           #   Usuarios
│   │   │   ├── suppliers/       #   Proveedores
│   │   │   ├── categories/      #   Categorías
│   │   │   ├── products/        #   Productos
│   │   │   ├── combos/          #   Combos
│   │   │   ├── sales/           #   Ventas / POS
│   │   │   ├── invoices/        #   Facturas
│   │   │   ├── retornables/     #   Envases retornables y casilleros
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
- **Base de Datos Dual (PostgreSQL / SQLite)**: La arquitectura es híbrida: PostgreSQL 16 con `psycopg` en Cloud VPS (Docker Compose), y SQLite en modo Desktop (Tauri 2) y tests. Todo código SQL o migración debe mantener estricta compatibilidad multi-dialecto en SQLAlchemy 2.0 (usar `select()`, `sa.func.now()`, `render_as_batch=True`; no acoplar lógica a sintaxis o funciones exclusivas de un único dialecto).
- **Errores**: Rutas FastAPI responden con `HTTPException` y código HTTP adecuado (400 validación, 401 no autenticado, 403 sin permisos, 404 no encontrado, 409 conflicto).
- **Resguardo de datos**: No generar comandos SQL destructivos (`DROP TABLE`, `TRUNCATE`) sin advertencia previa.
- **Testing**: Antes de generar nuevo código, verifica si existe un test asociado y mantenlo actualizado. Nueva funcionalidad = nuevo test.
- **Prohibido `create_all()` en producción**: Solo en tests. Alembic es el único mecanismo de creación de tablas.
