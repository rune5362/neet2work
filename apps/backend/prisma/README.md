# Prisma DB 관리

이 폴더는 PostgreSQL 17 스키마와 샘플 데이터를 팀원끼리 공유하기 위한 기준입니다.

## 핵심 원칙

- DB 구조는 `schema.prisma`와 `migrations/`로 공유합니다.
- 샘플 데이터는 `seed.ts`로 공유합니다.
- 각 팀원의 실제 로컬 DB 데이터는 공유하지 않습니다.
- migration 파일은 Git에 커밋합니다.
- `src/generated/prisma/`는 `prisma generate`로 생성하므로 커밋하지 않습니다.

## 자주 쓰는 명령

프로젝트 루트에서 실행합니다.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

backend workspace에서 직접 실행해도 됩니다.

```bash
npm run db:migrate -w apps/backend
```

## 새 테이블/컬럼 추가 흐름

1. `apps/backend/prisma/schema.prisma` 수정
2. migration 생성 및 로컬 DB 적용

```bash
npm run db:migrate -w apps/backend -- --name add_some_feature
```

또는 backend 폴더에서:

```bash
npm run db:migrate -- --name add_some_feature
```

3. 생성된 `prisma/migrations/` 폴더 확인
4. 필요한 seed 데이터가 있으면 `prisma/seed.ts` 수정
5. `schema.prisma`, migration, seed 변경사항을 함께 커밋

## 동료가 만든 migration 받기

```bash
git pull
npm run db:migrate
npm run db:seed
```

## 로컬 DB 초기화

주의: 로컬 DB 데이터가 삭제됩니다.

```bash
npm run db:reset
```
