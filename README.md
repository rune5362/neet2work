
# 일했음 청년(Neet2Work)
2026 final proj, "일해야 한다(Need to work)"라는 문장과 발음이 유사한 점을 이용한 언어유희입니다. '쉬었음 청년(NEET)'에서 '일하는 청년(WORK)'으로의 변화를 직관적으로 보여줍니다.

> RPA 기반 채용 공고 수집과 생성형 AI 자소서 분석을 결합한 맞춤형 커리어 컨설팅 서비스

## 프로젝트 소개

**일했음 청년**은 사용자의 자기소개서와 채용 공고를 비교 분석하여 합격 가능성을 예측하고, 자기소개서 수정 가이드라인을 제공하는 맞춤형 커리어 컨설팅 플랫폼입니다.

RPA가 채용 공고를 수집하면, 생성형 AI가 사용자의 자기소개서와 채용 공고의 요구사항을 대조하여 다음과 같은 정보를 제공합니다.

- 채용 공고별 합격 가능성 분석
- 자기소개서와 공고 요구사항 간 적합도 비교
- 부족한 역량 및 키워드 도출
- 자기소개서 수정 방향 제안
- 직무별 맞춤형 커리어 컨설팅 제공

## 프로젝트 주제

### 맞춤형 커리어 컨설팅 서비스

RPA가 채용 공고를 수집하고, 생성형 AI가 사용자의 자기소개서와 채용 공고를 대조하여 합격 가능성을 분석한 뒤 자기소개서 수정 가이드라인을 제공하는 서비스입니다.

## 주요 기능

### 1. 채용 공고 수집

- RPA 또는 크롤링 기반 채용 공고 수집
- 기업명, 직무, 요구 기술, 우대사항, 경력 조건 등 데이터 추출
- 수집된 공고 목록 조회

### 2. 자기소개서 입력 및 관리

- 사용자가 자기소개서 내용을 입력
- 자기소개서 문항별 내용 저장 및 분석
- 추후 파일 업로드 기능 확장 가능

### 3. AI 기반 합격 가능성 분석

- 채용 공고와 자기소개서 내용 비교
- 직무 적합도 점수 산출
- 핵심 키워드 매칭률 분석
- 요구 역량 대비 부족한 부분 도출

### 4. 자기소개서 수정 가이드라인 제공

- 문장 개선 방향 제안
- 공고에 맞는 키워드 추천
- 강조해야 할 경험 및 역량 안내
- 지원 직무별 맞춤형 피드백 제공

### 5. 로컬 실행 지원

- API 키가 없어도 Mock 데이터로 실행 가능
- DB 연결이 없어도 서버가 종료되지 않도록 구성
- 인증 기능이 없어도 기본 화면과 분석 흐름 확인 가능

## 팀원 및 역할 분담

| 이름 | 역할 |
| --- | --- |
| 김대균 | 팀장, 프로젝트 관리, 일정 관리, 기능 통합 관리 |
| 재근 | 초기 프로젝트 참여 및 인수인계 예정 |
| 성호 | AI 기술 담당, 생성형 AI 분석 로직 설계 |

## 기술 스택

### Frontend

- React
- JavaScript
- HTML / CSS

### Backend

- Node.js
- Express.js
- AWS
- Oracle Cloud

### Database & Storage

- AWS RDS Free Tier
- Cloudflare R2
- 로컬 JSON 데이터 또는 In-memory 저장소

### AI

- Codex
- 생성형 AI 기반 자기소개서 분석 로직
- API 키가 없는 경우 Mock 분석 결과 제공

### Deployment & DevOps

- GitHub
- AWS
- Docker
- Oracle Cloud

## 시스템 구조

```text
사용자
  │
  ▼
React Frontend
  │
  ▼
Node.js Backend API
  │
  ├─ 채용 공고 수집 모듈
  ├─ 자기소개서 분석 모듈
  ├─ AI 분석 모듈
  ├─ Mock 분석 모듈
  └─ 데이터 저장 모듈
        │
        ├─ AWS RDS
        ├─ Cloudflare R2
        └─ Local JSON / In-memory Fallback
```

## 예상 디렉터리 구조

```text
worked-youth/
├── frontend/
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── JobList.jsx
│       │   └── ResumeAnalyze.jsx
│       ├── components/
│       └── api/
│           └── client.js
│
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   └── src/
│       ├── routes/
│       │   ├── jobs.route.js
│       │   └── analyze.route.js
│       ├── services/
│       │   ├── jobCrawler.service.js
│       │   ├── aiAnalyzer.service.js
│       │   └── mockAnalyzer.service.js
│       ├── storage/
│       │   └── localStore.js
│       └── data/
│           └── sampleJobs.json
│
├── docker-compose.yml
└── README.md
```

## 로컬 실행 조건

본 프로젝트는 학원 프로젝트 환경을 고려하여 다음 조건을 만족하도록 구성합니다.

- API 키가 없어도 서버가 실행되어야 합니다.
- DB 연결 정보가 없어도 서버가 종료되지 않아야 합니다.
- 인증 기능이 없어도 기본 기능을 확인할 수 있어야 합니다.
- React 화면이 브라우저에서 정상적으로 표시되어야 합니다.
- 외부 서비스 연결 실패 시 Mock 데이터 또는 로컬 데이터를 사용합니다.

## 환경변수 예시

실제 키 값은 GitHub에 업로드하지 않습니다.

`.env.example`

```env
PORT=3000

# AI API Key
AI_API_KEY=

# Database
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

# Cloudflare R2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
```

## 실행 방법

### 1. Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

기본 실행 주소:

```text
http://localhost:5173
```

### 2. Backend 실행

```bash
cd backend
npm install
npm run dev
```

기본 실행 주소:

```text
http://localhost:3000
```

## API 예시

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
  "resumeText": "자기소개서 내용",
  "jobId": 1
}
```

### 분석 응답 예시

```json
{
  "score": 82,
  "matchKeywords": ["React", "Node.js", "협업", "문제 해결"],
  "missingKeywords": ["AWS", "Docker"],
  "summary": "해당 공고와 자기소개서의 직무 적합도는 높은 편입니다.",
  "guidelines": [
    "프로젝트 경험을 구체적인 수치와 함께 작성하세요.",
    "공고에서 요구하는 AWS 경험을 보완하면 좋습니다.",
    "협업 과정에서 맡은 역할을 더 명확히 설명하세요."
  ]
}
```

## 예외 처리 전략

### API 키가 없는 경우

AI API 키가 없는 경우 실제 AI 분석 대신 Mock 분석 결과를 반환합니다.

```text
AI_API_KEY 없음 → Mock 분석 모듈 사용
```

### DB 연결 실패 시

DB 연결 실패 시 서버를 종료하지 않고 로컬 JSON 또는 메모리 저장소를 사용합니다.

```text
DB 연결 성공 → AWS RDS 사용
DB 연결 실패 → Local JSON 또는 In-memory 저장소 사용
```

### 인증 기능이 없는 경우

초기 버전에서는 인증 없이 주요 기능을 사용할 수 있도록 구성합니다.

```text
로그인 기능 없음 → 게스트 사용자 기준으로 서비스 실행
```

## 기대 효과

- 사용자는 채용 공고에 맞는 자기소개서 개선 방향을 빠르게 확인할 수 있습니다.
- AI 분석을 통해 자신의 강점과 부족한 역량을 객관적으로 파악할 수 있습니다.
- 팀 프로젝트 관점에서 React, Node.js, AI, RPA, Cloud, Docker를 함께 경험할 수 있습니다.
- API 키와 DB 연결이 없어도 로컬에서 안정적인 데모 실행이 가능합니다.

## 향후 확장 기능

- 사용자 로그인 및 회원 관리
- 자기소개서 파일 업로드 기능
- 분석 이력 저장
- 직무별 추천 공고 제공
- 기업별 합격 가능성 통계 제공
- 관리자 페이지
- 실제 채용 플랫폼 연동
- Docker 기반 통합 배포 환경 구축

## 프로젝트 목표

본 프로젝트의 목표는 채용 공고와 자기소개서를 단순 비교하는 수준을 넘어, 사용자가 지원 직무에 맞게 자기소개서를 개선하고 커리어 방향을 설정할 수 있도록 돕는 AI 기반 커리어 컨설팅 서비스를 구현하는 것입니다.
