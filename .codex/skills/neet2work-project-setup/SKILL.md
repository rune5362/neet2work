---
name: neet2work-project-setup
description: Use when starting a new Neet2Work feature, restructuring a feature area, or deciding folder/API/service boundaries for production-ready but mock-friendly implementation.
---

# Neet2Work Project Setup

Use this skill for feature planning or non-trivial structure changes in Neet2Work.

## Procedure

1. Define the user flow and MVP boundary.
2. Identify the domain objects touched by the flow.
3. Decide whether the change belongs in frontend, backend, DB, RPA, or multiple layers.
4. Keep existing folder boundaries:
   - frontend: `api`, `components`, `pages`, `types`
   - backend: `routes`, `services`, `database`, `storage`, `rpa`, `types`, `errors`
5. Preserve Mock-first behavior. Decide what happens when AI key, PostgreSQL, or R2 config is missing.
6. Define API contracts before wiring UI to backend.
7. Check whether Prisma schema, seed data, local JSON samples, or tests need updates.
8. Implement the smallest structure that makes the responsibility clear.
9. Verify with the narrowest useful command, then broaden to `corepack pnpm run check` when behavior crosses layers.

## Output Expectations

When reporting the work, include:

- changed feature boundary
- files touched
- fallback behavior
- verification command and result
- remaining risk, if any

