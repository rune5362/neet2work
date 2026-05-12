# 개발 환경 세팅 가이드

이 문서는 팀원이 새 PC나 새 작업 폴더에서 동일한 개발 환경을 빠르게 세팅하기 위한 가이드입니다.

## 운영체제별 빠른 시작

처음 세팅하는 팀원은 본인 운영체제 문서를 먼저 봅니다.

| 운영체제 | 문서 | 추천 방식 |
| --- | --- | --- |
| Windows | [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) | PowerShell + winget 또는 nvm-windows |
| macOS | [MACOS_SETUP.md](./MACOS_SETUP.md) | Homebrew + nvm |
| Linux | [LINUX_SETUP.md](./LINUX_SETUP.md) | apt + nvm |

## 1. 필수 도구

| 도구 | 권장 버전 | 확인 명령 |
| --- | --- | --- |
| Node.js | 24.14.0 LTS | `node -v` |
| npm | 11.9.0 | `npm -v` |
| Git | 최신 안정 버전 | `git --version` |
| Docker Desktop | 최신 안정 버전 | `docker --version` |

Node 버전은 프로젝트 루트의 `.nvmrc`, `.node-version`, `package.json`에 맞춰 `24.14.0`을 사용합니다.
프로젝트는 `.npmrc`에서 `engine-strict=true`를 사용하므로 Node 버전이 맞지 않으면 설치 단계에서 오류가 날 수 있습니다.

## 2. Node.js 24 LTS 설치

### Windows

Windows는 [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)를 먼저 참고합니다.

`nvm-windows`를 이미 사용 중이라면 아래 방식도 가능합니다.

```powershell
nvm install 24.14.0
nvm use 24.14.0
node -v
npm -v
```

이미 Node.js 24 LTS를 공식 설치 파일로 설치했다면 `node -v`가 `v24.x.x`인지 확인합니다.

### macOS / Linux

macOS는 [MACOS_SETUP.md](./MACOS_SETUP.md), Linux는 [LINUX_SETUP.md](./LINUX_SETUP.md)를 먼저 참고합니다.

이미 `nvm`이 설치되어 있다면 프로젝트 루트에서 아래 명령을 실행합니다.

```bash
nvm install
nvm use
node -v
npm -v
```

`.nvmrc`에 `24.14.0`이 들어 있으므로 프로젝트 루트에서 `nvm install`만 실행해도 같은 Node 버전을 설치합니다.

`asdf`, `mise`, `nodenv`를 사용하는 경우 `.node-version`의 `24.14.0` 값을 기준으로 설치합니다.

## 3. 저장소 준비

```bash
git clone <repository-url>
cd Neet2Work
```

이미 저장소를 받은 상태라면 프로젝트 루트에서 아래 명령을 실행합니다.

```bash
git pull
```

## 4. npm 기반 초기 세팅

프로젝트 루트에서 한 번만 실행합니다.

```bash
npm run setup
```

이 명령은 다음 작업을 수행합니다.

- `npm install`로 루트와 workspaces 의존성 설치
- `.env`가 없으면 `.env.example`을 복사해 `.env` 생성
- Playwright Chromium 브라우저 설치

`npm install` 후 생성되거나 갱신되는 `package-lock.json`은 팀원 간 동일 의존성 설치를 위해 커밋 대상입니다.

개별로 실행하고 싶다면 아래 명령을 사용합니다.

```bash
npm install
npm run setup:env
npm run setup:playwright
```

## 5. 환경변수

초기 세팅 후 루트에 `.env` 파일이 생성됩니다.

```bash
npm run setup:env
```

기본값은 로컬 개발용이며, 실제 API 키나 비밀번호는 GitHub에 올리지 않습니다.

PostgreSQL을 Docker Compose로 실행할 경우 기본 `DATABASE_URL`은 아래 값을 사용합니다.

```env
DATABASE_URL=postgresql://neet2work:neet2work@localhost:5432/neet2work
```

## 6. 로컬 실행

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

## 7. PostgreSQL 17 실행

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

로컬에 PostgreSQL을 직접 설치해서 쓰는 경우에는 `.env`의 `DATABASE_URL`만 본인 환경에 맞게 수정합니다.

## 8. 테스트와 품질 검사

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

## 9. Playwright RPA 준비

초기 세팅에서 Playwright Chromium이 설치됩니다.

```bash
npm run setup:playwright
```

브라우저가 누락되었다는 오류가 나오면 위 명령을 다시 실행합니다.

## 10. 자주 생기는 문제

### npm 명령이 인식되지 않는 경우

Node.js 24 LTS를 다시 설치하거나 터미널을 새로 열어 PATH를 갱신합니다.

```bash
node -v
npm -v
```

### Node 버전이 다를 경우

프로젝트 루트에서 아래 명령을 실행합니다.

```bash
nvm use
```

Windows의 `nvm-windows`를 사용하는 경우:

```powershell
nvm use 24.14.0
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
