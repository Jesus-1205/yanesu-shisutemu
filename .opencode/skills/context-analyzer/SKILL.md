---
name: context-analyzer
description: >-
  Use when the user asks to analyze, inspect, understand the current state, map the end-to-end flow,
  or gather context about a specific topic, feature, module, database table, or flow in the codebase
  (e.g., "analyze the BCV exchange rate flow", "give me context on products module", "how does sales checkout work",
  "what files interact with invoices", "map the flow of X", "explain how Y is implemented across frontend and backend").
  This skill is STRICTLY READ-ONLY and focuses purely on discovering and summarizing the exact current state.
---

# Context Analyzer

Deep-dive, end-to-end, read-only analysis of any module, workflow, database entity, or feature in the codebase.

## Core Rules

1. **STRICTLY READ-ONLY:**
   - NEVER use `write`, `edit`, or modifying terminal commands.
   - Use only exploratory and reading tools: `grep`, `glob`, `read`, and `explore`.
   - Your sole responsibility is discovering, analyzing, and synthesizing the current state.

2. **Scoped & Agnostic to Outside Changes:**
   - Confine the analysis strictly to the target topic/module requested by the user.
   - If other branches or files outside this scope have uncommitted changes or unrelated modifications, ignore them completely. Focus only on the requested area.

3. **End-to-End Traceability (Full-Stack):**
   Trace the flow comprehensively across all technical layers (from DB to UI):
   - **Database / Models:** SQLAlchemy models (`backend/app/models/`), tables, constraints, relationships, precision/types.
   - **Backend Business Logic:** Services (`backend/app/services/`), calculations, validations, external integrations.
   - **Backend API Layer:** FastAPI routers (`backend/app/routes/`), Pydantic schemas (`backend/app/schemas/`), HTTP methods, status codes, dependencies.
   - **Frontend Services & Types:** TypeScript types/interfaces (`frontend/src/types/` or feature `types.ts`), API service calls (`frontend/src/services/` or feature services).
   - **Frontend State Management:** Global stores (Zustand in `frontend/src/stores/` or feature hooks).
   - **Frontend UI & Presentation:** Feature components (`frontend/src/features/*/`), route registrations (`router.tsx`), event handlers, user interaction points.

4. **Code References:**
   Always reference files and key functions using the standard `file_path:line_number` pattern.

5. **Stop & Await Next Steps:**
   - Present a clear, structured summary of the findings.
   - Do NOT propose speculative implementations, start writing code, or execute modifications.
   - Finish with the standard prompt asking the user for their desired next step.

---

## Investigation Workflow

### Step 1: Discover & Map Files
Locate all files relevant to the topic using batch search:
- Search backend models, schemas, services, and routes.
- Search frontend features, stores, services, types, and components.

### Step 2: Trace Data & Control Flow
- Trace from persistence layer upwards (DB $\rightarrow$ Service $\rightarrow$ Route $\rightarrow$ API Service $\rightarrow$ Store/Hook $\rightarrow$ UI Component) or vice versa.
- Note how data is transformed, validated, stored, and displayed.
- Check error handling, edge cases, and relevant business rules (e.g., currency precision, Decimal handling, permission checks).

### Step 3: Present Structured Report
Structure the report cleanly using GitHub-flavored Markdown:

```markdown
# Context Summary: <Topic / Feature Name>

## 1. Architectural Overview
Brief synopsis (2-3 sentences) of how this functionality works end-to-end.

## 2. Database & Models
- **Table / Model:** `<table_name>` in `backend/app/models/<file>.py:line`
- **Key Fields & Types:** Main columns, constraints, foreign keys.

## 3. Backend Layer
- **Schemas:** Pydantic DTOs in `backend/app/schemas/<file>.py:line`
- **Business Logic / Services:** Core functions in `backend/app/services/<file>.py:line`
- **API Endpoints:**
  - `METHOD /path` -> `handler_function` in `backend/app/routes/<file>.py:line` (Status: `XXX`, Roles: `...`)

## 4. Frontend Layer
- **Types:** Interfaces in `frontend/src/.../types.ts:line`
- **API Client:** Service functions in `frontend/src/.../api.ts:line`
- **State Management:** Zustand store or custom hook in `frontend/src/...:line`
- **UI & Components:**
  - Page / Container: `frontend/src/features/.../<Component>.tsx:line`
  - Subcomponents / Modals / Tables: `frontend/src/features/.../<Component>.tsx:line`
  - Route / Path: `frontend/src/router.tsx:line` (`/url-path`)

## 5. End-to-End Data Flow
1. **Trigger / UI Action:** User action in `<Component>` triggers `<handler>`.
2. **State & API Call:** Store/Service dispatches HTTP request with payload.
3. **Backend Processing:** Route receives request $\rightarrow$ Service processes & queries DB $\rightarrow$ Response returned.
4. **UI Update:** Response updates frontend state $\rightarrow$ Components re-render.

## 6. Key Notes & Constraints
- Specific business rules, permissions, edge cases, Decimal/precision handling, or dependencies observed.
```

### Step 4: Prompt for the Next Action
Conclude the response immediately with:
> *"¿Cuál es el siguiente paso? (ej. fix, feature, refactor)"* (or in the user's preferred language).
