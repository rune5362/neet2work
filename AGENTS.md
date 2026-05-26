# Neet2Work Agent Instructions

이 파일은 Neet2Work 저장소에서 작업하는 AI 에이전트용 프로젝트 규칙이다. 전역 지침보다 이 저장소의 실제 구조와 명령을 우선한다.

## Project Shape

- 서비스명: 일했음 청년(Neet2Work)
- 목적: 자기소개서와 채용 공고를 비교 분석해 직무 적합도, 보완점, 추천 문장을 제공하는 커리어 컨설팅 플랫폼
- 구조: pnpm workspace 기반 모노레포
- Frontend: `apps/frontend`, React 19, TypeScript, Vite 7, Vitest
- Backend: `apps/backend`, Express 5, TypeScript, Zod, Prisma 7, PostgreSQL 17, Vitest
- RPA: backend Playwright collector
- 기본 운영 원칙: Mock-first. 외부 AI API, PostgreSQL, R2가 없어도 로컬 개발과 발표 데모가 가능한 fallback을 유지한다.

## Commands

루트에서 Corepack pnpm만 사용한다. README에 npm 표기가 남아 있어도 현재 `package.json` 기준으로는 pnpm이 권위다.

```bash
corepack pnpm run dev
corepack pnpm run dev:frontend
corepack pnpm run dev:backend
corepack pnpm run lint
corepack pnpm run test
corepack pnpm run build
corepack pnpm run check
```

DB 작업:

```bash
corepack pnpm run db:generate
corepack pnpm --filter @neet2work/backend run db:migrate -- --name change_name
corepack pnpm run db:seed
```

## Coding Rules

- 기존 폴더 경계를 따른다: frontend는 `api`, `components`, `pages`, `types`; backend는 `routes`, `services`, `database`, `storage`, `rpa`, `types`, `errors`.
- 기능 구현은 route -> service -> storage/database 순서로 책임을 나눈다. route는 HTTP 입출력과 Zod validation, service는 도메인 로직, storage/database는 영속성만 맡긴다.
- React 화면은 page가 흐름을 잡고, 반복 UI는 component로 분리한다. 단일 화면에서만 쓰는 작은 JSX는 무리하게 분리하지 않는다.
- OOP, class, factory, adapter는 실제 책임 경계가 생길 때만 쓴다. 목표는 OOP 자체가 아니라 관심사 분리와 테스트 가능성이다.
- 타입은 frontend/backend 각각의 `types`에 가까운 위치에 둔다. API 응답 형태를 바꾸면 양쪽 타입과 호출부를 함께 확인한다.
- 생성물인 `apps/backend/src/generated/prisma/`는 직접 수정하지 않는다. Prisma schema/model/migration을 수정한 뒤 generate한다.
- `.env`와 실제 키, DB 비밀번호, R2 credential, 사용자 업로드 문서는 커밋하지 않는다.

## Backend Rules

- 모든 외부 입력은 route 또는 boundary에서 Zod로 검증한다.
- 사용자에게 반환하는 에러는 내부 경로, stack trace, secret을 노출하지 않는다.
- DB가 필요한 기능은 PostgreSQL이 없을 때의 동작을 의도적으로 결정한다. 기존 Mock/local fallback을 깨뜨리지 않는다.
- DB 스키마 변경은 Prisma migration으로 남긴다. `schema.prisma`, `prisma/models/*.prisma`, `prisma/migrations/`, 필요한 seed 변경을 함께 검토한다.
- 인증/계정 기능은 password hash, audit log, soft delete, status 필드를 우회하지 않는다.

## Frontend Rules

- 디자인 기준은 `DESIGN.md`를 먼저 본다.
- 운영 도구형 화면처럼 조용하고 읽기 쉬운 UI를 우선한다. 과한 장식보다 입력, 결과, 상태가 명확해야 한다.
- API 호출은 `apps/frontend/src/api` 경유를 우선한다.
- 버튼, 폼, 결과 패널은 모바일 폭에서 텍스트가 넘치지 않게 확인한다.

## Verification

- 일반 변경: `corepack pnpm run lint`, `corepack pnpm run test`
- 타입/번들 영향 변경: `corepack pnpm run build`
- 전체 확인: `corepack pnpm run check`
- DB schema 변경: `corepack pnpm run db:generate`와 관련 migrate/status 명령
- 검증을 못 돌렸으면 이유와 남은 리스크를 최종 보고에 명시한다.

## Project Skills

반복 작업은 `.codex/skills/`의 프로젝트 스킬을 참고한다.

- `neet2work-project-setup`: 기능이나 큰 구조를 설계할 때
- `neet2work-db-design`: Prisma/PostgreSQL 스키마를 바꿀 때
- `neet2work-api-design`: REST API를 추가하거나 변경할 때
- `neet2work-refactor-components`: OOP/컴포넌트화 리팩토링을 할 때

