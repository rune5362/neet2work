# 협업 가이드

## 기본 원칙

- Node.js는 24.14.0 LTS를 사용합니다.
- 패키지 매니저는 Corepack으로 고정된 pnpm 11만 사용합니다.
- 의존성은 프로젝트 루트에서 설치합니다.
- `pnpm-lock.yaml`은 팀원 간 동일 의존성 설치를 위해 커밋합니다.
- API 키, DB 비밀번호, 개인 설정은 `.env`에만 저장하고 커밋하지 않습니다.
- 기능을 추가할 때는 Mock fallback이 깨지지 않도록 유지합니다.
- DB 스키마 변경은 Prisma migration으로 남기고 `prisma/migrations`를 커밋합니다.

## 처음 참여할 때

아래 문서를 먼저 따라 합니다.

```txt
setup/SETUP.md
```

빠른 세팅 명령:

```bash
corepack pnpm run setup
```

## 작업 전 확인

```bash
node -v
corepack pnpm --version
corepack pnpm run check
corepack pnpm run security:audit
```

## 브랜치와 커밋

- 기능 작업은 별도 브랜치에서 진행합니다.
- 커밋 전 `corepack pnpm run check`를 실행합니다.
- 불필요한 `.env`, `node_modules`, 빌드 결과물은 커밋하지 않습니다.

## 테스트

프론트엔드와 백엔드는 Vitest를 사용합니다.

```bash
corepack pnpm run test
```

테스트 감시 모드:

```bash
corepack pnpm --filter @neet2work/frontend run test:watch
corepack pnpm --filter @neet2work/backend run test:watch
```

## 코드 스타일

포맷:

```bash
corepack pnpm run format
```

린트:

```bash
corepack pnpm run lint
```

## Docker 사용

PostgreSQL 17까지 포함한 전체 개발 환경은 Docker Compose로 실행합니다.

```bash
corepack pnpm run docker:up
```

Docker를 쓰지 않는 경우에는 로컬 PostgreSQL 17을 설치하고 `.env`의 `DATABASE_URL`을 수정합니다.

## DB 변경 규칙

스키마 변경은 `apps/backend/prisma/schema.prisma`에서 시작합니다.

```bash
corepack pnpm --filter @neet2work/backend run db:migrate -- --name add_feature_name
corepack pnpm run db:seed
```

커밋 대상:

- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/`
- 필요한 경우 `apps/backend/prisma/seed.ts`

커밋하지 않는 대상:

- 실제 로컬 DB 데이터
- `.env`
- `apps/backend/src/generated/prisma/`
