---
name: neet2work-refactor-components
description: Use when refactoring Neet2Work code toward OOP, components, clearer service boundaries, or better testability while preserving behavior.
---

# Neet2Work Refactor Components

Use this skill when the goal is structure improvement rather than new behavior.

## Procedure

1. State the behavior that must remain unchanged.
2. Identify responsibilities currently mixed together:
   - UI rendering
   - form/input state
   - API calls
   - domain rules
   - persistence
   - external API/RPA calls
3. Choose the smallest useful separation.
4. Prefer existing project patterns over new abstractions.
5. Introduce classes only when stateful collaboration or a stable interface makes the code simpler.
6. Keep public interfaces narrow and named by domain responsibility.
7. Add or preserve tests around the behavior being moved.
8. Run targeted tests before claiming behavior is preserved.

## Frontend Guidance

- Page components own route-level flow.
- Repeated UI or independently testable UI becomes a component.
- API calls stay in `src/api`.
- Domain display types stay in `src/types`.

## Backend Guidance

- Route owns HTTP parsing and response.
- Service owns business rules.
- Database/storage owns persistence.
- RPA collector owns browser scraping and normalization.

## Report Format

Include:

- before/after responsibility split
- changed files
- tests or checks run
- behavior preservation evidence

