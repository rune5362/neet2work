# agy_cli Provider 연동 TODO_LIST

이 TODO_LIST는 `agy-cli-ssh-integration-plan.md`를 현재 Neet2Work 구조에 맞춰 실행 순서로 변환한 문서다. 사용자가 결과를 빨리 확인할 수 있도록 frontend 표시/선택 작업을 먼저 배치하고, 실제 실행 provider와 SSH 연동은 이후 단계에서 연결한다.

## Phase 1. Frontend Provider 노출

- [x] Phase 1은 backend 실제 연동 전 단계이므로 mock/provider status fixture 기반으로 `agy_cli` 표시와 선택을 먼저 확인한다.
- [x] `apps/frontend/src/types/draft-workflow.ts`의 `AiProviderId`에 `"agy_cli"`를 추가한다.
- [x] `providerBadgeLabel()`에 `"agy_cli"` 분기를 추가하고 라벨은 `"Agy CLI"`로 고정한다.
- [x] `AIDraftChatBuilder`의 provider 목록/선택 UI가 backend에서 내려온 `agy_cli` status를 기존 provider와 동일하게 표시하는지 확인한다.
- [x] frontend provider mock/test data에 `agy_cli` provider status를 추가한다.
- [x] `apps/frontend/src/pages/AIDraftChatBuilder.test.tsx`에 `agy_cli`가 provider 메뉴에 표시되는 테스트를 추가한다.
- [x] 같은 테스트 파일에 `agy_cli`를 manual provider로 선택했을 때 request body의 `aiSelection.providerId`가 `"agy_cli"`가 되는 케이스를 추가한다.
- [x] `corepack pnpm --filter @neet2work/frontend test`로 frontend 타입/렌더링 회귀를 확인한다.

## Phase 2. Backend Provider Contract 반영

- [x] `apps/backend/src/types/ai-routing.ts`의 `AiProviderId`에 `"agy_cli"`를 추가한다.
- [x] `apps/backend/src/types/draft-workflow.ts`의 provider id 타입에도 `"agy_cli"`를 추가한다.
- [x] `apps/backend/src/services/draft-workflow/schemas.ts`의 manual provider 선택 enum에 `"agy_cli"`를 추가한다.
- [x] 같은 파일의 `aiExecutionMetaSchema.providerId` enum에 `"agy_cli"`를 추가한다.
- [x] `apps/backend/src/config/ai-config.ts`의 `parseProviderOrder()` allowed 목록과 기본 provider order 처리에 `"agy_cli"`를 반영한다.
- [x] `.env.example`에 `AGY_CLI_*`, `AGY_SSH_*` 설정을 추가하되 `AGY_CLI_COMMAND`는 빈 값으로 둔다.
- [x] 확인된 개발 PC 경로 `C:\Users\pc07-00\AppData\Local\agy\bin\agy.exe`는 설명용 예시로만 남기고 기본 env 값으로 넣지 않는다.
- [x] `aiConfig.agyCli` 설정 객체를 추가하고 숫자/boolean/allowlist/path 값을 안전하게 파싱한다.
- [x] `AGY_CLI_SANDBOX_ENABLED`는 `true`만 허용하고, 약화 설정은 구성 오류로 처리한다.
- [x] `AGY_CLI_TASK_PROFILE`은 `cover_letter_review`만 허용한다.
- [x] provider 실행 timeout은 `Math.min(input.timeoutMs, aiConfig.agyCli.timeoutMs)`로 제한한다.
- [x] 구성 오류의 status 동작을 고정한다: `getStatus()`는 `configured=false`, `online=false`, sanitized `reason`을 반환하고, `execute()`는 `ProviderExecutionError("offline", reason)`를 던진다.
- [x] `agy_cli` status reason은 아래 값으로 제한한다: `disabled`, `missing_command`, `invalid_command`, `sandbox_required`, `invalid_task_profile`, `agy_not_logged_in`, `agy_probe_timeout`, `agy_app_data_unwritable`, `ssh_missing_config`, `ssh_key_unreadable`, `ssh_host_key_mismatch`, `ssh_wrapper_invalid`, `ssh_wrapper_timeout`, `output_limit_exceeded`, `invalid_json_output`.

## Phase 3. Prompt Contract 및 Output 검증

- [x] `agy_cli` 전용 helper를 추가해 기존 `buildDraftWorkflowPrompt()` 결과 앞에 agy 전용 고정 instruction을 prepend한다.
- [x] 이 helper는 기존 `buildDraftWorkflowPrompt()`의 operation별 schema와 “backend가 `aiMeta`/`mode`를 주입한다” 규칙을 그대로 유지한다.
- [x] prompt envelope에는 프로필 기반 자기소개서 첨삭 역할, 입력 범위, 금지 동작, JSON-only 출력 요구를 포함한다.
- [x] `agy_cli` 출력에는 `aiMeta`와 `mode`를 포함하지 않도록 prompt에 명시한다.
- [x] `DraftWorkflowService.parseWorkflowResult()`가 기존처럼 `aiMeta`와 `mode`를 주입하는 구조를 유지한다.
- [x] `experienceInput.profileContexts`가 없는 요청은 `agy_cli`에서만 실행하지 않는다.
- [x] 위 profile precondition은 기존 draft-workflow schema와 다른 provider에는 적용하지 않는다.
- [x] 공용 `extractJsonObject()`를 `agy_cli`에서 사용하지 않는다.
- [x] `apps/backend/src/services/ai/provider-utils.ts`에 `parseStrictJsonObject()`를 추가한다.
- [x] `parseStrictJsonObject()`는 `JSON.parse(raw.trim())`만 허용하고, 앞뒤 설명문/markdown/로그가 섞이면 `ProviderExecutionError("invalid_output", "invalid json output")`를 던진다.
- [x] `agy_cli`만 `parseStrictJsonObject()`를 사용하고 기존 provider는 기존 `extractJsonObject()` 사용을 유지한다.
- [x] strict parser 실패 또는 zod schema 검증 실패 시 기존 fallback 흐름으로 전환한다.

## Phase 4. Local agy.exe Provider 구현

- [x] `apps/backend/src/services/ai/agy-cli.provider.ts`를 추가하고 `AiProvider` 인터페이스를 구현한다.
- [x] provider `id`는 `"agy_cli"`, label은 `"Agy CLI"`로 지정한다.
- [x] `AiRouter.createDefault()` provider map에 `new AgyCliProvider()`를 등록한다.
- [x] 로컬 실행은 `AGY_CLI_ENABLED=true`이고 `AGY_SSH_ENABLED=false`일 때만 사용한다.
- [x] `resolveAgyCliCommand()`는 명시 경로, `%LOCALAPPDATA%\agy\bin\agy.exe`, 제한된 fallback 순서로 탐색한다.
- [x] `AGY_CLI_COMMAND`는 절대 경로만 허용하고 파일명 allowlist를 적용한다.
- [x] 로컬 cwd는 `AGY_CLI_WORKDIR` 또는 안전한 임시 디렉터리로 고정한다.
- [x] child process env는 backend 전체 env를 넘기지 않고 필요한 최소값만 allowlist로 전달한다.
- [x] 로컬 실행은 `spawn(command, ["--sandbox", "--print-timeout", timeoutText, "--print", prompt], { shell: false })` 형태의 args 배열만 사용한다.
- [x] prompt 원문은 로그에 남기지 않는다.
- [x] stdout/stderr 누적 크기와 prompt 크기를 제한한다.
- [x] timeout, output limit 초과, non-zero exit code, strict JSON 실패 시 child process를 정리하고 provider error로 분류한다.
- [x] `getStatus()`에서 `agy.exe --version`으로 실행 파일을 확인한다.
- [x] `getStatus()`에서 짧은 timeout의 `agy.exe models` probe로 로그인 세션과 app data 쓰기 권한을 확인한다.
- [x] 미로그인으로 `--print`가 OAuth 대기 상태에 들어갈 수 있으므로 모든 probe와 실행은 timeout으로 감싼다.

## Phase 5. SSH Remote 연동

- [ ] backend package에 `ssh2`를 추가한다.
- [ ] `ssh2` 설치 후 TypeScript build로 타입 제공 여부를 확인하고, 타입이 없으면 `@types/ssh2`를 추가한다.
- [ ] lockfile을 갱신하고 신규 transitive dependency를 검토한다.
- [ ] `apps/backend/src/services/ai/ssh-helper.ts`를 추가한다.
- [ ] `runRemoteWrapperWithStdin(config, stdinData, timeoutMs)` 형태로 SSH wrapper 실행을 캡슐화한다.
- [ ] SSH 실행은 `AGY_CLI_ENABLED=true`이고 `AGY_SSH_ENABLED=true`일 때만 사용한다.
- [ ] SSH 모드에서는 로컬 executable fallback을 시도하지 않는다.
- [ ] `AGY_SSH_HOST`, port, username, key path, host fingerprint 또는 known_hosts 설정을 필수 검증한다.
- [ ] `AGY_SSH_ENABLED=true`인데 SSH 필수값이 빠진 경우 로컬 command가 있더라도 로컬 fallback을 하지 않고 offline으로 보고한다.
- [ ] private key 인증만 허용하고 password auth, keyboard-interactive, agent forwarding, X11, PTY는 사용하지 않는다.
- [ ] `AGY_SSH_REMOTE_WRAPPER`는 argument 없는 absolute path만 허용한다.
- [ ] 원격 wrapper 기본 예시는 `/opt/neet2work/run-agy-sandbox-print`로 둔다.
- [ ] wrapper는 stdin으로 prompt를 받고 내부에서 안전한 인자 배열로 `agy.exe --sandbox --print-timeout <timeout> --print <prompt>`를 실행한다.
- [ ] known_hosts 사용 시 host와 port를 함께 검증한다.
- [ ] fingerprint 사용 시 SHA256 fingerprint가 정확히 일치해야 한다.
- [ ] SSH stdout/stderr 크기 제한, exec timeout, channel close, `conn.end()`, `conn.destroy()` cleanup을 구현한다.
- [ ] 원격 stderr/stdout 원문, host, username, key path, fingerprint 전체값은 일반 로그/API 응답에 노출하지 않는다.

## Phase 6. Smoke Scripts

- [ ] `apps/backend/src/scripts/agyLocalSmoke.ts`를 추가한다.
- [ ] `apps/backend/src/scripts/agySshSmoke.ts`를 추가한다.
- [ ] `apps/backend/package.json`에 `agy:local:smoke`와 `agy:ssh:smoke` script를 추가한다.
- [ ] local smoke는 실행 파일 탐색, `--sandbox`, `--print`, 로그인 세션, app data 쓰기 권한, JSON-only 응답을 확인한다.
- [ ] SSH smoke는 host key 검증, wrapper 실행, wrapper stdin 수신, 원격 로그인 세션, app data 쓰기 권한, JSON-only 응답을 확인한다.
- [ ] smoke script는 민감 설정 값과 prompt 원문을 출력하지 않는다.
- [ ] 준비되지 않은 환경에서는 명확한 sanitized reason과 non-zero exit code를 반환한다.

## Phase 7. Tests

- [ ] backend status test에 `agy_cli` disabled 기본 상태를 추가한다.
- [ ] `AGY_CLI_SANDBOX_ENABLED`가 `true`가 아니면 실행 거부되는 테스트를 추가한다.
- [ ] 로컬 command 상대 경로, 파일명 allowlist 실패, cwd 실패 케이스를 테스트한다.
- [ ] `getStatus()`가 구성 오류에서 `configured=false`, `online=false`, sanitized reason을 반환하는 테스트를 추가한다.
- [ ] `execute()`가 구성 오류에서 `ProviderExecutionError("offline", reason)`를 던지는 테스트를 추가한다.
- [ ] 로그인 probe timeout 시 child process cleanup과 offline 분류를 테스트한다.
- [ ] app data/config/log 디렉터리 쓰기 권한 실패 시 offline 분류를 테스트한다.
- [ ] `AGY_SSH_ENABLED=true`이면 로컬 fallback을 시도하지 않는 테스트를 추가한다.
- [ ] `AGY_SSH_ENABLED=true`이고 SSH 필수값이 빠졌지만 로컬 command가 있는 경우에도 로컬 fallback을 시도하지 않는 테스트를 추가한다.
- [ ] SSH fingerprint/known_hosts 실패, key path 실패, wrapper path 실패, wrapper timeout 테스트를 추가한다.
- [ ] modelId allowlist 실패 시 CLI args 또는 wrapper에 반영되지 않는 테스트를 추가한다.
- [ ] profileContexts 없는 요청은 `agy_cli`에서만 실행되지 않는 테스트를 추가한다.
- [ ] `agy_cli` 출력에 `aiMeta`/`mode`가 없고 `DraftWorkflowService`가 기존처럼 주입하는 테스트를 추가한다.
- [ ] strict JSON-only parser가 JSON 외 텍스트를 invalid output으로 처리하는 테스트를 추가한다.
- [ ] 기존 `extractJsonObject()`를 사용하는 Codex/Gemini/Local provider 테스트가 깨지지 않는지 확인한다.
- [ ] frontend `AiProviderId`, `providerBadgeLabel()`, provider 선택 UI 테스트를 추가한다.
- [ ] `corepack pnpm --filter @neet2work/backend test`를 실행한다.
- [ ] `corepack pnpm --filter @neet2work/frontend test`를 실행한다.

## Phase 8. Manual Setup Checklist

- [ ] 로컬 실행 계정에서 `agy.exe`를 미리 실행하고 로그인 절차를 완료한다.
- [ ] 로컬 실행 계정이 `agy.exe` app data/config/log 디렉터리에 필요한 읽기/쓰기 권한을 갖는지 확인한다. 현재 확인된 Windows 예시는 `C:\Users\pc07-00\.gemini\antigravity-cli` 및 `C:\Users\pc07-00\.gemini\config`다.
- [ ] 실제 `.env`에 `AGY_CLI_COMMAND`를 수동 설정한다.
- [ ] SSH 실행 시 원격 `AGY_SSH_USERNAME` 계정으로 로그인해 해당 계정에서 `agy.exe` 로그인 절차를 완료한다.
- [ ] SSH 실행 시 원격 계정의 `agy.exe` app data/config/log 디렉터리 쓰기 권한을 확인한다. 원격 OS별 실제 경로는 `agy.exe` 실행 계정에서 확인한다.
- [ ] 원격 서버에 sandbox print wrapper를 배치하고 외부 argument를 받지 않게 한다.
- [ ] SSH host fingerprint 또는 known_hosts 값을 수동으로 검증해 설정한다.
- [ ] 로컬 환경이 준비된 경우 `corepack pnpm --filter @neet2work/backend run agy:local:smoke`를 실행한다.
- [ ] SSH 환경이 준비된 경우 `corepack pnpm --filter @neet2work/backend run agy:ssh:smoke`를 실행한다.
