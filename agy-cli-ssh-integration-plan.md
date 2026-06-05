# agy.exe 연동 및 SSH 원격 호출 보안 보강 계획서

본 계획서는 외부 PC 또는 로컬 환경에 존재하는 `agy.exe` 또는 Antigravity CLI를 Neet2Work 백엔드의 AI provider로 연동하고, SSH 통신을 통해 원격 서버의 CLI를 안전하게 호출할 수 있는 `agy_cli` provider 추가 작업을 다룬다.

핵심 목표는 프롬프트를 셸 명령어 인자로 전달하지 않고 stdin으로만 전송하며, 로컬/원격 실행 모두 검증된 고정 명령과 안전한 기본값을 사용하도록 제한하는 것이다. `agy_cli`는 외부 프로세스 실행 기능이므로 기본 비활성화하고, 활성화 후에도 읽기 전용 분석 provider로만 동작하게 한다.

## 보안 원칙

- 프롬프트, 사용자 입력, model id, 원격 경로, sandbox policy 값을 셸 명령 문자열에 직접 섞지 않는다.
- 로컬 실행은 `child_process.spawn(command, args, { shell: false })`와 args 배열만 사용한다.
- 원격 실행은 자유 문자열 명령을 조립하지 않고, 서버에 사전 배치된 단일 wrapper command만 호출한다.
- `AGY_CLI_ENABLED`와 `AGY_SSH_ENABLED`의 기본값은 `false`로 둔다.
- `AGY_CLI_SANDBOX_POLICY`는 설정으로 약화할 수 없게 `readOnly`만 허용한다.
- SSH 접속은 host key fingerprint 또는 known_hosts 검증 없이는 허용하지 않는다.
- SSH agent forwarding, X11 forwarding, PTY 요청, password auth는 사용하지 않는다.
- prompt, stdout/stderr 원문, SSH key path, 사용자 식별 정보, 원격 호스트 정보는 로그에 남기지 않는다.
- prompt와 출력 크기, 실행 시간, 동시 실행 수를 제한해 메모리/프로세스 DoS를 방지한다.
- provider 설정은 서버 환경 변수에서만 읽고, API 요청 본문에서 SSH host/path/command를 받지 않는다.

## Proposed Changes

### Backend Configuration & Settings

#### package.json

- `apps/backend/package.json`의 `dependencies`에 `ssh2`를 추가한다.
- TypeScript 타입이 필요하면 `devDependencies`에 `@types/ssh2`를 추가한다.
- SSH smoke test 실행을 위해 backend script에 `agy:ssh:smoke`를 추가한다.
- 의존성 추가 시 lockfile을 함께 갱신하고, 신규 transitive dependency를 검토한다.

#### ai-config.ts

- `agyCli` 설정을 추가하고 환경 변수와 매핑한다.
- `parseProviderOrder`의 allowed provider 목록에 `agy_cli`를 추가한다.
- `resolveAgyCliCommand()`를 추가하되, 실행 파일 탐색은 안전한 순서로 제한한다.
  1. `AGY_CLI_COMMAND` 명시 경로
  2. Windows 공식 설치 후보 경로
     - `%LOCALAPPDATA%\Programs\antigravity\agy.exe`
     - `%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe`
  3. PATH fallback은 개발 환경에서만 허용하거나 경고 상태로 처리
- `AGY_CLI_COMMAND`는 절대 경로만 허용하고, 파일명은 `agy.exe`, `agy`, `Antigravity.exe`, `Antigravity` 중 하나로 제한한다.
- `AGY_CLI_SANDBOX_POLICY`는 `readOnly`만 허용한다. 다른 값은 환경과 무관하게 설정 오류로 처리한다.
- 숫자 설정은 양의 정수로 검증하고 유효하지 않으면 안전한 기본값을 사용한다.
- `AGY_CLI_MODEL` 또는 요청의 `modelId`를 지원할 경우 allowlist된 값만 허용한다. allowlist가 없으면 model override를 무시하고 기본 모델만 사용한다.
- `AGY_CLI_MAX_CONCURRENCY`를 추가해 동시에 실행되는 local child process 또는 SSH command 수를 제한한다.

#### .env.example

`.env.example`에만 예시 값을 추가한다. 실제 `.env`는 자동 수정하지 않는다.

```env
# Agy CLI & SSH integration
AGY_CLI_ENABLED=false
AGY_CLI_COMMAND=
AGY_CLI_MODEL=
AGY_CLI_TIMEOUT_MS=120000
AGY_CLI_SANDBOX_POLICY=readOnly
AGY_CLI_MAX_PROMPT_BYTES=200000
AGY_CLI_MAX_OUTPUT_BYTES=1000000
AGY_CLI_MAX_CONCURRENCY=1
AGY_CLI_MODEL_ALLOWLIST=

AGY_SSH_ENABLED=false
AGY_SSH_HOST=
AGY_SSH_PORT=22
AGY_SSH_USERNAME=
AGY_SSH_KEY_PATH=
AGY_SSH_HOST_FINGERPRINT=
AGY_SSH_KNOWN_HOSTS_PATH=
AGY_SSH_REMOTE_WRAPPER=/opt/neet2work/run-agy-readonly
AGY_SSH_CONNECT_TIMEOUT_MS=10000
AGY_SSH_EXEC_TIMEOUT_MS=120000
```

`AGY_SSH_REMOTE_WRAPPER`는 임의 명령이 아니라 absolute path만 받는다. 값에는 공백, quote, shell metacharacter, argument를 허용하지 않는다. 운영 환경에서는 이 값을 기본 wrapper 경로로 고정하고 변경을 배포 설정에서만 관리한다.

#### ai-routing.ts 및 draft-workflow schema

- `AiProviderId` 유니온 타입에 `"agy_cli"`를 추가한다.
- draft-workflow 요청 schema의 manual provider 선택 enum에 `"agy_cli"`를 추가한다.
- draft-workflow 응답 schema의 `aiMeta.providerId` enum에도 `"agy_cli"`를 추가한다.

### Services & Providers

#### ssh-helper.ts

- `ssh2`를 사용해 SSH 연결, host key 검증, wrapper 실행, stdin 쓰기, stdout/stderr 수집, timeout, cleanup을 담당한다.
- `runRemoteWrapperWithStdin(config, stdinData, timeoutMs)` 형태의 함수를 제공한다.
- wrapper 경로는 absolute path 정규식과 allowlist로 검증하고, argument를 붙이지 않는다.
- `hostVerifier`로 `AGY_SSH_HOST_FINGERPRINT` 또는 `AGY_SSH_KNOWN_HOSTS_PATH` 기반 검증을 수행한다.
- host key fingerprint는 SHA256 fingerprint 형식을 기본으로 사용한다.
- 인증은 private key 기반만 허용하고, private key 본문이나 passphrase를 repo/env 파일에 저장하지 않는다. passphrase가 필요하면 OS keychain 또는 ssh-agent 기반 운영 절차를 별도 사용한다.
- `agentForward`, `x11`, `pty`는 명시적으로 사용하지 않는다.
- stdout/stderr 누적 크기가 `AGY_CLI_MAX_OUTPUT_BYTES`를 넘으면 실행을 중단한다.
- timeout 또는 예외 발생 시 SSH channel을 닫고 `conn.end()`와 `conn.destroy()`를 호출한다.
- 반환 오류에는 sanitized reason code만 포함하고 원격 stderr 원문은 포함하지 않는다.

#### agy-cli.provider.ts

- `AiProvider` 인터페이스를 구현하는 `AgyCliProvider` 클래스를 추가한다.
- `id`는 `"agy_cli"`로 지정한다.
- `getStatus()`는 설정 검증 결과, 로컬 실행 파일 존재 여부, SSH 설정 완성도, host key 검증 가능 여부를 기반으로 상태를 반환한다.
- `execute()`는 draft-workflow prompt를 생성한 뒤 최대 prompt 크기를 검증한다.
- 동시 실행 수가 `AGY_CLI_MAX_CONCURRENCY`를 초과하면 provider를 실행하지 않고 fallback 가능 오류를 반환한다.
- 로컬 실행은 아래와 같이 고정 args 배열로만 수행한다.

```ts
spawn(command, ["--stdin", "--sandbox-policy", "readOnly"], { shell: false })
```

- SSH 실행은 `AGY_SSH_REMOTE_WRAPPER` wrapper를 호출하고 prompt는 stdin으로만 전달한다.
- model 값을 지원해야 한다면 셸 문자열이나 command argument가 아니라 검증된 stdin envelope 또는 wrapper 내부 고정 설정으로 처리한다.
- 요청에서 들어온 `modelId`는 `AGY_CLI_MODEL_ALLOWLIST`에 포함된 경우에만 사용한다.
- CLI stdout은 JSON만 허용한다. 임의 텍스트에서 첫 `{`와 마지막 `}`를 잘라 파싱하는 fallback은 사용하지 않는다.
- JSON 파싱 후 기존 draft-workflow zod schema로 검증 가능한 결과만 반환한다.
- stderr는 진단용으로만 제한 크기까지 수집하고, 응답/로그에는 원문을 노출하지 않는다.

#### ai-router.ts

- provider map에 `new AgyCliProvider()`를 등록한다.
- auto mode에서는 `AI_PROVIDER_ORDER`에 포함된 경우에만 실행 후보가 된다.
- manual mode에서는 `agy_cli`가 offline 또는 invalid output이면 기존 라우터 정책에 따라 fallback으로 전환된다.

### Smoke Test Script

- `apps/backend/src/scripts/agySshSmoke.ts`를 추가한다.
- SSH 설정이 준비되지 않은 경우 명확한 메시지와 non-zero exit code를 반환한다.
- smoke test는 민감 설정 값을 출력하지 않는다.
- 성공 조건은 다음과 같다.
  - SSH host key 검증 통과
  - wrapper command 실행 성공
  - prompt가 stdin으로 전달됨
  - `readOnly` sandbox 적용
  - 유효한 JSON 응답 수신
  - 원문 prompt와 원격 stderr가 로그에 노출되지 않음

실행 명령:

```powershell
corepack pnpm --filter @neet2work/backend run agy:ssh:smoke
```

## 보안 검토 결과

기존 계획의 “프롬프트를 stdin으로 전달한다”는 방향은 command injection 방지에 유효하지만, SSH 원격 실행에서는 `ssh2.exec(command)` 자체가 문자열 명령을 원격 셸에 전달한다는 점이 남아 있다. 따라서 원격 실행은 임의 command 문자열이 아니라 검증된 absolute wrapper path 하나만 호출해야 한다. wrapper path에는 argument, 공백, quote, shell metacharacter를 허용하지 않는다.

또한 SSH host key 검증이 없으면 중간자 공격에 취약하다. `AGY_SSH_HOST_FINGERPRINT` 또는 `AGY_SSH_KNOWN_HOSTS_PATH`를 필수 설정으로 두고, 검증 실패 시 provider를 offline으로 처리해야 한다.

실제 `.env`에 SSH 호스트, 사용자, 키 경로를 자동 주입하는 것은 민감 설정 노출 위험이 있으므로 하지 않는다. `.env.example`만 문서화하고 실제 값은 운영자가 로컬 환경에서 직접 관리한다.

`AGY_CLI_ENABLED=true`를 기본값으로 두면 외부 프로세스 실행 기능이 의도치 않게 활성화될 수 있다. 새 provider의 기본값은 비활성화가 안전하다.

`AGY_CLI_SANDBOX_POLICY`를 환경 변수로 받더라도 `readOnly` 외 값을 거부해야 한다. 그렇지 않으면 설정 변경만으로 파일 수정 또는 임의 명령 실행 권한이 열릴 수 있다.

PATH 자동 탐색은 실행 파일 하이재킹 위험이 있으므로 명시 경로와 공식 설치 경로를 우선하고, PATH fallback은 개발 환경 전용으로 제한한다.

stdout/stderr를 무제한 누적하면 원격 CLI 오작동 또는 악의적 출력으로 메모리 DoS가 발생할 수 있다. prompt와 출력 모두 최대 바이트를 제한한다.

`modelId`는 사용자 요청에서 들어올 수 있으므로 외부 입력으로 취급한다. allowlist 없이 CLI argument나 원격 command에 반영하면 명령 주입 또는 provider 정책 우회로 이어질 수 있다.

임의 텍스트에서 JSON 객체를 추출하는 방식은 로그/경고 문자열을 정상 출력처럼 오인할 수 있다. `agy_cli`는 stdout 전체가 JSON envelope인 경우만 성공으로 처리하고, 스키마 검증에 실패하면 fallback으로 전환해야 한다.

외부 프로세스와 SSH 호출은 요청 수만큼 프로세스를 늘릴 수 있으므로 동시 실행 제한이 필요하다. 제한 초과 시 provider error로 실패시키고 기존 fallback 흐름을 사용한다.

## Verification Plan

### Automated Tests

- `agy_cli` disabled 기본 상태는 `configured=false`, `online=false`로 보고된다.
- `AGY_CLI_SANDBOX_POLICY`가 `readOnly`가 아닌 경우 환경과 무관하게 실행이 거부된다.
- SSH fingerprint가 없거나 불일치하면 연결이 실패한다.
- 원격 command가 allowlist wrapper가 아니면 실행이 실패한다.
- prompt는 command 또는 args 문자열에 포함되지 않고 stdin으로만 전달된다.
- `modelId`가 allowlist에 없으면 CLI 실행 인자나 원격 wrapper에 반영되지 않는다.
- stdout/stderr 최대 크기 초과 시 provider가 실패하고 자원을 정리한다.
- timeout 시 local child process와 SSH channel/connection이 정리된다.
- 동시 실행 제한 초과 시 새 process 또는 SSH channel을 만들지 않는다.
- stdout에 JSON 외 텍스트가 섞이면 invalid output으로 실패한다.
- 로그와 status reason에 prompt, stderr 원문, SSH key path, 원격 호스트 정보가 포함되지 않는다.
- `AI_PROVIDER_ORDER=agy_cli,fallback` 파싱이 정상 동작한다.
- manual provider selection에서 `agy_cli`가 zod schema를 통과한다.
- provider 결과의 `aiMeta.providerId="agy_cli"`가 draft-workflow schema를 통과한다.

### Commands

```powershell
corepack pnpm --filter @neet2work/backend test
```

SSH 환경이 실제로 준비된 경우에만 아래 smoke test를 실행한다.

```powershell
corepack pnpm --filter @neet2work/backend run agy:ssh:smoke
```

## Assumptions

- 원격 서버에는 `/opt/neet2work/run-agy-readonly` 같은 readOnly 전용 wrapper command가 사전에 배치된다.
- wrapper command는 내부에서 `agy.exe --stdin --sandbox-policy readOnly`와 동등한 안전한 명령만 실행하고, 외부 argument를 받지 않는다.
- 원격 서버의 SSH 계정은 최소 권한 계정이며, 필요한 CLI 실행 권한만 가진다.
- 원격 SSH 계정에는 가능하면 forced command, restricted shell, 제한된 파일 권한을 적용한다.
- 실제 credential, private key, passphrase는 repo 파일이나 로그에 기록하지 않는다.
