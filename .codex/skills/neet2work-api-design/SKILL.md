---
name: neet2work-api-design
description: Use when adding or changing Neet2Work Express REST endpoints, request validation, response shapes, or frontend API clients.
---

# Neet2Work API Design

Use this skill for REST API changes across backend and frontend.

## Procedure

1. Define endpoint path, method, request body/query, success response, and error cases.
2. Put input validation in the route with Zod or a schema exported from the service when it is shared.
3. Keep route handlers thin: parse input, call service, return response.
4. Put domain decisions in `services`.
5. Keep storage/database calls out of frontend and route handlers.
6. Use `{ data: ... }` for successful resource responses unless an existing endpoint pattern says otherwise.
7. Return opaque user-facing errors. Do not leak stack traces, internal paths, credentials, SQL, or provider responses.
8. Update frontend `api` client and shared types when the response shape changes.
9. Add or update tests around service behavior and request validation when risk is meaningful.

## Fallback Policy

API behavior must remain usable in local demo mode:

- missing `AI_API_KEY` -> mock analyzer path
- missing DB/R2 config -> explicit unavailable response or existing local fallback
- health checks should report configured/mock/local state clearly

