# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-05-27

### AI 자소서 빌더 채팅형 리디자인
- `/ai-draft` 본문을 GPT/Gemini형 채팅 워크스페이스로 재구성하고, 상단 `AI 설정` 팝오버와 대화 히스토리/새 대화 액션을 정리했다.
- 초기 화면에서 AI 초안 결과, 진행 메트릭, ATS 82점, 직무 스킬 매칭이 보이도록 조정하고, 결과 카드에 공백 포함/제외 자수, TXT/Markdown 전환, 폰트 크기 제어, 복사 성공 상태를 추가했다.
- 사운드 효과, 버튼 hover/press, 생성 완료 링, 메시지 진입, 팝오버 레이어 등 마이크로 인터랙션을 보강했다.
- 검증: `corepack pnpm --filter @neet2work/frontend run build` 통과, `http://127.0.0.1:5173/ai-draft` HTTP 200 확인, Playwright+로컬 Chrome으로 렌더/AI 설정/복사/메시지 입력 경로를 확인했다.

### ai-draft 원본 작업트리 선별 반영

- `neet2work-antigravity` 작업트리에서 `/ai-draft` 화면만 원본 작업트리로 가져왔다.
- 수정:
  - `apps/frontend/src/pages/AIDraftChatBuilder.tsx`를 추가했다.
  - `apps/frontend/src/App.tsx`에 `/ai-draft` 라우트를 연결했다.
  - `apps/frontend/src/components/HomeTopNav.tsx`에 `AI 자소서 빌더` 네비게이션을 추가하고 active 상태를 연결했다.
  - `apps/frontend/src/styles.css`에는 `aiDraftChatPage`로 scope가 잡힌 draft 전용 CSS 블록만 추가하고, 전역 홈 배경을 덮는 실험 CSS는 제외했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과. 최초 샌드박스 실행은 `tsbuildinfo` 쓰기 권한 때문에 실패했고, 승인된 빌드 검증으로 재실행해 통과했다.
  - 인앱 브라우저에서 `http://localhost:5174/ai-draft`가 렌더링되고 `AI 자소서 채팅`, 채팅 패널, 사이드 패널이 표시되는 것을 확인했다.
  - `/jobs` 헤더의 `AI 자소서 빌더` 링크를 클릭하면 `/ai-draft`로 이동하고 해당 네비가 active 처리되는 것을 확인했다.

### ai-analysis 화면 교체 방식 정정

- `/ai-draft`를 별도 라우트/네비로 추가하는 방식이 아니라, `neet2work-antigravity`에서 가져온 `AIDraftChatBuilder`를 기존 `/ai-analysis` 화면에 연결하도록 정정했다.
- 수정:
  - `apps/frontend/src/App.tsx`에서 `/ai-analysis`가 `AIDraftChatBuilder`를 렌더하도록 변경하고 별도 `/ai-draft` 라우트를 제거했다.
  - `apps/frontend/src/components/HomeTopNav.tsx`에서 별도 `AI 자소서 빌더` 네비를 제거하고 기존 `AI 분석` 네비만 유지했다.
  - `apps/frontend/src/pages/AIDraftChatBuilder.tsx`의 헤더 active 상태를 `analysis`로 바꿨다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - 인앱 브라우저에서 `http://localhost:5174/ai-analysis`가 `AI 자소서 채팅` 화면을 렌더하고, 헤더 `AI 분석`이 active이며 별도 `/ai-draft` 네비가 없는 것을 확인했다.

### ai-analysis Home 헤더/푸터 컴포넌트 적용 정정

- `ai-analysis` 화면에서 별도 앱 헤더를 새로 만들지 않고, Home에서 쓰는 `HomeTopNav`와 `HomeFooter` 컴포넌트를 그대로 사용하도록 정정했다.
- 수정:
  - 임시로 추가했던 `AppTopNav` 컴포넌트와 관련 CSS를 제거했다.
  - `apps/frontend/src/pages/AIDraftChatBuilder.tsx`가 `HomeTopNav active="analysis"`와 `HomeFooter`를 사용하도록 맞췄다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - 인앱 브라우저에서 `http://localhost:5174/ai-analysis`가 `HomeTopNav`, `HomeFooter`를 포함하고 `AI 분석` 네비가 active 상태인 것을 확인했다.

### ai-analysis 오른쪽 패널 선명도 개선

- 오른쪽 취업 준비 활동 패널이 반투명 배경과 `backdrop-filter: blur(16px)` 때문에 뿌옇게 보이던 문제를 정리했다.
- 수정:
  - `apps/frontend/src/styles.css`에서 `.aiDraftSidePanel`의 backdrop blur를 제거하고 불투명한 `#f8fafc` 배경으로 변경했다.
  - `.aiDraftSideHeader`, `.aiDraftInfoCard`도 흰색 불투명 배경과 선명한 border/shadow로 조정했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - 인앱 브라우저에서 `http://localhost:5174/ai-analysis`의 오른쪽 패널 `backdrop-filter`가 `none`, 패널 배경이 `rgb(248, 250, 252)`, 카드 배경이 `rgb(255, 255, 255)`로 적용된 것을 확인했다.

### ai-analysis ATS 점수 링 텍스트 비율 조정

- 오른쪽 `ATS 적합도` 카드의 원형 점수 링에서 `82`와 `/100` 텍스트 비율과 중심 정렬이 어색한 문제를 정리했다.
- 수정:
  - `apps/frontend/src/styles.css`에서 `.aiDraftScoreRing`을 grid 배치에서 flex column 중앙 정렬로 변경했다.
  - 점수 숫자는 1.72rem/900으로 낮추고, `/100`은 0.68rem과 6px 간격으로 분리해 계층이 더 자연스럽게 보이도록 조정했다.
  - 두 텍스트 모두 tabular number를 적용해 숫자 폭이 안정적으로 보이게 했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - 인앱 브라우저에서 `http://localhost:5174/ai-analysis`의 점수 링이 flex column 중앙 정렬, 숫자 27.52px, `/100` 10.88px로 적용된 것을 확인했다.

### ai-analysis 초안 적합도 미터 애니메이션 적용

- `AI 초안 결과` 진행 카드의 정적 체크 표시를 실제 퍼센트 기반 적합도 미터로 교체했다.
- 수정:
  - `apps/frontend/src/pages/AIDraftChatBuilder.tsx`에서 `draftFitProgress` 상태와 `requestAnimationFrame` 기반 증가 애니메이션을 적용했다.
  - 초기 렌더와 `AI 초안 생성 시작` 클릭 모두 `0 -> 목표 적합도`로 값이 올라가도록 `draftFitProgressRef`로 현재 값을 추적했다.
  - `apps/frontend/src/styles.css`에서 `.aiDraftFitMeter` 원형 conic-gradient, 중앙 `%` 텍스트, loading pulse/complete glow를 추가했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build`는 샌드박스 권한 제한으로 1회 실패 후, 동일 명령을 권한 상승으로 재실행해 통과했다.
  - Browser 플러그인은 `browser-client is not trusted`로 연결 실패해 로컬 Playwright CLI로 대체 검증했다.
  - `http://localhost:5174/ai-analysis`에서 새로고침 시 미터 값이 `29% -> 66% -> 82%`로 증가하는 것을 확인했다.
  - `AI 초안 생성 시작` 클릭 후 미터 값이 `2% -> 46% -> 78% -> 82%`로 증가하고, loading 상태에서 complete 상태로 전환되는 것을 확인했다.
  - 콘솔 오류는 `favicon.ico` 404 1건만 확인됐으며 앱 런타임 오류는 없었다.

### ai-analysis 초안 적합도 미터 크기 조정

- `AI 초안 결과` 진행 카드의 초안 적합도 원형 미터를 주석 요청대로 90x90으로 키우고 내부 텍스트 비율을 함께 조정했다.
- 수정:
  - `apps/frontend/src/styles.css`의 `.aiDraftFitMeter` 크기를 90px로 변경했다.
  - 내부 원 inset을 11px로 맞추고, 숫자/퍼센트/라벨 폰트 크기를 각각 1.42rem, 0.72rem, 0.72rem으로 키웠다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build`는 샌드박스 권한 제한으로 1회 실패 후, 동일 명령을 권한 상승으로 재실행해 통과했다.
  - Playwright CLI로 `http://localhost:5174/ai-analysis`에서 미터 계산값이 90x90, 숫자 22.72px, 퍼센트/라벨 11.52px, inset 11px로 적용된 것을 확인했다.
  - 콘솔 오류/경고는 0건이었다.

### Codex 작업트리 프론트 변경 원본 폴더 반영

- Codex 작업트리 `C:\Users\pc07-00\.codex\worktrees\522b\neet2work`의 최신 프론트 화면 변경을 원본 폴더 `C:\lsh\git\neet2work`로 반영했다.
- 반영 파일:
  - `apps/frontend/src/App.tsx`
  - `apps/frontend/src/components/HomeTopNav.tsx`
  - `apps/frontend/src/pages/Jobs.tsx`
  - `apps/frontend/src/pages/AIDraftChatBuilder.tsx`
  - `apps/frontend/src/styles.css`
- 검증:
  - 대상 5개 파일이 작업트리와 원본 폴더에서 동일한 SHA-256 해시인 것을 확인했다.
  - 원본 폴더에서 `/ai-draft` 라우트/네비 흔적이 없고 `/ai-analysis`가 `AIDraftChatBuilder`를 렌더하는 것을 확인했다.
  - 원본 폴더 기준 `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - 원본 폴더 기준 `corepack pnpm --filter @neet2work/frontend build` 통과. Vite chunk size 경고는 기존 번들 크기 안내이며 빌드 실패는 아니다.

### Jobs 필터 원복 문제 복구

- `/jobs` 화면이 `수집처/국가/언어` 구버전 필터로 보이던 문제를 복구했다.
- 원인:
  - 원본 폴더 반영 과정에서 Codex 작업트리에 남아 있던 구버전 `Jobs.tsx`와 jobs CSS를 원본 폴더에 복사했다.
  - 동시에 5174 dev server는 원본 폴더가 아니라 Codex 작업트리 `C:\Users\pc07-00\.codex\worktrees\522b\neet2work`에서 실행 중이었다.
- 수정:
  - `sungho` HEAD에 남아 있던 정상 `Jobs.tsx`와 jobs CSS를 복구했다.
  - `styles.css`는 `sungho` HEAD의 jobs 스타일 위에 현재 AI draft 스타일 섹션을 다시 붙여 AI 분석 미터/패널 수정은 보존했다.
  - 원본 폴더와 5174 서버가 보는 Codex 작업트리 양쪽에 동일하게 반영했다.
- 검증:
  - 원본 폴더와 Codex 작업트리의 `Jobs.tsx`, `styles.css` SHA-256 해시가 동일한 것을 확인했다.
  - `corepack pnpm --filter @neet2work/frontend lint`를 원본 폴더와 Codex 작업트리에서 각각 통과했다.
  - `corepack pnpm --filter @neet2work/frontend build`를 원본 폴더와 Codex 작업트리에서 각각 통과했다. 원본 폴더 빌드의 chunk size 경고는 안내이며 실패는 아니다.
  - Browser 플러그인은 `browser-client is not trusted`로 연결 실패해 Playwright CLI로 대체 검증했다.
  - `http://localhost:5174/jobs`에서 필터바가 `직무/경력 수준/근무 지역/고용형태/상세 필터`로 렌더되는 것을 확인했다.
  - `근무 지역` 드롭다운을 열면 한국/일본 지역 목록이 표시되고, 바깥 클릭으로 닫히는 것을 확인했다.
  - 콘솔 오류/경고는 0건이었다.

### Codex 작업트리 프론트 변경 원본 폴더 재반영
- 5174 서버가 보고 있던 Codex 작업트리의 최신 프론트 파일 5개를 원본 폴더 `C:\lsh\git\neet2work`로 다시 반영했다.
- 반영 파일: `apps/frontend/src/App.tsx`, `apps/frontend/src/components/HomeTopNav.tsx`, `apps/frontend/src/pages/Jobs.tsx`, `apps/frontend/src/pages/AIDraftChatBuilder.tsx`, `apps/frontend/src/styles.css`.
- 검증: 대상 파일 SHA-256 일치, `/jobs` 필터 복구 구조 유지, `/ai-analysis`가 AI 초안 화면으로 연결됨, `corepack pnpm --filter @neet2work/frontend lint` 및 `build` 통과.
- 참고: build는 Vite의 500kB chunk size 경고만 출력했고 실패는 없었다.

### 프론트 변경 커밋 준비
- `/ai-analysis` AI 초안 채팅 화면 연결, jobs 필터 복구, 작업일지 날짜 정리를 한 커밋으로 묶기 위해 변경 범위를 확인했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend run lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend run build`는 샌드박스 권한 제한으로 1회 실패 후, 동일 명령을 권한 상승으로 재실행해 통과했다.

### ai-analysis 채팅 빌더 100vh 맞춤
- 브라우저 코멘트에 따라 `/ai-analysis`의 `aiDraftShell` 섹션이 데스크톱 viewport 100vh 안에 들어오도록 조정했다.
- 수정:
  - `apps/frontend/src/styles.css`에서 `aiDraftShell`을 `height: 100vh`로 고정하고 상단 네비 여백을 포함한 box sizing을 적용했다.
  - `aiDraftWorkspace`, `aiDraftChatPanel`, `aiDraftSidePanel`이 shell 높이 안에서 늘어나도록 바꾸고, 채팅 타임라인과 오른쪽 패널은 내부 스크롤로 처리했다.
  - 1180px 이하 1열 레이아웃에서는 기존 세로 흐름을 유지하도록 높이 고정을 해제했다.
- 검증:
  - 인앱 브라우저 `http://localhost:5175/ai-analysis?fit-check=1`의 1680x838 viewport에서 `aiDraftShell` 높이와 bottom이 각각 838px로 계산되고 footer top도 838px로 내려간 것을 확인했다.
  - `AI 설정` 팝오버를 열어도 shell 높이와 footer 위치가 유지되고 콘솔 오류/경고가 0건인 것을 확인했다.
