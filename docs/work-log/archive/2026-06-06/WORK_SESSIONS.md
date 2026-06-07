# Work Sessions

## 2026-06-06

### 01:16 AI 커리어 문서 코치 문서 작성 세션 재설계
- Thread: `019e9876-4578-75d1-b93c-8ed3fcabf3b9`
- Scope: 자소서 원본 파일과 GitHub URL을 함께 받은 뒤 `자료 수집 -> 근거 분석 -> 부족 정보 질문 -> 문항별 초안`으로 이어지는 커리어 문서 작성 세션을 백엔드/프론트에 구현했다.
- Backend: 문서 분석, GitHub fetch 분석, Evidence Vault 정규화, gap interview, 근거 기반 문항별 draft 생성을 `career-document-workflow` 서비스로 분리하고 `/api/career-workflow/document-session`, `/api/career-workflow/document-session/answer` 라우트를 추가했다.
- Frontend: 기존 채팅 화면에서 파일 카드와 텍스트 말풍선을 분리하고, 초안/분석 의도 감지 시 버튼 없이 문서 세션을 시작하도록 연결했다. 세션 단계, 문서 분석, GitHub 근거, Evidence Vault, 질문별 답변 저장, 문항별 초안/부족 근거/리스크를 표시하도록 수정했다.
- Verification: backend targeted vitest, frontend targeted vitest, backend/frontend lint, backend/frontend TypeScript build, UTF-8 API smoke, in-app Browser page render smoke를 확인했다.
- Gap: Browser MCP에서 파일 업로드 조작 API가 확인되지 않아 실제 화면에서 파일 선택 후 전송까지의 end-to-end 조작은 완료하지 못했다. 빌드 산출물 백엔드 서버와 API 스모크로 새 흐름의 서버 응답은 확인했다.

### 13:39 AI 커리어 문서 코치 리뷰 패치
- Thread: `019e9876-4578-75d1-b93c-8ed3fcabf3b9`
- Scope: 리뷰에서 발견한 보완 답변 slot 누락, GitHub fetch 무제한 대기, 새 UX와 충돌하는 프론트 테스트 기대값을 패치했다.
- Backend: `CareerGapAnswer.slot`을 optional로 추가하고, 답변 저장 시 해당 질문 slot을 high-confidence interview evidence에 보존하도록 수정했다. GitHub API 요청에는 timeout/abort 처리를 추가했다.
- Frontend tests: provider/fallback/안내형 문구 노출을 기대하던 기존 테스트를 새 사용자-facing 계약인 자동 작성, 근거 기반 안전 생성, provider 비노출 기준으로 갱신했다.
- Verification: backend career-document workflow/routes vitest 9건, `AIDraftChatBuilder.test.tsx` 70건, backend/frontend lint, backend/frontend build, `git diff --check`를 통과했다.

### 14:27 AI 분석 페이지 자소서 작성 상호작용 확장
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 첨부가 없는 경우에도 자소서 형식을 선택할 수 있게 하고, 선택 문항/글자수/문체를 문서 작성 세션 API에 전달하도록 확장했다.
- Backend: `career-document-workflow`에 선택 형식 target 필드와 일반 포트폴리오 URL 분석 서비스를 추가했다. 포트폴리오 페이지 제목/요약/기술스택은 Evidence Vault 근거로 들어가며, 읽기 실패 시 보완 질문으로 이어진다. gap interview 질문은 고정 질문 목록 대신 문항, 직무, 링크 분석 상태를 반영해 동적으로 구성하도록 바꿨다.
- Frontend: `/ai-analysis` 채팅 화면 사이드 패널에 자소서 형식 선택 UI를 추가하고, document-session 결과에 포트폴리오 분석 상태를 표시했다.
- Verification: backend career-document workflow/routes vitest 11건, `AIDraftChatBuilder.test.tsx` 71건, backend/frontend TypeScript compile을 통과했다. 샌드박스에서는 Vitest esbuild spawn이 `EPERM`으로 막혀 권한 상승으로 동일 테스트를 실행했다.

### 17:22 AI 분석 채팅 provider 선택 버튼 복구
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 채팅 composer에서 사라졌던 AI provider/model 선택 버튼과 provider 상태 패널, Codex 연결 흐름을 복구했다.
- Frontend: `AIDraftChatBuilder`의 `aiSelection` 수동 선택 상태, provider 메뉴, 실제 생성 provider 표시, Codex bridge 로그인 상태 확인/연결 UI를 다시 연결했다. 관련 테스트 기대값도 provider 라벨 노출 기준으로 갱신했다.
- Verification: `AIDraftChatBuilder.test.tsx` 71건, backend career-document workflow/routes vitest 14건, backend/frontend TypeScript compile, `git diff --check`를 통과했다.

### 17:27 AI 분석 채팅 기본 provider Codex 고정
- Thread: `019e9b5a-8feb-7201-b8ea-d0c2972b408c`
- Scope: 채팅 composer의 `AI 자동선택` 항목을 제거하고 기본 선택 provider를 Codex로 고정했다.
- Frontend: `AIDraftChatBuilder` 기본 `aiSelection`을 `codex_bridge` manual 선택으로 바꾸고, provider 메뉴에서 자동 선택 항목을 제거했다. 새 채팅 초기화도 Codex 기본값으로 맞췄다.
- Verification: `AIDraftChatBuilder.test.tsx` 71건, frontend TypeScript compile, `git diff --check`, in-app Browser에서 기본 라벨 `Codex`와 메뉴 내 자동선택 미노출을 확인했다.
