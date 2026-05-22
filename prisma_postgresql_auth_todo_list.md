# TODO_LIST - Prisma + PostgreSQL 회원가입 및 로그인 기능 구현

> 적용 요구사항: 운영용 DB 설계, 감사 로그 필요, soft delete 적용, 공통 컬럼 포함

---

## 1. 운영용 DB 설계

- [ ] PostgreSQL 운영용 DB 스키마 설계
- [ ] 개발 / 스테이징 / 운영 DB 환경 분리
- [ ] Prisma datasource 설정
- [ ] DATABASE_URL 환경변수 구성
- [ ] 운영 DB 접근 권한 최소화
- [ ] DB 마이그레이션 전략 수립
  - [ ] 개발 환경: `prisma migrate dev`
  - [ ] 운영 환경: `prisma migrate deploy`
- [ ] 주요 테이블 인덱스 설계
  - [ ] `email` unique index
  - [ ] `deletedAt` 조회용 index
  - [ ] `createdAt` 정렬용 index
- [ ] 운영 환경 백업 정책 수립
- [ ] DB 장애 복구 시나리오 정리

---

## 2. 공통 컬럼 설계

- [ ] 모든 주요 테이블에 공통 컬럼 포함
  - [ ] `id`
  - [ ] `createdAt`
  - [ ] `updatedAt`
  - [ ] `deletedAt`
  - [ ] `createdBy`
  - [ ] `updatedBy`
  - [ ] `deletedBy`
- [ ] Prisma schema에 공통 컬럼 반영
- [ ] `createdAt` 기본값 설정
- [ ] `updatedAt` 자동 갱신 설정
- [ ] `deletedAt` nullable 처리
- [ ] soft delete 대상 테이블 기준 정의

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

- [ ] `User` 모델 설계
- [ ] 이메일 로그인 기준 확정
- [ ] `email` unique 제약조건 추가
- [ ] `passwordHash` 컬럼 추가
- [ ] 이름 / 닉네임 / 프로필 정보 컬럼 검토
- [ ] 사용자 상태값 설계
  - [ ] `ACTIVE`
  - [ ] `INACTIVE`
  - [ ] `SUSPENDED`
  - [ ] `DELETED`
- [ ] 이메일 인증 여부 컬럼 추가
- [ ] 마지막 로그인 시간 컬럼 추가
- [ ] 로그인 실패 횟수 컬럼 추가
- [ ] 계정 잠금 관련 컬럼 추가 여부 검토

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

- [ ] 실제 DELETE 대신 `deletedAt` 업데이트 방식 사용
- [ ] 회원 탈퇴 시 `User` 레코드 물리 삭제 금지
- [ ] `deletedAt`, `deletedBy` 값 저장
- [ ] 탈퇴 회원 로그인 차단 처리
- [ ] 기본 조회 조건에 `deletedAt: null` 적용
- [ ] 이메일 재가입 정책 결정
  - [ ] 기존 이메일 재사용 허용 여부
  - [ ] 탈퇴 계정 복구 가능 여부
- [ ] soft delete된 데이터의 개인정보 마스킹 여부 검토
- [ ] Prisma query helper 또는 repository layer에서 soft delete 필터 공통화

---

## 5. 감사 로그 설계

- [ ] `AuditLog` 모델 설계
- [ ] 회원가입 이벤트 기록
- [ ] 로그인 성공 이벤트 기록
- [ ] 로그인 실패 이벤트 기록
- [ ] 로그아웃 이벤트 기록
- [ ] 비밀번호 변경 이벤트 기록
- [ ] 회원 탈퇴 이벤트 기록
- [ ] 계정 잠금 / 해제 이벤트 기록
- [ ] 요청 IP 저장
- [ ] User-Agent 저장
- [ ] `actorId` 저장
- [ ] `targetId` 저장
- [ ] `action` 저장
- [ ] 변경 전 / 변경 후 데이터 저장 여부 검토
- [ ] 민감정보는 감사 로그에 저장하지 않도록 처리

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

- [ ] 회원가입 API 엔드포인트 생성
- [ ] 입력값 검증
  - [ ] email 형식 검증
  - [ ] password 길이 검증
  - [ ] password 복잡도 검증
  - [ ] name 길이 검증
- [ ] 이메일 중복 확인
- [ ] `deletedAt`이 있는 기존 계정 처리 정책 반영
- [ ] 비밀번호 해싱 처리
  - [ ] bcrypt 또는 argon2 사용
- [ ] User 생성
- [ ] `createdBy` 처리
- [ ] 회원가입 성공 AuditLog 저장
- [ ] 회원가입 실패 AuditLog 저장 여부 검토
- [ ] 이메일 인증 기능 필요 여부 검토
- [ ] 회원가입 응답에서 `passwordHash` 제외

---

## 7. 로그인 기능 구현

- [ ] 로그인 API 엔드포인트 생성
- [ ] email / password 입력값 검증
- [ ] User 조회 시 `deletedAt: null` 조건 적용
- [ ] 계정 상태 확인
  - [ ] `ACTIVE` 상태만 로그인 허용
  - [ ] `SUSPENDED` / `DELETED` / `INACTIVE` 로그인 차단
- [ ] `passwordHash` 비교
- [ ] 로그인 실패 시 `failedLoginCount` 증가
- [ ] 로그인 실패 AuditLog 저장
- [ ] 로그인 성공 시 `failedLoginCount` 초기화
- [ ] `lastLoginAt` 업데이트
- [ ] 로그인 성공 AuditLog 저장
- [ ] Access Token 발급
- [ ] Refresh Token 발급 여부 결정
- [ ] 토큰 만료 시간 설정
- [ ] 로그인 응답에서 민감정보 제외

---

## 8. 세션 / 토큰 관리

- [ ] JWT 기반 인증 방식 검토
- [ ] Refresh Token 저장 방식 결정
  - [ ] DB 저장
  - [ ] Redis 저장
  - [ ] HttpOnly Cookie 저장
- [ ] `RefreshToken` 모델 필요 여부 검토
- [ ] 로그아웃 시 Refresh Token 무효화
- [ ] 다중 기기 로그인 허용 여부 결정
- [ ] 토큰 탈취 대응 정책 수립
- [ ] Access Token 만료 시간 설정
- [ ] Refresh Token 만료 시간 설정

---

## 9. 보안 처리

- [ ] 비밀번호 평문 저장 금지
- [ ] `passwordHash` 응답 제외
- [ ] 로그인 실패 메시지 일반화
  - [ ] “이메일 또는 비밀번호가 올바르지 않습니다”
- [ ] brute force 방지 정책 적용
- [ ] 로그인 실패 횟수 제한
- [ ] 계정 잠금 정책 검토
- [ ] rate limit 적용
- [ ] HTTPS 환경 전제
- [ ] CORS 설정
- [ ] CSRF 대응 필요 여부 검토
- [ ] SQL Injection 방지
- [ ] Prisma raw query 사용 시 주의
- [ ] 환경변수로 `JWT_SECRET` 관리

---

## 10. Prisma 설정 및 마이그레이션

- [ ] Prisma schema 작성
- [ ] User 모델 추가
- [ ] AuditLog 모델 추가
- [ ] RefreshToken 모델 필요 시 추가
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
