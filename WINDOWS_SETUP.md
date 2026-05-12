# Windows PowerShell 초기 세팅

이 문서는 Windows에서 아무것도 설치되어 있지 않은 상태를 기준으로 개발 환경을 준비하는 순서입니다.

Windows에서는 두 가지 경로를 지원합니다.

- 추천: `winget`으로 Node.js LTS 설치 후 프로젝트 세팅
- 선택: `nvm-windows` 설치 후 Node.js 24.14.0 사용

`nvm install 24`에서 오류가 나는 경우에는 추천 경로인 `winget` 기반 스크립트를 사용합니다.

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

## 4. 선택 사항: nvm-windows 설치

`nvm-windows`를 쓰고 싶다면 아래 명령으로 설치합니다.

```powershell
winget install --id CoreyButler.NVMforWindows --exact --accept-package-agreements --accept-source-agreements
```

설치 후 PowerShell을 새로 열고 확인합니다.

```powershell
nvm version
```

그 다음 아래 명령을 시도합니다.

```powershell
nvm install 24.14.0
nvm use 24.14.0
node -v
npm -v
```

여기서 오류가 나면 `nvm-windows` 경로를 계속 붙잡지 말고 7번의 자동 세팅 스크립트를 사용합니다.

## 5. 프로젝트 폴더로 이동

```powershell
cd C:\MLOps_20260406_AM\workspace\Neet2Work
```

다른 위치에 저장소를 받았다면 본인 프로젝트 경로로 이동합니다.

아직 저장소를 받지 않았다면:

```powershell
git clone <repository-url>
cd Neet2Work
```

## 6. 실행 정책을 현재 터미널에서만 허용

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

이 설정은 현재 PowerShell 창에서만 적용됩니다.

## 7. Windows 자동 세팅 스크립트 실행

```powershell
.\scripts\setup-windows.ps1
```

이 스크립트가 하는 일:

- Node.js 24.14.0 이상 확인
- Node.js가 없거나 24 미만이면 `winget`으로 Node.js LTS 설치
- npm 확인
- `npm install`
- `.env.example`을 기준으로 `.env` 생성
- Playwright Chromium 설치

## 8. 설치 후 PowerShell을 새로 열어야 하는 경우

Node.js를 처음 설치한 직후에는 PATH 반영 때문에 새 PowerShell 창이 필요할 수 있습니다.

아래 오류가 나오면 PowerShell을 닫고 다시 연 뒤 5번부터 다시 실행합니다.

```txt
Node.js 24 이상을 찾지 못했습니다.
npm 명령을 찾지 못했습니다.
```

## 9. Docker Desktop 설치

PostgreSQL 17까지 Docker로 실행하려면 Docker Desktop이 필요합니다.

```powershell
winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
```

설치 후 Docker Desktop을 실행하고 확인합니다.

```powershell
docker --version
docker compose version
```

## 10. 세팅 확인

```powershell
node -v
npm -v
npm test
```

Node는 `v24.14.0`이 나오면 가장 좋고, 최소 `v24.14.0` 이상 `v25` 미만이면 됩니다.

## 11. 개발 서버 실행

```powershell
npm run dev
```

접속 주소:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health Check: `http://localhost:3000/health`

## 12. PostgreSQL 17까지 함께 실행

Docker Desktop이 설치되어 있다면 아래 명령을 사용합니다.

```powershell
npm run docker:up
```

## 13. 전체 검사까지 한 번에 실행

세팅 후 테스트, 린트, 빌드까지 한 번에 확인하고 싶다면:

```powershell
.\scripts\setup-windows.ps1 -RunCheck
```

의존성 설치는 건너뛰고 검사만 하고 싶다면:

```powershell
.\scripts\setup-windows.ps1 -SkipInstall -RunCheck
```
