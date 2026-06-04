# Work Sessions

## 2026-05-31

### Codex Bridge 기반 자소서 워크플로우 실행

- Google Docs 입사지원서 문서의 자기소개서 5개 항목을 `/api/draft-workflow/plan -> /draft` 경로로 재작성했다.
- `codex_bridge` 실행 인자 위치를 현재 Codex CLI에 맞게 수정하고, `CODEX_BRIDGE_REASONING_EFFORT` 설정을 추가해 `gpt-5.5` + `xhigh` 실행을 지원했다.
- Codex CLI JSONL의 `item.completed`/`agent_message` 출력 형식을 파싱하도록 provider 유틸을 보강했다.
- 포트 `3012` 테스트 백엔드에서 `codex_bridge`가 `gpt-5.5`로 online 상태임을 확인하고, 5개 항목 모두 fallback 없이 생성된 결과를 Google Docs 표 12번 오른쪽 칸에 반영했다.
- 검증: Google Docs connector readback으로 표 12번 반영 확인, `corepack pnpm --filter @neet2work/backend exec vitest run src/services/ai/ai-providers.status.test.ts src/services/ai/ai-router.test.ts`, `corepack pnpm --filter @neet2work/backend exec tsc --noEmit`.
