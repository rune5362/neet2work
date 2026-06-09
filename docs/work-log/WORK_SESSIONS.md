# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-06-09

### presentation-skill 프로젝트 추가

- 범위: GitHub `sirilsengolraj-source/presentation-skill` 저장소를 프로젝트 로컬 Codex skill로 추가했다.
- 변경: `.codex/skills/presentation-skill/` 아래에 `SKILL.md`, `DESIGN.md`, `README.md`, `references/`, `scripts/`, `templates/`, `examples/` 등 skill 파일을 설치했다.
- Verification: 설치 스크립트 완료 메시지 확인, 설치된 `SKILL.md`의 `name: presentation-skill` 확인, `git status --short`로 신규 skill 디렉터리 추가 범위 확인.

### dependency overview SVG 배치 조정

- 범위: `docs/generated/dependencies/overview.svg`의 `Frontend` 영역이 더 오른쪽에 배치되도록 dependency overview Mermaid 생성 흐름을 조정했다.
- 변경: `scripts/generate-dependency-graphs.mjs`의 overview 그래프에서 backend/external을 먼저 배치하고, frontend API client를 진입점으로 둬 Mermaid LR 레이아웃이 frontend 클러스터를 우측으로 밀도록 했다.
- Verification: `corepack pnpm run docs:deps:mermaid`, `corepack pnpm run docs:diagrams`, `git diff --check` 통과. 생성된 SVG에서 `Frontend` 클러스터 x 좌표가 `346.84375`로 이동한 것을 확인했다.

### Neet2Work 발표용 PPTX 생성

- 범위: `presentation-skill` saved workspace 방식으로 Neet2Work 최종 발표용 PPTX를 생성했다.
- 변경: `.codex/skills/presentation-skill/decks/neet2work-project-presentation/`에 `design_brief.json`, `content_plan.json`, `evidence_plan.json`, `asset_plan.json`, `outline.json`, Playwright 캡처 helper와 화면 캡처 asset을 작성했다.
- 산출물: `.codex/skills/presentation-skill/decks/neet2work-project-presentation/build/neet2work-pptx.pptx` 40장. 전체 컨셉, 기능 정의, 설계, 구현 순서로 구성하고 `docs/generated` SVG 및 홈/채용공고/AI 분석/문서함/로그인 캡처를 포함했다.
- Verification: `cmd /c npm run check:node`, `cmd /c npm run check:python`, Playwright headless 화면 캡처, `python3 scripts/build_workspace.py --workspace decks/neet2work-project-presentation --qa --skip-render --overwrite` 통과. QA 결과 overflow 0, overlap 0, placeholder 0, geometry violation 0, design error 0. `python-pptx`로 40장 제목 순서와 placeholder 문자열 없음 확인.

### Neet2Work PPTX SVG 호환성 수정

- 범위: PowerPoint에서 일부 SVG 다이어그램 텍스트가 보이지 않는 문제를 해결했다.
- 변경: `assets/helpers/render-svg-assets.mjs`를 추가해 `docs/generated` SVG 10개를 Playwright inline SVG 렌더링으로 PNG asset으로 변환하고, `outline.json`의 설계 figure 경로를 `assets/diagrams-png/*.png`로 교체했다.
- Verification: PNG 대표 asset에서 텍스트 렌더링 확인, PPTX 재빌드 QA 통과. 최종 PPTX media 확인 결과 `svg_count=0`, PNG media 16개 포함. `python-pptx`로 40장, 첫/마지막 제목, placeholder 문자열 없음 확인.

### Neet2Work 발표용 PPTX timestamp workspace 생성

- 범위: 기존 `neet2work-project-presentation` workspace를 덮어쓰지 않고, 사용 기술과 생성 시간을 담은 새 발표 산출물 폴더를 만들었다.
- 변경: `.codex/skills/presentation-skill/decks/neet2work__pd-cp__20260609-1541/`에 기존 PNG 다이어그램과 화면 캡처를 재사용한 deck source를 복사하고, 출력명을 `build/neet2work.pptx`로 정리했다. PPTX에는 SVG를 이미지로 직접 넣지 않고 PNG asset을 사용했다.
- 산출물: `.codex/skills/presentation-skill/decks/neet2work__pd-cp__20260609-1541/build/neet2work.pptx` 39장. QA overlap을 만든 `Auth login sequence` 중복 텍스트 장표는 제거했다.
- Verification: `node scripts/build_deck_pptxgenjs.js --outline decks/neet2work__pd-cp__20260609-1541/outline.json --output decks/neet2work__pd-cp__20260609-1541/build/neet2work.pptx --style-preset executive-clinical` 성공. `python3 scripts/qa_gate.py --skip-render --fail-on-design-warnings` 통과, overflow 0, overlap 0, placeholder 0, design warnings 0. LibreOffice `soffice`가 없어 rendered slide QA는 실행하지 못했다.

### Neet2Work Tech Blueprint PPTX 재제작

- 범위: 기존 발표 deck의 문장/장표 구조를 재사용하지 않고, 개발자 청중용 `Tech Blueprint` 콘셉트로 새 발표 workspace를 만들었다.
- 변경: `scripts/generate-tech-blueprint-deck.mjs`를 추가해 Product Design 브리프와 Creative Production style route를 반영한 새 `design_brief.json`, `content_plan.json`, `evidence_plan.json`, `asset_plan.json`, `outline.json`을 생성했다. 기존 PNG 다이어그램/화면 캡처만 재사용하고, 표지/설계/구현 전환용 blueprint 콘셉트 PNG 3개를 새로 생성했다.
- 산출물: `.codex/skills/presentation-skill/decks/neet2work__tech-blueprint-pd-cp__20260609-1606/build/neet2work.pptx` 41장. PPTX media에는 PNG asset 19개가 포함되고 SVG media는 포함하지 않았다.
- Verification: `node scripts/build_deck_pptxgenjs.js --outline decks/neet2work__tech-blueprint-pd-cp__20260609-1606/outline.json --output decks/neet2work__tech-blueprint-pd-cp__20260609-1606/build/neet2work.pptx --style-preset midnight-neon` 성공. `python3 scripts/qa_gate.py --skip-render --fail-on-design-warnings` 통과, overflow 0, overlap 0, placeholder 0, design warnings 0. PPTX 내부 검사 결과 slide 41, media 19, svgMedia 0, badTokens none. LibreOffice `soffice`가 없어 rendered slide QA는 실행하지 못했다.

### Neet2Work Tech Blueprint PPTX 복구 및 한국어화

- 범위: Tech Blueprint PPTX가 PowerPoint에서 복구 프롬프트를 띄우고 본문이 영어로 보이는 문제를 수정했다.
- 변경: `scripts/localize-tech-blueprint-deck.mjs`를 추가해 `outline.json` 본문을 한국어로 재작성하고, `image-sidebar` 장표의 `sections` 필드를 renderer가 기대하는 `sidebar_sections`로 변환했다. 숫자가 아닌 KPI 텍스트가 `?`로 렌더링되던 2개 장표는 `split` 장표로 교체했다.
- 산출물: `.codex/skills/presentation-skill/decks/neet2work__tech-blueprint-pd-cp__20260609-1606/build/neet2work.pptx` 41장. 안정적인 `executive-clinical` preset으로 재빌드했다.
- Verification: `python3 scripts/qa_gate.py --skip-render --fail-on-design-warnings` 통과, overflow 0, overlap 0, placeholder 0, design warnings 0. PPTX 내부 검사 결과 slide 41, media 19, svgMedia 0, badTokens none, brokenMediaRels none. `extract_outline.py`로 추출한 텍스트에서 placeholder/영어 fallback/`?` 토큰이 없음을 확인했다. LibreOffice `soffice`가 없어 rendered slide QA는 실행하지 못했다.

### presentation-skill deck build 산출물 ignore 등록

- 범위: 방금 생성한 발표 deck의 빌드 결과물이 Git 추적 대상으로 올라오지 않도록 ignore 규칙을 추가했다.
- 변경: `.gitignore`에 `.codex/skills/presentation-skill/decks/**/build/` 패턴을 추가했다.
- Verification: `git check-ignore -v .codex\skills\presentation-skill\decks\neet2work__tech-blueprint-pd-cp__20260609-1606\build\neet2work.pptx`로 최종 PPTX가 새 규칙에 매칭되는 것을 확인했다.

### presentation-skill 로컬 workspace ignore 범위 조정

- 범위: build 산출물만 ignore하면 `.codex/skills/presentation-skill/` 아래 skill 설치 파일, deck source, assets가 대량 untracked로 노출되는 문제를 정리했다.
- 변경: `.gitignore`의 presentation-skill ignore 규칙을 `.codex/skills/presentation-skill/` 전체로 조정했다.
- Verification: `git status --short --untracked-files=all`에서 `.codex/skills/presentation-skill/` 대량 untracked 항목이 사라진 것을 확인하고, `git check-ignore -v`로 `SKILL.md`, `outline.json`, 최종 `neet2work.pptx`가 같은 규칙에 매칭되는 것을 확인했다.

### 브라우저 자동화를 통한 프로필 및 자기소개서 등록

- 범위: Neet2Work 및 GDG 사이트의 프로필 폼 및 자기소개서 등록 프로세스 검증.
- 변경:
  - 브라우저 에이전트(browser subagent)를 활용하여 Neet2Work 사이트(`https://neet2work.duckdns.org/documents/profiles/new`)에 5개 분야 프로필(프론트엔드, 백엔드, 풀스택, 데이터 엔지니어, DevOps)을 등록함.
  - Neet2Work 사이트에 등록된 5개 프로필 각각과 매칭하여 총 5건의 자기소개서(카카오뱅크 UX 리서치, 포이시스 금융솔루션 개발, EY한영 데이터 분석, 오토패스 파이썬/AWS 개발, PTKOREA 플랫폼 운영관리 지원서)를 작성 및 등록함.
  - GDG 사이트(`https://gdg.ddns.net/documents/profiles/new`)에 1개의 프론트엔드 개발자 프로필을 등록함.
  - 스크롤하지 못해 저장 버튼을 누르지 못하는 웹 자동화 장애 요인을 분석 및 해결(스크롤 강제 실행 지침 전달).
- Verification:
  - 등록된 각 프로필 및 자기소개서 상세 페이지 URL 접속 확인.
  - 등록 과정 스크린샷(`profile_1_frontend.png`, `cover_letter.png`, `cover_letter_1.png` 등) 및 녹화본(`screencast.webm`, `screencast_part2.webm`, `screencast_part3.webm`, `screencast_cover_letter.webm` 등) 정상 생성 확인.
