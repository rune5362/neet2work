# Work Log

## 2026-05-15

### Figma Summary

- 한국→일본 채용 사이트 수집 가능성 검증과 표준화 파이프라인 확보를 목표로 planning brief 작성
- repo 현실 기준 실행 계획을 `docs/plans/2026-05-15-job-collection-pipeline.md`에 정리하고 검증/rollback/checklist 고정
- `chrome@openai-bundled`로 ChatGPT 검토를 수행하고 후보 사이트를 `GREEN/YELLOW/RED` probe 후 구현하는 방식으로 계획 보정
- ChatGPT Pro 재검토를 반영해 새 사이트 추가 전 Saramin baseline/API raw field boundary 확인 단계를 추가
- Chrome/GPT 검토 전용 runbook을 추가하고 `AGENTS.md`에 조건부 참조 규칙 반영
- pnpm 11 기준에 맞게 `AGENTS.md`의 잔존 `npm.cmd` 실행 예시를 `corepack pnpm`으로 교정
- GPT-5.5 Pro 확장모드 재검토를 다시 수행하고 결과를 repo 현실 기준 최종 실행 체크리스트로 재정리
- 한국/일본 후보 전체를 probe하고 `GREEN/YELLOW/RED` evidence로 분류
- `saramin`, `jobkorea`, `linkareer`, `mynavi_tenshoku`, `daijob`, `careercross`, `green_japan` 7개 GREEN 수집원을 final matrix에 고정
- 각 GREEN 수집원은 1건 sample JSON 생성과 dry-run import를 통과했고 `corepack pnpm run crawl:matrix:check`로 전체 matrix 검증 완료
