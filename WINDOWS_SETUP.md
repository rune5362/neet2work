# Windows PowerShell 초기 세팅

이 문서는 Windows에서 아무것도 설치되어 있지 않은 상태를 기준으로 개발 환경을 준비하는 순서입니다.

Windows에서는 팀원 간 환경 차이를 줄이기 위해 하나의 경로로 통일합니다.

- `winget`으로 `nvm-windows`를 설치합니다.
- `nvm-windows`로 Node.js 24.14.0을 설치하고 사용합니다.
- 프로젝트 세팅 스크립트를 실행합니다.

Windows에서는 Node.js 공식 설치 파일이나 `winget install OpenJS.NodeJS.LTS` 직접 설치 방식은 권장하지 않습니다. 모든 팀원이 같은 방식으로 `nvm-windows`를 사용합니다.

## 1. PowerShell 열기

일반 PowerShell 또는 Windows Terminal을 엽니다.

## 2. winget 확인

```powershell
winget --version
```

`winget`이 없다는 오류가 나면 Microsoft Store에서 `App Installer`를 설치한 뒤 PowerShell을 새로 엽니다.

## 3. Git 설치

Git이 없다면 설치합니다.

```powershell
winget install --id Git.Git --exact --accept-package-agreements --accept-source-agreements
```

PowerShell을 새로 열고 확인합니다.

```powershell
git --version
```

## 4. nvm-windows 설치

```powershell
winget install --id CoreyButler.NVMforWindows --exact --accept-package-agreements --accept-source-agreements
```

설치 후 PowerShell을 새로 열고 확인합니다.

```powershell
nvm version
```

## 5. Node.js 24.14.0 설치 및 사용

```powershell
nvm install 24.14.0
nvm use 24.14.0
node -v
npm -v
```

Node는 `v24.14.0`이 나와야 합니다.

## 6. 프로젝트 폴더 준비

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

## 7. 실행 정책을 현재 터미널에서만 허용

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

이 설정은 현재 PowerShell 창에서만 적용됩니다.

## 8. Windows 자동 세팅 스크립트 실행

```powershell
.\scripts\setup-windows.ps1
```

이 스크립트가 하는 일:

- Node.js 24.14.0 이상 확인
- `nvm-windows`가 없으면 `winget`으로 설치
- Node.js가 없거나 버전이 맞지 않으면 `nvm install 24.14.0`, `nvm use 24.14.0` 실행
- npm 확인
- `npm install`
- `.env.example`을 기준으로 `.env` 생성
- Playwright Chromium 설치

## 9. 설치 후 PowerShell을 새로 열어야 하는 경우

Node.js를 처음 설치한 직후에는 PATH 반영 때문에 새 PowerShell 창이 필요할 수 있습니다.

아래 오류가 나오면 PowerShell을 닫고 다시 연 뒤 6번부터 다시 실행합니다.

```txt
nvm-windows 설치 후 nvm 명령을 찾지 못했습니다.
Node.js 24.14.0 이상 25 미만을 찾지 못했습니다.
npm 명령을 찾지 못했습니다.
```

## 10. Docker Desktop 설치

PostgreSQL 17까지 Docker로 실행하려면 Docker Desktop이 필요합니다.

```powershell
winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
```

설치 후 Docker Desktop을 실행하고 확인합니다.

```powershell
docker --version
docker compose version
```

## 11. 세팅 확인

```powershell
node -v
npm -v
npm test
```

Node는 `v24.14.0`이 나와야 합니다.

## 12. 개발 서버 실행

```powershell
npm run dev
```

접속 주소:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health Check: `http://localhost:3000/health`

## 13. PostgreSQL 17까지 함께 실행

Docker Desktop이 설치되어 있다면 아래 명령을 사용합니다.

```powershell
npm run docker:up
```

## 14. 전체 검사까지 한 번에 실행

세팅 후 테스트, 린트, 빌드까지 한 번에 확인하고 싶다면:

```powershell
.\scripts\setup-windows.ps1 -RunCheck
```

의존성 설치는 건너뛰고 검사만 하고 싶다면:

```powershell
.\scripts\setup-windows.ps1 -SkipInstall -RunCheck
```
