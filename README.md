# 일했음 청년(Neet2Work)

2026 final project. "일해야 한다(Need to work)"와 발음이 비슷한 점을 활용해, 쉬었음 청년(NEET)이 일하는 청년(WORK)으로 전환되는 흐름을 표현한 프로젝트입니다.

> 공개 HTML 기반 채용공고 collector/ETL과 생성형 AI 자기소개서 분석을 결합한 맞춤형 커리어 컨설팅 서비스

## 프로젝트 소개

**일했음 청년**은 사용자의 자기소개서와 채용 공고를 비교 분석하여 직무 적합도를 예측하고, 자기소개서 수정 가이드라인을 제공하는 맞춤형 커리어 컨설팅 플랫폼입니다.

초기 버전은 실제 외부 API, DB, R2 키가 없어도 실행되는 Mock-first 구조를 사용합니다. 덕분에 발표와 로컬 개발 환경에서는 안정적으로 데모를 보여주고, 이후 실제 AI, RDS, R2 연동을 점진적으로 붙일 수 있습니다.

## 주요 기능

- 채용 공고 목록 조회
- 자기소개서 입력 및 분석 요청
- 채용공고와 자기소개서 간 적합도 점수 산출
- 강점, 보완점, 부족한 키워드 도출
- 자기소개서 수정 가이드와 추천 문장 제공
- API 키 미설정 시 Mock 분석 결과 반환
- DB/R2 미설정 시 로컬 JSON 또는 in-memory fallback 사용

## 팀원 및 역할 분담

| 이름 | 역할 |
| --- | --- |
| 김대균 | 팀장, 프로젝트 관리, 일정 관리, 기능 통합 관리 |
| 이성호 | AI 기술 담당, 생성형 AI 분석 로직 설계 |
| 봉재근 | 초기 프로젝트 참여 및 인수인계 예정 |
| 김경민 | 초기 프로젝트 참여 및 인수인계 예정 |

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Node.js | 24 LTS |
| Package Manager | pnpm 11 |
| Frontend | React 19 + Vite 7 |
| Backend | Express 5 |
| DB | PostgreSQL 17 |
| DB Migration | Prisma Migrate + Prisma Seed |
| Job Collection | Python public HTML collector/ETL |
| Browser Automation | Playwright |
| Formatter | Prettier |
| Linter | ESLint |
| Test | Vitest |

### Frontend

- React 19
- TypeScript
- Vite 7
- HTML / CSS

### Backend

- Node.js 24 LTS
- Express.js 5
- TypeScript
- REST API
- Zod

### Database & Storage

- PostgreSQL 17
- Prisma Migrate
- Prisma Seed
- 각자 개발 DB 사용, 공통 스키마는 Prisma migration으로 통일
- AWS RDS Free Tier
- Cloudflare R2
- Local JSON Data
- In-memory Fallback

### Job Collection / Browser Automation

- 현재 채용공고 수집은 RPA가 아니라 공개 HTML 기반 Python collector/ETL 구조입니다.
- Python collector는 JSON만 만들고 DB에는 직접 쓰지 않습니다.
- Playwright는 브라우저 자동화가 필요한 future RPA/검증 경로로 분리합니다.

### AI

- Codex
- Generative AI 기반 자기소개서 분석 로직
- API Key 미설정 시 Mock Analyzer 사용

### Code Quality & Test

- Prettier
- ESLint
- Vitest

### Deployment & DevOps

- GitHub
- Docker / Docker Compose (선택)
- AWS
- Oracle Cloud
- pnpm workspaces

## 폴더 구조

```txt
neet2work/
├─ apps/
│  ├─ frontend/
│  │  ├─ src/
│  │  │  ├─ api/
│  │  │  ├─ components/
│  │  │  ├─ pages/
│  │  │  ├─ test/
│  │  │  ├─ types/
│  │  │  ├─ App.tsx
│  │  │  └─ main.tsx
│  │  ├─ index.html
│  │  ├─ vite.config.ts
│  │  ├─ vitest.config.ts
│  │  └─ package.json
│  │
│  └─ backend/
│     ├─ src/
│     │  ├─ config/
│     │  ├─ rpa/
│     │  ├─ routes/
│     │  ├─ services/
│     │  ├─ storage/
│     │  ├─ types/
│     │  └─ server.ts
│     ├─ data/
│     │  ├─ sampleJobs.json
│     │  └─ sampleAnalysis.json
│     ├─ prisma/
│     │  ├─ migrations/
│     │  ├─ schema.prisma
│     │  └─ seed.ts
│     ├─ package.json
│     ├─ tsconfig.json
│     └─ vitest.config.ts
│
├─ .env.example
├─ .editorconfig
├─ .gitattributes
├─ .gitignore
├─ setup/
│  ├─ SETUP.md
│  ├─ WINDOWS_SETUP.md
│  ├─ MACOS_SETUP.md
│  └─ LINUX_SETUP.md
├─ docker-compose.yml        # 선택: 로컬 컨테이너 실행용
├─ package.json
└─ README.md
```

## 시스템 구조

```txt
사용자
  │
  ▼
React + TypeScript Frontend
  │
  ▼
Express 5 + TypeScript Backend API
  │
  ├─ 채용 공고 조회 API
  ├─ 자기소개서 분석 API
  ├─ AI 분석 모듈
  ├─ Mock 분석 모듈
  └─ 데이터 저장 모듈
        │
        ├─ PostgreSQL 17 / AWS RDS
        ├─ Cloudflare R2
        └─ Local JSON / In-memory Fallback
```

## 환경변수

실제 키 값은 GitHub에 업로드하지 않습니다. `.env.example`을 참고해 필요할 때만 `.env`를 생성합니다.

DB 인스턴스 자체는 팀원이 각자 따로 사용합니다. 팀 공통 기준은 `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/migrations/`, `apps/backend/prisma/seed.ts`입니다.

```env
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:3000
PORT=3000
CLIENT_URL=http://localhost:5173
AI_API_KEY=
AI_MODEL=
# 개인 개발 DB URL로 교체합니다. 비워두면 DB 없이 mock fallback으로 실행됩니다.
DATABASE_URL=
POSTGRES_USER=neet2work
POSTGRES_PASSWORD=neet2work
POSTGRES_DB=neet2work
R2_ENDPOINT=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

## 실행 방법

자세한 개발 환경 세팅은 [setup/SETUP.md](./setup/SETUP.md)를 참고합니다. 운영체제별 완전 초기 세팅은 [setup/WINDOWS_SETUP.md](./setup/WINDOWS_SETUP.md), [setup/MACOS_SETUP.md](./setup/MACOS_SETUP.md), [setup/LINUX_SETUP.md](./setup/LINUX_SETUP.md)에 정리되어 있습니다. 협업 규칙은 [CONTRIBUTING.md](./CONTRIBUTING.md)에 정리되어 있습니다.

### 처음 설치

```bash
corepack pnpm run setup
```

`corepack pnpm run setup`은 의존성 설치, `.env` 생성, Prisma Client 생성, Playwright Chromium 설치를 한 번에 수행합니다.

`corepack pnpm run setup` 과정의 `db:generate`는 Prisma Client 생성만 수행하므로 PostgreSQL이 실행 중이지 않아도 됩니다.

### 프론트/백엔드 동시 실행

```bash
corepack pnpm run dev
```

### 각각 실행

```bash
corepack pnpm run dev:frontend
corepack pnpm run dev:backend
```

### 선택: Docker Compose 실행

```bash
docker compose up --build
```

Docker Compose는 로컬에서 frontend, backend, PostgreSQL 17 컨테이너를 함께 실행하고 싶을 때만 사용합니다. 각자 Supabase, AWS RDS, 로컬 PostgreSQL 등 별도 DB를 쓰는 기본 개발 흐름에는 필수가 아닙니다.

### 테스트 실행

```bash
corepack pnpm run test
```

프론트엔드와 백엔드는 Vitest 기반 smoke test를 포함합니다.

### DB 마이그레이션

PostgreSQL 스키마 공유는 Prisma Migrate를 사용합니다.

DB 서버는 각자 따로 사용하고, 스키마와 샘플 데이터만 Git으로 통일합니다.

```bash
corepack pnpm run db:migrate
corepack pnpm run db:seed
```

Prisma migration은 아래 구조로 관리합니다.

```txt
apps/backend/prisma/
├─ schema.prisma
├─ seed.ts
└─ migrations/
   ├─ migration_lock.toml
   └─ 00000000000000_init/
      └─ migration.sql
```

`00000000000000_init/migration.sql`은 의미 없는 예시 파일이 아니라, 현재 프로젝트의 초기 DB 스키마를 만드는 실제 migration 파일입니다. 이 파일은 `job_postings`, `resume_analyses`, `AnalysisMode` enum, 인덱스, 외래키 관계를 생성합니다.

마이그레이션 실행 순서는 `prisma/migrations/` 아래의 폴더명 순서로 결정됩니다.

```txt
1. 00000000000000_init/migration.sql
2. 20260513153000_add_users/migration.sql
3. 20260514101000_add_resume_history/migration.sql
```

실제 작업에서는 Prisma가 보통 `20260513..._name` 형식의 migration 폴더를 자동 생성합니다.

새 스키마 변경을 만들 때는 아래 명령을 사용합니다.

```bash
corepack pnpm --filter @neet2work/backend run db:migrate -- --name add_feature_name
```

동료가 만든 migration을 받은 뒤에는 아래 순서로 맞춥니다.

```bash
git pull
corepack pnpm run db:migrate
corepack pnpm run db:seed
```

기존 스키마를 크게 바꾸고 싶을 때는 상황에 따라 다르게 처리합니다.

- 팀원들이 아직 migration을 적용하기 전: 기존 초기 migration을 다시 만들 수 있습니다.
- 팀원들이 이미 migration을 적용한 뒤: 기존 migration은 수정하지 않고 새 migration을 추가합니다.
- 로컬 개발 DB 데이터가 필요 없을 때: `corepack pnpm run db:reset`으로 로컬 DB를 초기화한 뒤 seed를 다시 넣습니다.

주의사항:

- 이미 공유된 migration 파일은 되도록 수정하거나 삭제하지 않습니다.
- 공유 후 DB 변경은 새 migration으로 누적합니다.
- 실제 개발 DB 데이터는 Git으로 공유하지 않습니다.
- 공유할 샘플 데이터는 `apps/backend/prisma/seed.ts`에 반영합니다.
- `db:reset`은 현재 `.env`의 `DATABASE_URL` 대상 DB를 초기화하므로, 공용/운영 DB에서는 실행하지 않습니다.
- 서버 실행은 DB 없이도 Mock fallback으로 가능하지만, `db:migrate`, `db:seed`는 실제 DB 연결이 필요합니다.
- `corepack pnpm run setup`, `corepack pnpm run db:generate`, `corepack pnpm run dev`는 DB 없이도 실행 가능하도록 유지합니다.

### 채용공고 JSON Import

크롤러가 만든 표준 `JobPosting` JSON은 먼저 dry-run으로 형식을 확인합니다.

```bash
corepack pnpm run db:import:jobs --dry-run ../../docs/research/job-sites/saramin_sample_2026-05-14.json
```

개인 개발 DB의 `DATABASE_URL`을 넣은 뒤 실제 upsert를 실행합니다.

```bash
corepack pnpm run db:import:jobs -- ../../docs/research/job-sites/saramin_sample_2026-05-14.json
```

이 명령은 운영 수집 payload에서는 `(source, sourceJobId)` 기준으로 upsert하므로 같은 JSON을 다시 실행해도 중복 행을 만들지 않습니다.

자세한 DB 관리 흐름은 [apps/backend/prisma/README.md](./apps/backend/prisma/README.md)를 참고합니다.

## API 예시

### Health Check

```http
GET /health
```

응답 예시:

```json
{
  "ok": true,
  "database": "not_configured",
  "ai": "mock",
  "storage": "local"
}
```

### 채용 공고 목록 조회

```http
GET /api/jobs
```

### 자기소개서 분석 요청

```http
POST /api/analyze
Content-Type: application/json
```

```json
{
  "resumeText": "React와 TypeScript를 활용한 웹 프로젝트 경험이 있습니다.",
  "jobId": "job-001"
}
```

응답 예시:

```json
{
  "data": {
    "jobId": "job-001",
    "matchScore": 95,
    "strengths": ["React 경험이 채용공고의 핵심 기술과 잘 맞습니다."],
    "weaknesses": [],
    "missingKeywords": [],
    "rewriteGuides": ["프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요."],
    "suggestedSentences": [
      "React 기반 프로젝트에서 사용자 입력 데이터를 API와 연동하여 분석 결과를 시각화한 경험이 있습니다."
    ],
    "mode": "mock"
  }
}
```

## 설계 원칙

- TypeScript로 핵심 데이터 타입을 먼저 정의합니다.
- React와 Express를 분리하되 pnpm workspaces로 하나의 저장소에서 관리합니다.
- API 키, DB, R2, AWS 설정이 없어도 서버가 죽지 않게 합니다.
- 실제 AI 연동 전에도 Mock 분석 결과가 화면에 나오게 합니다.
- 채용공고 수집은 처음부터 실제 크롤링에 의존하지 않고 `sampleJobs.json`으로 먼저 완성합니다.
- 발표 시에는 "실제 연동 가능 구조 + 로컬 fallback 구조"를 강조합니다.

## 향후 확장 기능

- 사용자 로그인 및 회원 관리
- 자기소개서 파일 업로드 기능
- 분석 이력 저장
- 직무별 추천 공고 제공
- 기업별 합격 가능성 통계 제공
- 관리자 페이지
- 실제 채용 플랫폼 연동
- Supabase/AWS RDS 기반 개발/운영 DB 분리
