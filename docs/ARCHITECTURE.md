# Architecture

Neet2Work는 쉬었음 청년이 채용 공고와 자기소개서를 기반으로 취업 준비 방향을 잡도록 돕는 커리어 분석 플랫폼이다.

## Runtime Shape

```txt
React + Vite frontend
  -> Express REST API
    -> routes: HTTP validation and response shape
    -> services: business logic and fallback decisions
    -> database/storage/rpa: persistence, local fallback, collection
    -> Prisma/PostgreSQL, local JSON, in-memory fallback
```

## Frontend Boundary

- `apps/frontend/src/pages`: URL 단위 화면과 사용자 흐름
- `apps/frontend/src/components`: 반복되거나 독립적인 UI 조각
- `apps/frontend/src/api`: backend REST 호출
- `apps/frontend/src/types`: 화면과 API가 공유하는 도메인 타입
- `apps/frontend/src/styles.css`: 현재 전역 스타일 진입점

화면 추가 시 page가 데이터 흐름과 레이아웃을 잡고, 재사용 UI만 component로 분리한다.

## Backend Boundary

- `apps/backend/src/server.ts`: Express app wiring, global middleware, error handler
- `apps/backend/src/routes`: endpoint, Zod validation, HTTP status/response
- `apps/backend/src/services`: 분석, 회원가입, 채용공고 등 도메인 로직
- `apps/backend/src/database`: Prisma client, audit log, soft delete 같은 DB 공통 기능
- `apps/backend/src/storage`: PostgreSQL/local/in-memory 저장소 경계
- `apps/backend/src/rpa`: Playwright 기반 채용 공고 수집
- `apps/backend/src/types`: backend 도메인 타입

route는 service를 호출하고, service가 storage/database를 선택한다. route에서 DB query나 복잡한 도메인 분기를 직접 작성하지 않는다.

## Data And Fallback Policy

- `AI_API_KEY`가 없으면 mock analysis를 반환한다.
- PostgreSQL 연결이 없을 수 있으므로 개발/발표 경로는 local JSON 또는 in-memory fallback을 고려한다.
- R2 credential이 없으면 로컬 저장소 흐름을 유지한다.
- fallback은 숨겨진 실패가 아니라 의도된 개발 모드 동작이어야 한다. 사용자 응답과 health check에서 상태를 구분한다.

## API Shape

현재 주요 endpoint:

- `GET /health`
- `GET /api/jobs`
- `POST /api/analyze`
- `POST /api/auth/signup`

성공 응답은 가능한 한 `{ data: ... }` 형태를 유지한다. validation 실패와 서버 오류는 내부 구현 정보를 노출하지 않는다.

## Database Shape

Prisma schema는 `apps/backend/prisma/schema.prisma`와 `apps/backend/prisma/models/*.prisma`로 관리한다. 생성된 client는 `apps/backend/src/generated/prisma/`에 생기며 직접 수정하지 않는다.

주요 모델 영역:

- User, UserStatus
- JobPosting, JobPostingStatus
- ResumeAnalysis, AnalysisMode
- AuditLog, AuditAction

회원/감사/삭제 정책이 걸린 모델은 unique constraint, soft delete, audit log 영향을 같이 검토한다.

