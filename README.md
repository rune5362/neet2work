# 일했음 청년(Neet2Work)

2026 final project. "일해야 한다(Need to work)"와 발음이 비슷한 점을 활용해, 쉬었음 청년(NEET)이 일하는 청년(WORK)으로 전환되는 흐름을 표현한 프로젝트입니다.

> RPA 기반 채용 공고 수집과 생성형 AI 자기소개서 분석을 결합한 맞춤형 커리어 컨설팅 서비스

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
| Package Manager | npm |
| Frontend | React 19 + Vite 7 |
| Backend | Express 5 |
| DB | PostgreSQL 17 |
| RPA | Playwright |
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
- AWS RDS Free Tier
- Cloudflare R2
- Local JSON Data
- In-memory Fallback

### RPA

- Playwright

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
- Docker
- Docker Compose
- AWS
- Oracle Cloud
- npm workspaces

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
├─ docker-compose.yml
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

```env
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:3000
PORT=3000
CLIENT_URL=http://localhost:5173
AI_API_KEY=
AI_MODEL=
DATABASE_URL=postgresql://neet2work:neet2work@localhost:5432/neet2work
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
npm run setup
```

`npm run setup`은 의존성 설치, `.env` 생성, Playwright Chromium 설치를 한 번에 수행합니다.

### 프론트/백엔드 동시 실행

```bash
npm run dev
```

### 각각 실행

```bash
npm run dev:frontend
npm run dev:backend
```

### Docker Compose 실행

```bash
docker compose up --build
```

Docker Compose는 frontend, backend, PostgreSQL 17 컨테이너를 함께 실행합니다.

### 테스트 실행

```bash
npm test
```

프론트엔드와 백엔드는 Vitest 기반 smoke test를 포함합니다.

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
- React와 Express를 분리하되 npm workspaces로 하나의 저장소에서 관리합니다.
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
- Docker 기반 통합 배포 환경 구축
