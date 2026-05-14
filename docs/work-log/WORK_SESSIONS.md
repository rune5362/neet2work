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

### Main Branch Update Merge

- `origin/main` 최신 커밋을 fetch하고 `playground` 브랜치에 병합 진행
- `package.json` scripts 충돌을 Figma/worklog 명령과 setup/db 명령을 모두 보존하는 방식으로 해결
- `package.json` JSON 파싱, `git diff --check`, `npm.cmd run worklog:prepare`로 기본 검증 완료
