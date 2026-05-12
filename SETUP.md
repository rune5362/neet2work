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

Windows 팀원은 프로젝트 루트에서 아래 명령만 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup-windows.ps1
```

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

## 자주 생기는 문제

### npm 명령이 인식되지 않는 경우

Windows는 [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)의 문제 해결 섹션을 확인합니다.

macOS / Linux는 터미널을 새로 열거나 아래 명령으로 Node 버전을 다시 적용합니다.

```bash
nvm use
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
