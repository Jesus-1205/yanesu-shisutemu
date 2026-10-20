# Sistema de Control de Inventario (Yanesu Shisutemu)

Eres un ingeniero de software experto asignado a este proyecto. Desarrolla código robusto, escalable y seguro siguiendo las directrices del repositorio.

## Enrutamiento de Reglas

Antes de modificar, crear o analizar cualquier archivo, lee el archivo de reglas correspondiente al dominio de tu tarea:

- **Arquitectura global o flujos:** `.opencode/rules/architecture.md`
- **Backend (FastAPI, SQLAlchemy, Pydantic, SQLite, tests):** `.opencode/rules/backend_rules.md`
- **Frontend (React 19, TypeScript, Tailwind v4, vitest):** `.opencode/rules/frontend_rules.md`
- **Commits Git:** `.opencode/rules/git_commit.md`

## Stack Tecnológico

- **Backend:** Python 3.12+ | FastAPI 0.115.6 | SQLAlchemy 2.0.51 | Pydantic 2.13.4 | uvicorn 0.34
- **Base de Datos:** SQLite (archivo `yanesu.db` en `%LOCALAPPDATA%/YanesuShisutemu/data/`)
- **Frontend:** React 19 | TypeScript 5.7 | Vite 6 | Tailwind CSS v4 | Zustand 5 | Recharts 3
- **Desktop:** Tauri 2 (`licoreria-desktop/`)
- **Autenticación:** JWT HS256 en cookie httpOnly (python-jose 3.3.0) + passlib[bcrypt]
- **Integraciones:** Google Gemini API, scraping BCV (beautifulsoup4 + requests), encriptación Fernet

## Estructura del Repositorio

```
Sistema_inventario/
├── backend/                  # FastAPI (organización por capas)
│   ├── app/
│   │   ├── core/             # Config, DB (SQLite), JWT, errores, first_run, port_manager
│   │   ├── models/           # SQLAlchemy 2.0 (Mapped/mapped_column)
│   │   ├── schemas/          # Pydantic v2 (BaseModel)
│   │   ├── routes/           # Routers FastAPI (auth, sales, invoices, products, ...)
│   │   └── services/         # Lógica de negocio (gemini, bcv, auditoría, encriptación, ...)
│   ├── tests/                # Tests (pytest + httpx)
│   ├── sql/                  # Scripts SQL de normalización
│   ├── run.py                # Entrada de desarrollo
│   └── requirements.txt
├── frontend/                 # React 19 (organización por features)
│   └── src/
│       ├── features/         # 19 módulos autocontenidos: auth, products, sales,
│       │                     #   invoices, combos, suppliers, categories,
│       │                     #   exchange-rates, price-rules, payment-methods,
│       │                     #   reports, roles, users, settings, dashboard, ...
│       ├── ui-components/    # Componentes UI reutilizables (Button, Modal, Table, ...)
│       ├── components/ui/    # Componentes UI base
│       ├── stores/           # Estado global (Zustand)
│       ├── hooks/            # Custom hooks globales
│       ├── services/         # Cliente HTTP (api.ts)
│       ├── lib/              # Utilidades (exportToExcel, tauri, text)
│       ├── types/            # Tipos globales compartidos
│       └── __tests__/        # Tests de frontend (vitest)
├── licoreria-desktop/        # App desktop Tauri 2
├── docs/                     # Documentación (MIGRATION_SQLITE, PENDING_TASKS, ...)
└── .opencode/rules/          # Reglas por dominio
```

## Directrices Críticas

- SQLAlchemy 2.0 (`select()`/`scalars()`/`Mapped`), prohibido `session.query()`
- Pydantic v2 (`model_dump()`/`ConfigDict`), prohibido `.dict()`
- **Decimales**: dinero, stock y tasas SIEMPRE con `Decimal`/`DECIMAL`, NUNCA `float` (es un sistema de inventario: un centavo o un descuadre es un fallo grave). Ver sección 0 de `backend_rules.md`
- TypeScript sin `any`, interfaces en `types/` o `features/*/types.ts`
- Base de datos **SQLite** (no PostgreSQL): no generar SQL de dialecto incompatible
- **Prohibido `create_all()` en producción**: Solo en tests. Alembic es el único mecanismo de creación de tablas.
- Rutas FastAPI delgadas: HTTP en `routes/`, lógica de negocio en `services/`
- NO hacer `git commit` ni `git push` a menos que el usuario lo solicite explícitamente

## Flujo de Trabajo

1. Lee este archivo (`AGENTS.md`).
2. Identifica la tarea asignada por el desarrollador.
3. Carga el archivo de reglas adecuado de `.opencode/rules/`.
4. Inspecciona si el módulo cuenta con tests existentes antes de escribir código.
5. Ejecuta los tests existentes para verificar que no rompes nada, luego presenta los cambios.

## Agentes

Ver `.opencode/agents/` para agentes especializados (auditoría, testing, security, etc.). Usa `@nombre-del-agente` para invocar subagentes o **Tab** para cambiar de agente principal.
