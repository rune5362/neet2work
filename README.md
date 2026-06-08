# 일했음 청년(Neet2Work)

2026 final project. "일해야 한다(Need to work)"와 발음이 비슷한 점을 활용해, 쉬었음 청년(NEET)이 일하는 청년(WORK)으로 전환되는 흐름을 표현한 커리어 지원 플랫폼입니다.

> 공개 채용공고 수집, 지원 문서 관리, 생성형 AI 자기소개서 작성 workflow를 결합한 맞춤형 취업 준비 서비스

## 프로젝트 소개

**일했음 청년**은 사용자가 채용공고를 탐색하고, 지원 프로필/이력서/자기소개서/지원 세트를 관리하며, 자기소개서 문항과 공고 정보를 기반으로 근거 중심의 초안 작성을 진행할 수 있도록 돕습니다.

현재 프로젝트는 발표와 로컬 개발을 안정적으로 유지하기 위해 **Mock-first + DB optional** 구조를 유지합니다. PostgreSQL, AI provider, R2 같은 외부 의존성이 없어도 기본 화면과 fallback workflow가 동작하고, 각 기능은 실제 연동을 붙일 수 있도록 backend REST API와 Prisma migration을 기준으로 설계되어 있습니다.


## 팀원 및 역할 분담

| 이름 | 역할 |
| --- | --- |
| 김대균 | 팀장, 프로젝트 관리, 일정 관리, 기능 통합 관리 |
| 이성호 | AI 기술 담당, 생성형 AI 분석 로직 설계 |


## 현재 구현된 주요 기능

- 채용공고 목록/상세 조회, 검색, 필터, 페이지네이션, URL 동기화
- 채용공고 facet 조회와 공개 HTML collector/ETL 결과 import
- 회원가입, 로그인, 토큰 갱신, 로그아웃, 계정 보안 요약, 내 정보 수정
- 통합 문서함(`/documents`)에서 지원 프로필, 이력서, 자기소개서, 지원 세트 관리
- 프로필/문서 생성, 수정, 복사, 보호, 삭제 lifecycle 처리
- 지원 세트에서 프로필/이력서/자기소개서 연결 관리
- 자기소개서 fit 분석 mock API(`/api/analyze`)
- AI 자기소개서 작성 workflow(`/ai-analysis`)
- TXT/MD/DOCX/PDF 본문 추출
- AI provider 라우팅: Codex Bridge, Gemini, Local AI, fallback demo
- Codex app-server OAuth 상태 확인 및 로그인 URL 발급 flow
- PostgreSQL/Prisma 기반 스키마, migration, seed, audit/soft-delete 기반
- DB 미설정 또는 일부 provider 미설정 시 demo fallback 유지

## 주요 화면

| URL | 설명 |
| --- | --- |
| `/` | 홈 화면 |
| `/jobs` | 채용공고 목록, 필터, 상세 drawer |
| `/ai-analysis` | AI 자기소개서 작성 workflow |
| `/ai-analysis/details` | 기존 분석 상세 화면 |
| `/documents` | 프로필/문서/지원 세트를 합친 통합 문서함 |
| `/documents/profiles/new` | 지원 프로필 생성 |
| `/documents/profiles/:profileId` | 지원 프로필 상세/수정 |
| `/documents/new` | 이력서 또는 자기소개서 생성 |
| `/documents/:documentId` | 문서 상세/수정 |
| `/documents/sets/:setId` | 지원 세트 상세/수정 |
| `/login`, `/signup`, `/auth` | 인증 화면 |
| `/myaccount` | 내 계정 관리 |
| `/notifications` | 알림 화면 |

`/profiles/*` 경로는 기존 링크 호환을 위해 `/documents` 하위 프로필 경로로 redirect됩니다. 프로필/문서 version 화면은 제거되었고 현재 workflow는 copy/protect/edit 중심입니다.

## AI 자기소개서 작성 workflow

`/ai-analysis`는 단순 첨삭 화면이 아니라, 문항 요구사항과 사용자의 경험을 구조화한 뒤 근거 기반 자기소개서 초안을 만드는 단계형 workflow입니다.

현재 흐름:

1. 사용자가 지원 회사, 직무, 문항, 공고 정보, 작성 톤, 기존 문서/대화 내용을 입력합니다.
2. 저장된 자기소개서 또는 첨부 파일을 레퍼런스로 선택할 수 있습니다.
3. 첨부 파일이 TXT/MD/DOCX/PDF이면 backend가 본문을 추출합니다.
4. 문항 요구사항이 있으면 공고/레퍼런스보다 우선해 material store에 고정합니다.
5. AI provider router가 `auto` 또는 `manual` 모드로 사용 가능한 provider를 선택합니다.
6. `/plan` 단계에서 경험 카드, 적합도 판단, 보완 질문, 개요, 근거 검증 정보를 생성합니다.
7. `/draft` 단계에서 개요 기반 초안, evidence map, 자기검수 리포트, 수정 옵션을 생성합니다.
8. `/revise` 단계에서 기존 계획과 근거를 유지한 채 사용자 수정 요청을 반영합니다.

첨부 파일 정책:

- 지원: `.txt`, `.md`, `.docx`, `.pdf`
- DOCX: `mammoth`로 raw text 추출
- PDF: `pdf-parse`로 text layer 추출
- 미지원: 이미지 파일, legacy `.doc`, 이미지 기반/스캔본 PDF

AI 라우팅 정책:

- 기본 mode는 `auto`
- 기본 provider 순서: `codex_bridge`, `gemini`, `local`, `fallback`
- 수동 provider가 실패하면 다른 유료 provider가 아니라 fallback demo로 내려갑니다.
- fallback 결과는 `aiMeta.usedFallback=true`와 `fallbackReason`으로 구분됩니다.

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Runtime | Node.js 24 LTS |
| Package Manager | pnpm 11 via Corepack |
| Frontend | React 19, TypeScript, Vite 7, lucide-react |
| Backend | Express 5, TypeScript, Zod |
| Database | PostgreSQL 17, Prisma 7, Prisma Migrate |
| Auth | JWT access token, refresh token, password hashing, rate limit |
| AI Routing | Codex Bridge, Gemini API, Local AI, Fallback Demo |
| Document Parsing | Mammoth, pdf-parse |
| Test | Vitest, Testing Library |
| Lint/Format | ESLint, Prettier |
| Automation | Playwright, Python/public HTML collector 후보 |
| Optional Infra | Docker Compose, AWS RDS, Cloudflare R2, Oracle Cloud |

### Frontend

- React 19 기반 SPA입니다.
- TypeScript로 화면 상태, API 응답, 도메인 타입을 관리합니다.
- Vite 7을 사용해 개발 서버와 production build를 처리합니다.
- `React.lazy`와 `Suspense`로 page 단위 code splitting을 적용합니다.
- `apps/frontend/src/pages`는 URL 단위 화면을 담당합니다.
- `apps/frontend/src/components`는 반복 UI와 독립 컴포넌트를 담당합니다.
- `apps/frontend/src/api`는 backend REST API client를 담당합니다.
- frontend는 DB provider에 직접 접근하지 않고 `VITE_API_BASE_URL`로 backend만 호출합니다.
- `lucide-react`를 아이콘 라이브러리로 사용합니다.
- Vitest와 Testing Library로 주요 사용자 flow를 검증합니다.

### Backend

- Express 5 기반 REST API 서버입니다.
- TypeScript와 ESM module 구조를 사용합니다.
- Zod로 request body와 query string을 검증합니다.
- route는 HTTP 계약과 response shape를 담당합니다.
- service는 인증, 채용공고, 문서함, AI workflow 같은 도메인 로직을 담당합니다.
- middleware는 rate limit, CORS, HTTPS guard 같은 공통 정책을 담당합니다.
- `HttpError`와 전역 error handler로 validation 오류와 서버 오류를 구분합니다.
- `dotenv`로 root/backend `.env`를 로딩하되 test 환경에서는 로컬 `.env` 영향이 테스트를 흔들지 않게 분리합니다.
- 현재 주요 API는 jobs, analyze, draft-workflow, resume extract, auth, profiles, documents, document-sets입니다.

### Database & Storage

- PostgreSQL 17 호환 DB를 기준으로 합니다.
- Prisma 7과 Prisma Migrate로 schema, migration, seed를 관리합니다.
- Prisma model source는 `apps/backend/prisma/models/*.prisma`입니다.
- `apps/backend/prisma/schema.prisma`는 generator/datasource 중심으로 유지합니다.
- 생성된 Prisma Client는 `apps/backend/src/generated/prisma/`에 생성되며 직접 수정하지 않습니다.
- 팀원별 개인 개발 DB를 사용할 수 있고, 공통 스키마는 migration으로 통일합니다.
- `User`, `RefreshToken`, `AuditLog`로 인증과 감사 기록을 관리합니다.
- `JobPosting`, `ResumeAnalysis`로 채용공고와 분석 결과를 관리합니다.
- `CandidateProfile`, `ApplicationDocument`, `ApplicationSet`으로 통합 문서함 데이터를 관리합니다.
- DB가 없거나 연결이 불안정한 개발/발표 환경에서도 local JSON 또는 in-memory fallback이 동작하도록 설계합니다.
- Cloudflare R2 관련 환경변수는 준비되어 있지만 현재 핵심 runtime은 DB와 local/fallback 중심입니다.

### Job Collection / Browser Automation

- 채용공고 수집은 공개 HTML 기반 collector/ETL 결과 JSON을 import하는 구조입니다.
- collector는 표준 `JobPosting` JSON 생성에 집중하고 DB에는 직접 쓰지 않습니다.
- backend import script가 dry-run, 형식 검증, 실제 upsert를 담당합니다.
- Saramin, JobKorea, Linkareer, Mynavi Tenshoku, Daijob, CareerCross, Green Japan check 명령이 준비되어 있습니다.
- 채용공고 운영 lifecycle을 위해 dry-run/apply, operational plan, manual run, scheduler, SQL artifact 명령을 제공합니다.
- Playwright는 브라우저 자동화가 필요한 future RPA 또는 검증 경로로 분리되어 있습니다.

### AI

- AI workflow는 provider router를 통해 Codex Bridge, Gemini, Local AI, fallback demo를 선택합니다.
- 기본 routing mode는 `auto`입니다.
- 기본 provider 순서는 `codex_bridge`, `gemini`, `local`, `fallback`입니다.
- manual mode에서 선택 provider가 실패하면 다른 유료 provider가 아니라 fallback demo로 내려갑니다.
- fallback 결과는 `aiMeta.usedFallback`과 `fallbackReason`으로 실제 AI 결과와 구분합니다.
- Codex Bridge는 Codex CLI app-server 프로토콜을 사용합니다.
- Neet2Work는 Codex OAuth token이나 OpenAI API key를 저장하지 않습니다.
- Gemini provider는 API key와 model이 설정된 경우에만 online 후보가 됩니다.
- Local AI provider는 Ollama 또는 OpenAI-compatible endpoint 연결을 염두에 둡니다.
- hardcoded fallback demo provider는 발표와 개발 안정성을 위한 deterministic output을 제공합니다.
- 자기소개서 작성 flow는 `/plan`, `/draft`, `/revise` 단계로 분리되어 있습니다.
- material store, experience cards, evidence map, review report를 통해 근거 기반 초안 작성을 지향합니다.

### Document Parsing

- TXT와 MD는 UTF-8 텍스트로 처리합니다.
- DOCX는 `mammoth`로 raw text를 추출합니다.
- PDF는 `pdf-parse`로 text layer를 추출합니다.
- 이미지 기반 PDF나 스캔본처럼 text layer가 없는 파일은 지원하지 않습니다.
- legacy `.doc` 파일은 DOCX 변환 후 업로드하는 흐름을 전제로 합니다.
- 추출된 본문은 AI workflow의 경험 입력 또는 요구사항 입력으로 사용됩니다.

### Code Quality & Test

- ESLint로 frontend/backend TypeScript source를 검사합니다.
- Prettier로 repository formatting 기준을 맞춥니다.
- Vitest로 frontend와 backend test를 실행합니다.
- Testing Library로 React 화면 flow와 사용자 상호작용을 검증합니다.
- backend test는 route validation, service fallback, provider 상태, 인증, 문서 lifecycle을 확인합니다.
- `corepack pnpm run check`는 lint, test, build를 순서대로 실행하는 통합 검증 명령입니다.

### Deployment & DevOps

- pnpm workspace 기반 monorepo입니다.
- frontend와 backend는 같은 저장소에서 관리하되 package script로 분리합니다.
- Docker Compose는 선택적 로컬 실행 경로로 제공합니다.
- PostgreSQL은 로컬 PostgreSQL, Docker PostgreSQL, Supabase Postgres, AWS RDS PostgreSQL 같은 호환 DB를 사용할 수 있습니다.
- AWS, Cloudflare R2, Oracle Cloud 관련 환경변수는 확장 후보로 준비되어 있습니다.
- `.env.example`을 기준으로 환경변수 계약을 공유하고 실제 secret은 Git에 올리지 않습니다.
- `setup/` 아래 OS별 초기 세팅 문서를 제공합니다.
- `docs/` 아래 API 계약, architecture, AI workflow, DB/API handoff 문서를 유지합니다.
- work-log와 Figma bridge 관련 script가 포함되어 작업 기록과 디자인 연계 흐름을 지원합니다.
- Windows 개발 환경에서는 `1-demo-local-pc.cmd`로 Codex Bridge와 Gemini/Gemma를 켠 로컬 시연 서버를 실행할 수 있습니다.

## 폴더 구조

```txt
neet2work/
├─ apps/
│  ├─ frontend/
│  │  ├─ src/
│  │  │  ├─ api/          # backend REST client
│  │  │  ├─ components/   # 반복 UI 컴포넌트
│  │  │  ├─ data/         # 화면용 기준 데이터
│  │  │  ├─ pages/        # URL 단위 화면
│  │  │  ├─ test/         # frontend test setup
│  │  │  ├─ types/        # frontend/API mirror 타입
│  │  │  ├─ App.tsx       # route 분기
│  │  │  └─ main.tsx
│  │  └─ package.json
│  │
│  └─ backend/
│     ├─ prisma/
│     │  ├─ models/       # split Prisma model source
│     │  ├─ migrations/
│     │  ├─ schema.prisma # generator/datasource 중심
│     │  └─ seed.ts
│     ├─ src/
│     │  ├─ config/
│     │  ├─ database/
│     │  ├─ middleware/
│     │  ├─ routes/       # Express route + validation
│     │  ├─ scripts/
│     │  ├─ services/     # domain logic
│     │  ├─ storage/
│     │  ├─ types/
│     │  └─ server.ts
│     └─ package.json
│
├─ docs/                  # API, architecture, workflow, handoff 문서
├─ setup/                 # OS별 개발 환경 세팅
├─ scripts/               # repo-level helper scripts
├─ tools/
├─ docker-compose.yml
├─ package.json
└─ README.md
```

## 시스템 구조

```txt
사용자
  │
  ▼
React + Vite frontend
  │  VITE_API_BASE_URL
  ▼
Express REST API
  ├─ auth routes
  ├─ jobs routes
  ├─ profile/document/document-set routes
  ├─ analyze route
  ├─ draft-workflow routes
  └─ resume extract route
      │
      ├─ Prisma/PostgreSQL
      ├─ local JSON / in-memory fallback
      ├─ AI provider router
      │   ├─ Codex app-server
      │   ├─ Gemini
      │   ├─ Local AI
      │   └─ hardcoded fallback
      └─ document parsers
```

## 환경변수

실제 키 값은 GitHub에 업로드하지 않습니다. `.env.example`을 기준으로 `.env`를 생성합니다.

기본 개발에서는 `DATABASE_URL`, AI provider key, R2 credential이 비어 있어도 실행됩니다. 다만 DB migration, seed, 실제 저장 데이터 확인은 PostgreSQL 연결이 필요합니다.

주요 환경변수:

```env
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:3000

PORT=3000
CLIENT_URL=http://localhost:5173
ALLOW_LOCALHOST_ORIGINS=false
REQUIRE_HTTPS=true

JWT_SECRET=change-me-to-a-long-random-secret
ACCESS_TOKEN_EXPIRES_IN_SECONDS=3600
REFRESH_TOKEN_EXPIRES_IN_SECONDS=2592000
LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
AUTH_RATE_LIMIT_WINDOW_SECONDS=60
AUTH_RATE_LIMIT_MAX_REQUESTS=30

AI_ROUTING_DEFAULT=auto
AI_PROVIDER_ORDER=codex_bridge,gemini,local,fallback
AI_PROVIDER_TIMEOUT_MS=180000

CODEX_BRIDGE_ENABLED=false
CODEX_BRIDGE_COMMAND=
CODEX_CLI_PATH=
CODEX_BRIDGE_HOME=
CODEX_BRIDGE_MODEL=
CODEX_BRIDGE_REASONING_EFFORT=

GEMINI_ENABLED=false
GEMINI_API_KEY=
GEMINI_MODELS=gemma-4-31b-it,gemma-4-26b-a4b-it,gemini-2.5-flash
GEMINI_MODEL=

LOCAL_AI_ENABLED=false
LOCAL_AI_BASE_URL=http://localhost:11434
LOCAL_AI_MODEL=
LOCAL_AI_PROTOCOL=ollama

DATABASE_URL=
DATABASE_PASSWORD=
POSTGRES_USER=neet2work
POSTGRES_PASSWORD=neet2work
POSTGRES_DB=neet2work

R2_ENDPOINT=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

전체 목록과 설명은 [.env.example](./.env.example)을 기준으로 합니다.

## Codex Bridge

Codex Bridge는 `codex exec`가 아니라 Codex CLI의 app-server 프로토콜을 사용합니다. `CODEX_BRIDGE_ENABLED=true`일 때 backend가 `codex app-server --listen stdio://`를 실행하고, `account/read`로 backend host의 Codex 로그인 상태를 확인합니다.

동작 방식:

- Neet2Work는 OpenAI API key나 OAuth token을 저장하지 않습니다.
- 로컬 Codex가 이미 로그인되어 있으면 provider가 online으로 잡힙니다.
- 미로그인 상태면 `codex_not_logged_in`으로 offline 처리되고 fallback으로 내려갑니다.
- 로그인 시작은 `/api/draft-workflow/providers/codex/login`에서 app-server의 로그인 URL을 받아 처리합니다.
- `CODEX_BRIDGE_COMMAND`가 비어 있으면 Windows에서는 `%LOCALAPPDATA%\OpenAI\Codex\bin\*\codex.exe`, 그 외에는 `CODEX_CLI_PATH` 또는 PATH의 `codex`를 사용합니다.
- `CODEX_BRIDGE_HOME`이 비어 있으면 사용자 홈의 `.codex`를 우선 사용하고, 그 다음 `CODEX_HOME`을 봅니다.

Smoke check:

```bash
corepack pnpm run codex:bridge:smoke
corepack pnpm run codex:bridge:smoke -- --start-login
corepack pnpm run codex:bridge:smoke -- --start-login --wait-login
```

Windows에서 Codex Bridge를 켠 상태로 개발 서버를 바로 실행하려면 프로젝트 루트의 `1-demo-local-pc.cmd`를 사용할 수 있습니다.

### 로컬 단일 PC Codex/Gemini 시연

작업 PC 한 대에서 브라우저, frontend, backend, Codex Bridge, Gemini/Gemma 라우팅을 모두 켜려면 다음 명령을 실행합니다.

```bash
1-demo-local-pc.cmd
```

브라우저에서는 다음 주소로 접속합니다.

```text
http://localhost:5173
```

이 스크립트는 로컬 시연 동안 `CODEX_BRIDGE_ENABLED=true`, `GEMINI_ENABLED=true`, `GEMINI_MODELS=gemma-4-31b-it,gemma-4-26b-a4b-it,gemini-2.5-flash`를 process 환경변수로 설정하고 `corepack pnpm run dev`를 실행합니다. 실제 Gemini API key 값은 `.env`에서 읽히며 스크립트가 출력하지 않습니다.

### Oracle 사이트 + 작업 PC Codex 시연

오라클에 배포된 `https://neet2work.duckdns.org` 화면은 그대로 쓰고, `/api` 요청만 작업 PC의 Codex Bridge backend로 보내려면 작업 PC에서 다음 명령을 실행합니다.

```bash
2-demo-oracle-site.cmd
```

이 스크립트는 backend 실행, SSH reverse tunnel 연결, 오라클 Caddy 시연 모드 전환을 순서대로 처리합니다. 창을 닫거나 `Ctrl+C`로 종료하면 Caddy를 원래 모드로 되돌리고 backend/tunnel도 정리합니다.

시연 PC에서는 기존 운영 주소로 접속합니다.

```text
https://neet2work.duckdns.org
```

강제 종료나 네트워크 끊김으로 자동 원복이 안 된 경우에만 수동으로 원복합니다.

```bash
oracle-caddy-demo-mode.cmd -Action disable
```

상태 확인:

```bash
oracle-caddy-demo-mode.cmd -Action status
```

## 실행 방법

자세한 초기 세팅은 [setup/SETUP.md](./setup/SETUP.md)를 참고합니다. OS별 문서는 [setup/WINDOWS_SETUP.md](./setup/WINDOWS_SETUP.md), [setup/MACOS_SETUP.md](./setup/MACOS_SETUP.md), [setup/LINUX_SETUP.md](./setup/LINUX_SETUP.md)에 있습니다.

### 처음 설치

```bash
corepack pnpm run setup
```

이 명령은 의존성 설치, `.env` 생성, Prisma Client 생성, Playwright Chromium 설치를 수행합니다. `db:generate`는 DB 연결 없이도 실행 가능합니다.

### 개발 서버

```bash
corepack pnpm run dev
```

개별 실행:

```bash
corepack pnpm run dev:frontend
corepack pnpm run dev:backend
```

기본 주소:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

### Docker Compose

```bash
docker compose up --build
```

Docker Compose는 frontend, backend, PostgreSQL 17 컨테이너를 함께 실행하고 싶을 때 선택적으로 사용합니다.

## 검증 명령

```bash
corepack pnpm run lint
corepack pnpm run test
corepack pnpm run build
corepack pnpm run check
```

개별 package 검증:

```bash
corepack pnpm --filter @neet2work/frontend test
corepack pnpm --filter @neet2work/backend test
corepack pnpm --filter @neet2work/frontend build
corepack pnpm --filter @neet2work/backend build
```

## DB와 Prisma

PostgreSQL 스키마는 Prisma Migrate로 공유합니다. 개인 개발 DB는 각자 따로 사용하고, 공통 기준은 `apps/backend/prisma/models/*.prisma`, `apps/backend/prisma/migrations/`, `apps/backend/prisma/seed.ts`입니다.

자주 쓰는 명령:

```bash
corepack pnpm run db:generate
corepack pnpm run db:migrate
corepack pnpm run db:deploy
corepack pnpm run db:seed
corepack pnpm run db:reset
```

새 migration 생성:

```bash
corepack pnpm --filter @neet2work/backend run db:migrate -- --name add_feature_name
```

현재 주요 모델 영역:

- `User`, `RefreshToken`, `AuditLog`
- `JobPosting`, `ResumeAnalysis`
- `CandidateProfile`
- `ApplicationDocument`
- `ApplicationSet`

주의사항:

- 이미 공유된 migration은 되도록 수정하지 않고 새 migration을 추가합니다.
- `db:reset`은 현재 `.env`의 `DATABASE_URL` 대상 DB를 초기화합니다.
- `db:migrate`, `db:deploy`, `db:seed`는 실제 DB 연결이 필요합니다.
- `setup`, `db:generate`, `dev`는 DB 없이도 동작하도록 유지합니다.

자세한 DB/API 인수인계는 [docs/DB_API_TEAM_HANDOFF.md](./docs/DB_API_TEAM_HANDOFF.md), Prisma 운영 문서는 [apps/backend/prisma/README.md](./apps/backend/prisma/README.md)를 참고합니다.

## 채용공고 수집/Import

현재 채용공고 수집은 공개 HTML 기반 collector/ETL 결과 JSON을 backend import 스크립트로 DB에 반영하는 구조입니다. collector는 표준 JSON 생성에 집중하고 DB에는 직접 쓰지 않습니다.

소스별 check:

```bash
corepack pnpm run crawl:saramin:check
corepack pnpm run crawl:jobkorea:check
corepack pnpm run crawl:linkareer:check
corepack pnpm run crawl:mynavi:check
corepack pnpm run crawl:daijob:check
corepack pnpm run crawl:careercross:check
corepack pnpm run crawl:green:check
corepack pnpm run crawl:matrix:check
```

JSON import:

```bash
corepack pnpm run db:import:jobs --dry-run ../../docs/research/job-sites/saramin_sample_2026-05-14.json
corepack pnpm run db:import:jobs -- ../../docs/research/job-sites/saramin_sample_2026-05-14.json
```

운영 lifecycle 보조 명령:

```bash
corepack pnpm run db:lifecycle:jobs:dry-run
corepack pnpm run db:lifecycle:jobs:apply
corepack pnpm run jobs:operational:plan
corepack pnpm run jobs:operational:manual-run
corepack pnpm run jobs:operational:sql-artifacts
corepack pnpm run jobs:operational:scheduler
corepack pnpm run jobs:operational:jp-plan
```

## API 요약

세부 request/response schema는 [docs/API_CONTRACT.md](./docs/API_CONTRACT.md)를 기준으로 합니다.

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/health` | runtime dependency 상태 |
| `GET` | `/api/jobs` | 채용공고 목록 |
| `GET` | `/api/jobs/facets` | 채용공고 필터 facet |
| `GET` | `/api/jobs/:id` | 채용공고 상세 |
| `POST` | `/api/analyze` | 자기소개서 fit 분석 mock/AI 경로 |
| `POST` | `/api/resume/extract` | TXT/MD/DOCX/PDF 본문 추출 |
| `GET` | `/api/draft-workflow/providers` | AI provider 상태 |
| `POST` | `/api/draft-workflow/providers/codex/login` | Codex OAuth 시작 |
| `GET` | `/api/draft-workflow/providers/codex/login/:loginId` | Codex OAuth 상태 |
| `POST` | `/api/draft-workflow/plan` | 작성 계획 생성 |
| `POST` | `/api/draft-workflow/draft` | 초안 생성 |
| `POST` | `/api/draft-workflow/revise` | 초안 수정 |
| `POST` | `/api/auth/signup` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 |
| `POST` | `/api/auth/refresh` | access token 갱신 |
| `POST` | `/api/auth/logout` | 로그아웃 |
| `GET` | `/api/auth/me/security` | 계정 보안 요약 |
| `PATCH` | `/api/auth/me` | 내 정보 수정 |
| `GET/POST` | `/api/profiles` | 지원 프로필 목록/생성 |
| `GET/PATCH/DELETE` | `/api/profiles/:profileId` | 지원 프로필 상세/수정/보호 |
| `POST` | `/api/profiles/:profileId/copy` | 지원 프로필 복사 |
| `POST` | `/api/profiles/:profileId/delete` | 지원 프로필 삭제 lifecycle |
| `GET/POST` | `/api/documents` | 이력서/자기소개서 목록/생성 |
| `GET/PATCH/DELETE` | `/api/documents/:documentId` | 문서 상세/수정/보호 |
| `POST` | `/api/documents/:documentId/copy` | 문서 복사 |
| `POST` | `/api/documents/:documentId/delete` | 문서 삭제 lifecycle |
| `GET/POST` | `/api/document-sets` | 지원 세트 목록/생성 |
| `GET/PATCH/DELETE` | `/api/document-sets/:setId` | 지원 세트 상세/수정/보관 |

## 관련 문서

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md): 시스템 구조와 책임 경계
- [docs/API_CONTRACT.md](./docs/API_CONTRACT.md): API 계약
- [docs/AI_WORKFLOW.md](./docs/AI_WORKFLOW.md): AI 자기소개서 workflow
- [docs/DB_API_TEAM_HANDOFF.md](./docs/DB_API_TEAM_HANDOFF.md): DB/API 인수인계
- [docs/AGENT_PROJECT_BRIEF.md](./docs/AGENT_PROJECT_BRIEF.md): 프로젝트 브리프
- [CONTRIBUTING.md](./CONTRIBUTING.md): 협업 규칙

## 설계 원칙

- Frontend는 DB provider에 직접 접근하지 않고 backend REST API를 호출합니다.
- Route는 HTTP 계약과 validation에 집중하고, 도메인 판단은 service에 둡니다.
- 외부 의존성이 없어도 demo fallback 경로가 유지되어야 합니다.
- API key, OAuth token, DB password는 저장소에 올리지 않습니다.
- Prisma model source는 `apps/backend/prisma/models/*.prisma`입니다.
- 공유된 migration은 수정하지 않고 새 migration으로 누적합니다.
- 기능 제거 시 UI뿐 아니라 route, type, sample data, API client 잔재까지 같이 확인합니다.
