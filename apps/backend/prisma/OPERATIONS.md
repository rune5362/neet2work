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
- `job_postings.status, job_postings.last_seen_at`: lifecycle filtering and collection freshness review.
- `job_postings.job_category`: category filtering.
- `job_postings.career_stage`: career stage filtering.
- `job_postings.active_*`: partial public search indexes for active postings.
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
- `candidate_profiles`
- `application_documents`
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

## Session and token policy

Access tokens are HS256 JWTs signed with `JWT_SECRET`. The default access token TTL is `ACCESS_TOKEN_EXPIRES_IN_SECONDS=3600`.

Refresh tokens are stored in PostgreSQL in `refresh_tokens`. The API returns the raw refresh token only once in the login or refresh response. The database stores only a SHA-256 hash in `refresh_tokens.token_hash`.

The default refresh token TTL is `REFRESH_TOKEN_EXPIRES_IN_SECONDS=2592000` (30 days). Each refresh operation rotates the refresh token by revoking the current row with `revoked_at` and creating a new row. Logout revokes the provided refresh token and writes a `LOGGED_OUT` audit log.

Multiple devices are allowed. Each login creates an independent refresh token row. A revoked, expired, deleted, or unknown refresh token must be treated as invalid and must not issue a new access token.

## Authentication security policy

Passwords must never be stored or returned in plaintext. User-facing auth responses must never include `password_hash`.

Login failures use the generic message `이메일 또는 비밀번호가 올바르지 않습니다.` for invalid credentials and inactive statuses. The account lock message does not reveal whether an email exists.

Brute force protection has two layers:

- Per-route auth rate limiting in memory, controlled by `AUTH_RATE_LIMIT_WINDOW_SECONDS` and `AUTH_RATE_LIMIT_MAX_REQUESTS`.
- Per-account failed login locking, controlled by `LOGIN_MAX_FAILED_ATTEMPTS` and `LOGIN_LOCK_MINUTES`.

Production traffic must be served over HTTPS. In production, the Express app trusts the first reverse proxy and requires `req.secure` or `x-forwarded-proto: https` unless `REQUIRE_HTTPS=false` is explicitly configured for a non-public environment. HTTPS responses set HSTS.

CORS is restricted to the comma-separated `CLIENT_URL` allowlist. Do not use wildcard origins for authenticated endpoints.

CSRF protection is not required for the current bearer-token/body-token flow because authentication tokens are not stored in cookies. If refresh tokens move to HttpOnly cookies later, add SameSite cookie settings and CSRF tokens before enabling that flow.

Use Prisma query builders for database access. Avoid `$queryRaw` and `$executeRaw`; if raw SQL is unavoidable, use Prisma parameter binding and never interpolate user input.

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
