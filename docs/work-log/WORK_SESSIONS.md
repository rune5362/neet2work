# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-06-09

### AI 자소서 첨부 양식/복합 문서 처리 기준 보강

- 범위: 첨부 DOCX/텍스트 양식이 한 페이지 시각 밀도, 표/칸 레이아웃, 이력서/자소서/기술스택/포트폴리오 복합 섹션을 포함할 때 분석 결과와 AI 계획 payload에 보존되도록 보강했다.
- 변경: 문서 분석 결과에 `template.layoutRules`와 `template.sections`를 추가하고, 복합 섹션을 evidence vault와 질문 생성 payload에 전달했다. 기본 자소서 양식과 안내 문구의 `1페이지 목표`도 빽빽한 글자수가 아니라 자연스러운 문서 밀도 기준으로 바꿨다.
- 검증: `corepack pnpm --filter backend test career-document-workflow.service.test.ts`, `corepack pnpm --filter frontend test AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter frontend build`, `corepack pnpm --filter backend build` 통과. `checklist-vibe` CLI와 `harness.config.json`은 없어 CLI gate는 생략했다. 테스트/build는 Windows `esbuild spawn EPERM` 및 Prisma 바이너리 네트워크 제한 때문에 승인된 로컬 권한으로 실행했다.

### Apple식 포트폴리오 PPT 템플릿 리디자인

- 범위: 기존 Worldpackers 참고 포트폴리오 PPT를 Apple keynote-inspired 발표 템플릿으로 재구성했다. 첫 장은 제목, 마지막 장은 Q&A로 유지하고 총 15장으로 맞췄다.
- 디자인: Product Design으로 대상/정적 발표물/시각 기준을 확인하고, Creative Production 스타일 인테이크로 `apple-keynote-minimal`, `hero-product-screens`, `one-line-claims`, `black-white-rhythm`, `wide-whitespace`, `no-card-grids` 방향을 고정했다.
- 내용: 기능 나열을 줄이고 큰 한 문장 중심으로 문제, 제품 루프, 작업 과정, 기술스택, 제품 화면, AI 자소서 작성 원칙을 이어갔다. AI 자소서 파트는 요구사항 고정, 근거 카드, gap 질문, plan/draft/review/revise 흐름을 별도 슬라이드로 강조했다.
- 산출물: `outputs/019ea6c4-3930-75a3-8065-72f5e2398669/presentations/neet2work-portfolio-apple-keynote/output/neet2work-apple-keynote-portfolio.pptx`
- Verification: presentation builder로 15장 PPTX 재생성, PPT 패키지 검사 15 slide XML/4 media/0 empty entries 확인, contact sheet 생성 및 시각 검수, layout quality check 15 files 0 errors 0 warnings 통과.

### Worldpackers 참고 포트폴리오 PPT 리디자인

- 범위: 기존 Neet2Work 포트폴리오 발표 PPT를 더 유연한 해외 포트폴리오 케이스스터디 톤으로 재구성했다. 첫 장은 제목, 마지막 장은 Q&A로 두고 총 15장으로 맞췄다.
- 디자인: Worldpackers Behance 케이스스터디의 Challenge/Role/Insight/Inspiration/Solution식 전개, 큰 번호, 큰 화면 캡처, 짧은 설명 리듬을 참고했다. Product Design 브리프로 기능 나열보다 사용자 흐름과 제품 판단을 우선했고, Creative Production으로 덜 딱딱한 포폴 말투와 다크/라이트 대비 톤을 잡았다.
- 내용: Jobs, 상세 drawer, AI 자소서 작성실 화면을 중심으로 설명하고, Goalplz/AGENTS.md/Product Design/Creative Production/Presentation QA를 작업 과정 슬라이드에 포함했다. AI 자소서 파트는 문항 요구사항 우선, material store, experience card, claim ledger, evidence map, 근거 부족 시 질문으로 되돌리는 흐름을 중점 설명했다.
- 산출물: `outputs/019ea6c4-3930-75a3-8065-72f5e2398669/presentations/neet2work-portfolio-worldpackers/output/neet2work-worldpackers-case-study.pptx`
- Verification: presentation builder로 15장 PPTX 재생성, PPT 패키지 검사 15 slide XML/3 media/0 empty entries 확인, contact sheet 생성 및 시각 검수, layout quality check 15 files 0 errors 0 warnings 통과.

### AI 자소서 초안 파일뷰어 통합 및 질문 위치 조정

- 범위: AI 자소서 문서 세션에서 보완 질문 카드가 가초안보다 위에 표시되고, 가초안이 파일뷰어와 별도 카드로 중복 표시되던 UX를 정리했다.
- 변경: 별도 `작성 중인 가초안/완성본` 파일 항목을 만들지 않고, 기존 첨부 파일 항목을 선택한 상태에서 파일 미리보기 패널 본문이 작성/수정된 가초안 또는 완성본으로 갱신되게 바꿨다.
- UI: 초안 본문, 글자수, TXT/Markdown 전환, 글자 크기, 제출 준비도, 복사/다운로드/문서함 저장 버튼을 첨부 문서 미리보기 패널 안으로 이동했다. 보완 질문 카드는 해당 작성본 viewer 아래에 표시되도록 순서를 바꿨다.
- 앱 브라우저 검증: 현재 `/ai-analysis?jobId=jobkorea-48853600` 탭은 대화가 초기화된 상태라 진행 중 문서 세션 DOM은 없었다. 새로고침/전송은 하지 않고 현재 상태만 확인했다.
- Verification: `corepack pnpm --filter frontend test AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter frontend build` 통과. `checklist-vibe` CLI와 `harness.config.json`은 없어 CLI gate는 생략했다. 테스트/build는 기존 Windows `esbuild spawn EPERM` 때문에 승인된 로컬 권한으로 실행했다.
