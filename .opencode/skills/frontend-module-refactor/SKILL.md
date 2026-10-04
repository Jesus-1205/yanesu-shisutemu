---
name: frontend-module-refactor
description: Refactor any overloaded file in a frontend module into specialized custom hooks and small presentation components following strict React and testing best practices. Use this skill when asked to "refactor the X module", "clean up the X page", "split the X components", or "separate responsibilities in the frontend".
---

# Frontend Module Refactoring Workflow

You are tasked with refactoring a highly coupled React frontend module into a clean, separated architecture following strict best practices and Test-Driven Refactoring. The issue might not just be in the main page; "God Components" deep in the tree often mix concerns and need breaking down.

Your goal is to separate:
1. Business Logic and State Management (Custom Hooks)
2. Presentation (Small UI Components)
3. Orchestration (The Main Page or Parent Components)

## Step 1: Reconocimiento y Mapeo (Discovery)
1. Read the targeted file(s) (e.g., `*Page.tsx` or any bulky `*Component.tsx`) and the entire module structure. 
2. Identify "God Components": files mixing `useState`, `useEffect`, data fetching (`api.*`), calculations, and complex JSX.
3. Identify distinct visual or logical sections that can be extracted into pure components or separate hooks.
4. **CRITICAL:** Use the `glob` and `grep` tools to search the codebase (`src/ui-components`, `src/hooks`, `src/lib`, etc.) for existing components, utils, or hooks that already do what you need. DO NOT duplicate existing logic.

## Step 2: Extracción de Lógica (Custom Hooks)
1. Create dedicated custom hooks (e.g., `use[Feature]*.ts`) in the module's `hooks/` directory.
2. Move all complex state, API calls, logic, and derived values into these hooks.
3. Ensure each hook returns clean data, a `loading` Boolean, an `error` state (if applicable), and clear trigger/refetch functions.
4. **Testing Requirement:** Create a unit test for every extracted hook in `src/__tests__/features/[modulo]/`. Test initial states, successful logic, and error resilience.

## Step 3: Extracción de Presentación (Componentes Pequeños)
1. Extract bulky HTML/JSX blocks into separate, focused files in the module's `components/` directory.
2. Define exact, strict TypeScript interfaces for all component `props`. Provide strictly typed boundaries and NEVER use `any`.
3. Ensure these components are "dumb" (purely presentational)—they receive data and callbacks via props and do not manage business logic or fetch data themselves.
4. **Testing Requirement:** Create or update unit tests for these components in `src/__tests__/features/[modulo]/`.

## Step 4: Refactorización y Composición
1. Update the original bloated component(s) to import the new custom hooks and the new presentation components.
2. The original component should now act purely as a coordinator: calling the hook, handling the global `loading`/`error` UI, and distributing data to the pure children components.

## Step 5: Validación Estricta (Verification)
Before considering the task complete and explicitly before making any Git commits, you MUST:
1. Run `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm exec tsc -b` inside the `frontend/` directory to ensure no internal TypeScript type-checking errors.
2. Run `$env:PATH = "$env:APPDATA\fnm\node-versions\v24.18.0\installation;" + $env:PATH; pnpm test src/__tests__/features/[modulo]` to ensure all existing and new tests for the module are perfectly green.
3. Fix any errors encountered immediately. Do NOT declare the task finished until both verification steps resolve without errors.
