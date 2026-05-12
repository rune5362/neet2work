# Windows PowerShell 초기 세팅

이 문서는 Windows에서 아무것도 설치되어 있지 않은 상태를 기준으로 개발 환경을 준비하는 순서입니다.

Windows 팀원은 환경 차이를 줄이기 위해 아래 방식으로 통일합니다.

- `winget`으로 `nvm-windows`를 설치합니다.
- `nvm-windows`로 Node.js 24.14.0을 설치하고 사용합니다.
- 프로젝트 세팅은 `scripts/setup-windows.ps1`이 자동으로 처리합니다.

Node.js 공식 설치 파일이나 `winget install OpenJS.NodeJS.LTS` 직접 설치 방식은 권장하지 않습니다.

## 1. 프로젝트 폴더 준비

아직 저장소를 받지 않았다면 원하는 작업 폴더에서 아래 명령을 실행합니다.

```powershell
git clone <repository-url>
cd .\Neet2Work
```

이미 저장소를 받은 상태라면 프로젝트 폴더를 기준으로 PowerShell을 엽니다.

가장 쉬운 방법:

- 파일 탐색기에서 프로젝트 폴더를 엽니다.
- 주소창에 `powershell`을 입력하고 Enter를 누릅니다.
- 아래 명령으로 현재 위치가 프로젝트 루트인지 확인합니다.

```powershell
Get-ChildItem package.json
```

이후 문서의 모든 명령은 프로젝트 루트 기준 상대경로로 실행합니다.

## 2. 자동 세팅 실행

프로젝트 루트에서 아래 명령만 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup-windows.ps1
```

이 스크립트가 자동으로 처리하는 일:

- `winget` 확인
- `nvm-windows`가 없으면 `winget`으로 설치
- Node.js가 없거나 버전이 맞지 않으면 `nvm install 24.14.0`, `nvm use 24.14.0` 실행
- npm 확인
- `npm install`
- `.env.example`을 기준으로 `.env` 생성
- Playwright Chromium 설치

## 3. 개발 서버 실행

```powershell
npm run dev
```

접속 주소:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health Check: `http://localhost:3000/health`

## 4. 세팅 확인

필요할 때 아래 명령으로 현재 상태를 확인합니다.

```powershell
node -v
npm -v
npm test
```

Node는 `v24.14.0`이 나와야 합니다.

전체 검사까지 한 번에 실행하고 싶다면:

```powershell
.\scripts\setup-windows.ps1 -RunCheck
```

의존성 설치는 건너뛰고 검사만 하고 싶다면:

```powershell
.\scripts\setup-windows.ps1 -SkipInstall -RunCheck
```

## 5. PostgreSQL 17까지 함께 실행

Docker Desktop이 설치되어 있다면 아래 명령을 사용합니다.

```powershell
npm run docker:up
```

Docker Desktop이 없다면 PostgreSQL 컨테이너는 실행할 수 없지만, Mock fallback 구조 덕분에 기본 프론트엔드와 백엔드 개발은 가능합니다.

## 6. Docker Desktop 설치

PostgreSQL 17까지 Docker로 실행하려면 Docker Desktop이 필요합니다.

```powershell
winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
```

설치 후 Docker Desktop을 실행하고 확인합니다.

```powershell
docker --version
docker compose version
```

## 7. 문제가 생겼을 때 확인할 명령

자동 스크립트가 실패했을 때만 아래 명령을 순서대로 확인합니다.

```powershell
winget --version
nvm version
nvm list
node -v
npm -v
where node
where npm
```

`winget`이 없다는 오류가 나면 Microsoft Store에서 `App Installer`를 설치한 뒤 PowerShell을 새로 엽니다.

`nvm` 명령을 찾지 못하면 아래 명령으로 `nvm-windows`를 설치한 뒤 PowerShell을 새로 엽니다.

```powershell
winget install --id CoreyButler.NVMforWindows --exact --accept-package-agreements --accept-source-agreements
```

Node 버전이 다르면 아래 명령을 실행합니다.

```powershell
nvm install 24.14.0
nvm use 24.14.0
```

아래 오류가 나오면 PowerShell을 닫고 다시 연 뒤 프로젝트 루트에서 자동 세팅을 다시 실행합니다.

```txt
nvm-windows 설치 후 nvm 명령을 찾지 못했습니다.
Node.js 24.14.0 이상 25 미만을 찾지 못했습니다.
npm 명령을 찾지 못했습니다.
```
