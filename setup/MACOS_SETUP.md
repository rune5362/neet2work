# macOS 초기 세팅

이 문서는 macOS에서 아무것도 설치되어 있지 않은 상태를 기준으로 개발 환경을 준비하는 순서입니다.

주의: 이 문서는 `setup/` 폴더 안에 있지만, 모든 명령은 프로젝트 루트에서 실행합니다. 프로젝트 루트는 `package.json`, `apps/`, `scripts/` 폴더가 있는 위치입니다.

## 1. Xcode Command Line Tools 설치

```bash
xcode-select --install
```

## 2. Homebrew 설치

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

설치 후 안내되는 `eval` 명령을 터미널에 입력합니다.

확인:

```bash
brew --version
```

## 3. Git 설치

```bash
brew install git
git --version
```

## 4. nvm 설치

```bash
brew install nvm
mkdir -p ~/.nvm
```

zsh 기본 사용자의 경우:

```bash
cat <<'EOF' >> ~/.zshrc
export NVM_DIR="$HOME/.nvm"
[ -s "$(brew --prefix nvm)/nvm.sh" ] && \. "$(brew --prefix nvm)/nvm.sh"
[ -s "$(brew --prefix nvm)/etc/bash_completion.d/nvm" ] && \. "$(brew --prefix nvm)/etc/bash_completion.d/nvm"
EOF
source ~/.zshrc
```

bash 사용자의 경우:

```bash
cat <<'EOF' >> ~/.bashrc
export NVM_DIR="$HOME/.nvm"
[ -s "$(brew --prefix nvm)/nvm.sh" ] && \. "$(brew --prefix nvm)/nvm.sh"
[ -s "$(brew --prefix nvm)/etc/bash_completion.d/nvm" ] && \. "$(brew --prefix nvm)/etc/bash_completion.d/nvm"
EOF
source ~/.bashrc
```

확인:

```bash
nvm --version
```

## 5. Node.js 24.14.0 LTS 설치

프로젝트 루트에서 실행합니다.

```bash
nvm install
nvm use
node -v
corepack pnpm --version
```

`.nvmrc`에 `24.14.0`이 들어 있으므로 `nvm install`은 같은 Node 버전을 설치합니다.

## 6. 프로젝트 받기

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

## 7. 프로젝트 초기 세팅

```bash
bash scripts/setup-unix.sh
```

또는 직접 실행합니다.

```bash
corepack pnpm install
corepack pnpm run setup:env
corepack pnpm run db:generate
corepack pnpm run setup:playwright
```

## 8. 개인 개발 DB 연결

DB 서버는 팀원별로 따로 사용합니다. Supabase, AWS RDS, 로컬 PostgreSQL, Docker PostgreSQL 중 본인이 쓸 DB의 PostgreSQL 연결 문자열을 루트 `.env`의 `DATABASE_URL`에 넣습니다.

DB를 연결한 뒤 공통 스키마와 샘플 데이터를 적용합니다.

```bash
corepack pnpm run db:migrate
corepack pnpm run db:seed
corepack pnpm run db:studio
```

DB를 아직 연결하지 않아도 Mock fallback 구조 덕분에 기본 프론트엔드와 백엔드 개발은 가능합니다.

## 9. 선택: Docker Desktop 설치

개인 개발 DB를 Docker PostgreSQL로 띄우고 싶은 경우에만 Docker Desktop을 설치합니다.

```bash
brew install --cask docker
open -a Docker
```

확인:

```bash
docker --version
docker compose version
```

Docker Desktop이 준비된 경우에만 아래 명령으로 로컬 컨테이너 DB까지 실행합니다.

```bash
corepack pnpm run docker:up
```

## 10. 실행

```bash
corepack pnpm run dev
corepack pnpm run test
corepack pnpm run check
```
