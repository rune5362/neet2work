# 개발 환경 세팅 가이드

이 문서는 팀원이 새 PC나 새 작업 폴더에서 동일한 개발 환경을 빠르게 세팅하기 위한 가이드입니다.

주의: 이 문서는 `setup/` 폴더 안에 있지만, 모든 명령은 프로젝트 루트에서 실행합니다. 프로젝트 루트는 `package.json`, `apps/`, `scripts/` 폴더가 있는 위치입니다.

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
- pnpm 의존성 설치
- `.env` 생성
- Prisma Client 생성
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
| pnpm | 11.x |
| Git | 최신 안정 버전 |
| Docker Desktop | 선택, 개인이 로컬 컨테이너 DB를 쓸 때만 필요 |

Node 버전은 프로젝트 루트의 `.nvmrc`, `.node-version`, `package.json`에 맞춰 `24.14.0`을 사용합니다.
프로젝트는 Corepack으로 `package.json`의 pnpm 11 버전을 고정하고, `.npmrc`에서 `engine-strict=true`를 사용하므로 Node 버전이 맞지 않으면 설치 단계에서 오류가 날 수 있습니다.

## 환경변수

초기 세팅 후 루트에 `.env` 파일이 생성됩니다.

```bash
corepack pnpm run setup:env
```

기본값은 로컬 개발용이며, 실제 API 키나 비밀번호는 GitHub에 올리지 않습니다.

DB 인스턴스 자체는 팀원 각자가 따로 사용합니다. `.env`의 `DATABASE_URL`에는 본인이 사용할 개인 개발 DB 주소를 넣습니다. Supabase, AWS RDS, 로컬 PostgreSQL, Docker PostgreSQL 중 어떤 방식이든 가능합니다.

```env
DATABASE_URL=postgresql://neet2work:neet2work@localhost:5432/neet2work
```

## 로컬 실행

프론트엔드와 백엔드를 동시에 실행합니다.

```bash
corepack pnpm run dev
```

접속 주소:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health Check: `http://localhost:3000/health`

각각 실행하려면 아래 명령을 사용합니다.

```bash
corepack pnpm run dev:frontend
corepack pnpm run dev:backend
```

## 개발 DB 선택

공통으로 맞추는 것은 DB 서버가 아니라 Prisma 스키마입니다.

- 공통 기준: `apps/backend/prisma/schema.prisma`
- 공통 migration: `apps/backend/prisma/migrations/`
- 공통 샘플 데이터: `apps/backend/prisma/seed.ts`
- 개인 설정: 루트 `.env`의 `DATABASE_URL`

Supabase나 AWS RDS를 개발 DB로 쓰는 경우 `.env`에 해당 PostgreSQL 연결 문자열을 넣고 아래 migration/seed 명령을 실행합니다.

Docker로 로컬 PostgreSQL 컨테이너를 쓰고 싶은 팀원만 Docker Compose를 사용합니다.

```bash
corepack pnpm run docker:up
```

또는 직접 실행합니다.

```bash
docker compose up --build
```

Docker Compose는 다음 컨테이너를 실행합니다.

- frontend
- backend
- PostgreSQL 17

Docker가 없어도 기본 개발은 가능합니다. 이 경우 개인 원격 DB를 연결하거나, DB 연결 없이 Mock fallback으로 프론트엔드와 백엔드 기본 흐름을 개발합니다.

## DB 마이그레이션과 샘플 데이터

PostgreSQL 스키마는 Prisma Migrate로 관리합니다.

Prisma Client 생성:

```bash
corepack pnpm run db:generate
```

`db:generate`는 Prisma Client 파일만 생성하므로 PostgreSQL이 실행 중이지 않아도 됩니다.

마이그레이션 적용:

```bash
corepack pnpm run db:migrate
```

공통 샘플 데이터 입력:

```bash
corepack pnpm run db:seed
```

DB 화면 확인:

```bash
corepack pnpm run db:studio
```

DB 연결 필요 여부:

| 명령 | DB 필요 여부 | 설명 |
| --- | --- | --- |
| `corepack pnpm run setup` | 필요 없음 | 의존성 설치, `.env` 생성, Prisma Client 생성, Playwright 설치 |
| `corepack pnpm run db:generate` | 필요 없음 | Prisma Client 생성 |
| `corepack pnpm run dev` | 필요 없음 | DB가 없어도 Mock fallback으로 서버 실행 |
| `corepack pnpm run db:migrate` | 필요 | PostgreSQL에 migration 적용 |
| `corepack pnpm run db:seed` | 필요 | PostgreSQL에 샘플 데이터 입력 |
| `corepack pnpm run db:reset` | 필요 | 현재 `DATABASE_URL`의 개발 DB 초기화 후 migration/seed 재실행 |
| `corepack pnpm run db:studio` | 필요 | DB GUI 접속 |

자세한 흐름은 `apps/backend/prisma/README.md`를 참고합니다.

## 테스트와 품질 검사

테스트:

```bash
corepack pnpm run test
```

린트:

```bash
corepack pnpm run lint
```

빌드:

```bash
corepack pnpm run build
```

전체 확인:

```bash
corepack pnpm run check
```

보안 점검:

```bash
corepack pnpm run security:audit
```

## Playwright RPA 준비

초기 세팅에서 Playwright Chromium이 설치됩니다.

```bash
corepack pnpm run setup:playwright
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
- Docker (선택)
- Playwright
- PostgreSQL
- DotENV

## 자주 생기는 문제

### pnpm 명령이 인식되지 않는 경우

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
corepack pnpm run setup:env
```

### PostgreSQL 연결이 안 되는 경우

먼저 `.env`의 `DATABASE_URL`이 본인 개인 개발 DB를 가리키는지 확인합니다. 실제 비밀번호나 전체 URL은 채팅, 문서, GitHub에 올리지 않습니다.

Docker Compose를 쓰는 경우에만 컨테이너 실행 상태를 확인합니다.

```bash
docker compose ps
```

서버는 DB 연결이 실패해도 종료되지 않고 `/health`에서 `database: "unavailable"` 또는 `database: "not_configured"` 상태를 보여줍니다.
