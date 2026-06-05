<!--
## Sync Impact Report

- Version change: N/A → 1.0.0 (initial ratification)
- Modified principles: N/A (first constitution)
- Added sections: Core Principles, Out-of-Scope Guardrails, AI Usage Rules, Governance
- Removed sections: N/A
- Templates requiring updates:
  - ✅ `.specify/templates/plan-template.md` — Constitution Check section reviewed; no updates needed (gates filled dynamically by /speckit-plan)
  - ✅ `.specify/templates/spec-template.md` — No constitution-driven mandatory section changes needed
  - ✅ `.specify/templates/tasks-template.md` — No new principle-driven task types required beyond existing categories
- Follow-up TODOs: None
-->

# Scribble Assignment Constitution

## Core Principles

### I. Brownfield-First
Every change begins with reading and understanding the existing code. New code MUST align with existing patterns and file conventions. Rewriting the starter from scratch is forbidden. Changes must leave the codebase more comprehensible, not less.

- MUST read relevant files before writing new code
- MUST extend existing routes, components, and models rather than replacing them
- MUST commit in granular, traceable slices tied to the spec

### II. HTTP Polling Only
All real-time synchronization between players is achieved via HTTP polling at approximately 2-second intervals. No WebSockets, Server-Sent Events, or long-polling are permitted.

- MUST implement lobby and gameplay sync via periodic GET requests
- MUST NOT introduce WebSocket libraries or event-stream mechanisms
- Polling intervals SHOULD be approximately 2 seconds unless a scenario specifies otherwise

### III. In-Memory State Only
All game state lives in the backend process memory. There is no database, file-system persistence, or caching layer. Restarting the backend clears all rooms.

- MUST store all room and game state in the existing in-memory store (`backend/src/services/roomStore.ts`)
- MUST NOT introduce any database drivers, ORM, or persistent storage
- Callers MUST NOT assume state persists across backend restarts

### IV. Acceptance-Driven Implementation
Each gameplay scenario has explicit acceptance criteria in the spec. A scenario is not complete until manually verified with two browser tabs against those criteria. AI-generated output MUST be reviewed and confirmed correct before committing.

- MUST verify each scenario with two open browser tabs before moving to the next
- MUST NOT commit untested code as complete
- Each commit MUST map to a specific task in `tasks.md`

### V. Minimal Dependencies
The project MUST NOT introduce new top-level dependencies not already present in the starter, unless the addition is explicitly justified in the spec or plan.

- MUST NOT add new state-management or routing libraries
- MUST NOT add new UI frameworks beyond what the starter ships
- New packages MUST be documented and justified in the plan

## Out-of-Scope Guardrails

The following are permanently out of scope. Spec, plan, tasks, and implementation MUST NOT include them:

- WebSockets or real-time event streams of any kind
- Databases or persistent storage of any kind
- User authentication, accounts, or sessions
- Deployment, hosting, CI, or Docker configuration
- Multiple rounds, drawer rotation, timers, countdowns, or scoring bonuses
- Custom or random word packs beyond the starter seed
- Spectator mode, moderation, room passwords, or invite links
- Unrelated refactors or rewrites of the starter codebase

If a proposed change touches any of these areas, it MUST be flagged and removed before committing.

## AI Usage Rules

AI-generated code and artifacts are starting points, not finished products.

- Every AI-generated code block MUST be reviewed line-by-line before committing
- Spec, plan, and task artifacts MUST reflect human judgment, not be accepted wholesale
- AI suggestions that violate any Core Principle MUST be rejected regardless of apparent quality
- Commits MUST be granular and explainable — each commit SHOULD map to a specific task in `tasks.md`

## Governance

This constitution supersedes all other practices and preferences for this project. Amendments require:

1. A documented rationale tied to a spec or business scenario
2. An update to this file with a version increment following semantic versioning
3. A propagation check across dependent templates and artifacts

All pull requests MUST verify that implementation behavior matches the spec. Deviations MUST be documented before merging.

**Version**: 1.0.0 | **Ratified**: 2026-06-03 | **Last Amended**: 2026-06-03
