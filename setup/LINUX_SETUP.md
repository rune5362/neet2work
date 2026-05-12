# Linux 초기 세팅

이 문서는 Ubuntu/Debian 계열 Linux를 기준으로 합니다. Fedora, Arch 등은 패키지 매니저 명령만 각 배포판에 맞게 바꾸면 됩니다.

주의: 이 문서는 `setup/` 폴더 안에 있지만, 모든 명령은 프로젝트 루트에서 실행합니다. 프로젝트 루트는 `package.json`, `apps/`, `scripts/` 폴더가 있는 위치입니다.

## 1. 기본 도구 설치

```bash
sudo apt update
sudo apt install -y curl git build-essential ca-certificates
```

확인:

```bash
git --version
curl --version
```

## 2. nvm 설치

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
```

설치 후 터미널을 새로 열거나 아래 명령을 실행합니다.

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

확인:

```bash
nvm --version
```

## 3. Node.js 24.14.0 LTS 설치

프로젝트 루트에서 실행합니다.

```bash
nvm install
nvm use
node -v
npm -v
```

`.nvmrc`에 `24.14.0`이 들어 있으므로 `nvm install`은 같은 Node 버전을 설치합니다.

## 4. Docker 설치

Docker Desktop 또는 Docker Engine 중 하나를 설치합니다.

확인:

```bash
docker --version
docker compose version
```

현재 사용자를 docker 그룹에 추가해야 할 수 있습니다.

```bash
sudo usermod -aG docker $USER
```

이 명령을 실행했다면 로그아웃 후 다시 로그인합니다.

## 5. 프로젝트 받기

원하는 작업 폴더에서 아래 명령을 실행합니다.

```bash
git clone <repository-url>
cd ./Neet2Work
```

이미 프로젝트 폴더가 있다면 터미널에서 그 폴더를 열고 아래 명령으로 프로젝트 루트인지 확인합니다.

```bash
ls package.json
```

이후 문서의 모든 명령은 프로젝트 루트 기준 상대경로로 실행합니다.

## 6. 프로젝트 초기 세팅

```bash
bash scripts/setup-unix.sh
```

또는 직접 실행합니다.

```bash
npm install
npm run setup:env
npm run setup:playwright
```

## 7. 실행

```bash
npm run dev
npm run docker:up
npm test
npm run check
```
