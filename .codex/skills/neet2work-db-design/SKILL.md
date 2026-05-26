---
name: neet2work-db-design
description: Use when changing Neet2Work Prisma models, PostgreSQL constraints, indexes, migrations, seed data, soft delete behavior, or audit logging.
---

# Neet2Work DB Design

Use this skill before editing `apps/backend/prisma/**` or DB-backed service logic.

## Procedure

1. Identify the domain rule, not just the table shape.
2. List affected models, relations, and service methods.
3. Decide required fields, nullable fields, defaults, enums, and timestamps.
4. Define PK, FK, unique constraints, and indexes.
5. Check soft delete implications. Unique constraints must not accidentally block valid re-creation flows.
6. Check audit logging implications for user/account/security-sensitive changes.
7. Update Prisma model files and migration together.
8. Update seed/import scripts if the schema change affects sample data.
9. Regenerate Prisma client with `corepack pnpm run db:generate`.
10. Run targeted backend tests, then broader checks if API behavior changed.

## Neet2Work Constraints

- Do not edit `apps/backend/src/generated/prisma/` directly.
- Do not commit local DB data or `.env`.
- Keep local/demo fallback behavior explicit.
- Prefer service-level transactions for multi-write flows.

