# TODO_LIST - Prisma + PostgreSQL 회원가입 및 로그인 기능 구현

> 적용 요구사항: 운영용 DB 설계, 감사 로그 필요, soft delete 적용, 공통 컬럼 포함

---

## 1. 운영용 DB 설계

- [x] PostgreSQL 운영용 DB 스키마 설계
- [x] 개발 / 스테이징 / 운영 DB 환경 분리
- [x] Prisma datasource 설정
- [x] DATABASE_URL 환경변수 구성
- [x] 운영 DB 접근 권한 최소화
- [x] DB 마이그레이션 전략 수립
  - [x] 개발 환경: `prisma migrate dev`
  - [x] 운영 환경: `prisma migrate deploy`
- [x] 주요 테이블 인덱스 설계
  - [x] `email` unique index
  - [x] `deletedAt` 조회용 index
  - [x] `createdAt` 정렬용 index
- [x] 운영 환경 백업 정책 수립
- [x] DB 장애 복구 시나리오 정리

> 운영 DB 절차와 인덱스 정책은 `apps/backend/prisma/OPERATIONS.md`에 정리한다.
> `email` unique index와 `deletedAt` 조회용 index는 `User` 모델 및 soft delete 컬럼 추가 시점에 함께 적용한다.

---

## 2. 공통 컬럼 설계

- [x] 모든 주요 테이블에 공통 컬럼 포함, 단 기존 테이블에 칼럼을 추가 할 경우 nullable 적용
  - [x] `id`
  - [x] `createdAt`
  - [x] `updatedAt`
  - [x] `deletedAt`
  - [x] `createdBy`
  - [x] `updatedBy`
  - [x] `deletedBy`
- [x] Prisma schema에 공통 컬럼 반영
- [x] `createdAt` 기본값 설정
- [x] `updatedAt` 자동 갱신 설정
- [x] `deletedAt` nullable 처리
- [x] soft delete 대상 테이블 기준 정의

> 공통 컬럼과 soft delete 적용 기준은 `apps/backend/prisma/OPERATIONS.md`에 정리한다.
> 새 `User`, `AuditLog` 등 이후 모델은 생성 시점부터 공통 컬럼 기준을 따른다.

### 공통 컬럼 예시

```prisma
id        String    @id @default(uuid())
createdAt DateTime  @default(now())
updatedAt DateTime  @updatedAt
deletedAt DateTime?
createdBy String?
updatedBy String?
deletedBy String?
```

---

## 3. 사용자 테이블 설계

- [x] `User` 모델 설계
- [x] 이메일 로그인 기준 확정
- [x] `email` unique 제약조건 추가
- [x] `passwordHash` 컬럼 추가
- [x] 이름 / 닉네임 / 프로필 정보 컬럼 검토
- [x] 사용자 상태값 설계
  - [x] `ACTIVE`
  - [x] `INACTIVE`
  - [x] `SUSPENDED`
  - [x] `DELETED`
- [x] 이메일 인증 여부 컬럼 추가
- [x] 마지막 로그인 시간 컬럼 추가
- [x] 로그인 실패 횟수 컬럼 추가
- [x] 계정 잠금 관련 컬럼 추가 여부 검토

> 로그인 식별자는 `users.email`로 고정하고 unique index를 둔다.
> 프로필 정보는 `name`, `nickname`, `profileImageUrl` nullable 컬럼으로 시작한다.
> 계정 잠금은 `lockedUntil` nullable 컬럼으로 설계하고, 실제 잠금 정책은 로그인 기능 구현 시 확정한다.

### User 모델 예시

```prisma
model User {
  id               String     @id @default(uuid())
  email            String
  passwordHash     String
  name             String?
  status           UserStatus @default(ACTIVE)
  emailVerifiedAt  DateTime?
  lastLoginAt      DateTime?
  failedLoginCount Int        @default(0)

  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt
  deletedAt        DateTime?
  createdBy        String?
  updatedBy        String?
  deletedBy        String?

  @@unique([email])
  @@index([deletedAt])
  @@index([createdAt])
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  DELETED
}
```

---

## 4. Soft Delete 적용

- [x] 실제 DELETE 대신 `deletedAt` 업데이트 방식 사용
- [x] 회원 탈퇴 시 `User` 레코드 물리 삭제 금지
- [x] `deletedAt`, `deletedBy` 값 저장
- [x] 탈퇴 회원 로그인 차단 처리
- [x] 기본 조회 조건에 `deletedAt: null` 적용
- [x] 이메일 재가입 정책 결정
  - [x] 기존 이메일 재사용 허용 여부
  - [x] 탈퇴 계정 복구 가능 여부
- [x] soft delete된 데이터의 개인정보 마스킹 여부 검토
- [x] Prisma query helper 또는 repository layer에서 soft delete 필터 공통화

> soft delete 기준은 `apps/backend/src/database/softDelete.ts`와 `apps/backend/prisma/OPERATIONS.md`에 둔다.
> `users.email`은 전역 unique이므로 탈퇴 계정의 이메일 재가입은 기본 차단한다.
> 탈퇴 계정 복구는 `deletedAt`, `deletedBy`를 비우고 `status`를 복구하는 별도 플로우에서만 허용한다.
> 개인정보 마스킹은 회원 탈퇴 API 구현 시 실제 보존/파기 정책과 함께 적용한다.

---

## 5. 감사 로그 설계

- [x] `AuditLog` 모델 설계
- [x] 회원가입 이벤트 기록
- [x] 로그인 성공 이벤트 기록
- [x] 로그인 실패 이벤트 기록
- [x] 로그아웃 이벤트 기록
- [x] 비밀번호 변경 이벤트 기록
- [x] 회원 탈퇴 이벤트 기록
- [x] 계정 잠금 / 해제 이벤트 기록
- [x] 요청 IP 저장
- [x] User-Agent 저장
- [x] `actorId` 저장
- [x] `targetId` 저장
- [x] `action` 저장
- [x] 변경 전 / 변경 후 데이터 저장 여부 검토
- [x] 민감정보는 감사 로그에 저장하지 않도록 처리

> 감사 로그 이벤트 종류는 `AuditAction` enum으로 고정한다.
> 실제 이벤트 저장은 `apps/backend/src/database/auditLog.ts`의 helper를 회원가입/로그인/로그아웃/탈퇴 API에서 호출한다.
> 변경 전/후 전체 payload는 저장하지 않고, 민감정보를 제외한 요약 metadata만 저장한다.

### AuditLog 모델 예시

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  actorId   String?
  targetId  String?
  action    String
  entity    String
  entityId  String?
  ipAddress String?
  userAgent String?
  metadata  Json?

  createdAt DateTime @default(now())

  @@index([actorId])
  @@index([targetId])
  @@index([action])
  @@index([createdAt])
}
```

---

## 6. 회원가입 기능 구현

- [x] 회원가입 API 엔드포인트 생성
- [x] 입력값 검증
  - [x] email 형식 검증
  - [x] password 길이 검증, 8자 이상
  - [x] password 복잡도 검증
  - [x] name 길이 검증, utf-8기준 02자~30자
- [x] 이메일 중복 확인
- [x] `deletedAt`이 있는 기존 계정 처리 정책 반영
- [x] 비밀번호 해싱 처리
  - [ ] bcrypt 또는 argon2 사용
- [x] User 생성
- [x] `createdBy` 처리
- [x] 회원가입 성공 AuditLog 저장
- [x] 회원가입 실패 AuditLog 저장 여부 검토
- [x] 이메일 인증 기능 필요 여부 검토
- [x] 회원가입 응답에서 `passwordHash` 제외

> 회원가입 엔드포인트는 `POST /api/auth/signup`이다.
> 비밀번호는 추가 의존성 없이 Node.js 내장 `crypto.scrypt`로 salt hash 처리한다. bcrypt/argon2 전환은 의존성 추가 승인 후 진행한다.
> `users.email` 전역 unique 정책 때문에 soft delete된 기존 계정도 재가입을 차단한다.
> 회원가입 실패 AuditLog는 실패 사유에 개인정보가 섞일 수 있어 rate limit/abuse 정책과 함께 확정한다.
> 이메일 인증은 현재 필수 가입 플로우에서 제외하고 `emailVerifiedAt: null` 상태로 시작한다.

---

## 7. 로그인 기능 구현

- [x] 로그인 API 엔드포인트 생성
- [x] email / password 입력값 검증
- [x] User 조회 시 `deletedAt: null` 조건 적용
- [x] 계정 상태 확인
  - [x] `ACTIVE` 상태만 로그인 허용
  - [x] `SUSPENDED` / `DELETED` / `INACTIVE` 로그인 차단
- [x] `passwordHash` 비교
- [x] 로그인 실패 시 `failedLoginCount` 증가
- [x] 로그인 실패 AuditLog 저장
- [x] 로그인 성공 시 `failedLoginCount` 초기화
- [x] `lastLoginAt` 업데이트
- [x] 로그인 성공 AuditLog 저장
- [x] Access Token 발급
- [x] Refresh Token 발급 여부 결정
- [x] 토큰 만료 시간 설정
- [x] 로그인 응답에서 민감정보 제외

> 로그인 엔드포인트는 `POST /api/auth/login`이다.
> Access Token은 `JWT_SECRET` 기반 HS256 토큰으로 발급하며 기본 만료 시간은 `ACCESS_TOKEN_EXPIRES_IN_SECONDS=3600`이다.
> Refresh Token은 8번 세션/토큰 관리에서 DB 저장 방식으로 구현한다. 로그인 응답은 원문 refresh token을 1회 반환하고 DB에는 해시만 저장한다.
> 로그인 실패 메시지는 인증 정보 노출을 줄이기 위해 일반화한다.

---

## 8. 세션 / 토큰 관리

- [x] JWT 기반 인증 방식 검토
- [x] Refresh Token 저장 방식 결정
  - [x] DB 저장
  - [x] Redis 저장
  - [x] HttpOnly Cookie 저장
- [x] `RefreshToken` 모델 필요 여부 검토
- [x] 로그아웃 시 Refresh Token 무효화
- [x] 다중 기기 로그인 허용 여부 결정
- [x] 토큰 탈취 대응 정책 수립
- [x] Access Token 만료 시간 설정
- [x] Refresh Token 만료 시간 설정

> Access Token은 `JWT_SECRET` 기반 HS256 JWT로 유지하며, 기본 만료 시간은 `ACCESS_TOKEN_EXPIRES_IN_SECONDS=3600`이다.
> Refresh Token은 Redis나 HttpOnly Cookie가 아니라 `refresh_tokens` 테이블에 SHA-256 해시로 저장한다.
> 로그인 응답 본문으로 원문 refresh token을 1회 전달하고, DB에는 원문을 저장하지 않는다.
> Refresh Token 기본 만료 시간은 `REFRESH_TOKEN_EXPIRES_IN_SECONDS=2592000`(30일)이다.
> `/api/auth/refresh`는 refresh token을 회전한다. 사용된 token은 `revokedAt`을 기록하고 새 refresh token을 발급한다.
> `/api/auth/logout`은 전달된 refresh token을 무효화하고 `LOGGED_OUT` 감사 로그를 남긴다.
> 다중 기기 로그인은 허용하며, 로그인마다 별도 refresh token 레코드를 만든다.
> 탈취 대응은 해시 저장, 만료 시간, refresh token rotation, revoked/expired/deleted token 재사용 차단을 기준으로 한다.

---

## 9. 보안 처리

- [x] 비밀번호 평문 저장 금지
- [x] `passwordHash` 응답 제외
- [x] 로그인 실패 메시지 일반화
  - [x] “이메일 또는 비밀번호가 올바르지 않습니다”
- [x] brute force 방지 정책 적용
- [x] 로그인 실패 횟수 제한
- [x] 계정 잠금 정책 검토
- [x] rate limit 적용
- [x] HTTPS 환경 전제
- [x] CORS 설정
- [x] CSRF 대응 필요 여부 검토
- [x] SQL Injection 방지
- [x] Prisma raw query 사용 시 주의
- [x] 환경변수로 `JWT_SECRET` 관리

> 비밀번호는 `crypto.scrypt` 기반 salt hash로 저장하고 평문은 저장하지 않는다.
> 로그인 응답과 회원가입 응답은 `toPublicUser`를 통해 `passwordHash`를 제외한다.
> 인증 실패 메시지는 기본적으로 `이메일 또는 비밀번호가 올바르지 않습니다.`로 일반화한다.
> 로그인 실패 제한은 `LOGIN_MAX_FAILED_ATTEMPTS=5`, 잠금 시간은 `LOGIN_LOCK_MINUTES=15`를 기본값으로 사용한다.
> 잠금 기준 도달 시 `users.locked_until`을 설정하고 `ACCOUNT_LOCKED` 감사 로그를 남긴다.
> 인증 API rate limit은 in-memory 방식으로 적용하며 `AUTH_RATE_LIMIT_WINDOW_SECONDS=60`, `AUTH_RATE_LIMIT_MAX_REQUESTS=30`을 기본값으로 사용한다.
> 운영 환경은 HTTPS를 전제로 하며, reverse proxy의 `x-forwarded-proto: https` 또는 `req.secure`를 요구한다. 예외는 비공개 환경에서 `REQUIRE_HTTPS=false`로만 허용한다.
> CORS는 `CLIENT_URL` allowlist 기반으로만 허용하고 wildcard origin은 사용하지 않는다.
> 현재 refresh token은 Cookie가 아니라 응답 body/localStorage 흐름이므로 CSRF 토큰은 필수 적용하지 않는다. HttpOnly Cookie로 전환할 경우 SameSite/CSRF 토큰을 함께 적용한다.
> DB 접근은 Prisma query builder를 기준으로 하고, raw query는 사용자 입력 문자열 보간 없이 parameter binding으로만 허용한다.
> `JWT_SECRET`은 환경변수로만 관리하며 `.env.example`에는 생성 명령과 placeholder만 둔다.

---

## 10. Prisma 설정 및 마이그레이션

- [ ] Prisma schema 작성
- [ ] User 모델 추가
- [ ] AuditLog 모델 추가
- [x] RefreshToken 모델 필요 시 추가
- [ ] Prisma migration 생성
- [ ] 로컬 DB 마이그레이션 테스트
- [ ] 스테이징 DB 마이그레이션 테스트
- [ ] 운영 DB 마이그레이션 적용 절차 문서화
- [ ] Prisma Client generate 확인
- [ ] Seed 데이터 필요 여부 검토

---

## 11. 테스트

- [ ] 회원가입 성공 테스트
- [ ] 이메일 중복 회원가입 실패 테스트
- [ ] 잘못된 이메일 형식 테스트
- [ ] 약한 비밀번호 테스트
- [ ] 로그인 성공 테스트
- [ ] 비밀번호 불일치 로그인 실패 테스트
- [ ] 존재하지 않는 이메일 로그인 실패 테스트
- [ ] soft delete된 사용자 로그인 차단 테스트
- [ ] SUSPENDED 사용자 로그인 차단 테스트
- [ ] AuditLog 생성 여부 테스트
- [ ] passwordHash 응답 제외 테스트
- [ ] `deletedAt: null` 필터 적용 테스트
- [ ] rate limit 테스트

---

## 12. 운영 체크리스트

- [ ] 운영 DB 연결 확인
- [ ] 운영 환경변수 설정
- [ ] `JWT_SECRET` 설정
- [ ] DB 마이그레이션 적용
- [ ] 로그 수집 시스템 연동
- [ ] AuditLog 저장 확인
- [ ] 에러 모니터링 연동
- [ ] 회원가입 / 로그인 API health check
- [ ] 백업 정책 확인
- [ ] 개인정보 보관 및 파기 정책 검토
- [ ] 탈퇴 회원 데이터 처리 정책 검토
