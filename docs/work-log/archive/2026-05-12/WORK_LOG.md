# Work Log

## 2026-05-12

### Figma Summary

- Figma 자동화용 환경 변수 추가
- Figma 대상 프레임과 `WORK_LOG` 텍스트 레이어 조회 확인
- 작업 일지 내보내기와 Figma 이어쓰기 흐름 준비
- Figma append 시 현재 텍스트 박스 가로폭은 유지하고 세로 길이는 자연 증가하도록 보정
- UTF-8 파일 작성 규칙과 날짜별 Figma 일지 중복 방지 로직 추가

### Changed Files

- `.env.example`
- `package.json`
- `scripts/check-figma-target.mjs`
- `docs/WORK_LOG.md`
- `scripts/export-work-log.mjs`
- `scripts/serve-figma-work-log.mjs`
- `tools/figma-work-log-plugin/`

### Verification

- `node --check scripts/check-figma-target.mjs`
- `npm.cmd run figma:check`
