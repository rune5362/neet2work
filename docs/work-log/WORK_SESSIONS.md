# Work Sessions

오늘 작업 상세 기록 원장이다.
지난 날짜 기록은 `docs/work-log/archive/`에 보관한다.

## 2026-06-10

### 포트폴리오 제출 리포 실행 파일 복사 및 push

- 대상: `C:\lsh\git\ai-aws-r2gul4r`
- 범위: 로컬 실행, Docker/Oracle 서버 배포, 시연 스크립트, frontend/backend 소스, Prisma schema/migration, 핵심 문서와 `.env.example`만 제출 리포에 복사했다.
- 제외: 실제 `.env`, 빌드 산출물, work-log 원본, 개인 계획서/백업 SQL/발표자료, Codex 내부 설정.
- 조정: 제출 리포 기본 브랜치 `main`에 맞게 Oracle deploy workflow, pull-based deploy 기본 URL/브랜치, 배포 문서, crawler User-Agent URL을 수정했다.
- 검증: `git diff --cached --check`, 원본 전용 참조 검색, `.env*` 포함 확인, secret-like 패턴 파일명/길이 점검을 통과했다. 새 의존성 설치가 필요한 build/test는 승인 없이 실행하지 않았다.
- 결과: `e61c02d Add portfolio submission runtime files` 커밋을 `https://github.com/2026-fullstack-rpa-class/ai-aws-r2gul4r.git`의 `main`에 push했다.

### `.env.example` 변수 목록 동기화

- 대상: `.env.example`
- 범위: `.env` 값은 출력하거나 복사하지 않고 변수 이름만 비교했다.
- 변경: `.env`에 없는 `CAREER_DOCUMENT_AI_TIMEOUT_MS`, `CODEX_BRIDGE_REMOTE_BASE_URL`, `CODEX_BRIDGE_RELAY_ENABLED`, `CODEX_BRIDGE_RELAY_TOKEN`, `CODEX_BRIDGE_TURN_TIMEOUT_MS`를 `.env.example`에서 제거했다.
- 검증: `.env`와 `.env.example` 모두 56개 변수로 일치, 누락/초과 0개, 순서 차이 없음. `git diff --check -- .env.example` 통과.
