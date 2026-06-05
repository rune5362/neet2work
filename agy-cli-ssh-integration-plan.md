# agy.exe 연동 및 SSH 원격 호출 보안 보강 계획서

본 계획서는 외부 PC 또는 로컬 환경에 존재하는 `agy.exe` 또는 Antigravity CLI를 Neet2Work 백엔드의 AI provider로 연동하고, SSH 통신을 통해 원격 서버의 CLI를 안전하게 호출할 수 있는 `agy_cli` provider 추가 작업을 다룬다.

핵심 목표는 프롬프트를 셸 명령 문자열에 삽입하지 않고 검증된 CLI 인자 배열로만 전달하며, 로컬/원격 실행 모두 고정 명령과 안전한 기본값을 사용하도록 제한하는 것이다. `agy_cli`는 외부 프로세스 실행 기능이므로 기본 비활성화하고, 활성화 후에도 읽기 전용 분석 provider로만 동작하게 한다.

`agy_cli`의 제품 역할은 "프로필을 입력받아 자기소개서 초안을 첨삭하는 AI provider"로 제한한다. `agy.exe` 자체에 영구 역할 설정을 주입할 수 있는지는 CLI 기능에 의존하므로 전제로 두지 않는다. 대신 백엔드에서 생성하는 prompt envelope에 고정 역할 지시, 입력 스키마, 출력 스키마, 금지 동작을 포함해 매 호출마다 동일한 역할을 강제한다.

현재 로컬 확인 결과 `C:\Users\pc07-00\AppData\Local\agy\bin\agy.exe`가 존재하며, `--version`은 `1.0.5`다. `--help` 기준 주요 실행 옵션은 `--print`, `--print-timeout`, `--model`, `--sandbox`이고, `--stdin` 또는 `--sandbox-policy` 옵션은 확인되지 않았다.

## 보안 원칙

- 프롬프트, 사용자 입력, model id, 원격 경로, sandbox 값을 셸 명령 문자열에 직접 섞지 않는다.
- 로컬 실행은 `child_process.spawn(command, args, { shell: false })`와 args 배열만 사용한다.
- 원격 실행은 자유 문자열 명령을 조립하지 않고, 서버에 사전 배치된 단일 wrapper command만 호출한다.
- `AGY_CLI_ENABLED`와 `AGY_SSH_ENABLED`의 기본값은 `false`로 둔다.
- `AGY_CLI_SANDBOX_ENABLED`는 설정으로 약화할 수 없게 `true`만 허용하고, 실제 CLI에는 `--sandbox`를 항상 전달한다.
- SSH 접속은 host key fingerprint 또는 known_hosts 검증 없이는 허용하지 않는다.
- SSH agent forwarding, X11 forwarding, PTY 요청, password auth는 사용하지 않는다.
- prompt, stdout/stderr 원문, SSH key path, 사용자 식별 정보, 원격 호스트 정보는 로그에 남기지 않는다.
- prompt와 출력 크기, 실행 시간, 동시 실행 수를 제한해 메모리/프로세스 DoS를 방지한다.
- provider 설정은 서버 환경 변수에서만 읽고, API 요청 본문에서 SSH host/path/command를 받지 않는다.
- `agy_cli`는 프로필 기반 자기소개서 첨삭 목적 외 작업 지시를 수행하지 않는다.

## Proposed Changes

### Backend Configuration & Settings

#### package.json

- `apps/backend/package.json`의 `dependencies`에 `ssh2`를 추가한다.
- TypeScript 타입이 필요하면 `devDependencies`에 `@types/ssh2`를 추가한다.
- 로컬 smoke test 실행을 위해 backend script에 `agy:local:smoke`를 추가한다.
- SSH smoke test 실행을 위해 backend script에 `agy:ssh:smoke`를 추가한다.
- 의존성 추가 시 lockfile을 함께 갱신하고, 신규 transitive dependency를 검토한다.

#### ai-config.ts

- `agyCli` 설정을 추가하고 환경 변수와 매핑한다.
- `parseProviderOrder`의 allowed provider 목록에 `agy_cli`를 추가한다.
- `resolveAgyCliCommand()`를 추가하되, 실행 파일 탐색은 안전한 순서로 제한한다.
  1. `AGY_CLI_COMMAND` 명시 경로
  2. Windows 공식 설치 후보 경로
     - `%LOCALAPPDATA%\agy\bin\agy.exe`

  3. PATH fallback은 개발 환경에서만 허용하거나 경고 상태로 처리
- `AGY_CLI_COMMAND`는 절대 경로만 허용하고, 파일명은 `agy.exe`, `agy`, `Antigravity.exe`, `Antigravity` 중 하나로 제한한다.
- `AGY_CLI_SANDBOX_ENABLED`는 `true`만 허용한다. `false` 또는 미설정 약화는 환경과 무관하게 설정 오류로 처리한다.
- 숫자 설정은 양의 정수로 검증하고 유효하지 않으면 안전한 기본값을 사용한다.
- `AGY_CLI_MODEL` 또는 요청의 `modelId`를 지원할 경우 allowlist된 값만 허용한다. allowlist가 없으면 model override를 무시하고 기본 모델만 사용한다.
- `AGY_CLI_MAX_CONCURRENCY`를 추가해 동시에 실행되는 local child process 또는 SSH command 수를 제한한다.
- `agy_cli`의 용도는 코드 수정/셸 실행 agent가 아니라 자기소개서 첨삭 provider로 고정한다. 이 용도는 API 요청에서 변경할 수 없고, backend prompt builder의 상수 instruction으로 관리한다.
- 실행 모드는 명확히 분기한다. `AGY_SSH_ENABLED=true`이면 SSH 원격 실행만 사용하고, `false`이면 로컬 실행만 사용한다.
- 로컬 실행 작업 디렉터리는 `AGY_CLI_WORKDIR`로 선택 설정할 수 있다. 미설정 시 백엔드가 생성한 안전한 임시 디렉터리를 사용하고, 사용자 홈이나 repo 루트 전체를 기본 cwd로 노출하지 않는다.

#### .env.example

`.env.example`에만 예시 값을 추가한다. 실제 `.env`는 자동 수정하지 않는다.

```env
# Agy CLI & SSH integration
AGY_CLI_ENABLED=false
AGY_CLI_COMMAND=C:\Users\pc07-00\AppData\Local\agy\bin\agy.exe
AGY_CLI_MODEL=
AGY_CLI_TIMEOUT_MS=120000
AGY_CLI_SANDBOX_ENABLED=true
AGY_CLI_MAX_PROMPT_BYTES=200000
AGY_CLI_MAX_OUTPUT_BYTES=1000000
AGY_CLI_MAX_CONCURRENCY=1
AGY_CLI_MODEL_ALLOWLIST=
AGY_CLI_TASK_PROFILE=cover_letter_review
AGY_CLI_WORKDIR=

AGY_SSH_ENABLED=false
AGY_SSH_HOST=
AGY_SSH_PORT=22
AGY_SSH_USERNAME=
AGY_SSH_KEY_PATH=
AGY_SSH_HOST_FINGERPRINT=
AGY_SSH_KNOWN_HOSTS_PATH=
AGY_SSH_REMOTE_WRAPPER=/opt/neet2work/run-agy-sandbox-print
AGY_SSH_CONNECT_TIMEOUT_MS=10000
AGY_SSH_EXEC_TIMEOUT_MS=120000
```

수동 설정 시에는 아래 기준을 따른다.

- `AGY_CLI_ENABLED`: 로컬 또는 SSH `agy_cli` provider를 실제로 사용할 때만 `true`로 변경한다.
- `AGY_CLI_COMMAND`: 로컬 실행을 사용할 때만 설정한다. 절대 경로만 입력하고, 파일명은 `agy.exe`, `agy`, `Antigravity.exe`, `Antigravity` 중 하나여야 한다.
- `AGY_CLI_MODEL`: 기본 모델을 고정해야 할 때만 설정한다. 요청별 `modelId`를 허용하려면 `AGY_CLI_MODEL_ALLOWLIST`에 허용 모델을 쉼표로 나열한다.
- `AGY_CLI_TASK_PROFILE`: provider의 고정 작업 프로필이다. 현재는 `cover_letter_review`만 허용하며, 프로필 기반 자기소개서 첨삭 이외의 값은 설정 오류로 처리한다.
- `AGY_CLI_TIMEOUT_MS`: CLI 전체 실행 제한 시간이다. 너무 크게 잡으면 요청 점유 시간이 길어지므로 기본값을 우선 사용한다.
- `AGY_CLI_MAX_PROMPT_BYTES`: `--print`로 전달할 prompt 최대 크기다. 초과 시 provider 실행을 거부한다.
- `AGY_CLI_MAX_OUTPUT_BYTES`: stdout/stderr 누적 최대 크기다. 초과 시 provider 실행을 중단한다.
- `AGY_CLI_MAX_CONCURRENCY`: 동시에 실행할 수 있는 `agy_cli` 작업 수다. 원격/로컬 프로세스 폭증을 막기 위해 기본값 `1`을 권장한다.
- `AGY_CLI_WORKDIR`: 로컬 `agy.exe` 실행 cwd다. 미설정 시 안전한 임시 디렉터리를 사용한다. 설정하는 경우 절대 경로만 허용하고, 비밀 파일이 있는 디렉터리를 지정하지 않는다.
- `AGY_SSH_ENABLED`: 원격 SSH 실행을 사용할 때만 `true`로 변경한다. `true`일 때는 host, username, key path, host key 검증 값이 모두 필요하다.
- `AGY_SSH_HOST`: 원격 서버 주소다. API 요청에서 받지 않고 서버 환경 변수로만 관리한다.
- `AGY_SSH_PORT`: SSH 포트다. 기본값은 `22`이며 양의 정수만 허용한다.
- `AGY_SSH_USERNAME`: 원격 서버의 최소 권한 계정명이다. root 또는 관리자 계정 사용을 금지한다.
- `AGY_SSH_KEY_PATH`: private key 파일 경로다. private key 본문, passphrase, 일회성 token은 `.env`나 repo 파일에 저장하지 않는다.
- `AGY_SSH_HOST_FINGERPRINT`: 원격 서버 host key의 SHA256 fingerprint다. `AGY_SSH_KNOWN_HOSTS_PATH`를 쓰지 않는 경우 필수다.
- `AGY_SSH_KNOWN_HOSTS_PATH`: known_hosts 파일 경로다. `AGY_SSH_HOST_FINGERPRINT` 대신 사용할 수 있다.
- `AGY_SSH_REMOTE_WRAPPER`: 원격 서버에 사전 배치된 sandbox print wrapper의 absolute path다. argument, 공백, quote, shell metacharacter를 포함하지 않는다.
- `AGY_SSH_CONNECT_TIMEOUT_MS`: SSH 연결 수립 제한 시간이다.
- `AGY_SSH_EXEC_TIMEOUT_MS`: 원격 wrapper 실행 제한 시간이다.

로컬 실행과 SSH 실행을 모두 설정한 경우에는 `AGY_SSH_ENABLED=true`일 때 SSH 실행을 우선 사용한다. 운영자는 둘 중 하나의 실행 방식을 명확히 선택하는 것을 권장한다.

수동 설정 전제 조건:

- 로컬 실행을 사용할 경우 백엔드가 실행되는 같은 OS 사용자 계정에서 `agy.exe`를 미리 실행하고 로그인 절차를 완료해 둔다. 현재 확인된 로컬 경로는 `C:\Users\pc07-00\AppData\Local\agy\bin\agy.exe`이고, `--version` 결과는 `1.0.5`다.
- SSH 원격 실행을 사용할 경우 원격 서버의 `AGY_SSH_USERNAME` 계정으로 접속한 뒤, 그 계정에서 `agy.exe`를 미리 실행하고 로그인 절차를 완료해 둔다.
- 백엔드는 로그인 UI나 대화형 인증을 처리하지 않는다. 로그인 세션이 없으면 `agy.exe`가 대화형 로그인 대기 상태로 멈출 수 있으므로, probe timeout을 auth/session unavailable 상태로 분류하고 process/channel을 강제 정리한다.
- 로그인 세션 파일이나 token은 repo, `.env`, 로그에 기록하지 않고, `agy.exe`가 관리하는 기본 인증 저장소에만 둔다.
- 실행 계정은 `agy.exe`가 사용하는 app data/config/log 디렉터리에 읽기/쓰기 권한이 있어야 한다. 현재 로컬 실행에서는 `C:\Users\pc07-00\.gemini\antigravity-cli`와 `C:\Users\pc07-00\.gemini\config` 접근이 시도되는 것을 확인했다.

### Local Connection Plan

- 로컬 실행은 `AGY_SSH_ENABLED=false`이고 `AGY_CLI_ENABLED=true`일 때만 활성화한다.
- 로컬 실행 전 백엔드 실행 계정에서 `agy.exe` 로그인 세션이 준비되어 있어야 한다.
- `getStatus()`는 아래 순서로 로컬 연결 가능성을 판단한다.
  1. `AGY_CLI_TASK_PROFILE=cover_letter_review` 검증
  2. `AGY_CLI_SANDBOX_ENABLED=true` 검증
  3. `AGY_CLI_COMMAND` 또는 공식 설치 후보 경로 확인
  4. 실행 파일명 allowlist와 절대 경로 검증
  5. `AGY_CLI_WORKDIR` 검증 또는 안전한 임시 cwd 준비 가능 여부 확인
  6. `agy.exe models`로 로그인 세션과 app data 쓰기 권한을 짧은 timeout 안에서 확인
  7. 실제 `--print` 실행은 미로그인 시 OAuth 대기 상태로 멈출 수 있으므로 별도 실행 timeout으로 감싼다.
- `execute()`는 로컬 child process를 만들 때 backend process 환경 변수를 그대로 넘기지 않는다. 필요한 최소 환경 변수만 allowlist로 구성한다.
- 로컬 child process에는 stdout/stderr pipe만 연결하고, shell/stdio inherit/interactive prompt는 사용하지 않는다.
- 로컬 prompt는 셸 문자열이 아니라 `spawn` args 배열의 `--print` 값으로 전달한다. 이 값은 프로세스 인자에 노출될 수 있으므로 로그에 남기지 않고 최대 크기를 제한한다.
- 로그인 probe timeout, output limit 초과, JSON schema 실패, child exit code non-zero는 provider 실패로 처리하고 기존 fallback 흐름을 사용한다.
- timeout 또는 실패 시 child process를 종료한다. Windows에서는 우선 `child.kill()`을 호출하고, 종료되지 않으면 후속 cleanup 절차를 둔다.
- 로컬 smoke test script `agy:local:smoke`를 추가한다. 이 스크립트는 로컬 실행 파일 탐색, `--sandbox` args, `--print` 실행, JSON-only 응답, 민감정보 로그 미노출을 확인한다.

### SSH Remote Connection Plan

- SSH 실행은 `AGY_CLI_ENABLED=true`이고 `AGY_SSH_ENABLED=true`일 때만 활성화한다.
- SSH 실행 전 원격 `AGY_SSH_USERNAME` 계정에서 `agy.exe` 로그인 세션이 준비되어 있어야 한다.
- SSH 원격 서버에는 사전에 sandbox wrapper를 배치한다. Linux 예시는 `/opt/neet2work/run-agy-sandbox-print`이며, Windows OpenSSH 서버를 쓰는 경우에도 공백 없는 absolute wrapper path를 별도로 배치하고 같은 검증 규칙을 적용한다.
- wrapper는 외부 argument를 받지 않고 stdin만 읽는다. wrapper 내부에서만 `agy.exe --sandbox --print-timeout <timeout> --print <prompt>`와 동등한 명령을 셸 문자열이 아닌 안전한 인자 배열로 고정 실행한다.
- `getStatus()`는 아래 순서로 SSH 연결 가능성을 판단한다.
  1. host, port, username, key path 필수값 검증
  2. private key 파일 존재 및 읽기 가능 여부 확인
  3. host fingerprint 또는 known_hosts 설정 존재 확인
  4. wrapper path absolute path 정규식 검증
  5. SSH connect timeout 안에서 연결 및 host key 검증
  6. wrapper read-only probe로 `agy.exe` 로그인 세션, app data 쓰기 권한, JSON 응답 가능 여부를 exec timeout 안에서 확인
- `ssh2` 연결 옵션은 private key 인증만 사용하고 password auth, keyboard-interactive, agent forwarding, X11, PTY를 사용하지 않는다.
- known_hosts를 사용할 경우 host와 port를 함께 검증한다. fingerprint를 사용할 경우 SHA256 fingerprint가 정확히 일치해야 한다.
- SSH 연결 실패, host key 불일치, wrapper probe timeout, wrapper exit code non-zero는 provider offline 또는 provider error로 처리하고 sanitized reason만 남긴다.
- 원격 stderr/stdout 원문은 API 응답과 일반 로그에 노출하지 않는다. smoke test에서도 host, username, key path, fingerprint 전체값을 출력하지 않는다.
- SSH smoke test `agy:ssh:smoke`는 wrapper 배치 여부, host key 검증, wrapper stdin 수신, `--sandbox --print` 실행, JSON-only 응답, 민감정보 로그 미노출을 확인한다.

#### ai-routing.ts 및 draft-workflow schema

- `AiProviderId` 유니온 타입에 `"agy_cli"`를 추가한다.
- draft-workflow 요청 schema의 manual provider 선택 enum에 `"agy_cli"`를 추가한다.
- draft-workflow 응답 schema의 `aiMeta.providerId` enum에도 `"agy_cli"`를 추가한다.

#### draft-workflow prompt contract

- `agy_cli`로 전달하는 prompt는 백엔드에서 생성한 고정 envelope만 사용한다.
- envelope에는 아래 내용을 항상 포함한다.
  - 역할: "사용자 프로필과 자기소개서 초안을 바탕으로 채용 자기소개서를 첨삭하는 한국어 AI reviewer"
  - 입력: 지원자 프로필, 목표 회사/직무, 채용 문항, 기존 초안, 경력/프로젝트/역량 근거
  - 출력: 기존 draft-workflow zod schema와 호환되는 JSON만 반환
  - 금지: 파일 수정, 셸 명령 실행 요청, SSH/로컬 환경 탐색, provider 설정 변경, 프로필에 없는 사실 창작, 민감정보 노출
  - 기준: 프로필 근거 기반 첨삭, 문항 적합도, 직무 적합도, 구체성, 블라인드 채용 리스크, 한국어 가독성, 면접 방어 가능성
- 사용자의 자유 입력이 있더라도 provider 목적을 바꾸는 instruction은 무시한다.
- `agy.exe`가 별도 system prompt 옵션을 제공하더라도 자유 입력으로 구성한 셸 문자열에 넣지 않는다. 필요하면 wrapper 내부 고정 설정 또는 prompt envelope의 고정 instruction으로만 반영한다.

### Services & Providers

#### ssh-helper.ts

- `ssh2`를 사용해 SSH 연결, host key 검증, wrapper 실행, wrapper stdin 쓰기, stdout/stderr 수집, timeout, cleanup을 담당한다.
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
- `execute()`는 `AGY_CLI_TASK_PROFILE=cover_letter_review`를 확인하고, profile context가 없는 요청은 실행하지 않는다.
- 동시 실행 수가 `AGY_CLI_MAX_CONCURRENCY`를 초과하면 provider를 실행하지 않고 fallback 가능 오류를 반환한다.
- 실행 모드 선택은 `AGY_SSH_ENABLED` 하나로 결정한다. SSH 모드에서는 로컬 executable fallback을 시도하지 않고, 로컬 모드에서는 SSH 설정을 사용하지 않는다.
- 로컬 실행 시 cwd는 `AGY_CLI_WORKDIR` 또는 안전한 임시 디렉터리로 고정하고, child process env는 allowlist된 최소값만 전달한다.
- 로컬 실행은 아래와 같이 고정 args 배열로만 수행한다.

```ts
spawn(command, ["--sandbox", "--print-timeout", timeoutText, "--print", prompt], { shell: false })
```

- SSH 실행은 `AGY_SSH_REMOTE_WRAPPER` wrapper를 호출하고 prompt는 SSH channel stdin으로 wrapper에 전달한다. wrapper가 내부에서 `agy.exe --sandbox --print-timeout ... --print ...`를 안전한 인자 배열로 실행한다.
- model 값을 지원해야 한다면 셸 문자열이나 자유 command argument가 아니라 검증된 prompt envelope 또는 wrapper 내부 고정 설정으로 처리한다.
- 요청에서 들어온 `modelId`는 `AGY_CLI_MODEL_ALLOWLIST`에 포함된 경우에만 사용한다.
- prompt envelope의 task instruction은 백엔드 상수로 생성하며 API 요청에서 덮어쓸 수 없게 한다.
- CLI stdout은 JSON만 허용한다. 임의 텍스트에서 첫 `{`와 마지막 `}`를 잘라 파싱하는 fallback은 사용하지 않는다.
- JSON 파싱 후 기존 draft-workflow zod schema로 검증 가능한 결과만 반환한다.
- stderr는 진단용으로만 제한 크기까지 수집하고, 응답/로그에는 원문을 노출하지 않는다.

#### ai-router.ts

- provider map에 `new AgyCliProvider()`를 등록한다.
- auto mode에서는 `AI_PROVIDER_ORDER`에 포함된 경우에만 실행 후보가 된다.
- manual mode에서는 `agy_cli`가 offline 또는 invalid output이면 기존 라우터 정책에 따라 fallback으로 전환된다.

### Smoke Test Script

- `apps/backend/src/scripts/agyLocalSmoke.ts`를 추가한다.
- `apps/backend/src/scripts/agySshSmoke.ts`를 추가한다.
- 로컬 또는 SSH 설정이 준비되지 않은 경우 명확한 메시지와 non-zero exit code를 반환한다.
- smoke test는 민감 설정 값을 출력하지 않는다.
- 로컬 smoke test 성공 조건은 다음과 같다.
  - 로컬 실행 파일 탐색 및 allowlist 검증 통과
  - 백엔드 실행 계정의 `agy.exe` 로그인 세션 확인
  - 백엔드 실행 계정의 Antigravity/Gemini app data 쓰기 권한 확인
  - 안전한 cwd 사용
  - 고정 args와 `shell: false` 사용
- prompt가 `--print` args 배열로 전달됨
  - JSON-only 응답 수신
  - 원문 prompt와 stderr가 로그에 노출되지 않음
- SSH smoke test 성공 조건은 다음과 같다.
  - SSH host key 검증 통과
  - 원격 `AGY_SSH_USERNAME` 계정의 `agy.exe` 로그인 세션 확인
  - 원격 `AGY_SSH_USERNAME` 계정의 Antigravity/Gemini app data 쓰기 권한 확인
  - wrapper command 실행 성공
- prompt가 wrapper stdin으로 전달됨
- `--sandbox` 적용
  - 유효한 JSON 응답 수신
  - 원문 prompt와 원격 stderr가 로그에 노출되지 않음

실행 명령:

```powershell
corepack pnpm --filter @neet2work/backend run agy:local:smoke
corepack pnpm --filter @neet2work/backend run agy:ssh:smoke
```

## 보안 검토 결과

기존 계획의 “프롬프트를 stdin으로 전달한다”는 방향은 `agy.exe` 자체 옵션으로는 확인되지 않았다. 로컬 실행은 `spawn` args 배열의 `--print` 값으로 prompt를 전달하고, SSH 실행은 wrapper stdin으로 prompt를 보낸 뒤 wrapper 내부에서 `agy.exe --sandbox --print-timeout ... --print ...`를 안전한 인자 배열로 실행한다. SSH 원격 실행에서는 `ssh2.exec(command)` 자체가 문자열 명령을 원격 셸에 전달하므로, 원격 실행은 임의 command 문자열이 아니라 검증된 absolute wrapper path 하나만 호출해야 한다. wrapper path에는 argument, 공백, quote, shell metacharacter를 허용하지 않는다.

또한 SSH host key 검증이 없으면 중간자 공격에 취약하다. `AGY_SSH_HOST_FINGERPRINT` 또는 `AGY_SSH_KNOWN_HOSTS_PATH`를 필수 설정으로 두고, 검증 실패 시 provider를 offline으로 처리해야 한다.

실제 `.env`에 SSH 호스트, 사용자, 키 경로를 자동 주입하는 것은 민감 설정 노출 위험이 있으므로 하지 않는다. `.env.example`만 문서화하고 실제 값은 운영자가 로컬 환경에서 직접 관리한다.

`AGY_CLI_ENABLED=true`를 기본값으로 두면 외부 프로세스 실행 기능이 의도치 않게 활성화될 수 있다. 새 provider의 기본값은 비활성화가 안전하다.

`AGY_CLI_SANDBOX_ENABLED`는 항상 `true`여야 하며, 실제 CLI에는 `--sandbox`를 전달해야 한다. 그렇지 않으면 설정 변경만으로 파일 수정 또는 임의 명령 실행 권한이 열릴 수 있다.

PATH 자동 탐색은 실행 파일 하이재킹 위험이 있으므로 명시 경로와 공식 설치 경로를 우선하고, PATH fallback은 개발 환경 전용으로 제한한다.

stdout/stderr를 무제한 누적하면 원격 CLI 오작동 또는 악의적 출력으로 메모리 DoS가 발생할 수 있다. prompt와 출력 모두 최대 바이트를 제한한다.

`modelId`는 사용자 요청에서 들어올 수 있으므로 외부 입력으로 취급한다. allowlist 없이 CLI argument나 원격 command에 반영하면 명령 주입 또는 provider 정책 우회로 이어질 수 있다.

`agy.exe`를 범용 agent처럼 사용하면 프로필 첨삭 범위를 벗어나 파일/환경 탐색이나 사실 창작 위험이 커진다. 백엔드는 `cover_letter_review` 작업 프로필을 고정하고, 프로필과 채용 문항에 근거한 자기소개서 첨삭만 요청해야 한다.

임의 텍스트에서 JSON 객체를 추출하는 방식은 로그/경고 문자열을 정상 출력처럼 오인할 수 있다. `agy_cli`는 stdout 전체가 JSON envelope인 경우만 성공으로 처리하고, 스키마 검증에 실패하면 fallback으로 전환해야 한다.

외부 프로세스와 SSH 호출은 요청 수만큼 프로세스를 늘릴 수 있으므로 동시 실행 제한이 필요하다. 제한 초과 시 provider error로 실패시키고 기존 fallback 흐름을 사용한다.

## Verification Plan

### Automated Tests

- `agy_cli` disabled 기본 상태는 `configured=false`, `online=false`로 보고된다.
- `AGY_CLI_SANDBOX_ENABLED`가 `true`가 아닌 경우 환경과 무관하게 실행이 거부된다.
- SSH fingerprint가 없거나 불일치하면 연결이 실패한다.
- 원격 command가 allowlist wrapper가 아니면 실행이 실패한다.
- `AGY_SSH_ENABLED=true`이면 로컬 executable fallback을 시도하지 않는다.
- `AGY_SSH_ENABLED=false`이면 SSH 설정이 있어도 로컬 실행만 사용한다.
- 로컬 실행 파일 경로가 상대 경로이거나 파일명 allowlist에 없으면 provider가 offline으로 보고된다.
- 로컬 실행 cwd가 상대 경로이거나 접근할 수 없으면 provider가 offline으로 보고된다.
- 로컬 `agy.exe` 로그인 세션이 없거나 대화형 로그인 대기로 probe가 timeout되면 provider가 offline으로 보고되고 child process가 정리된다.
- 로컬 실행 계정이 `agy.exe` app data/config/log 디렉터리에 쓸 수 없으면 provider가 offline으로 보고된다.
- 로컬 child process env에 backend 전체 환경 변수가 그대로 전달되지 않는다.
- SSH private key 파일이 없거나 읽을 수 없으면 provider가 offline으로 보고된다.
- known_hosts 검증은 host와 port를 함께 확인한다.
- SSH wrapper probe가 실패하거나 timeout되면 provider가 offline으로 보고된다.
- 원격 `AGY_SSH_USERNAME` 계정의 `agy.exe` 로그인 세션이 없거나 대화형 로그인 대기로 probe가 timeout되면 provider가 offline으로 보고되고 SSH channel이 정리된다.
- 원격 `AGY_SSH_USERNAME` 계정이 `agy.exe` app data/config/log 디렉터리에 쓸 수 없으면 provider가 offline으로 보고된다.
- prompt는 셸 command 문자열에 포함되지 않는다. 로컬은 args 배열의 `--print` 값으로 전달하고, SSH는 wrapper stdin으로 전달한다.
- `modelId`가 allowlist에 없으면 CLI 실행 인자나 원격 wrapper에 반영되지 않는다.
- `AGY_CLI_TASK_PROFILE`이 `cover_letter_review`가 아니면 provider가 실행되지 않는다.
- profile context가 없는 요청은 `agy_cli`로 실행되지 않는다.
- prompt envelope에 프로필 기반 자기소개서 첨삭 역할, 금지 동작, JSON-only 출력 요구가 포함된다.
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

로컬 `agy.exe` 또는 SSH 환경이 실제로 준비된 경우에만 아래 smoke test를 실행한다.

```powershell
corepack pnpm --filter @neet2work/backend run agy:local:smoke
corepack pnpm --filter @neet2work/backend run agy:ssh:smoke
```

## Assumptions

- 원격 서버에는 `/opt/neet2work/run-agy-sandbox-print` 같은 sandbox 전용 wrapper command가 사전에 배치된다.
- wrapper command는 내부에서 `agy.exe --sandbox --print-timeout <timeout> --print <prompt>`와 동등한 안전한 명령만 실행하고, 외부 argument를 받지 않는다.
- `agy.exe` 자체의 영구 system prompt 설정은 필수 전제가 아니다. 작업 역할은 백엔드의 prompt envelope로 강제한다.
- 로컬 또는 원격 실행 계정은 사전에 `agy.exe` 로그인을 완료한 상태다.
- 로컬 또는 원격 실행 계정은 `agy.exe`의 app data/config/log 디렉터리에 필요한 읽기/쓰기 권한을 가진다.
- 원격 서버의 SSH 계정은 최소 권한 계정이며, 필요한 CLI 실행 권한만 가진다.
- 원격 SSH 계정에는 가능하면 forced command, restricted shell, 제한된 파일 권한을 적용한다.
- 실제 credential, private key, passphrase는 repo 파일이나 로그에 기록하지 않는다.
