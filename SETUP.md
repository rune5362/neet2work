# 개발 환경 세팅 가이드

이 문서는 팀원이 새 PC나 새 작업 폴더에서 동일한 개발 환경을 빠르게 세팅하기 위한 가이드입니다.

## 운영체제별 빠른 시작

처음 세팅하는 팀원은 본인 운영체제 문서를 먼저 봅니다.

| 운영체제 | 문서 | 추천 방식 |
| --- | --- | --- |
| Windows | [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) | 자동 스크립트 우선, 내부에서 winget + nvm-windows 사용 |
| macOS | [MACOS_SETUP.md](./MACOS_SETUP.md) | Homebrew + nvm |
| Linux | [LINUX_SETUP.md](./LINUX_SETUP.md) | apt + nvm |

## Windows 빠른 실행

Windows 팀원은 프로젝트 루트 경로에서 아래 명령만 실행합니다.
    - 중간에 2번 정도 새로설치된 프로그램 인식을 위해 powerShell을 다시 띄워서 반복 합니다.


```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup-windows.ps1
```

첫 번째 명령을 실행하면 PowerShell이 아래와 같은 확인 메시지를 보여줄 수 있습니다.

```txt
Execution Policy Change
The execution policy helps protect you from scripts that you do not trust.
Do you want to change the execution policy?
[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "N"):
```

의미:

- PowerShell이 스크립트 실행 정책을 임시로 바꿔도 되는지 확인하는 보안 안내입니다.
- 우리가 사용하는 `-Scope Process`는 현재 열려 있는 PowerShell 창에만 적용됩니다.
- PowerShell 창을 닫으면 이 설정은 사라집니다.
- Windows 전체 보안 정책을 영구적으로 바꾸는 명령이 아닙니다.

대응:

- 프로젝트 루트에서 실행 중이고, 명령이 `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`가 맞다면 `Y`를 입력하고 Enter를 누릅니다.
- 여러 번 묻는 경우에도 현재 창에서만 허용하려면 `Y`를 선택하면 됩니다.
- 불안하면 `N`을 누르고 중단한 뒤, 현재 위치가 프로젝트 루트인지 `Get-ChildItem package.json`으로 확인하고 다시 실행합니다.

스크립트가 자동으로 처리하는 일:

- `winget` 확인
- `nvm-windows` 설치 또는 확인
- Node.js 24.14.0 설치 및 사용
- npm 의존성 설치
- `.env` 생성
- Playwright Chromium 설치

수동 확인 명령은 [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)의 문제 해결 섹션에서만 사용합니다.

## macOS / Linux 빠른 실행

macOS와 Linux는 OS별 문서에 따라 `nvm`과 Node.js를 먼저 준비한 뒤 프로젝트 루트에서 실행합니다.

```bash
bash scripts/setup-unix.sh
```

## 저장소 준비

아직 저장소를 받지 않았다면 원하는 작업 폴더에서 아래 명령을 실행합니다.

```bash
git clone <repository-url>
cd ./Neet2Work
```

이미 저장소를 받은 상태라면 프로젝트 루트에서 아래 명령으로 위치를 확인한 뒤 진행합니다.

Windows PowerShell:

```powershell
Get-ChildItem package.json
```

macOS / Linux:

```bash
ls package.json
```

최신 변경사항을 받을 때는 프로젝트 루트에서 아래 명령을 실행합니다.

```bash
git pull
```

## 필수 버전

| 도구 | 권장 버전 |
| --- | --- |
| Node.js | 24.14.0 LTS |
| npm | 11.9.0 |
| Git | 최신 안정 버전 |
| Docker Desktop | 선택, PostgreSQL 컨테이너 실행 시 필요 |

Node 버전은 프로젝트 루트의 `.nvmrc`, `.node-version`, `package.json`에 맞춰 `24.14.0`을 사용합니다.
프로젝트는 `.npmrc`에서 `engine-strict=true`를 사용하므로 Node 버전이 맞지 않으면 설치 단계에서 오류가 날 수 있습니다.

## 환경변수

초기 세팅 후 루트에 `.env` 파일이 생성됩니다.

```bash
npm run setup:env
```

기본값은 로컬 개발용이며, 실제 API 키나 비밀번호는 GitHub에 올리지 않습니다.

PostgreSQL을 Docker Compose로 실행할 경우 기본 `DATABASE_URL`은 아래 값을 사용합니다.

```env
DATABASE_URL=postgresql://neet2work:neet2work@localhost:5432/neet2work
```

## 로컬 실행

프론트엔드와 백엔드를 동시에 실행합니다.

```bash
npm run dev
```

접속 주소:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health Check: `http://localhost:3000/health`

각각 실행하려면 아래 명령을 사용합니다.

```bash
npm run dev:frontend
npm run dev:backend
```

## PostgreSQL 17 실행

PostgreSQL까지 함께 실행하려면 Docker Compose를 사용합니다.

```bash
npm run docker:up
```

또는 직접 실행합니다.

```bash
docker compose up --build
```

Docker Compose는 다음 컨테이너를 실행합니다.

- frontend
- backend
- PostgreSQL 17

Docker가 없어도 기본 개발은 가능합니다. 이 경우 서버는 DB 연결 실패로 종료되지 않고 Mock fallback을 사용합니다.

## 테스트와 품질 검사

테스트:

```bash
npm test
```

린트:

```bash
npm run lint
```

빌드:

```bash
npm run build
```

전체 확인:

```bash
npm run check
```

## Playwright RPA 준비

초기 세팅에서 Playwright Chromium이 설치됩니다.

```bash
npm run setup:playwright
```

브라우저가 누락되었다는 오류가 나오면 위 명령을 다시 실행합니다.

## VS Code 확장 설치

최소 추천 확장을 한 번에 설치하려면 아래 명령을 실행합니다.

Windows:

```powershell
.\scripts\install-vscode-extensions.ps1
```

macOS / Linux:

```bash
bash scripts/install-vscode-extensions.sh
```

설치되는 확장:

- ESLint
- Prettier
- Docker
- Playwright
- PostgreSQL
- DotENV

## 자주 생기는 문제

### npm 명령이 인식되지 않는 경우

Windows는 [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)의 문제 해결 섹션을 확인합니다.

macOS / Linux는 터미널을 새로 열거나 아래 명령으로 Node 버전을 다시 적용합니다.

```bash
nvm use
```

### `.\scripts\setup-windows.ps1`을 찾지 못하는 경우

아래 오류는 실행 정책 문제가 아니라, 현재 PowerShell 위치가 프로젝트 루트가 아니라는 뜻입니다.

```txt
The term '.\scripts\setup-windows.ps1' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

프로젝트 루트인지 확인합니다.

```powershell
Get-Location
Get-ChildItem
Test-Path .\scripts\setup-windows.ps1
Test-Path .\package.json
```

정상이라면 둘 다 `True`가 나와야 합니다.

`False`가 나오면 프로젝트 폴더로 이동해야 합니다. 파일 탐색기에서 프로젝트 폴더를 열고 주소창에 `powershell`을 입력한 뒤 다시 실행하는 방법이 가장 쉽습니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup-windows.ps1
```

이미 GitHub에서 받은 폴더인데 `scripts\setup-windows.ps1`이 없다면 최신 변경사항을 받습니다.

```powershell
git pull
```

### .env 파일이 없는 경우

```bash
npm run setup:env
```

### PostgreSQL 연결이 안 되는 경우

Docker Compose가 실행 중인지 확인합니다.

```bash
docker compose ps
```

서버는 DB 연결이 실패해도 종료되지 않고 `/health`에서 `database: "unavailable"` 또는 `database: "not_configured"` 상태를 보여줍니다.
