# Work Sessions

## 2026-05-21

### Figma 작업일지 날짜 전환과 동기화

- `corepack pnpm run worklog:prepare`로 2026-05-20 활성 작업일지를 archive로 넘기고 2026-05-21 작업일지를 준비했다.
- `docs/work-log/WORK_LOG.md`에 2026-05-21 Figma용 요약을 작성했다.
- 로컬 Figma bridge를 통해 5/21 요약을 Figma `WORK_LOG`에 반영했다.
- 검증:
  - `corepack pnpm run worklog:export`가 5/21 요약을 출력하며 통과했다.
  - `http://localhost:3927/health` bridge 상태 확인이 HTTP 200을 반환했다.
  - `corepack pnpm run figma:apply-log -- --timeout-ms 60000`이 `Figma WORK_LOG appended`로 완료됐다.
  - 이후 `corepack pnpm run figma:check`는 Figma API rate limit인 HTTP 429로 실패했다.

### 분리된 Codex Worktree 프론트 작업 회수

- `C:\lsh\git\neet2work-codex`에 따로 남아 있던 2026-05-21 프론트 작업 기록을 중앙 archive로 회수했다.
- `neet2work-antigravity`의 Jobs/AI 분석 화면 파일을 Codex worktree로 가져와 Jobs, AI 분석 시작, AI 분석 상세 화면을 교체했다.
- Jobs 화면 필터, 결과 칩, loading/empty/error 상태, 상세 drawer 필드, 카드 액션 스타일을 정리했다.
- 상세 보기 액션은 텍스트 링크 스타일로 바꾸고, `AI 적합도 분석`은 primary CTA로 유지했다.
- 공고 상세 drawer의 액션 행을 2열 레이아웃으로 정리하고 원문 공고 CTA의 외부 링크 아이콘을 inline SVG로 교체했다.
- 공유 mock job dataset을 추가해 Jobs와 AI 분석 화면이 같은 프론트 mock 데이터를 보도록 정리했다.
- Home/분석 화면의 과장 문구, 리뷰 토글, 실제 기능처럼 보이는 placeholder 액션을 제거했다.
- AI 분석 결과 화면에 선택 공고 요약, 점수, 강점, 약점, 누락 키워드, 개선 가이드, 추천 문장 섹션을 명시했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `git diff --check -- apps/frontend` 통과.
  - `http://127.0.0.1:5174/`, `/jobs`, `/ai-analysis`, `/ai-analysis/details?state=error`, `/ai-analysis/details?jobId=job-1` 브라우저 확인에서 콘솔 오류와 모바일 가로 overflow가 없었다.

요약:

- Codex worktree에서는 Jobs와 AI 분석 화면을 실제 프론트 수정 기준으로 정리했다.
- Jobs 화면은 필터, 결과 상태, 카드 정보 구조, 상세 drawer, 액션 스타일을 중심으로 개선했다.
- AI 분석 화면은 선택 공고 맥락과 결과 리포트 섹션을 명확히 보여주는 방향으로 정리했다.
- Home과 footer/nav에서는 실제 기능처럼 보이는 placeholder와 과장 문구를 걷어냈다.

### 분리된 Antigravity Worktree AI 자소서 빌더 작업 회수

- `C:\lsh\git\neet2work-antigravity`에 따로 남아 있던 2026-05-21 AI 자소서 빌더 프론트 작업 기록을 중앙 archive로 회수했다.
- `/ai-draft` 라우트와 GNB 탭을 추가하고 `AIDraftChatBuilder.tsx`를 연결했다.
- 자기소개서 문항과 목표 글자 수를 기반으로 경험 슬롯과 글자 수 예산을 배분하는 UI 흐름을 만들었다.
- 소크라테스식 질문 피드, 슬롯 진행 대시보드, 3종 초안 탭, 복사/편집 UI를 구현했다.
- `DESIGN.md` 기준으로 슬레이트 화이트 캔버스와 딥 로열 네이비 패널 대비를 적용하고 설정/대화/결과 영역을 리디자인했다.
- 이후 기존 혼합 코드를 걷어내고 API JSON 시각화 패널, 슬롯 가중치 게이지, 반응형 규격을 포함한 전면 재구축 기록을 남겼다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend run build`가 각 단계에서 통과했다.

요약:

- Antigravity worktree에서는 `/ai-draft` 기반 AI 자소서 빌더 화면을 실험적으로 구현했다.
- 경험 슬롯, 글자 수 예산, 소크라테스식 질문, 초안 탭, 복사/편집 흐름을 프론트 UI로 구성했다.
- 이후 `DESIGN.md`의 색상, 패널, 버튼, 포커스 규칙에 맞춰 리디자인했다.
- 마지막에는 기존 혼합 코드를 걷어내고 API JSON 시각화와 슬롯 가중치 게이지를 포함한 재구축 기록을 남겼다.
