# Prisma PostgreSQL Operations

This document defines the operating rules for development, staging, and production PostgreSQL databases.

## Environments

Each environment must use a separate PostgreSQL database and a separate `DATABASE_URL`.

| Environment | Owner | Migration command | Seed policy |
| --- | --- | --- | --- |
| Development | Each developer | `corepack pnpm run db:migrate` | Allowed for sample data |
| Staging | Release owner | `corepack pnpm run db:deploy` | Only reviewed staging data |
| Production | Release owner | `corepack pnpm run db:deploy` | Do not run seed unless explicitly approved |

Application code reads only `DATABASE_URL`. Environment separation is handled by deployment secrets or local `.env` files, not by changing source code.

## Migration Strategy

Development:

```bash
corepack pnpm run db:migrate
```

Use this only against local development databases. It can create new migration folders and may run development-only checks.

Create a migration without applying additional app changes:

```bash
corepack pnpm --filter @neet2work/backend run db:migrate:create -- --name change_name
```

Staging and production:

```bash
corepack pnpm run db:deploy
```

Use this for already-committed migrations. Do not use `prisma migrate dev` against staging or production.

Before production deploy:

1. Confirm the target `DATABASE_URL`.
2. Run migrations on a staging database restored from a recent production-like backup when possible.
3. Review generated SQL under `apps/backend/prisma/migrations/`.
4. Confirm backup completion before applying migrations.
5. Apply with `corepack pnpm run db:deploy`.

## Index Policy

Current operational indexes:

- `job_postings.created_at`: job listing ordering and recent data review.
- `job_postings.deleted_at`: soft delete filtering.
- `job_postings.country`: country filtering.
- `job_postings.source, job_postings.collected_at`: source-based collection queries.
- `resume_analyses.created_at`: analysis history ordering.
- `resume_analyses.deleted_at`: soft delete filtering.
- `resume_analyses.job_id`: lookup by job posting.

Planned authentication indexes:

- `users.email`: unique login identifier.
- `users.deleted_at`: soft delete filtering.
- `users.created_at`: user listing and audit review ordering.

## Common Columns

Major tables should use the same audit and lifecycle columns:

- `id`: primary key.
- `created_at`: creation timestamp.
- `updated_at`: last update timestamp.
- `deleted_at`: nullable soft delete marker.
- `created_by`: nullable actor id for creation.
- `updated_by`: nullable actor id for updates.
- `deleted_by`: nullable actor id for soft delete.

For existing tables, newly added actor and soft delete columns stay nullable to avoid unsafe backfills. New tables should include these columns from the first migration unless the table is append-only infrastructure data.

## Soft Delete Scope

Soft delete applies to user-owned or user-visible domain data. Current scope:

- `job_postings`
- `resume_analyses`

Future authentication tables such as `users` should also include `deleted_at` and `deleted_by`. Append-only audit logs should not be soft deleted by default.

## Backup Policy

Production PostgreSQL must have automated backups enabled before accepting user data.

- Frequency: at least daily full backup.
- Retention: at least 7 days for early service operation.
- Before schema deploys: take or confirm a fresh backup.
- Restore test: verify restore procedure after initial production setup and after major DB changes.

## Recovery Scenario

For migration failure:

1. Stop the application deploy that depends on the failed migration.
2. Capture the failed migration name and database error.
3. Check `corepack pnpm run db:status` against the affected environment.
4. If no data was changed, fix the migration and redeploy.
5. If data may have changed, restore from the latest verified backup or write a forward-only repair migration.

For database outage:

1. Confirm whether the issue is application connectivity, credentials, network, or PostgreSQL availability.
2. Keep the application in fallback or maintenance mode when possible.
3. Restore service from the managed database console or the latest backup.
4. Run `corepack pnpm run db:status` after recovery.
5. Verify core read/write flows before reopening traffic.
