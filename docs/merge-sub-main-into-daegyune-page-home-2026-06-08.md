# 병합 보고서 - sub-main을 daegyune/page/home에 병합 - 2026-06-08

## 요약

- 현재 브랜치: `daegyune/page/home`
- 병합한 브랜치: `origin/sub-main`
- 병합 커밋: `a756eed8aa4a53c3a8aeb5ad0de287e9e1637f65`
- 병합 부모 커밋:
  - `c89b77b` (`origin/daegyune/page/home`)
  - `7ade675` (`origin/sub-main`)
- 병합 후 브랜치 상태: `daegyune/page/home`이 `origin/daegyune/page/home`보다 18커밋 앞선 상태
- 원격 푸시 여부: 아직 푸시하지 않음

## 병합 범위

이번 작업은 `origin/sub-main`의 변경 사항을 `daegyune/page/home`으로 가져와 병합한 작업입니다.

주요 유입 영역은 다음과 같습니다.

- Oracle 배포 워크플로와 데모 실행 스크립트
- 프로덕션 Docker 및 nginx 설정
- backend 인증, 보호된 AI route, 배포, RLS 관련 변경
- career workflow 및 career document workflow backend 서비스, route, type
- frontend AI draft chat builder 및 career workflow type 변경
- work log archive 및 Oracle 배포 문서

병합 전체 규모는 124개 파일 변경, 14,935줄 추가, 1,699줄 삭제입니다.

## 충돌 파일

Git이 다음 3개 파일에서 content conflict를 보고했습니다.

- `apps/backend/src/config/ai-config.ts`
- `apps/backend/src/services/draft-workflow/draft-workflow.service.test.ts`
- `apps/frontend/src/pages/AIDraftChatBuilder.test.tsx`

## 충돌 원인

### `apps/backend/src/config/ai-config.ts`

`daegyune/page/home`에는 `agy_cli` 라우팅과 설정 보강이 추가되어 있었습니다.

- `agy_cli` provider order 지원
- `AgyCliStatusReason` 기반 설정 오류 사유 제공
- command, workdir, remote wrapper 검증
- SSH wrapper 설정
- AI timeout 및 limit 값에 대한 양수 정수 파싱

`origin/sub-main`에는 같은 설정 모듈에 Codex와 Gemini runtime 개선이 추가되어 있었습니다.

- 기본 provider timeout 상수
- Codex bridge turn timeout
- `GEMINI_MODELS` 기반 Gemini 다중 모델 파싱
- Gemini model list 기준의 `isGeminiConfigured()` 판단

두 브랜치가 같은 provider 설정 구조와 parsing helper를 동시에 수정해서 충돌이 발생했습니다.

### `apps/backend/src/services/draft-workflow/draft-workflow.service.test.ts`

`daegyune/page/home`은 backend가 소유해야 하는 metadata를 생략한 `agy_cli` 출력에 대해 `mode`와 `aiMeta`를 주입하는 계약 테스트를 추가했습니다.

`origin/sub-main`은 인접한 fallback revision rejection 테스트 이름을 더 명확하게 수정했습니다.

두 변경이 같은 `createPlan` 및 `reviseDraft` 테스트 영역 근처에 들어가면서 충돌이 발생했습니다.

### `apps/frontend/src/pages/AIDraftChatBuilder.test.tsx`

`daegyune/page/home`은 frontend provider menu에서 `Agy CLI`를 보여주고, 선택 시 `agy_cli`를 manual provider로 보내는 테스트를 추가했습니다.

`origin/sub-main`은 다음 테스트를 추가했습니다.

- Codex app-server 표시용 model을 manual model override로 보내지 않는지 검증
- fallback mode를 실제 AI 출력과 구분해서 표시하는지 검증

두 브랜치가 같은 plan coverage block에 테스트를 삽입하면서 충돌이 발생했습니다.

## 해결 방식

### `apps/backend/src/config/ai-config.ts`

두 브랜치의 유효한 동작을 모두 유지했습니다.

- provider order에 `agy_cli` 유지
- `agy_cli` 설정 검증과 `isAgyCliConfigured()` 유지
- Codex bridge turn timeout 유지
- Gemini 다중 모델 파싱과 `models` 출력 유지
- `parseModelList()`를 Gemini model list와 `AGY_CLI_MODEL_ALLOWLIST`에 함께 사용
- timeout 값은 `parsePositiveInteger()`로 통일해 0, 음수, 정수가 아닌 값이 들어오면 안전하게 기본값으로 fallback

### `apps/backend/src/services/draft-workflow/draft-workflow.service.test.ts`

두 테스트 의도를 모두 유지했습니다.

- `agy_cli` backend metadata 주입 테스트 유지
- fallback revision rejection 테스트 유지
- fallback 테스트 이름은 더 명확한 `reviseDraft rejects fallback revisions containing disallowed claims with 422`로 정리

### `apps/frontend/src/pages/AIDraftChatBuilder.test.tsx`

다음 frontend 테스트 의도를 모두 유지했습니다.

- provider menu에 `Agy CLI`가 표시되는지 검증
- `Agy CLI` 선택 시 `{ mode: "manual", providerId: "agy_cli" }`가 전송되는지 검증
- Codex 선택 시 `codex-app-server` 표시용 model이 manual model override로 전송되지 않는지 검증
- fallback 출력이 실제 AI 출력과 구분되어 표시되는지 검증

병합 후 UI 기본 provider label이 `AI 자동선택`이 아니라 `Codex`로 바뀐 상태였기 때문에, Agy CLI 테스트의 버튼 기대값을 `AI provider 선택, 현재 Codex`에 맞췄습니다.

## 검증

성공한 검증 명령은 다음과 같습니다.

- `git diff --check`
- `rg -n "^(<<<<<<<|=======|>>>>>>>)"`
- `corepack pnpm --filter @neet2work/backend test -- src/services/draft-workflow/draft-workflow.service.test.ts`
- `corepack pnpm --filter @neet2work/frontend test`

검증 결과는 다음과 같습니다.

- whitespace 오류 없음
- merge conflict marker 잔존 없음
- backend 테스트 통과: 36개 test file, 283개 test
- frontend 테스트 통과: 3개 test file, 110개 test

## 참고 사항

- `corepack pnpm --filter @neet2work/frontend exec vitest run ...` 및 backend equivalent 명령은 이 Windows 환경에서 `vitest` command를 찾지 못해 실패했습니다.
- 이 저장소에서 안정적으로 동작한 package `test` script 경로를 사용해 검증했습니다.
- 병합은 로컬 커밋까지만 완료했습니다. 원격 `daegyune/page/home`에 반영하려면 별도 push가 필요합니다.
