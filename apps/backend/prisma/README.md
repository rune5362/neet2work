# Prisma DB 관리

이 폴더는 PostgreSQL 17 스키마와 샘플 데이터를 팀원끼리 공유하기 위한 기준입니다.

## 핵심 원칙

- DB 구조는 `schema.prisma`, `models/*.prisma`, `migrations/`로 공유합니다.
- 샘플 데이터는 `seed.ts`로 공유합니다.
- 각 팀원의 실제 로컬 DB 데이터는 공유하지 않습니다.
- migration 파일은 Git에 커밋합니다.
- 개발/스테이징/운영 DB 운영 절차는 `OPERATIONS.md`를 따릅니다.
- `src/generated/prisma/`는 `prisma generate`로 생성하므로 커밋하지 않습니다.

## 자주 쓰는 명령

프로젝트 루트에서 실행합니다.

```bash
corepack pnpm run db:generate
corepack pnpm run db:migrate
corepack pnpm run db:seed
corepack pnpm run db:studio
```

DB 연결 필요 여부:

| 명령 | DB 필요 여부 | 설명 |
| --- | --- | --- |
| `corepack pnpm run db:generate` | 필요 없음 | Prisma Client 생성 |
| `corepack pnpm run db:migrate` | 필요 | PostgreSQL에 migration 적용 |
| `corepack pnpm run db:seed` | 필요 | PostgreSQL에 샘플 데이터 입력 |
| `corepack pnpm run db:reset` | 필요 | 로컬 DB 초기화 |
| `corepack pnpm run db:studio` | 필요 | Prisma Studio 실행 |

`corepack pnpm run setup`은 내부에서 `db:generate`만 실행하므로 PostgreSQL이 꺼져 있어도 통과해야 합니다. 반대로 `db:migrate`, `db:seed`는 실제 DB 연결이 없으면 실패하는 것이 정상입니다.

backend workspace에서 직접 실행해도 됩니다.

```bash
corepack pnpm --filter @neet2work/backend run db:migrate
```

## 새 테이블/컬럼 추가 흐름

1. `apps/backend/prisma/schema.prisma` 또는 `apps/backend/prisma/models/*.prisma` 수정
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
5. `schema.prisma`, `models/*.prisma`, migration, seed 변경사항을 함께 커밋

## 동료가 만든 migration 받기

```bash
git pull
corepack pnpm run db:migrate
corepack pnpm run db:seed
```

## 로컬 DB 초기화

주의: 로컬 DB 데이터가 삭제됩니다.

```bash
corepack pnpm run db:reset
```
