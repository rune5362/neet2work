# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-05-14

### Figma Work Log

- 5/14 오늘 할 일을 DB 스키마 초안, Python 크롤러 공통 골격, 사람인 1개 사이트 수집 검증, 표준 JobPosting 필드 정리 중심으로 `docs/work-log/WORK_LOG.md`에 정리
- `npm.cmd run worklog:prepare`로 5/13 일지를 archive로 옮기고 5/14 active 일지를 준비
- `npm.cmd run worklog:export`로 5/14 Figma 요약 export 확인
- Figma bridge를 띄운 뒤 `apply-figma-work-log.mjs` 적용 결과 `Figma WORK_LOG appended.` 확인

### Docs Folder Organization

- 작업일지 관련 파일을 `docs/work-log/`로 이동하고 archive 경로를 `docs/work-log/archive/`로 정리
- 채용 사이트 조사 문서를 `docs/research/job-sites/`로 이동
- work log helper 스크립트와 AGENTS 경로 참조를 새 폴더 구조에 맞게 수정
- `#by Codex` 섹션 태그가 Figma export에 포함되도록 `worklog:export` 로직 보정
- `node --check`와 `npm.cmd run worklog:export`로 새 경로 동작 확인
- Figma sync 전 bridge 실행 명령, bridge URL, plugin manifest, runner 실행 경로를 `FIGMA_WORK_LOG_RULES.md`에 명시
- Figma 플러그인과 bridge 실행 파일을 `C:\lsh\git\figma_bridge`로 복사하고 독립 실행용 `package.json` 구성
- 복사본에서 `node --check`와 `npm.cmd run worklog:export`로 동작 확인
- Figma 요약에서 `#by Codex` 표기 정책을 제거하고 export/plugin 스타일링 로직에서도 관련 처리를 삭제
- `node --check`와 `corepack pnpm run worklog:export`로 by Codex 제거 후 출력 확인

### Main Branch Update Merge

- `origin/main` 최신 커밋을 fetch하고 `playground` 브랜치에 병합 진행
- `package.json` scripts 충돌을 Figma/worklog 명령과 setup/db 명령을 모두 보존하는 방식으로 해결
- `package.json` JSON 파싱, `git diff --check`, `npm.cmd run worklog:prepare`로 기본 검증 완료

### pnpm 11 Migration

- 공급망 공격 대응을 위해 package manager를 `pnpm@11.1.1`로 고정하고 `pnpm-lock.yaml`, `pnpm-workspace.yaml` 추가
- `minimumReleaseAge: 1440`과 Prisma/esbuild 필수 build script 명시 허용 설정 추가
- 루트 scripts, setup scripts, Docker build context, README/setup/Prisma/Figma worklog 문서를 pnpm 기준으로 갱신
- `package-lock.json` 제거 후 `corepack pnpm install --frozen-lockfile`, `corepack pnpm run db:generate`, `corepack pnpm run check` 통과

### Job Collection Foundation

- 5/14 Figma 요약의 오늘 할 일 4개 항목을 실제 산출물 기준으로 완료
- `JobPosting` DB 스키마에 출처/원본 ID, 국가/언어, 고용형태, 학력, 마감, 원본 텍스트/JSON, 수집 시각 필드 추가
- `scripts/job_crawler/`에 Python 공통 수집 모델, HTTP 클라이언트, 사람인 1건 수집기를 추가
- 사람인 Python 검색 목록 1건을 상세 URL까지 확인해 `docs/research/job-sites/saramin_sample_2026-05-14.json` 표준 JSON으로 저장
- 표준 필드와 원본 보존 전략을 `docs/research/job-sites/JOB_POSTING_COLLECTION_SCHEMA.md`에 정리
- 후속 감사에서 raw 원본 필드 API 노출 차단, 수집 상한/지연, Corepack pnpm 실행 경로, `collectedAt` null 정렬, Python cache ignore를 보강
- 추가 전략 감사에서 public `JobPosting`과 수집용 `CollectedJobPosting` 타입을 분리하고 배열 필드 `@default([])` 및 후속 migration을 추가
- `docs/research/job-sites/COLLECTION_STRATEGY_RISK_REVIEW.md`에 닫은 허점, 남은 검증 gap, 새 전략을 별도 문서화
- 검증 gap: 현재 환경에서 Docker CLI를 찾지 못했고 로컬 PostgreSQL 5432 포트가 닫혀 있어 실제 DB migration 적용/상태 확인은 수행하지 않음

### DB Development Policy

- Docker를 필수 개발 경로에서 제외하고, 팀 공통 기준을 Prisma `schema.prisma`, `migrations/`, `seed.ts`로 명확히 정리
- 각 팀원이 Supabase, AWS RDS, 로컬 PostgreSQL, Docker PostgreSQL 중 개인 개발 DB를 선택해 `.env`의 `DATABASE_URL`로 연결하는 방식으로 README/setup/Prisma 문서를 갱신
- `db:reset`은 현재 `DATABASE_URL` 대상 DB를 초기화하므로 공용/운영 DB에서 실행하지 말라는 경고를 추가

### Job Collection Verification

- DB 스키마/migration, Python 크롤러 골격, 사람인 목록-상세 1건 재수집, 표준 `JobPosting`/원본 보존 전략을 재검증
- `prisma validate`, empty DB 기준 `prisma migrate diff`, Python `py_compile`, 사람인 1건 live JSON 생성, `corepack pnpm run check` 통과 확인
- 남은 리스크는 실제 Supabase migration 적용 전 상태, `source_job_id` null 중복 가능성, 오래된 Playwright 수집기 타입 이름 혼동 가능성으로 정리
