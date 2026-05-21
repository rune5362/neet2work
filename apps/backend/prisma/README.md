# Prisma DB 관리

이 폴더는 PostgreSQL 17 스키마와 샘플 데이터를 팀원끼리 공유하기 위한 기준입니다.

## 핵심 원칙

- DB 구조는 `schema.prisma`와 `migrations/`로 공유합니다.
- 샘플 데이터는 `seed.ts`로 공유합니다.
- DB 인스턴스 자체는 팀원이 각자 따로 사용합니다.
- 각 팀원은 본인 `.env`의 `DATABASE_URL`에 개인 개발 DB를 연결합니다.
- 개인 개발 DB는 PostgreSQL 17 호환이어야 하며 Supabase Postgres, AWS RDS PostgreSQL, 로컬 PostgreSQL, Docker PostgreSQL 중 하나를 권장합니다.
- migration 실행 role에는 `pg_trgm` extension 생성 또는 사용 권한, `public` schema 객체 생성 권한, RLS 활성화 권한이 필요합니다.
- 실제 개발 DB 데이터는 공유하지 않습니다.
- migration 파일은 Git에 커밋합니다.
- `src/generated/prisma/`는 `prisma generate`로 생성하므로 커밋하지 않습니다.

## 자주 쓰는 명령

프로젝트 루트에서 실행합니다.

```bash
corepack pnpm run db:generate
corepack pnpm run db:deploy
corepack pnpm run db:seed
corepack pnpm run db:import:jobs --dry-run ../../docs/research/job-sites/saramin_sample_2026-05-14.json
corepack pnpm run db:studio
```

DB 연결 필요 여부:

| 명령 | DB 필요 여부 | 설명 |
| --- | --- | --- |
| `corepack pnpm run db:generate` | 필요 없음 | Prisma Client 생성 |
| `corepack pnpm run db:deploy` | 필요 | 공유된 migration을 PostgreSQL에 적용 |
| `corepack pnpm run db:migrate` | 필요 | 스키마 변경 작업자가 새 migration 생성/적용 |
| `corepack pnpm run db:seed` | 필요 | PostgreSQL에 샘플 데이터 입력 |
| `corepack pnpm run db:import:jobs --dry-run <file>` | 필요 없음 | 표준 채용공고 JSON 형식 검증 |
| `corepack pnpm run db:import:jobs -- <file>` | 필요 | 표준 채용공고 JSON upsert |
| `corepack pnpm run db:reset` | 필요 | 현재 `DATABASE_URL`의 개발 DB 초기화 |
| `corepack pnpm run db:studio` | 필요 | Prisma Studio 실행 |

`corepack pnpm run setup`은 내부에서 `db:generate`만 실행하므로 PostgreSQL이 꺼져 있어도 통과해야 합니다. 반대로 `db:deploy`, `db:migrate`, `db:seed`는 실제 DB 연결이 없으면 실패하는 것이 정상입니다.

backend workspace에서 직접 실행해도 됩니다.

```bash
corepack pnpm --filter @neet2work/backend run db:deploy
```

## 새 테이블/컬럼 추가 흐름

1. `apps/backend/prisma/schema.prisma` 수정
2. migration 생성 및 로컬 DB 적용

```bash
corepack pnpm --filter @neet2work/backend run db:migrate -- --name add_some_feature
```

또는 backend 폴더에서:

```bash
corepack pnpm run db:migrate -- --name add_some_feature
```

3. 생성된 `prisma/migrations/` 폴더 확인
4. 필요한 seed 데이터가 있으면 `prisma/seed.ts` 수정
5. `schema.prisma`, migration, seed 변경사항을 함께 커밋

## 동료가 만든 migration 받기

```bash
git pull
corepack pnpm run db:deploy
corepack pnpm run db:seed
```

이 명령은 팀 공통 migration을 내 개인 DB에 적용하는 흐름입니다. 다른 팀원의 DB에는 영향을 주지 않습니다.

## 크롤러 JSON 적재

크롤러는 DB에 바로 쓰지 않고 표준 JSON을 먼저 만듭니다. 사람이 산출물을 확인한 뒤 아래 명령으로 형식 검증을 먼저 합니다.

```bash
corepack pnpm run db:import:jobs --dry-run ../../docs/research/job-sites/saramin_sample_2026-05-14.json
```

개인 개발 DB의 `DATABASE_URL`이 설정된 상태에서 실제 적재를 실행합니다.

```bash
corepack pnpm run db:import:jobs -- ../../docs/research/job-sites/saramin_sample_2026-05-14.json
```

Import는 `(source, sourceJobId)` 기준 upsert라 같은 원본 공고를 다시 넣어도 중복 행을 만들지 않습니다. `source`와 `sourceJobId`는 수집 중복 방지와 추적을 위해 필수입니다.

## 개발 DB 초기화

주의: 현재 `.env`의 `DATABASE_URL`이 가리키는 DB 데이터가 삭제됩니다. Supabase, AWS RDS 같은 원격 DB를 쓰는 경우에도 개인 개발용 DB인지 먼저 확인합니다. 공용 DB나 운영 DB에서는 실행하지 않습니다.

```bash
corepack pnpm run db:reset
```
