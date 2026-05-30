# Work Sessions

## 2026-05-29

### pnpm 캐시 ignore 정리
- 루트 [C:\Users\pc07-00\.codex\worktrees\c499\neet2work\.gitignore](C:/Users/pc07-00/.codex/worktrees/c499/neet2work/.gitignore)에 `.pnpm-store/` 추가
- 확인: `git check-ignore -v .pnpm-store\\v11\\index.db .pnpm-store\\cache-marker`, `git diff --check -- .gitignore`

### 원본 루트 pnpm 캐시 ignore 정리
- 원본 루트 [C:\lsh\git\neet2work\.gitignore](C:/lsh/git/neet2work/.gitignore)에 `.pnpm-store/` 추가
- 확인: `git check-ignore -v .pnpm-store\\v11\\index.db .pnpm-store\\cache-marker`, `git diff --check -- .gitignore`

### 원본 로컬 sungho 동기화 마무리
- 원본 로컬 `sungho` 워크트리에서 진행 중이던 merge를 `docs/work-log/WORK_SESSIONS.md` 충돌 정리로 마무리했다.
- 기준: 현재 일지는 `2026-05-29`만 유지하고 이전 날짜 기록은 `docs/work-log/archive/`에 둔다.

### merge 이후 코드리뷰 및 워크트리 누락 점검
- `sungho` 브랜치 기준으로 merge 결과를 코드리뷰했고, `codex/jobs-polish` 및 `antigravity/frontend-ui` 워크트리와 diff를 대조했다.
- 확인: `git diff --name-status codex/jobs-polish..sungho`, `git diff --name-status sungho..antigravity/frontend-ui`, `git -C C:/Users/pc07-00/.codex/worktrees/c499/neet2work status --short --branch`, `git -C C:/lsh/git/neet2work-antigravity status --short --branch`
- 검증 메모: backend/frontend test와 build는 샌드박스 EPERM으로 완전 검증은 못 했고, frontend build에서 `lucide-react` 로컬 설치 누락 상태도 확인했다.

### 추가 워크트리 정리
- Git에 남아 있던 추가 워크트리 `neet2work-antigravity`는 실제 폴더가 이미 사라진 상태라 `git worktree prune --verbose`로 stale metadata를 제거했다.
- 확인: `git worktree list --porcelain` 결과에 메인 `sungho` 워크트리만 남고, `.git/worktrees` 디렉터리도 제거되었다.

### 로컬 작업 브랜치 정리
- 작업트리와 함께 쓰던 로컬 브랜치 `antigravity/frontend-ui`, `codex/frontend-ui`, `codex/jobs-polish`를 삭제했다.
- 확인: `git branch -vv` 결과 로컬에는 `sungho`, `main`, `playground`, `daegyune/page/home`만 남았다.
- 참고: 원격 추적 브랜치 `origin/codex/jobs-polish`는 아직 남아 있어 원격까지 정리하려면 별도 삭제가 필요하다.

### 원격 작업 브랜치 정리
- `git push origin --delete codex/jobs-polish`로 원격 작업 브랜치 `origin/codex/jobs-polish`를 삭제했다.
- 확인: `git branch -r` 결과 원격 브랜치 목록에서 `origin/codex/jobs-polish`가 사라졌고, `git worktree list --porcelain` 기준 추가 워크트리도 남아 있지 않다.

### 프론트 Vite dev 서버 재기동
- 프론트 Vite 서버를 `http://localhost:5173`으로 다시 띄우고 HTTP `200` 응답까지 확인했다.
- 검증 메모: 샌드박스 EPERM 때문에 서버 기동은 권한 상승으로 실행했고, 현재 `src/pages/Jobs.tsx`에서 `lucide-react` import 해석 오류가 로그에 남아 있다.

### Jobs lucide import 오류 복구
- `apps/frontend/src/pages/Jobs.tsx`에서 `lucide-react` 의존 아이콘을 inline SVG로 치환해 로컬 미설치 상태에서도 `/jobs`가 깨지지 않도록 복구했다.
- 확인: `http://localhost:5173/src/pages/Jobs.tsx?t=verify` 응답 `200`, 변환 결과에서 `lucide-react` import 미포함 확인.

### /ai-analysis API 연동 1차 슬라이스
- `plan.md` 기준으로 `/ai-analysis` 채팅 분석 화면에 `POST /api/analyze` 연동 1차 슬라이스를 반영했다.
- 변경: `apps/frontend/src/pages/AIDraftChatBuilder.tsx`에 `analysisResult`/`analysisStatus`/`analysisError` 상태, `resumeText` 10자 검증, 공고 변경 시 결과 초기화, API 결과 UI 매핑(점수·강점·보완점·키워드·가이드·추천 문장·mode 배지).
- 스타일: `apps/frontend/src/styles.css`에 결과/에러/키워드 칩 보조 클래스 추가.
- 테스트: `apps/frontend/src/pages/AIDraftChatBuilder.test.tsx`에 analyze 흐름 5케이스 추가.
- 확인: `corepack pnpm --filter @neet2work/frontend test -- src/pages/AIDraftChatBuilder.test.tsx` 7/7 통과, `corepack pnpm --filter @neet2work/frontend build` 성공.
- 남은 슬라이스: 브라우저 수동 검증(데스크톱/모바일), `/ai-analysis/details`는 이번 범위 제외.

### /ai-analysis 브라우저 검증
- 대상 URL: `http://localhost:5174/ai-analysis` (현재 worktree Vite), `http://localhost:5174/ai-analysis?jobId=careercross-1591647`
- 확인: mock 직접 진입, 10자 미만 분석 버튼 disabled+안내, analyze 성공(`mock 분석` 배지·추천 문장·강점/보완점·가이드), 백엔드 중단 시 에러 alert 유지, 모바일(390px) 단일 컬럼 레이아웃, 데스크톱 결과/사이드 패널 겹침 없음.
- 제한: 로컬 `DATABASE_URL` 미연결로 `/api/jobs` 500 → `jobId` 쿼리는 mock 공고 fallback만 확인. analyze API는 `POST /api/analyze` mock 응답으로 정상.
- 환경 메모: backend 기동 전 `db:generate` 필요, 프론트는 5173 점유로 5174에서 검증.

### /ai-analysis 분석 입력/상태 버그 수정
- `initialMessages`에서 데모 user 답변 제거, 초기 `draftState`를 `idle`로 변경해 사용자 입력 전 analyze 차단.
- `handleSend`/`handleGenerate` 시작·실패 시 `analysisResult` 초기화, 결과 카드는 `analysisResult` 있을 때만 렌더.
- `analyzeRequestIdRef`로 공고 변경·새 대화·재입력 후 stale 응답 무시.
- ATS 세부 바: API 결과 있으면 matchScore+키워드만, 없으면 `(추정)` 라벨 유지.
- 테스트: resumeText payload 검증, stale failure/race/new message 케이스 추가 (11 tests).
- 확인: `corepack pnpm --filter @neet2work/frontend test -- src/pages/AIDraftChatBuilder.test.tsx` 11/11, build 성공.

### /ai-analysis 채팅 UX 정리
- `plan.md` 기준으로 `/ai-analysis` 채팅 UX 정리 슬라이스를 반영했다.
- 변경: `AIDraftChatBuilder.tsx`에 새 대화 확인 모달(취소/오버레이/Escape 유지), textarea `scrollHeight` 자동 확장, inline `Icon` switch → `assets/icons/ai-draft-*.svg` import, 버튼 `aria-label`/`title`/`data-tooltip`, 첨부 버튼 `준비 중` disabled, AI 아바타를 `neet2work_symbol_reference_curve 1.png`로 교체.
- 자산: `apps/frontend/src/assets/icons/`에 ai-draft SVG 9개 추가.
- 스타일: `styles.css`에 아바타/아이콘/composer 정렬/확인 모달/tooltip/첨부 disabled 보조 클래스 추가.
- 테스트: `AIDraftChatBuilder.test.tsx` chat UX 7케이스 추가 (확인 모달·textarea 확장·tooltip·아바타).
- 확인: `corepack pnpm --filter @neet2work/frontend test -- src/pages/AIDraftChatBuilder.test.tsx` 18/18, build 성공.

### /ai-analysis 리뷰 피드백 반영
- lint: analyze 실패 mock의 미사용 `init` 인자를 `_init`으로 변경.
- 첨부 버튼: `disabled` 대신 wrapper `data-tooltip` + `aria-disabled`로 hover tooltip 유지.
- ready 경합: `handleSend` 시 항상 `idle` 전환, `sendReplyTimeoutRef`로 stale AI reply timer 취소.
- 테스트: ready 즉시 hide, stale timer 2케이스 추가 (20 tests).
- 확인: lint 통과, `AIDraftChatBuilder.test.tsx` 20/20, build 성공.

### /ai-analysis 첨부 버튼 아이콘·UI 개선
- `ai-draft-attach.svg`(paperclip) 추가, composer 첨부 버튼 아이콘을 `edit` → `attach`로 교체.
- 라벨 문구를 `자기소개서 첨부 (준비 중)`으로 정리하고 wrapper span 제거, 버튼에 tooltip 직접 부여.
- `styles.css`: 44px 정사각 보조 버튼(border/어두운 배경/hover·focus), `pointer-events: none` 제거로 tooltip/hover 유지.
- 테스트: attach 아이콘·tooltip 문구 검증 갱신.
- 확인: `git diff --check`, lint, test 20/20, build 성공.

### /ai-analysis 다음 질문 아이콘 수정
- `다음 질문 이어가기` 버튼이 기존 spark 아이콘과 같은 모양으로 남아 있던 문제를 수정했다.
- 변경: follow-up 전용 `ai-draft-follow-up.svg` 자산 추가, 버튼 아이콘을 `followUp`으로 교체, 아이콘 검증용 `data-icon-name` 속성 추가.
- 테스트: 성공 결과 렌더 테스트에서 `다음 질문 이어가기` 버튼이 `followUp` 아이콘을 사용하는지 검증.
- 확인: `git diff --check`, frontend lint, `AIDraftChatBuilder.test.tsx` 20/20, frontend build 성공.
- 서버: `localhost:5173`이 다른 워크트리의 오래된 Vite 서버를 서빙 중인 것을 확인하고, 현재 Codex worktree 기준으로 5173 서버를 재기동했다.

### /ai-analysis 하단 Composer pill 재구성
- 상단 `AI 설정` 버튼/`settingsOpen` popover 제거, `대화 히스토리`·`새 대화`만 유지.
- 하단 composer를 pill bar(`+` / textarea / 모델 선택 / 보내기) 단일 구조로 재구성.
- `+` popover: `사진 및 파일 추가`(준비 중), `문체 설정`, `단답 보완 질문` 토글.
- 모델 popover: `Gemini Pro` / `Fast Draft` / `Precision` 선택, 두 popover 동시 열림 방지·바깥 클릭/Escape 닫기.
- 자산: `ai-draft-chevron.svg`, `ai-draft-arrow-up.svg` 추가. 보내기 버튼은 위쪽 화살표 원형 버튼.
- 사이드 패널 `관리` 버튼 제거(설정 진입점 composer로 이동).
- 테스트: composer 구조·옵션 popover·followUp 토글·모델 변경·send 흐름 6케이스 추가 (25 tests).
- 확인: `git diff --check`, lint, test 25/25, build 성공.

### /ai-analysis 채팅 입력바 UI 보정
- composer bar 기본 `min-height: 48px`, padding `6px 8px`, `align-items: center`로 보내기 버튼(34px) 수직 정렬.
- `+` 버튼 32px 투명 아이콘, compact popover(150~180px, 행 32px)로 축소. `준비 중` 설명 제거, 문체 설정은 한 줄 select row.
- AI 모델 버튼 border/background 제거, 텍스트+chevron만 노출. hover underline, focus ring만 적용.
- textarea 1줄 `line-height: 22px` 기준, `COMPOSER_INPUT_MIN_HEIGHT=22`로 기본 높이 유지·멀티라인 확장 유지.
- 테스트: compact popover class·`준비 중` 미노출 검증 추가.
- 확인: lint, test 25/25, build 성공, `localhost:5173/ai-analysis` bar height 48px·send gap 7px/7px 확인.

### /ai-analysis composer·요약 리뷰 피드백 반영
- `사진 및 파일 추가`: `disabled` + `준비 중` 라벨로 비활성 상태 명확화.
- textarea: `scrollHeight > 240px`이면 높이 cap + `overflow-y: auto`로 잘림 방지.
- 대화 요약: 사용자 메시지(없으면 analysis strengths) 기반 동적 렌더, 없을 때 빈 상태 문구.
- 작성 옵션 popover: `role="dialog"`, 문체는 radio 버튼 그룹, followUp은 `role="switch"`.
- 테스트: cap 초과 scroll, attach disabled, 요약 empty/동적, tone radio 4케이스 추가 (29 tests).
- 확인: lint, `AIDraftChatBuilder.test.tsx` 29/29.

### /ai-analysis 작성 옵션 문체 서브팝업
- `toneMenuOpen` 상태 추가, inline 문체 목록 제거 → `문체 설정` row + chevron + 오른쪽 `aiDraftComposerToneSubmenu`.
- 작성 옵션 구조: attach(disabled) / divider / 문체 trigger / divider / followUp switch.
- 문체 선택 시 `settings.tone` 갱신 + 작성 옵션·문체 팝업 모두 닫기. Escape/바깥 클릭 시 3종 팝업 전부 닫기.
- 모바일: tone submenu를 옵션 팝업 위쪽(`bottom: calc(100% + 8px)`)으로 재배치.
- 테스트: 문체 inline 미노출, submenu open, tone 선택 close, divider 2개 (30 tests).
- 확인: lint, test 30/30, build 성공.

### /ai-analysis 작성 옵션 팝업·첨부·시각 보정 (score_total=4)
- 문체 chevron: 열림/닫힘과 무관하게 `rotate(-90deg)` 고정(오른쪽 화살표).
- 문체 서브팝업: 작성 옵션 dialog 하위로 이동, `aiDraftComposerToneSubmenuAligned`로 `bottom: 0`, `left: calc(100% + 6px)` 하단 정렬.
- 파일 첨부: `attachedFiles`/`fileInputRef` 추가, hidden `input[type=file]` 연결, `.txt`/`.md`는 `File.text()`로 읽어 `resumeText`에 `\n\n` 병합. 이미지/PDF/DOC/DOCX는 chip만 표시.
- chip UI: composer bar 위 `aiDraftAttachedFiles`, 제거 버튼, 읽기 실패 시 `읽기 실패` 표시.
- 채팅 패널 선명도: overlay opacity·radial gradient·bubble border/background 불투명도 보정.
- 테스트: attach 활성·file input click·txt/md payload·chip 제거·chevron/submenu 정렬 4케이스 추가. jsdom `File.text` polyfill을 `src/test/setup.ts`에 추가.
- 확인: lint, `AIDraftChatBuilder.test.tsx` 34/34, build 성공.

### /ai-analysis 첨부 파일 mock 추출 API 연동
- 백엔드: `POST /api/resume/extract` 추가. base64 JSON 입력으로 `.txt`/`.md` 디코드, `.pdf`/`.doc`/`.docx`는 mock 본문 반환, 이미지는 거부.
- 프론트: PDF/DOC/DOCX 첨부 시 extract API 호출 후 `resumeText`에 병합. chip `읽는 중…` 상태 추가.
- 테스트: backend service/route 4케이스, frontend pdf payload 1케이스 추가.
- 확인: backend test 125/125, frontend test 35/35, lint/build 성공. 브라우저 `5174/ai-analysis`에서 작성 옵션·문체 서브팝업·attach 활성 상태 확인.

### /ai-analysis 첨부·분석 리뷰 피드백 반영
- PDF/DOC/DOCX mock 본문 주입 제거 → chip만 표시(`본문 미포함`), `resumeText`/`analyze` payload 제외.
- `.txt`/`.md` 첨부만으로 `draftState=ready` 승격 → `AI 초안 생성 시작` 버튼 노출.
- 첨부 추가 시 `resetAnalysis()` + `draftState` idle 초기화(제거 시에만 하던 반쪽 처리 수정).
- `/api/resume/extract` 사용자 입력 오류는 `HttpError(400)`로 분리, PDF/DOC/DOCX는 400 거부.
- 테스트: attach-only analyze, pdf payload 제외, 첨부 시 stale 결과 제거, extract 400 (frontend 37, backend 126).

### Codex 앱 워크트리 변경분 원본 폴더 병합
- Codex 앱 워크트리 `C:\Users\pc07-00\.codex\worktrees\d8fd\neet2work`의 `/ai-analysis` 및 관련 백엔드/테스트 변경분을 원본 폴더 `C:\lsh\git\neet2work`로 복사 반영했다.
- 원본의 `Jobs.tsx`는 현재 워크트리와 동일했고, `WORK_SESSIONS.md`는 원본 내용이 현재 워크트리 내용의 접두인 것을 확인한 뒤 상위 버전으로 갱신했다.
- 신규 파일: resume extract route/service/types/utils, ai-draft SVG icons, `plan.md`.

### 5/29 Figma 작업일지 반영 및 커밋 준비
- `docs/work-log/WORK_LOG.md`에 5/29 Figma 요약 5개를 작성했다.
- Figma bridge를 `127.0.0.1:3927`로 재시작해 `figma:apply-log`를 재시도했고, `Figma WORK_LOG appended.` 성공 응답을 확인했다.
- 확인: `worklog:export`, frontend `AIDraftChatBuilder`/`Jobs` 테스트 52/52, backend 테스트 126/126, `git diff --check`.
