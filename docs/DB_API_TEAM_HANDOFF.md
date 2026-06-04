# DB/API Team Handoff Contract

이 문서는 팀원들이 각자 다른 개인 DB를 쓰더라도 Neet2Work 백엔드와
프론트엔드가 같은 계약으로 동작하게 만드는 기준이다.

핵심 결론:

- 실제 개인 DB 덤프나 `.env`를 공유하지 않는다.
- 공유 단위는 `schema.prisma`, `prisma/migrations/`, `seed.ts`,
  `.env.example`, `docs/API_CONTRACT.md`이다.
- DB 서버는 각자 달라도 되지만, DB 엔진은 PostgreSQL 17 호환이어야 한다.
- 프론트엔드는 DB나 Supabase/RDS에 직접 붙지 않고 항상 backend REST API만
  호출한다.

## Canonical Files

| 목적 | 파일 |
| --- | --- |
| DB 모델 기준 | `apps/backend/prisma/schema.prisma` |
| DB 재현 기준 | `apps/backend/prisma/migrations/` |
| 최소 샘플 데이터 | `apps/backend/prisma/seed.ts`, `apps/backend/data/sampleJobs.json` |
| API 계약 | `docs/API_CONTRACT.md` |
| 환경변수 계약 | `.env.example` |
| DB 운영 설명 | `apps/backend/prisma/README.md` |

팀원에게 파일을 따로 압축해서 보내기보다 Git으로 위 파일들이 포함된 최신
커밋을 받게 하는 것이 정식 경로다.

## DB Compatibility Contract

지원 DB:

- PostgreSQL 17
- PostgreSQL 호환 개인 개발 DB
- Supabase Postgres, AWS RDS PostgreSQL, Docker PostgreSQL, 로컬
  PostgreSQL

지원하지 않는 DB:

- MySQL
- MariaDB
- SQLite
- MongoDB
- PostgreSQL과 호환되지 않는 DBaaS

이 프로젝트의 현재 schema는 PostgreSQL 전용 기능을 사용한다.

| 기능 | 사용 위치 | 주의 |
| --- | --- | --- |
| `TEXT[]` | `skills`, analysis 배열 필드 | MySQL/SQLite로 그대로 이전 불가 |
| `JSONB` | `company_info`, `raw_json`, `classifier_meta` | PostgreSQL 필요 |
| enum type | `AnalysisMode`, `JobPostingStatus` | migration 순서 필요 |
| `pg_trgm` extension | public job search indexes | DB 사용자가 extension 생성 권한을 가져야 함 |
| RLS enabled | `job_postings`, `resume_analyses` | 브라우저 직접 DB 접근 금지 |

`pg_trgm` extension 생성 권한이 없는 개인 DB에서는 migration이 실패할 수
있다. 이 경우 DB 관리자 권한으로 extension을 먼저 활성화하거나, 권한 있는
개인 개발 DB를 사용한다.

RLS가 켜져 있으므로 backend가 쓰는 DB role은 migration을 실행한 owner role
또는 RLS를 통과할 수 있는 서버 전용 role이어야 한다. 브라우저용 anon/auth
role로 이 API를 직접 구현하면 현재 계약과 다르다.

## Current Migration Order

Prisma migration은 폴더명 정렬 순서대로 적용된다. 현재 기준 순서는 다음과
같다.

```txt
1. 00000000000000_init
2. 20260514000000_job_posting_collection_fields
3. 20260514001000_array_defaults
4. 20260514002000_enable_public_table_rls
5. 20260515080000_job_posting_operational_lifecycle
6. 20260519090000_public_job_search_indexes
```

이미 Git에 공유된 migration은 수정하거나 삭제하지 않는다. DB 구조가
바뀌면 새 migration을 추가한다.

## Teammate Setup Flow

프로젝트 루트에서 실행한다.

```bash
git pull
corepack pnpm run setup
```

루트 `.env`에 본인 개인 PostgreSQL 연결 정보를 넣는다.

```env
DATABASE_URL=postgresql://user@host:5432/neet2work?sslmode=require
DATABASE_PASSWORD=your-local-password-if-url-is-passwordless
```

비밀번호를 `DATABASE_URL`에 직접 넣어도 되지만, 채팅이나 문서에 전체 URL을
붙여넣는 실수를 줄이려면 `DATABASE_PASSWORD`를 따로 쓰는 방식이 낫다.

그 다음 개인 DB에 schema와 seed를 적용한다.

```bash
corepack pnpm run db:generate
corepack pnpm run db:deploy
corepack pnpm run db:seed
```

서버를 실행한다.

```bash
corepack pnpm run dev:backend
```

성공 기준:

```http
GET http://localhost:3000/health
```

```json
{
  "ok": true,
  "database": "connected",
  "ai": "mock",
  "storage": "local"
}
```

DB를 아직 연결하지 않아도 demo fallback은 살아 있어야 한다. 이때
`database`는 `not_configured` 또는 `unavailable`일 수 있다.

## API Contract Boundary

프론트엔드 계약은 `docs/API_CONTRACT.md`가 기준이다.

현재 프론트엔드가 직접 호출하는 backend endpoint:

```txt
GET  /health
GET  /api/jobs
GET  /api/jobs/facets
GET  /api/jobs/:id
POST /api/analyze
```

프론트엔드 환경변수:

```env
VITE_API_BASE_URL=http://localhost:3000
```

금지:

- 프론트엔드에서 Supabase/RDS/local DB를 직접 호출
- 브라우저에 DB URL, DB password, service role key 노출
- 팀원별 DB provider에 종속된 응답 shape 추가

API 응답 shape를 바꾸려면 다음을 같은 변경으로 묶는다.

1. backend route/service 타입 변경
2. frontend 타입과 호출부 변경
3. `docs/API_CONTRACT.md` 갱신
4. 관련 test 갱신

## Data Sharing Rules

정식 공유:

- migration
- seed
- 표준 job batch JSON
- dry-run으로 검증된 import artifact

공유 금지:

- `.env`
- 실제 DB URL
- DB 비밀번호
- Supabase service role key
- AWS/R2 access key
- 개인 DB 전체 dump
- 사용자의 실제 자기소개서/분석 이력

실제 job posting 데이터가 필요하면 raw DB dump 대신 표준 JSON import 흐름을
쓴다.

```bash
corepack pnpm run db:import:jobs --dry-run ../../docs/research/job-sites/saramin_sample_2026-05-14.json
corepack pnpm run db:import:jobs -- ../../docs/research/job-sites/saramin_sample_2026-05-14.json
```

두 번째 명령은 현재 `.env`의 `DATABASE_URL` 대상 DB에 write한다. 팀원이 자기
개인 DB인지 확인한 뒤 실행한다.

## Optional Schema Export

DB export는 보조 산출물일 뿐 정식 공유 단위가 아니다. 팀원이 migration을
못 쓰는 상황에서 구조 확인용으로만 만든다.

PostgreSQL schema-only dump 예시:

```bash
pg_dump --schema-only --no-owner --no-acl --file tmp/neet2work_schema.sql "$DATABASE_URL"
```

이 파일은 리뷰용이다. 팀원 DB를 맞추는 정식 방법은 여전히 다음이다.

```bash
corepack pnpm run db:deploy
corepack pnpm run db:seed
```

## Drift Check

계약이 맞는지 확인할 때는 아래 순서로 본다.

```bash
corepack pnpm run db:status
corepack pnpm run db:deploy
corepack pnpm run db:seed
corepack pnpm --filter @neet2work/backend run test
```

추가로 서버 실행 후 확인한다.

```http
GET /health
GET /api/jobs
GET /api/jobs/facets
GET /api/jobs/job-001
POST /api/analyze
```

`GET /api/jobs`가 DB rows 대신 sample fallback을 반환한다면
`/health.database` 값을 먼저 본다. `connected`가 아니라면 API 계약 문제가
아니라 개인 DB 연결 문제다. `/health.database`가 `connected`인데 목록이
비어 있다면 API 계약 문제가 아니라 개인 DB에 seed/import 대상 active row가
없는 상태다.

## Change Gate

다음 변경은 반드시 새 migration과 API 계약 갱신을 같이 포함한다.

- `job_postings` public field 추가/삭제/rename
- `resume_analyses` 저장 구조 변경
- `JobPostingStatus`, `AnalysisMode` enum 변경
- `/api/jobs`, `/api/jobs/facets`, `/api/jobs/:id`, `/api/analyze` 응답 shape 변경
- frontend가 사용하는 query param 추가/삭제

다음 변경은 migration만으로 충분하지 않다.

- 브라우저에서 DB provider SDK를 직접 쓰게 만드는 변경
- Supabase anon/auth 정책에 기대는 변경
- 원격 DB write 자동화
- 공용/운영 DB reset 또는 import

이 경우 별도 승인과 보안 검토가 필요하다.
