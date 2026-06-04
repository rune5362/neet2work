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
corepack pnpm --version
```

`.nvmrc`에 `24.14.0`이 들어 있으므로 `nvm install`은 같은 Node 버전을 설치합니다.

## 4. 프로젝트 받기

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

## 5. 프로젝트 초기 세팅

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

## 6. 개인 개발 DB 연결

DB 서버는 팀원별로 따로 사용합니다. Supabase, AWS RDS, 로컬 PostgreSQL, Docker PostgreSQL 중 본인이 쓸 DB의 PostgreSQL 연결 문자열을 루트 `.env`의 `DATABASE_URL`에 넣습니다.

개인 DB는 PostgreSQL 17 호환이어야 합니다. migration 실행 계정에는 `pg_trgm` extension 생성 또는 사용 권한, `public` schema 객체 생성 권한, `job_postings`와 `resume_analyses` RLS 활성화 권한이 필요합니다.

DB를 연결한 뒤 공통 스키마와 샘플 데이터를 적용합니다.

```bash
corepack pnpm run db:deploy
corepack pnpm run db:seed
corepack pnpm run db:studio
```

DB를 아직 연결하지 않아도 Mock fallback 구조 덕분에 기본 프론트엔드와 백엔드 개발은 가능합니다.

## 7. 선택: Docker 설치

개인 개발 DB를 Docker PostgreSQL로 띄우고 싶은 경우에만 Docker Desktop 또는 Docker Engine을 설치합니다.

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

Docker가 준비된 경우에만 아래 명령으로 로컬 컨테이너 DB까지 실행합니다.

```bash
corepack pnpm run docker:up
```

## 8. 실행

```bash
corepack pnpm run dev
corepack pnpm run test
corepack pnpm run check
```
