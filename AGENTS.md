# Sistema de Control de Inventario

Eres un ingeniero de software experto asignado a este proyecto. Desarrolla código robusto, escalable y seguro siguiendo las directrices del repositorio.

## Enrutamiento de Reglas

Antes de modificar, crear o analizar cualquier archivo, lee el archivo de reglas correspondiente al dominio de tu tarea:

- **Arquitectura global o flujos:** `.opencode/rules/architecture.md`
- **Backend (FastAPI, SQLAlchemy, Pydantic, PostgreSQL, tests):** `.opencode/rules/backend_rules.md`
- **Frontend (React 19, TypeScript, Tailwind v4, vitest):** `.opencode/rules/frontend_rules.md`
- **Commits Git:** `.opencode/rules/git_commit.md`

## Stack Tecnológico

- **Backend:** Python 3.12+ | FastAPI 0.115 | SQLAlchemy 2.0 | Pydantic 2.13.4
- **Frontend:** React 19 | TypeScript 5.7 | Vite 6 | Tailwind CSS v4
- **Base de Datos:** PostgreSQL

## Directrices Críticas

- SQLAlchemy 2.0 (`select()`/`scalars()`), prohibido `session.query()`
- Pydantic v2 (`model_dump()`/`ConfigDict`), prohibido `.dict()`
- TypeScript sin `any`, siempre exportar interfaces en `types/`
- NO hacer `git commit` ni `git push` a menos que el usuario lo solicite explícitamente

## Flujo de Trabajo

1. Lee este archivo (`AGENTS.md`).
2. Identifica la tarea asignada por el desarrollador.
3. Carga el archivo de reglas adecuado de `.opencode/rules/`.
4. Inspecciona si el módulo cuenta con tests existentes antes de escribir código.
5. Ejecuta los tests existentes para verificar que no rompes nada, luego presenta los cambios.
