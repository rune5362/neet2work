# macOS 초기 세팅

이 문서는 macOS에서 아무것도 설치되어 있지 않은 상태를 기준으로 개발 환경을 준비하는 순서입니다.

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
npm -v
```

`.nvmrc`에 `24.14.0`이 들어 있으므로 `nvm install`은 같은 Node 버전을 설치합니다.

## 6. Docker Desktop 설치

```bash
brew install --cask docker
open -a Docker
```

확인:

```bash
docker --version
docker compose version
```

## 7. 프로젝트 받기

```bash
git clone <repository-url>
cd Neet2Work
```

이미 프로젝트 폴더가 있다면 해당 폴더로 이동합니다.

```bash
cd /path/to/Neet2Work
```

## 8. 프로젝트 초기 세팅

```bash
bash scripts/setup-unix.sh
```

또는 직접 실행합니다.

```bash
npm install
npm run setup:env
npm run setup:playwright
```

## 9. 실행

```bash
npm run dev
npm run docker:up
npm test
npm run check
```
