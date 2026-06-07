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
