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
- `users.email`: unique login identifier.
- `users.deleted_at`: soft delete filtering.
- `users.created_at`: user listing and audit review ordering.
- `audit_logs.actor_id`: actor history lookup.
- `audit_logs.target_id`: target history lookup.
- `audit_logs.action`: event type filtering.
- `audit_logs.created_at`: audit timeline ordering.

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
- `users`

Append-only audit logs should not be soft deleted by default.

Soft delete rules:

- Do not call Prisma `delete` or `deleteMany` for scoped tables in application code.
- Set `deleted_at` and `deleted_by` instead.
- Set `users.status` to `DELETED` when a user leaves.
- Default user-facing reads must include `deleted_at IS NULL`.
- Login lookup must require `users.deleted_at IS NULL` and `users.status = 'ACTIVE'`.
- Deleted emails are not reusable while `users.email` remains globally unique.
- Account recovery is allowed by clearing `deleted_at`/`deleted_by` and restoring a non-deleted status through an explicit recovery flow.
- Personal data masking for deleted users is deferred until the withdrawal flow is implemented.

## Audit Logs

Audit logs are append-only security records. Do not store passwords, password hashes, access tokens, refresh tokens, raw credentials, or full request/response bodies in `audit_logs.metadata`.

Required authentication events:

- `USER_SIGNED_UP`
- `LOGIN_SUCCEEDED`
- `LOGIN_FAILED`
- `LOGGED_OUT`
- `PASSWORD_CHANGED`
- `USER_WITHDREW`
- `ACCOUNT_LOCKED`
- `ACCOUNT_UNLOCKED`

Use `actor_id` for the authenticated user performing an action. Use `target_id` for the affected user or record. For anonymous login failures, keep `actor_id` null and put only non-sensitive summary metadata, such as normalized reason codes.

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
