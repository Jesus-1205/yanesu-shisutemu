---
name: feature-planner
description: >-
  Use when the user wants to plan, architect, or design a new feature, workflow, or major refactor
  (e.g., "plan a new feature", "how should we implement X", "propose options for Y", "I want to add Z").
  This skill guides the user through gathering context, clarifying requirements, comparing 2-3 implementation
  strategies, and choosing a path BEFORE any code is written.
---

# Feature Planner

Architectural planning and strategy comparison skill. Your goal is to guide the user towards a solid, well-thought-out implementation plan while strictly avoiding writing any implementation code until the plan is approved.

## Strict Planning Workflow

You MUST follow this order sequentially. Do not proceed to the next step until the current step's conditions are met.

### Step 1: Context Verification & Clarification
Before proposing any architecture, ensure you have a complete picture.
1. **Context Check:** If you do not have sufficient context about the existing code affected by this requested feature, explicitly state this. You can optionally invoke the `context-analyzer` skill (via subagent or directly) to map the existing flow first.
2. **Clarification Questions:** If the user's input is ambiguous, lacks business logic rules, or leaves edge cases undefined (e.g., "Who has permission for this?", "How should decimals/taxes be handled here?"), ask **ALL** necessary clarifying questions right now.
3. **STOP HERE:** If you asked clarifying questions, stop your response immediately. **Do NOT generate the implementation options until the user answers your questions.**

### Step 2: Implementation Options (2-3 Strategies)
Once the context is clear and all questions are answered, present a minimum of 2 and a maximum of 3 distinct implementation options. Each option must take a functionally different architectural approach (e.g., Option A: Heavy Frontend logic vs. Option B: Backend-driven logic).

Present each option clearly, using this exact Markdown structure:

#### Option [Number]: [Descriptive Title]
- **Summary:** A 2-3 sentence description of the overarching strategy.
- **Pros:** Strengths and advantages of this approach.
- **Cons:** Weaknesses, technical debt, or potential risks.
- **Effort Level:** (Low / Medium / High).
- **System Changes Breakdown:**
  - *Database:* (e.g., new tables, SQLAlchemy model modifications, relationships).
  - *Backend:* (e.g., new FastAPI routes, Pydantic DTOs, logic in `services/`).
  - *Frontend:* (e.g., Zustand store additions, new hooks, TS type changes, UI component updates).
- **New Dependencies:** (List any external libraries required. If none, explicitly write "None").

### Step 3: Selection
At the end of presenting the options, explicitly ask the user for their decision:
> *"Which option do you prefer we move forward with, or would you like to tweak one of them?"*

### Step 4: Handoff to Implementation
Only **AFTER** the user has explicitly selected and approved an option:
1. Create a detailed, actionable `TodoList` breaking the chosen option down into step-by-step tasks.
2. Ask the user for permission to begin executing the first task on the list.
