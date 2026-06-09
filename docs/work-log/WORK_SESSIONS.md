# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-06-09

### Codex 장시간 생성 proxy timeout 5분 반영

- 범위: 배포 `/ai-analysis`에서 Codex 자소서 작성 요청이 약 60초 후 504로 끊기는 문제를 줄이기 위해 운영 proxy timeout 설정을 300초 기준으로 보강했다.
- 변경: frontend nginx `/api/`와 `/health` backend proxy에 `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout` 300초를 추가했다. Oracle Caddy demo mode와 Codex relay prefix helper가 생성하는 `reverse_proxy`에도 `response_header_timeout 300s`를 추가했다.
- 운영 반영 상태: Oracle SSH 접속이 현재 `publickey` 거절로 막혀 라이브 서버 직접 재시작/즉시 배포는 수행하지 못했다. 변경분은 배포 브랜치 커밋/푸시 또는 SSH 복구 후 Oracle deploy 실행이 필요하다.
- Verification: `git diff --check`, `scripts/oracle-caddy-demo-mode.ps1` PowerShell parser check, `scripts/oracle-codex-caddy-relay.ps1` PowerShell parser check 통과. 로컬에 `nginx`/`caddy` 실행 파일이 없어 실제 nginx/Caddy runtime validate는 생략했다.

### 포트폴리오 PPT 4페이지 작업 시작 기준 카피 교정

- 범위: `neet2work-apple-keynote-copy-rhythm-v2.pptx`의 4페이지가 PPT 제작 과정 설명이나 프로젝트 구현 단계 설명으로 치우치지 않도록, 작업 시작 전에 사용한 기준과 도구로 뼈대를 잡는 내용으로 다시 조정했다.
- 변경: 제목을 `작업 전, 뼈대를 세운 하네스`로 바꾸고, 오른쪽 단계 목록을 Goalplz, AGENTS.md, .codex Skills, README / Setup, Scripts / Work Log로 교체했다. 각 항목 아래에 목표/완료 조건, 작업 규칙, API·DB·구조 절차, 실행 환경, 검증·기록 루프 설명을 추가했다.
- 산출물: `docs/portfolio/neet2work-apple-keynote-copy-rhythm-v2-project-build.pptx`
- Verification: PPTX zip 무결성 검사 통과, `ppt/slides/slide4.xml` 텍스트 노드 21개가 의도한 문구로 교체·추가된 것을 확인했다. PowerPoint/LibreOffice 렌더링 도구가 PATH에 없어 시각 렌더 검증은 생략했다.

### 슬라이드 산출물 커밋 제외 기준 정리

- 범위: 발표자료 생성 중 나온 `outputs/` 하위 중간 산출물은 커밋 후보에서 제외하고, 루트에 둔 최종 PDF만 커밋 후보로 남기도록 `.gitignore`를 보강했다.
- Verification: `git status --short --ignored`로 `outputs/`가 ignored 상태이고 `neet2work-apple-keynote-copy-rhythm-v2-HQ.pdf`는 untracked 커밋 후보로 남아 있는 것을 확인했다.

### sub-main 커밋/푸시 및 Oracle 배포 확인

- 범위: 검증된 AI 문서 workflow 변경사항을 `sub-main`에만 커밋/푸시하고, Oracle 운영 배포가 해당 SHA를 반영하는지 확인했다. `main` 브랜치는 건드리지 않았다.
- Git: `d960169 Improve AI document workflow and deployment support`를 생성했고 `origin/sub-main`이 `d96016976bf8a054710b295a77e38431b690ba19`를 가리키는 것을 확인했다.
- Deploy: GitHub Actions run `27153600841`은 success였고, VM pull-based deploy가 `sub-main` 최신 SHA를 가져왔다. 운영 backend는 기존 env의 `TRUST_PROXY=true` 때문에 restart loop가 발생해 `/opt/neet2work/.env.production`과 `/opt/neet2work/repo/.env.production`을 `TRUST_PROXY=1`로 보정했다.
- Runtime: 이전 시연용 Caddy demo tunnel mode가 켜져 있어 `/health`가 꺼진 `127.0.0.1:3900`으로 가던 문제를 normal mode로 복구했다.
- Verification: 로컬 `corepack pnpm run test`, `corepack pnpm run build`, `git diff --check`, `git diff --cached --check` 통과. 운영 `https://neet2work.duckdns.org/health`는 `ok=true`, `database=connected`로 응답했고 `/ai-analysis`는 200 및 새 asset hash를 반환했다.

### AI 자소서 첨부 양식/복합 문서 처리 기준 보강

- 범위: 첨부 DOCX/텍스트 양식이 한 페이지 시각 밀도, 표/칸 레이아웃, 이력서/자소서/기술스택/포트폴리오 복합 섹션을 포함할 때 분석 결과와 AI 계획 payload에 보존되도록 보강했다.
- 변경: 문서 분석 결과에 `template.layoutRules`와 `template.sections`를 추가하고, 복합 섹션을 evidence vault와 질문 생성 payload에 전달했다. 기본 자소서 양식과 안내 문구의 `1페이지 목표`도 빽빽한 글자수가 아니라 자연스러운 문서 밀도 기준으로 바꿨다.
- 검증: `corepack pnpm --filter backend test career-document-workflow.service.test.ts`, `corepack pnpm --filter frontend test AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter frontend build`, `corepack pnpm --filter backend build` 통과. `checklist-vibe` CLI와 `harness.config.json`은 없어 CLI gate는 생략했다. 테스트/build는 Windows `esbuild spawn EPERM` 및 Prisma 바이너리 네트워크 제한 때문에 승인된 로컬 권한으로 실행했다.

### Apple식 포트폴리오 PPT 템플릿 리디자인

- 범위: 기존 Worldpackers 참고 포트폴리오 PPT를 Apple keynote-inspired 발표 템플릿으로 재구성했다. 첫 장은 제목, 마지막 장은 Q&A로 유지하고 총 15장으로 맞췄다.
- 디자인: Product Design으로 대상/정적 발표물/시각 기준을 확인하고, Creative Production 스타일 인테이크로 `apple-keynote-minimal`, `hero-product-screens`, `one-line-claims`, `black-white-rhythm`, `wide-whitespace`, `no-card-grids` 방향을 고정했다.
- 내용: 기능 나열을 줄이고 큰 한 문장 중심으로 문제, 제품 루프, 작업 과정, 기술스택, 제품 화면, AI 자소서 작성 원칙을 이어갔다. AI 자소서 파트는 요구사항 고정, 근거 카드, gap 질문, plan/draft/review/revise 흐름을 별도 슬라이드로 강조했다.
- 추가 조정: 발표 말투가 너무 딱딱해 보이는 단정형 문장을 줄이고, 이후 `다/습니다/입니다` 종결이 반복되는 문제를 다시 다듬었다. 최종 카피는 명사형, 짧은 구문, 질문형 라벨을 섞어 Apple keynote식 슬라이드 리듬에 맞췄다.
- PDF: 기본 PDF 화질이 낮아 3840x2160 고해상도 프리뷰를 새로 렌더링하고 `neet2work-apple-keynote-copy-rhythm-v2-HQ.pdf`로 15페이지 PDF를 재추출했다.
- PDF 캡처 보정: 6~9페이지 프론트 캡처가 좁은 프레임의 `cover` fit 때문에 좌우로 잘리는 문제를 확인하고, 스크린샷 기본 fit을 `contain`으로 바꿔 정보가 잘리지 않도록 4K 프리뷰와 HQ PDF를 다시 추출했다.
- 산출물: `outputs/019ea6c4-3930-75a3-8065-72f5e2398669/presentations/neet2work-portfolio-apple-keynote/output/neet2work-apple-keynote-portfolio.pptx`
- Verification: presentation builder로 15장 PPTX 재생성, PPT 패키지 검사 15 slide XML/4 media/0 empty entries 확인, contact sheet 생성 및 시각 검수, layout quality check 15 files 0 errors 0 warnings 통과. 캡처 보정 후 6/7/8/9페이지 4K 프리뷰를 시각 확인하고, HQ PDF 15페이지를 재검증했다.

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

### Oracle VM SSH 키 복구

- 범위: 현재 PC에서 `2-demo-oracle-site.cmd` 기본 SSH key 경로가 동작하도록 OCI `neet2work-prod` 인스턴스의 `ubuntu` 접속 키를 복구했다.
- OCI: Run Command는 Ubuntu 인스턴스에서 `Accepted` 상태에 머물러 실패했고, Bastion managed SSH 세션을 생성해 VM 내부 `/home/ubuntu/.ssh/authorized_keys`를 직접 정리했다.
- 키 처리: ED25519 키는 서버가 public key를 accept한 뒤 최종 인증을 거부해 `C:\Users\pc07-00\.ssh\neet2work-prod.ed25519-20260609.key`로 백업했다. 실제 기본 키 `C:\Users\pc07-00\.ssh\neet2work-prod.key`는 direct SSH가 성공한 RSA 키로 교체했다.
- Verification: `ssh -i C:\Users\pc07-00\.ssh\neet2work-prod.key ubuntu@129.146.96.211 "echo direct-default-key-ok"` 성공, `.\2-demo-oracle-site.cmd -DryRun` 성공. 실제 demo 실행은 Caddy demo mode를 바꿀 수 있어 DryRun까지만 확인했다.

### Oracle Codex 전용 릴레이 모드 전환

- 범위: `2-demo-oracle-site.cmd`가 Oracle 전체 `/api/*`를 로컬 PC로 우회하지 않고, Codex Bridge provider만 현재 PC의 로컬 백엔드로 위임하도록 구조를 바꿨다. Gemini와 일반 API는 계속 Oracle backend가 담당한다.
- 변경: backend에 `/api/codex-bridge-relay` 라우트를 추가하고, `CODEX_BRIDGE_REMOTE_BASE_URL`이 설정된 Oracle backend에서는 Codex status/execute/login 요청만 로컬 릴레이로 전달하도록 했다. `2-demo-oracle-site.cmd`는 SSH reverse tunnel과 Oracle Codex relay env만 켜고 종료 시 복구한다.
- 운영 확인: 기존 Caddy demo mode가 켜져 dead local tunnel로 `/api/*`를 보내던 상태를 disable했다. 이후 `sub-main`에 커밋/푸시하고 Oracle pull-based deploy를 즉시 실행해 배포 SHA가 최신 커밋을 가리키는 것을 확인했다.
- Gemini 상태: Oracle env 파일의 `GEMINI_API_KEY`가 실질적으로 비어 있어 처음에는 `missing_key_or_model`이었다. 로컬 `.env`의 Gemini key를 채팅/로그에 출력하지 않고 SSH stdin으로 Oracle env에 주입한 뒤 backend를 재생성했고, public provider 상태가 `gemini online=true configured=true`로 바뀐 것을 확인했다.
- Verification: `corepack pnpm --filter @neet2work/backend test -- src/services/ai/ai-providers.status.test.ts`, `corepack pnpm --filter @neet2work/backend build`, `.\2-demo-oracle-site.cmd -DryRun`, PowerShell parser check, `git diff --check` 통과. 운영 `/health`와 `/api/draft-workflow/providers`는 200으로 응답했고 Gemini provider는 online이다. 테스트/build는 Windows sandbox `spawn EPERM` 및 Prisma 바이너리 네트워크 제한 때문에 승인된 로컬 권한으로 실행했다.

### AI 페이지 상단 provider 연결 상태 표시 수정

- 범위: AI 커리어 문서 코치 상단 badge가 선택 provider가 아니라 전체 real provider 중 하나라도 online이면 `연결됨`으로 표시되던 문제를 수정했다.
- 변경: 상단 연결 상태를 현재 선택된 provider의 `online/configured/quotaExceeded` 기준으로 계산하게 바꿨다. Codex나 Local이 offline이고 Gemini만 online인 상태에서는 Codex/Local 선택 시 `연결 안됨`, Gemini 선택 시에만 `연결됨`으로 표시된다.
- Verification: `corepack pnpm --filter frontend test -- AIDraftChatBuilder.test.tsx`, `corepack pnpm --filter frontend build`, `git diff --check` 통과. 테스트/build는 Windows sandbox `spawn EPERM` 때문에 승인된 로컬 권한으로 재실행했다.

### Oracle Codex relay helper 배포 디렉터리 보정

- 범위: `2-demo-oracle-site.cmd` 실행 시 Oracle Codex relay mode helper가 최신 pull-based deploy 디렉터리인 `/opt/neet2work/repo`가 아니라 오래된 `/opt/neet2work/current` 기준으로 backend를 재생성하던 문제를 수정했다.
- 변경: `scripts/oracle-codex-relay-mode.ps1`의 원격 스크립트가 `/opt/neet2work/repo/docker-compose.oracle.yml`을 우선 사용하고, root/repo/current env 파일을 중복 없이 함께 갱신하도록 바꿨다.
- Verification: PowerShell parser check, `.\2-demo-oracle-site.cmd -DryRun`, `.\oracle-codex-relay-mode.cmd -Action status` 통과. 실제 enable/disable 검증은 public backend 재시작을 동반하는 운영 변경이라 별도 명시 승인 전에는 실행하지 않았다.

### Oracle Codex demo stale backend 방지

- 범위: `2-demo-oracle-site.cmd`가 로컬 3000 포트에 이전 backend가 남아 있는 상태에서도 새 token으로 Oracle relay mode를 켜 버려 Codex가 online으로 올라오지 않던 문제를 방지했다.
- 변경: 실행 전 로컬 3000 포트 점유를 검사해 stale backend가 있으면 중단하고, local relay status가 401/오프라인이면 Oracle env를 변경하지 않도록 실패를 fatal 처리했다. Oracle relay mode를 켠 뒤에도 public provider에서 Codex가 online이 되는지 확인하고, 실패하면 자동 복구 경로로 빠지게 했다.
- Runtime: 현재 남아 있던 stale local backend PID 5312를 종료했고, Oracle relay mode는 정상 disabled 상태로 복구했다.
- Verification: PowerShell parser check, `.\2-demo-oracle-site.cmd -DryRun`, public provider normal mode 확인, 로컬 3000 포트 free 확인, `git diff --check` 통과.

### Oracle Codex relay Caddy prefix 경로 보정

- 범위: Oracle host에서는 SSH reverse tunnel `127.0.0.1:3900`이 살아 있어도 backend 컨테이너 내부에서는 host loopback을 볼 수 없어 `public_codex online=False reason=fetch failed`가 나는 문제를 수정했다.
- 변경: Docker gateway proxy 우회 대신 Caddy에 실행 중에만 `/__codex-relay/*` prefix를 열어 Codex relay 전용 `/health`, `/api/codex-bridge-relay/*`만 SSH tunnel로 전달하게 했다. 정상 `/api/*`와 Gemini는 계속 Oracle backend를 사용한다.
- 안전장치: Caddy helper `oracle-codex-caddy-relay.cmd`를 추가하고, `2-demo-oracle-site.cmd` 종료 시 Oracle backend env와 Caddy config를 모두 원복한다. Prefix health 판정은 frontend SPA fallback 200 오탐을 피하도록 backend health JSON을 확인한다.
- Verification: PowerShell parser check, `.\2-demo-oracle-site.cmd -DryRun`, `git diff --check` 통과. 운영 self-test `.\2-demo-oracle-site.cmd -RunForSeconds 10`에서 `public_codex online=True configured=True` 확인 후 자동 원복됐고, 원복 후 `codex_relay_mode=disabled`, `codex_caddy_relay_mode=disabled`, public provider는 `codex_bridge disabled`, `gemini online=True configured=True`로 확인했다.

### Oracle 공고 수집 hourly timer 추가

- 범위: Oracle 배포 환경에서 공고 수집기가 1시간마다 자동 실행되도록 systemd timer 설치 경로를 추가했다.
- 변경: backend production image에 `python3`를 포함하고, `scripts/run-oracle-job-crawler.sh`가 source별 batch 수집, dry-run 검증, DB upsert import를 순서대로 수행하게 했다. `oracle-job-crawler-timer.cmd`/`scripts/oracle-job-crawler-timer.ps1`로 Oracle systemd service/timer를 install/status/run-now/uninstall 할 수 있게 했다.
- 배포: SSH key가 timer 설치 직후 publickey 거절 상태가 되어 직접 설치 검증이 막힐 수 있으므로, `scripts/deploy-oracle.sh`의 정상 health 통과 후 systemd timer를 자동 설치/갱신하도록 보강했다.
- 운영 기본값: `saramin jobkorea linkareer`를 60분마다 수집하며, lifecycle closed/inactive 자동 변경은 이번 timer에서 제외했다.
- Verification: PowerShell parser check 통과. Oracle 기존 timer 상태는 `timer_installed=false`로 확인했다. 이 PC의 WSL/Git Bash는 프로세스 생성 권한 오류로 `bash -n`을 실행하지 못해 Linux shell 문법 검증은 Oracle 배포/실행 단계에서 확인한다.
