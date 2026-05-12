# 협업 가이드

## 기본 원칙

- Node.js는 24 LTS를 사용합니다.
- 패키지 매니저는 npm만 사용합니다.
- 의존성은 프로젝트 루트에서 설치합니다.
- `package-lock.json`은 팀원 간 동일 의존성 설치를 위해 커밋합니다.
- API 키, DB 비밀번호, 개인 설정은 `.env`에만 저장하고 커밋하지 않습니다.
- 기능을 추가할 때는 Mock fallback이 깨지지 않도록 유지합니다.

## 처음 참여할 때

아래 문서를 먼저 따라 합니다.

```txt
SETUP.md
```

빠른 세팅 명령:

```bash
npm run setup
```

## 작업 전 확인

```bash
node -v
npm -v
npm run check
```

## 브랜치와 커밋

- 기능 작업은 별도 브랜치에서 진행합니다.
- 커밋 전 `npm run check`를 실행합니다.
- 불필요한 `.env`, `node_modules`, 빌드 결과물은 커밋하지 않습니다.

## 테스트

프론트엔드와 백엔드는 Vitest를 사용합니다.

```bash
npm test
```

테스트 감시 모드:

```bash
npm run test:watch -w apps/frontend
npm run test:watch -w apps/backend
```

## 코드 스타일

포맷:

```bash
npm run format
```

린트:

```bash
npm run lint
```

## Docker 사용

PostgreSQL 17까지 포함한 전체 개발 환경은 Docker Compose로 실행합니다.

```bash
npm run docker:up
```

Docker를 쓰지 않는 경우에는 로컬 PostgreSQL 17을 설치하고 `.env`의 `DATABASE_URL`을 수정합니다.
