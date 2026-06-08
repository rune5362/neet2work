# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-06-07

### 13:18 AI 분석 문서 보완 질문 채팅형 전환
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 자료 기반 문서 작성 세션 안의 별도 보완 답변 textarea와 저장 버튼을 제거하고, 아래 채팅 composer 입력을 활성 보완 질문 답변으로 처리하도록 변경했다.
- Frontend: `AIDraftChatBuilder`에서 활성 문서 질문이 있을 때 채팅 전송을 `/api/career-workflow/document-session/answer`로 연결하고, 성공 시 다음 질문 또는 초안 준비 상태를 채팅 메시지로 이어준다. 문서 코치 패널 문구도 채팅 답변 대기 기준으로 조정했다.
- Verification: `AIDraftChatBuilder.test.tsx` 71건, frontend TypeScript compile, `git diff --check`를 통과했다. in-app Browser 현재 DOM에서 기존 답변 textarea selector와 placeholder가 미노출임을 확인했다.

### 13:26 AI 분석 채팅 파일 드롭/붙여넣기 첨부
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 채팅 composer에 파일을 드래그해서 놓거나 클립보드에서 붙여넣으면 기존 첨부칩으로 들어오도록 확장했다.
- Frontend: 파일 선택 input의 첨부 처리 로직을 공용 `attachFiles` 흐름으로 분리하고, composer bar의 `dragenter/dragover/dragleave/drop/paste` 이벤트에서 파일만 가로채도록 연결했다. 일반 텍스트 붙여넣기는 기존 textarea 동작을 유지한다.
- Verification: `AIDraftChatBuilder.test.tsx` 73건, frontend TypeScript compile, `git diff --check`를 통과했다. in-app Browser에서 `/ai-analysis` composer 렌더와 콘솔 오류 없음도 확인했다.

### 13:31 AI 분석 README 문서 오분류 수정
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 자소서 양식과 README 두 개를 함께 첨부했을 때 README가 자소서 양식으로 오분류되어 문항과 보완 질문이 생성되는 문제를 수정했다.
- Backend: `DocumentAnalysisService`에서 README 파일명과 프로젝트 소개/기술스택/API/Mock-first 등 프로젝트 문서 신호를 자소서 양식 점수보다 먼저 참고자료로 분류하도록 조정했다. 양식 1개 + README 2개 회귀 테스트를 추가했다.
- Verification: backend `career-document-workflow.service.test.ts` 10건, backend TypeScript compile, `git diff --check`를 통과했다.

### 13:39 AI 분석 GitHub repo deep-read 확장
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: README만으로 기술스택을 추정하는 한계를 줄이기 위해 GitHub 저장소 분석에서 repo tree와 주요 manifest 파일을 제한적으로 읽도록 확장했다.
- Backend: `GithubAnalysisService`가 public repo의 `/git/trees`, `package.json`, `vite.config`, `prisma/schema.prisma`, `Dockerfile`, `requirements.txt`, `pyproject.toml`, `pom.xml`, `go.mod`, `Cargo.toml` 등 핵심 파일을 읽고 감지 기술스택, 근거 파일, 주요 소스 구성을 GitHub evidence fact로 추가한다. `GITHUB_TOKEN`/`GH_TOKEN` 헤더 지원과 `.env.example` 문서화도 추가했다.
- Verification: backend `career-document-workflow.service.test.ts` 11건, backend TypeScript compile, `git diff --check`를 통과했다.

### 13:47 AI 분석 GitHub 프로필 URL 조사 처리 수정
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: `https://github.com/r2gul4r를`처럼 GitHub URL 뒤에 한국어 조사가 붙으면 계정명을 잘못 파싱해 GitHub 분석이 unavailable로 떨어지는 문제를 수정했다.
- Backend: `GithubAnalysisService`에서 URL 끝 한국어 조사를 제거하고, 프로필 URL deep-read 경로에 필요한 repo 이름/summary helper를 보강했다. 프로필 URL도 최근 repo 일부의 tree와 manifest를 읽어 감지 기술스택 근거를 생성한다.
- Verification: backend `career-document-workflow.service.test.ts` 12건, backend TypeScript compile, 로컬 API `POST /api/career-workflow/document-session`에서 `r2gul4r` 프로필 fetched 및 repo 기술스택 evidence 생성을 확인했고, `git diff --check`를 통과했다.

### 14:01 AI 분석 GitHub 프로필 repo 관련도 선택
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 프로필 URL 분석이 최근 repo만 deep-read하지 않도록, 자소서/지원직무/첨부자료 맥락과 맞는 repo를 우선 선택하게 변경했다.
- Backend: `CareerDocumentWorkflowService`가 GitHub/포트폴리오 분석 컨텍스트에 target role, job posting, 선택 문항, 작성 스타일을 포함한다. `GithubAnalysisService`는 프로필 repo를 최대 50개 가져와 이름, 설명, 언어, topic을 키워드 점수로 랭킹하고 상위 repo만 tree/manifest deep-read한다. 관련 키워드가 없을 때만 최근 업데이트 기준으로 fallback한다.
- Verification: backend `career-document-workflow.service.test.ts` 13건, backend TypeScript compile, `git diff --check`를 통과했다. 직접 GitHub API smoke는 현재 외부 연결 오류로 확인하지 못했다.

### 14:14 AI 분석 GitHub rate limit 원인 표시
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: `https://github.com/r2gul4r보고`처럼 URL 뒤에 한국어 서술어가 공백 없이 붙은 입력과 GitHub API rate limit 실패 문구를 함께 수정했다.
- Backend: GitHub URL 끝의 trailing 한글을 제거해 실제 owner URL로 정리하고, GitHub API 403 rate limit/401/404 실패를 generic README 요청으로 뭉개지 않고 구체적인 fallback message로 내려보낸다.
- Verification: backend `career-document-workflow.service.test.ts` 13건, backend TypeScript compile, 로컬 API에서 `r2gul4r보고`가 `https://github.com/r2gul4r`로 정리되고 rate limit 소진 메시지가 반환되는 것을 확인했다. `.env`와 `apps/backend/.env`에는 GitHub token key가 없음을 값 노출 없이 확인했고, `git diff --check`를 통과했다.

### 14:22 AI 분석 GitHub 다중 사용자 서버 캐시
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 배포 환경에서 여러 사용자가 GitHub 프로필/저장소를 분석할 때 서버 공용 API 한도를 빠르게 소모하지 않도록 GitHub 읽기 구조를 보강했다.
- Backend: `GithubAnalysisService`에 서버 프로세스 메모리 캐시를 추가해 profile, repo list, languages, README, tree, manifest content 요청을 TTL 동안 재사용한다. 캐시 키는 익명/서버 토큰 사용 여부를 분리하고, `.env.example`에 서버용 `GITHUB_TOKEN` 운영 목적과 `GITHUB_ANALYSIS_CACHE_TTL_MS`를 문서화했다.
- Verification: backend `career-document-workflow.service.test.ts` 14건, backend TypeScript compile, `git diff --check`를 통과했다. 반복 프로필 분석에서 두 번째 요청이 GitHub fetch를 추가로 호출하지 않는 회귀 테스트를 추가했다.

### 14:42 AI 분석 GitHub 보완 질문 사유 문구 수정
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: GitHub API 실패 원인을 구체적으로 계산해도 보완 질문 카드에는 기존 고정 문구가 계속 노출되는 문제를 수정했다.
- Backend: `GapInterviewService`의 `github_context` whyAsking을 하드코딩 문구 대신 해당 GitHub 분석의 `fallbackMessage`로 표시하게 변경했다.
- Verification: backend `career-document-workflow.service.test.ts` 14건, backend TypeScript compile, 로컬 API에서 백엔드 재시작 후 `r2gul4r보고` 입력이 GitHub fetched로 처리되고 `github_context` 질문이 생성되지 않는 것을 확인했다. `git diff --check`를 통과했다.

### 14:52 AI 분석 Codex Bridge env 로딩 복구
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: `.env`가 `.env.example` 대비 부실해 Codex Bridge가 disabled로 표시되고, env 로딩 순서 때문에 값 추가 후에도 bridge 설정이 반영되지 않는 문제를 수정했다.
- Backend/Config: 기존 `.env` 값은 보존하면서 `.env.example` 기준 누락 키를 채우고 로컬 개발용 `REQUIRE_HTTPS=false`, `CODEX_BRIDGE_ENABLED=true`를 적용했다. `ai-config.ts`가 자체적으로 root/backend `.env`를 먼저 로드하도록 변경해 ESM import 순서와 무관하게 provider 설정을 읽는다.
- Verification: `/api/draft-workflow/providers`에서 `codex_bridge`가 online/configured true로 반환됨을 확인했고, in-app Browser `/ai-analysis`에서 `Codex · 온라인`과 상단 `연결됨`을 확인했다. backend `ai-providers.status.test.ts` + `career-document-workflow.service.test.ts` 28건, backend TypeScript compile, `git diff --check`를 통과했다.

### 15:04 AI 분석 첨부 문서 원본 미리보기
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: docx 같은 첨부 양식의 추출 텍스트가 표 구조를 잃고 무질서하게 보이는 문제를 줄이기 위해 문서 분석 카드의 앞면을 원본 파일 preview 중심으로 바꿨다.
- Frontend: 첨부 파일의 object URL, MIME type, size를 보존하고 문서 분석 결과의 sourceId와 매칭해 PDF/이미지는 인라인 미리보기로 표시한다. docx 등 브라우저가 직접 렌더링하지 못하는 파일은 원본 파일 block과 다운로드 액션을 보여주고, 감지 문항/추출 텍스트는 접힌 details 영역으로 이동했다. object URL은 제거/새 대화/unmount 시 정리한다.
- Verification: frontend TypeScript compile, `AIDraftChatBuilder.test.tsx` 73건, in-app Browser `/ai-analysis` 새로고침 및 console error 없음, `git diff --check`를 통과했다.

### 15:44 AI 분석 문서 작성 흐름 단순화
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 문서 세션 화면에서 단계, GitHub 분석, Evidence Vault, 문항별 내부 초안/리스크 노출을 제거하고 사용자가 다음 질문에 채팅으로 답한 뒤 완성본을 받는 흐름만 남겼다.
- Frontend: `AIDraftChatBuilder`의 문서 세션 카드는 첨부 파일 열기 목록과 현재 AI 질문 카드만 렌더링한다. 문서 세션 중 오른쪽 문서 코치 요약 패널은 숨기고, 문서 기반 초안도 일반 결과 카드에서 복사/다운로드 가능한 완성본으로 표시한다. 질문 생성은 백엔드 분석 결과를 그대로 사용하고 UI에 고정 질문 목록을 추가하지 않았다.
- Verification: frontend TypeScript compile, `AIDraftChatBuilder.test.tsx` 73건, in-app Browser `/ai-analysis` 새로고침 후 `Codex · 온라인`, composer 표시, 기존 답변 placeholder/Evidence Vault/GitHub 분석 미노출, console error 없음, `git diff --check`를 통과했다.

### 15:59 AI 분석 PDF/DOCX 원본 파일 뷰어
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 사용자가 말한 "구글 문서처럼 PDF/DOCX를 볼 수 있는" 원본 첨부 파일 뷰어를 문서 세션 안에 추가했다.
- Backend: 기존 `/api/resume/extract` DOCX 처리에서 `mammoth.convertToHtml` 결과를 `previewHtml`로 함께 반환해 분석용 텍스트와 화면용 HTML을 분리했다.
- Frontend: 첨부 파일 객체에 `previewHtml`을 보관하고, 문서 세션에서 파일별 `보기` 버튼과 `첨부 원본 미리보기` 패널을 렌더링한다. PDF는 object URL iframe, DOCX는 sandbox iframe `srcDoc`로 표시하고, 텍스트 파일은 preformatted preview로 보여준다. 원치 않았던 작성본 라이브 프리뷰는 제거했다.
- Verification: frontend/backend TypeScript compile, `AIDraftChatBuilder.test.tsx` 74건, backend `resume-extract.service.test.ts` 5건, in-app Browser `/ai-analysis` 새로고침 후 composer 표시/기존 live preview 미노출/console error 없음, `git diff --check`를 통과했다.

### 16:18 AI 분석 문서 세션 AI 라우터 연결
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 문서 세션 최종 초안이 규칙 기반 생성으로만 끝나 하드코딩처럼 보이던 문제를 수정했다.
- Backend/API: `/api/career-workflow/document-session`과 `/answer` 요청에 `aiSelection`을 받도록 스키마/타입을 확장하고, 보완 질문이 모두 끝난 뒤 `CareerDocumentWorkflowService`가 선택된 AI provider로 `draft` 작업을 호출해 문서 기반 초안을 대체 생성하도록 연결했다. provider 실패, fallback, invalid output은 규칙 기반 초안으로 대체하되 `aiMeta`와 risk에 남긴다.
- Frontend: 문서 세션 생성/답변 payload에 현재 선택 provider를 포함하고, 문서 기반 완성본 결과 카드에도 실제 provider/fallback 배지를 표시하도록 연결했다.
- Verification: frontend/backend TypeScript compile, backend `career-document-workflow.service.test.ts` + route test 20건, frontend `AIDraftChatBuilder.test.tsx` 74건, in-app Browser `/ai-analysis` 새로고침 후 기본 Codex provider/console error 없음 확인, `git diff --check`를 통과했다.

### 16:54 AI 분석과 daegyune/page/home 병합 충돌 해결
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: `origin/daegyune/page/home` 병합 중 발생한 AI 설정, AI 분석 채팅 빌더, 채팅 빌더 테스트 충돌을 해결했다.
- Merge: `ai-config.ts`는 test 환경 dotenv skip과 Codex Bridge env 선로드를 함께 유지했다. `AIDraftChatBuilder`는 채팅형 문서 작성/파일 뷰어/수동 provider 선택 흐름과 저장 프로필 context chip 흐름을 병합했고, 테스트 mock은 `extractFails`와 `/api/profiles` 응답을 모두 지원하도록 정리했다.
- Verification: Prisma Client 재생성 후 frontend/backend TypeScript compile, frontend `AIDraftChatBuilder.test.tsx` 84건, backend `draft-workflow.route.test.ts`/`prompt-builder.test.ts`/`profile-document.integration.test.ts` 14건, conflict marker scan, `git diff --check`를 통과했다.

### 17:54 프로젝트 전체 리뷰 패치
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 전체 코드리뷰에서 확인한 AI 실행 API 보호, 확인 필요 evidence 사용, DB fallback, refresh token rotation, 운영 JWT/proxy 환경 리스크를 패치했다.
- Backend/API: AI 분석/문서 추출/career workflow/draft workflow 실행 라우트에 인증과 user/IP 기반 rate limit을 붙였고, DB 연결이 있을 때 Prisma 오류를 메모리 fallback으로 숨기지 않게 정리했다. refresh token 재사용 race는 조건부 `updateMany`로 차단하고, production JWT secret placeholder/짧은 값 검증과 AI rate limit/TRUST_PROXY env 계약을 추가했다.
- AI Evidence: GitHub README/metadata와 포트폴리오 제목/기술스택처럼 확인된 사실은 초안 근거로 쓰되, 본인 기여나 요약처럼 확인이 필요한 근거는 사용자 답변 전까지 draft payload와 filled slot에서 제외하도록 바꿨다.
- Frontend: AI 분석 페이지의 보호된 API 호출에 현재 access token을 전달하도록 연결했다.
- Verification: `corepack pnpm run lint`, `corepack pnpm run test` 232 backend + 105 frontend tests, `corepack pnpm run build`, `git diff --check`를 통과했다. test/build는 sandbox `spawn EPERM` 때문에 승인 후 재실행했다.

### 18:16 Codex Bridge draft fallback 원인 수정
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: `start-codex-bridge` 이후 provider 상태는 online인데 초안 생성이 fallback/실패로 떨어지는 현상을 재검토했다.
- Root Cause: Codex app-server 계정 smoke와 짧은 turn smoke는 성공했고, `DraftWorkflowService.createPlan`도 `codex_bridge` + `usedFallback=false`로 성공했다. 실제 draft 단계에서 Codex가 만든 본문은 정상인데 `charCount` 메타데이터가 본문 길이와 달라 backend evidence lock 검증에서 422로 막혔다.
- Backend: AI provider가 반환한 `draftText`를 기준으로 `charCount.withSpaces`, `withoutSpaces`, `limit`을 backend에서 재계산한 뒤 evidence lock 검증을 수행하도록 변경했다. AI가 산술 메타데이터를 틀려도 본문/근거가 유효하면 Codex 결과를 유지한다.
- Verification: 실제 Codex Bridge plan+draft smoke에서 `planAiMeta.usedFallback=false`, `draftAiMeta.usedFallback=false`를 확인했다. `corepack pnpm run lint`, backend focused `draft-workflow.service.test.ts` 10건, 전체 `corepack pnpm run test` 338건, `corepack pnpm run build`를 통과했다.

### 18:36 Jobs 페이지 DB 인증서 경로 복구
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: `start-codex-bridge` 실행 후 `Jobs` 페이지가 fallback처럼 보인다는 보고를 `Jobs` 기준으로 재추적했다.
- Root Cause: `/api/jobs`가 AI provider와 무관하게 500을 반환했고, `/health`에서 DB SSL 인증서가 이전 워크트리의 `C:\lsh\...prod-ca-2021.crt` 절대경로를 가리켜 `database: unavailable` 상태였다.
- Backend: `resolveDatabaseUrl`이 죽은 `sslrootcert` 절대경로를 현재 백엔드 `certs` 폴더의 같은 인증서 파일로 보정하게 했다. DB SSL 인증서 누락은 공고 조회에서 DB unavailable fallback으로 분류해 500으로 화면을 깨지 않도록 했다.
- Verification: backend test 235건, `corepack pnpm run lint`, backend build, `git diff --check`를 통과했다. 로컬 `/health`는 `database: connected`, `/api/jobs?page=1&limit=9`는 실제 `daijob` 공고 200 응답, in-app Browser `/jobs`는 총 104개 공고와 `daijob` 출처를 표시하고 fallback/error 안내가 없음을 확인했다.

### 19:00 전체 기능 점검 및 DB 마이그레이션 적용
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 전체 페이지와 주요 상호작용을 리뷰/테스트/실사용 검증하고, 이미 확인된 auth DB migration 누락을 포함해 기능 오류를 복구했다.
- DB: `prisma migrate deploy`로 미적용 13개 migration을 연결된 Supabase PostgreSQL에 적용했다. `create_users`, `create_audit_logs`, `create_refresh_tokens`가 포함되어 회원가입/로그인/refresh token 저장 흐름이 정상화됐다. 최종 `migrate status`는 up to date다.
- Backend/API: 회원가입, 로그인, 보안 요약, 프로필 수정, refresh, logout을 실제 API로 확인했다. 프로필/문서 생성, 복사, 보호/복구, 문서세트 생성/수정/조회/보관도 실제 API smoke로 통과했다.
- Frontend/UI: in-app Browser에서 홈, Jobs, AI 분석, Auth, Signup, Login, Documents, ProfileNew/Detail, DocumentNew/Detail, DocumentSetDetail, Notifications, MyAccount를 로드하고 주요 상호작용을 확인했다. Jobs 검색/상세 drawer/AI 분석 이동, UI 회원가입/로그인, 프로필 생성, 자기소개서 생성, 문서세트 상세, AI 분석 질문 답변 흐름을 실사용했다.
- Fix: AI 초안 생성이 완료로 표시되면서 본문이 0자인 오류를 발견했다. `draftWorkflowDraftSchema`와 evidence lock 검증에서 빈 초안 본문을 invalid output으로 막고, non-fallback AI가 빈/invalid 초안을 반환하면 안전한 fallback draft로 대체하도록 `DraftWorkflowService`를 수정했다. 회귀 테스트를 추가했다.
- Verification: `corepack pnpm run lint`, `corepack pnpm run test` 342건, `corepack pnpm run build`, `git diff --check`, `/health`, `/api/draft-workflow/providers`, in-app Browser console error 없음 확인을 통과했다. 테스트/빌드는 sandbox spawn 제약 때문에 승인 후 실행했다.

### 20:37 완전검증 2차 스윕
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: "완전검증" 목표로 기존 자동 검증에 더해 현재 로컬 서버/DB/API/UI/반응형/Codex Bridge 상태를 다시 확인했다.
- Baseline: 프론트 `http://localhost:5173`, 백엔드 `http://localhost:3000` 기준으로 `/health`가 `database: connected`를 반환했고, `/api/jobs?page=1&limit=3`은 실제 `daijob` 데이터를 반환했다. `prisma migrate status`는 연결된 Supabase PostgreSQL에서 up to date였다.
- Automated checks: `corepack pnpm run check`로 lint, frontend 105 tests, backend 237 tests, frontend/backend build를 통과했다. sandbox `spawn EPERM` 때문에 승인 후 재실행했다.
- API smoke: 공개 API와 보호 라우트 anonymous 차단을 확인했다. 승인 후 임시 테스트 계정 `codex-e2e-1780832146876@example.com`으로 auth signup/login/security/profile patch/logout, profile/document/document-set create/list/detail/update/copy/archive/delete, resume extract, analyze, career document session/answer, draft workflow plan/draft/revise를 실제 API로 검증했고 30/30 통과했다.
- Browser/UI: in-app Browser에서 홈, Jobs, AI 분석, Auth, Signup, Login, Documents, ProfileNew, DocumentNew, Notifications, MyAccount를 로드해 빈 화면/콘솔 에러가 없음을 확인했다. Jobs 검색 쿼리, 직무 필터, 상세 필터, 지역 팝오버, 상세 drawer, AI 분석 job context를 확인했고, Documents 문서 상세/프로필 상세, MyAccount 수정 UI도 열림을 확인했다.
- Responsive: 모바일 390x844와 데스크톱 1366x768에서 홈, Jobs, AI 분석, Documents, MyAccount가 가로 overflow 없이 렌더링되고 console error가 없음을 확인했다.
- Codex Bridge: sandbox에서는 `codex:bridge:smoke`가 `spawn EPERM`으로 실패했지만 승인 경로에서는 `ok: true`, app-server `stdio`, ChatGPT Pro 계정으로 확인됐다. `/api/draft-workflow/providers`와 UI는 `Codex · 온라인`, Fallback 온라인으로 표시했다. 실제 Codex provider plan/draft 생성 호출은 외부 AI 사용량 가능성 때문에 추가 명시 승인 없이는 실행하지 않았다.
- Verification: `git diff --check`를 통과했다. 브라우저 텍스트 입력 자동화는 Browser 가상 클립보드 미설치로 제한되어, 검색 입력 자체는 URL 쿼리 검증으로 대체했다.

### 21:26 AI 연결 상태 하드코딩 제거 검증
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 사용자가 승인한 실제 Codex provider 호출로 AI가 연결되어 있는데도 규칙/하드코딩 응답이 노출되는 지점을 재검증하고 제거했다.
- Backend/API: `/api/analyze`를 mock 분석에서 AI router `analyze` 작업으로 연결하고, 문서 세션 보완 질문도 real provider가 online일 때 `plan` 결과로 생성하도록 바꿨다. AI 질문 생성 payload에서 기존 규칙 질문 문장을 제거해 Codex가 고정 문구를 반복하지 않게 했다. fallback provider는 real provider 실패/invalid/output unavailable일 때만 쓰는 안전망으로 남겼고 `aiMeta.usedFallback`에 노출한다.
- Frontend: AI 분석 초기 정적 응답과 `/ai-analysis/details` 구형 페이지를 제거하고, 채팅으로 보낸 사용자 입력을 분석 payload에 안정적으로 포함하도록 `submittedUserText`를 추가했다. GitHub URL parser는 복구하되, "URL만으로 저장소를 단정할 수 없다"는 고정 안내 노트는 제거했다.
- Verification: 실제 `/api/draft-workflow/providers`에서 `codex_bridge online/configured=true`를 확인했다. 실제 Codex 호출로 `/api/analyze`는 `mode=ai`, `providerId=codex_bridge`, `usedFallback=false`; `/api/career-workflow/document-session`은 `providerId=codex_bridge`, `usedFallback=false`와 새 맥락 질문을 반환했다. `corepack pnpm --filter @neet2work/frontend test` 105건, backend tests 239건, `corepack pnpm run lint`, `corepack pnpm run build`, in-app Browser `/ai-analysis`와 `/ai-analysis/details` 리다이렉트 검증을 통과했다.

### 22:47 Oracle VM GitHub Actions 자동 배포 구성
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: GitHub에 반영된 코드가 Oracle VM으로 자동 배포되도록 운영용 Docker/Compose와 GitHub Actions workflow를 추가했다.
- Deploy: 개발용 Dockerfile/compose는 유지하고, frontend nginx 정적 서빙 + backend production build + local PostgreSQL volume 구조의 `docker-compose.oracle.yml`을 별도로 추가했다. GitHub Actions는 private repo에서도 서버 GitHub 권한 없이 동작하도록 checkout 결과를 tar archive로 Oracle VM에 전송하고 `/opt/neet2work/current` release symlink를 갱신한다.
- Runtime: nginx가 `/api/*`와 `/health`를 backend 컨테이너로 proxy하므로 외부에는 port 80만 노출하는 구성을 기본값으로 잡았다. 서버 env 예시는 `deploy/oracle/env.production.example`에 비밀값 없이 추가했다.
- Verification: `git diff --check`, frontend production build, backend production build를 통과했다. `bash -n`은 Windows WSL 접근 제한으로 실행되지 않았다. Oracle VM에 Docker/env/GitHub Secrets를 쓰는 단계는 HTTPS 비활성 direct-IP 운영 노출 및 외부 secret 등록이 포함되어 추가 명시 승인이 필요해 대기 상태다.

### 23:24 Oracle VM 실배포 및 인증 검증
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 사용자 승인 후 Oracle VM에 Docker/Compose를 설치하고, Supabase PostgreSQL을 운영 DB로 쓰는 production env를 구성해 현재 작업 트리를 수동 1차 배포했다.
- Deploy: `docker-compose.oracle.yml`을 외부 DB 연결 방식으로 수정하고 local Postgres 컨테이너 의존성을 제거했다. backend Docker build에서 Prisma generate가 build-time `DATABASE_URL`을 요구하는 문제는 dummy build URL로 해결했고, runtime은 `.env.production`의 Supabase DB URL을 사용한다. `scripts/deploy-oracle.sh`는 compose project name을 `neet2work`로 고정하고 health retry를 추가했다.
- Auto deploy: GitHub Secrets 자동 등록 도구가 없어, 공개 repo를 활용한 VM pull-based 자동 배포 timer를 설치했다. `/opt/neet2work/oracle-poll-deploy.sh`와 `neet2work-deploy.timer`가 `main` SHA를 주기적으로 확인한다. 현재 GitHub `main`에는 배포 파일이 아직 없어 첫 실행은 skip 상태였고, 이 변경사항이 main에 올라가면 다음 polling에서 배포된다.
- Verification: `http://129.146.96.211/`가 200으로 응답하고 `/health`는 `database: connected`를 반환했다. Supabase 플러그인은 재인증 필요 상태라 직접 SQL 도구는 막혔지만, 배포된 backend가 Supabase pooler에 연결되어 `prisma migrate deploy`에서 pending migration 없음이 확인됐다. 실제 API로 회원가입/로그인/protected security endpoint를 통과했고, 컨테이너 내부 Prisma 조회로 `codex-prod-e2e-1780841733@example.com` 사용자가 `ACTIVE` 상태로 DB에 존재함을 확인했다. `git diff --check`를 통과했다.

### 23:34 배포 사이트 최종 검증 및 Supabase 플러그인 점검
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: Supabase 플러그인 연결 후 운영 DB, Oracle VM 배포본, UI 실사용, 코드 검사를 다시 확인하고 최종 리뷰 이슈를 정리했다.
- Supabase: 플러그인으로 `neet2work` 프로젝트가 `ACTIVE_HEALTHY`임을 확인했고, Prisma migration 18개 적용 상태와 최신 적용 시각을 조회했다. 배포 API/UI에서 만든 테스트 회원 계정 2개가 운영 DB에 `ACTIVE` 상태로 존재함을 확인했다.
- Deploy/UI: `http://129.146.96.211/health`는 `database: connected`를 반환했고, `/api/jobs?page=1&limit=3`은 실제 `daijob` 공고를 반환했다. Playwright로 배포 사이트의 홈, 채용공고, AI 분석, 로그인, 회원가입, 문서 페이지를 열고 콘솔/페이지 오류가 없음을 확인했으며, UI 회원가입 후 로그인 이동까지 통과했다.
- Server: Oracle VM의 `neet2work-deploy.timer`가 active이고, backend/frontend compose 컨테이너가 실행 중임을 확인했다. 현재 GitHub `main`에 배포 파일이 아직 없어 polling deploy는 skip하지만, 변경사항이 main에 반영되면 다음 polling에서 배포되는 구조다.
- Review: Supabase advisor가 `users`, `refresh_tokens`, `audit_logs`, `application_documents`, `candidate_profiles`, `application_sets`의 RLS disabled critical 이슈를 보고했다. Supabase 안내상 자동 remediation SQL은 적용하지 않고, 정책 설계 후 별도 migration으로 처리할 항목으로 남겼다. 배포본 AI provider는 Codex/Gemini/local 비활성, fallback online 상태라 실 AI 운영은 별도 provider 설정이 필요하다.
- Verification: `corepack pnpm run lint`, `corepack pnpm run test` 344건, `corepack pnpm run build`, `git diff --check`를 통과했다. Playwright Chromium 실행은 Windows sandbox `spawn EPERM` 때문에 승인 후 재실행했다.

### 00:07 DuckDNS HTTPS 운영 연결
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 무료 DuckDNS 도메인으로 Oracle VM 배포본에 HTTPS를 붙이고 외부 접속을 검증했다.
- DNS/Network: Chrome에서 `neet2work.duckdns.org`를 생성하고 IP를 `129.146.96.211`로 설정했다. Oracle Cloud `Default Security List for jeju-vcn`에 TCP `443` ingress rule을 추가했고, VM host firewall에도 TCP `80`/`443`을 허용했다.
- Server: Caddy를 설치해 `neet2work.duckdns.org` 요청을 `127.0.0.1:8080` frontend 컨테이너로 reverse proxy하도록 구성했다. Docker Compose는 frontend 외부 포트를 `127.0.0.1:8080`으로 제한하고, backend HTTPS guard가 Caddy/nginx forwarded proto를 인식하도록 배포 설정을 정리했다.
- Docs: `docs/deploy/ORACLE.md`에 DuckDNS/Caddy/HTTPS 구조와 필요한 80/443 인바운드 조건을 반영했다.
- Verification: 외부에서 `https://neet2work.duckdns.org/health`가 200과 `database: connected`를 반환했고, 홈과 jobs API도 200으로 응답했다. HTTPS 경유 임시 계정 회원가입 201, 로그인 200을 확인했으며 Chrome에서 HTTPS 홈 화면이 정상 렌더링되는 것을 확인했다. `git diff --check`를 통과했다.

### 00:29 Supabase 보안 advisor 정리 및 커밋 준비
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 남은 Supabase RLS/security advisor 항목을 migration으로 정리하고, 전체 변경사항 커밋/푸시 전 검증을 수행했다.
- DB/Supabase: `users`, `audit_logs`, `refresh_tokens`, `application_documents`, `candidate_profiles`, `application_sets`에 RLS를 활성화하고 anon/authenticated 권한을 회수했으며, 명시적인 `No direct Data API access` deny policy를 추가했다. 기존 RLS-only 테이블인 `_prisma_migrations`, `job_postings`, `resume_analyses`에도 동일한 deny policy를 추가했다. `pg_trgm` extension은 public schema에서 `extensions` schema로 이동했다.
- Verification: Prisma `db:deploy`로 migration 3개를 운영 Supabase DB에 적용했고 `db:status`는 up to date를 반환했다. Supabase security advisor는 `lints: []`로 확인됐다. `corepack pnpm run lint`, `corepack pnpm run test` 344건, `corepack pnpm run build`, `git diff --check`를 통과했다. test/build는 Windows sandbox `spawn EPERM` 때문에 승인 경로로 재실행했다.
- AI: 배포 서버 env에는 Gemini key 항목이 있으나 provider status는 아직 disabled다. 운영 Gemini 활성화는 유료 API 호출 가능성과 backend 재시작이 포함되어 사용자 명시 승인을 기다리는 상태다.

### 00:52 sub-main 배포 브랜치 전환
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: `main`을 건드리지 않고 Oracle VM 자동배포용 `sub-main` 브랜치를 생성하고 배포 대상을 전환했다.
- Git: 현재 검증된 작업 HEAD로 `sub-main` 브랜치를 만들고 원격에 푸시했다. `main`은 그대로 유지했다. GitHub Actions deploy trigger와 `scripts/oracle-poll-deploy.sh` 기본 브랜치, Oracle 배포 문서를 `sub-main` 기준으로 수정했다.
- Server: Oracle VM systemd `neet2work-deploy.service`의 `BRANCH`를 `sub-main`으로 변경하고 timer를 재시작했다. 기존 single-branch clone에서 `origin/sub-main` ref가 없던 문제는 poller가 명시 refspec으로 `refs/remotes/origin/sub-main`을 갱신하도록 수정해 해결했다.
- Verification: `neet2work-deploy.service`를 즉시 실행해 `/opt/neet2work/.deployed-sha`와 `/opt/neet2work/repo`가 `sub-main` 최신 SHA를 가리키는 것을 확인했다. compose 컨테이너는 backend/frontend 모두 up 상태였고, `https://neet2work.duckdns.org/health`와 provider API는 200으로 응답했다.

### 01:12 운영 AI provider 활성화 점검
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 사용자 승인 후 Oracle VM 운영 env에서 Gemini 활성화 플래그와 기본 모델을 켜고, Codex Bridge 연결 조건을 점검했다.
- Gemini: `/opt/neet2work/.env.production`과 repo runtime env에 `GEMINI_ENABLED=true`, `GEMINI_MODEL=gemini-2.5-flash`를 반영하고 backend 컨테이너를 재시작했다. 다만 `GEMINI_API_KEY` 줄은 존재하지만 값이 비어 있어 배포 providers API는 `missing_key_or_model` 상태다. 키 값은 출력하지 않고 줄 길이/존재 여부만 확인했다.
- Codex Bridge: 운영 host와 backend 컨테이너 모두 `codex` 명령을 찾지 못했고, backend env는 `CODEX_BRIDGE_ENABLED=false` 상태다. 현재 배포에서 Codex를 쓰려면 서버 또는 backend image에 Codex CLI를 설치하고, `/app/.codex` 같은 persistent `CODEX_HOME`에서 backend-side 로그인 후 bridge smoke check를 통과해야 한다.
- Verification: `https://neet2work.duckdns.org/api/draft-workflow/providers`가 200으로 응답했으며 현재 상태는 `codex_bridge disabled`, `gemini missing_key_or_model`, `fallback online`으로 확인됐다. 로컬 `.env`도 Gemini key 줄은 있으나 값은 비어 있음을 존재 여부만 확인했다.

### 01:18 Codex Bridge LAN 시연 스크립트 추가
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 서버 배포 없이 학원 작업 PC를 Codex Bridge AI 서버처럼 켜고, 같은 네트워크의 시연 PC가 접속하는 포트폴리오 시연 경로를 추가했다.
- Scripts: `start-codex-bridge-lan.cmd`와 `scripts/start-codex-bridge-lan.ps1`을 추가해 작업 PC IPv4 자동 감지 또는 수동 IP 입력을 지원하고, `CODEX_BRIDGE_ENABLED`, `CODEX_BRIDGE_HOME`, `VITE_API_BASE_URL`, `CLIENT_URL`, localhost origin 허용값을 한 번에 설정하도록 했다.
- Docs: `README.md`에 LAN 시연 실행법과 Windows 방화벽 TCP `5173`/`3000` 확인 항목을 추가했다.
- Verification: 자동 IP 감지 dry-run, 수동 IP batch wrapper dry-run, `git diff --check`를 통과했다. 실제 dev server 실행은 사용자의 작업 PC 네트워크에서 수행해야 하므로 이번 턴에서는 켜지 않았다.

### 01:47 Oracle 사이트 Codex 시연 터널 및 Gemini 모델 롤오버
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 오라클 배포 사이트는 그대로 쓰고 `/api`만 작업 PC Codex backend로 우회하는 시연 경로와 Gemini 다중 모델 fallback을 구현했다.
- Scripts: `oracle-caddy-demo-mode.cmd`, `scripts/oracle-caddy-demo-mode.ps1`, `start-oracle-codex-demo-bridge.cmd`, `scripts/start-oracle-codex-demo-bridge.ps1`을 추가했다. Caddy 시연 모드는 `/api/*`와 `/health`를 Oracle localhost `3900` reverse tunnel로 보내고, 나머지는 기존 frontend `8080`으로 보낸다. 작업 PC 스크립트는 Codex Bridge backend를 켜고 `127.0.0.1:3900 -> 작업PC:3000` SSH reverse tunnel을 유지한다.
- Gemini: `GEMINI_MODELS`를 추가해 `gemma-4-31b-it`, `gemma-4-26b-a4b-it`, `gemini-2.5-flash` 같은 우선순위 모델 목록을 지원한다. 모델별 429/quota, provider error, timeout, invalid JSON이 나면 같은 Gemini provider 안에서 다음 모델을 시도하고, `GEMINI_MODEL`은 기존 호환용 fallback으로 유지했다.
- Verification: PowerShell script parse, 작업 PC bridge dry-run, Oracle Caddy status read-only check를 통과했다. 현재 Caddy는 `demo_mode=disabled`, frontend 200, tunnel port 3900 미연결 상태를 확인했다. Backend targeted `ai-providers.status.test.ts` 16건, backend lint, backend build, `git diff --check`를 통과했다. sandbox `spawn EPERM`/Prisma 네트워크 차단은 승인 경로로 재실행했다.

### 01:56 Oracle Codex 시연 원클릭화
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 시연 절차가 복잡해지지 않도록 `start-oracle-codex-demo-bridge.cmd` 하나로 backend 실행, SSH reverse tunnel 대기, Oracle Caddy 시연 모드 전환, 종료 시 Caddy 원복과 job 정리를 모두 처리하도록 변경했다.
- Docs: README와 Oracle 배포 문서를 원클릭 실행 기준으로 정리하고, 강제 종료 등 자동 원복 실패시에만 `oracle-caddy-demo-mode.cmd -Action disable`을 수동 실행하도록 안내했다.
- Verification: updated bridge script parse, dry-run, `git diff --check`를 통과했다.

### 02:01 Gemini/Gemma 키 및 모델 호출 검증
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 로컬 `.env`에 Gemini API key 값이 들어온 것을 존재 여부만 확인하고, 요청대로 `안녕` 프롬프트를 각 모델에 1회씩 호출했다.
- Gemini: `gemma-4-31b-it`와 `gemma-4-26b-a4b-it`는 Google API가 `500 Internal error encountered`를 반환했고, `gemini-2.5-flash`는 200과 `안녕!` 응답을 반환했다. 키 값은 출력하지 않았다.
- Verification: bridge script dry-run, `git diff --check`, backend Vitest 30 files / 241 tests 통과를 확인했다. Vitest는 sandbox `spawn EPERM` 때문에 승인 경로로 재실행했다.

### 02:07 Gemma 4 호출 안정화
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: Gemma 4 모델 호출 실패를 수정하기 위해 모델 목록과 payload 변형을 실 API로 확인한 뒤, Gemma 모델은 `v1` endpoint를 쓰고 5xx transient error는 같은 모델에서 1회 재시도하도록 provider를 수정했다.
- Gemini: API 모델 목록에서 `gemma-4-31b-it`, `gemma-4-26b-a4b-it`, `gemini-2.5-flash`가 모두 `generateContent`를 지원함을 확인했다. 수정 후 `안녕` 1회 호출은 세 모델 모두 200으로 성공했다.
- Verification: backend Vitest 30 files / 242 tests, backend lint, backend build, `git diff --check`를 통과했다. build/test의 sandbox 제한은 승인 경로로 재실행했다.

### 02:11 GitHub Actions secret 미설정 실패 처리
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: `sub-main` push 후 `Deploy to Oracle VM` GitHub Actions run이 실패하는 원인을 확인하고 workflow를 수정했다.
- CI: run `27099218739`의 실패 지점은 `Validate secrets` 단계였고, `ORACLE_HOST`, `ORACLE_USER`, `ORACLE_SSH_PRIVATE_KEY`가 GitHub Secrets에 비어 있어 exit 1이 발생했다. VM pull-based deploy를 병행 중이므로 GitHub deploy secrets가 없을 때는 실패 대신 notice를 남기고 deploy steps를 skip하도록 `.github/workflows/deploy-oracle.yml`을 변경했다.
- Verification: GitHub run/job/log 확인, workflow diff review, `git diff --check`를 통과했다.

### 02:43 Oracle Codex 데모 브릿지 AI 연결 복구
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: `start-oracle-codex-demo-bridge` 실행 후 공개 사이트의 Codex/Gemini/Gemma provider 연결 상태를 점검하고, Gemini가 disabled로 떨어지는 원인을 수정했다.
- AI/Config: 로컬 `.env`에 Gemini key 값은 있었지만 `GEMINI_ENABLED=false`이고 모델 목록이 비어 있어 로컬 backend provider가 disabled로 뜨는 상태였다. secret 값은 출력하지 않고 enable flag와 `GEMINI_MODELS=gemma-4-31b-it,gemma-4-26b-a4b-it,gemini-2.5-flash`만 로컬 설정에 반영했다.
- Runtime: 이전 실행에서 남은 `127.0.0.1:3900 -> 127.0.0.1:3000` SSH reverse tunnel이 새 터널을 방해해 stale tunnel과 기존 demo script를 정리한 뒤 bridge를 재실행했다.
- Verification: 공개 `https://neet2work.duckdns.org/api/draft-workflow/providers`에서 `codex_bridge`, `gemma-4-31b-it`, `gemma-4-26b-a4b-it`, `gemini-2.5-flash`가 모두 `online=true`로 확인됐다. Google API direct smoke에서 세 모델 모두 `안녕` 호출에 HTTP 200으로 응답했다. 로컬 3000 backend listener와 Oracle SSH reverse tunnel 프로세스가 유지 중임을 확인했다.

### 02:52 로컬 단일 PC 시연 배치 추가
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: README의 Codex Bridge 실행 경로를 확인하고, 오라클이나 LAN 없이 작업 PC 한 대에서 frontend/backend/Codex/Gemini/Gemma를 켜는 로컬 시연 배치를 추가했다.
- Scripts: `start-local-codex-demo.cmd`와 `scripts/start-local-codex-demo.ps1`을 추가했다. 기존 `start-codex-bridge.cmd`는 새 로컬 시연 스크립트를 호출하는 호환 alias로 변경했다.
- Docs: README에 로컬 단일 PC Codex/Gemini 시연 섹션을 추가하고, 기존 LAN 시연과 Oracle 사이트 시연 경로와 구분했다.
- Verification: `scripts/start-local-codex-demo.ps1 -DryRun`, `start-local-codex-demo.cmd -DryRun`, `start-codex-bridge.cmd -DryRun`, `git diff --check`를 통과했다.

### 02:58 시연 배치 파일명 정리
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 루트의 `start-*` 시연 배치 이름이 서로 비슷해 발표 중 헷갈릴 수 있어, 실행 목적별 숫자 prefix 파일명으로 정리했다.
- Scripts: 루트 실행 파일을 `1-demo-local-pc.cmd`, `2-demo-lan-other-pc.cmd`, `3-demo-oracle-site.cmd`로 교체하고 기존 `start-codex-bridge.cmd`, `start-codex-bridge-lan.cmd`, `start-oracle-codex-demo-bridge.cmd`를 제거했다. 내부 PowerShell 스크립트는 안정성을 위해 유지했다.
- Docs: README와 Oracle 배포 문서의 실행 명령을 새 파일명으로 갱신했다.
- Verification: 새 3개 `.cmd` wrapper의 dry-run과 `git diff --check`를 통과했다.

### 03:02 LAN 시연 경로 제거
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 실제 시연 목적이 로컬 단일 PC와 Oracle 사이트 연결 두 가지로 좁혀져, 혼동을 줄이기 위해 LAN 전용 실행 경로를 제거했다.
- Scripts: `2-demo-lan-other-pc.cmd`와 `scripts/start-codex-bridge-lan.ps1`을 제거하고, Oracle 사이트 시연 파일을 `2-demo-oracle-site.cmd`로 당겼다.
- Docs: README의 LAN 시연 섹션을 삭제하고 Oracle 문서 실행 명령을 `2-demo-oracle-site.cmd`로 갱신했다.
- Verification: `1-demo-local-pc.cmd -DryRun`, `2-demo-oracle-site.cmd -DryRun`, 사용자용 문서의 LAN/옛 파일명 참조 제거 확인을 통과했다.

### 03:48 자소서 작성 흐름 채팅형 정리
- Thread: current Codex thread
- Scope: AI 분석 페이지의 자소서 작성 흐름을 카드/별도 답변칸 중심에서 GPT식 채팅 진행으로 바꾸고, 첨부 자료 기반 1차 초안 → 소크라테스식 보완 질문 → 2차 초안/수정 → 다운로드 흐름으로 정리했다.
- Frontend: 다음 질문 카드와 별도 답변 textarea를 제거하고, 채팅 입력으로 보완 답변과 수정 요청을 모두 처리하도록 `AIDraftChatBuilder`를 수정했다. 선택한 자소서 참고본과 프로필도 문서 세션 첨부 자료로 보내도록 연결했다.
- Backend: 자소서 분량을 1페이지 목표 900자, 최대 1.5페이지 상당 1200자로 제한하고, 근거가 일부라도 있으면 확인된 사실만으로 보수적 1차 초안을 먼저 만든 뒤 부족한 정보는 후속 질문으로 좁히도록 문서 워크플로를 조정했다.
- Verification: frontend/backend 대상 Vitest, 전체 Vitest, frontend/backend build, `git diff --check`를 통과했다. 브라우저 DOM 확인으로 답변 textarea/다음 질문 카드가 사라지고 채팅 입력과 1페이지 안내 문구가 표시되는 것을 확인했다.
