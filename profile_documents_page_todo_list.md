아래 TODO는 **`origin/daegyune/page/home` 브랜치의 현재 구조를 기준**으로 다시 정리한 작업용 목록입니다.

확인한 브랜치 상태 기준으로는 프로젝트가 `apps/*` 워크스페이스 구조이고, 루트 스크립트가 `@neet2work/backend`, `@neet2work/frontend`를 필터로 실행하는 구조입니다.  
백엔드는 Express 라우터를 `server.ts`에서 등록하는 방식이고, 현재 `/api/jobs`, `/api/analyze`, `/api/auth`만 등록되어 있습니다. 
프론트는 React Router가 아니라 `window.location.pathname` 조건문으로 페이지를 분기하고 있으며, `/ai-analysis`, `/ai-analysis/details`, `/documents` 경로가 이미 잡혀 있습니다. 

---

# 구현 전 중요 검수 사항

## 1. Prisma 모델 파일 분리 구조 확인

현재 프로젝트는 `apps/backend/prisma/schema.prisma`에 generator와 datasource만 두고, 실제 model/enum은 `apps/backend/prisma/models/*.prisma`에 분리하는 구조입니다.
따라서 새 Prisma model/enum도 `schema.prisma`에 직접 추가하지 않고 `apps/backend/prisma/models/*.prisma` 파일로 추가합니다.

기존 백엔드 코드가 참조하는 `JobPostingStatus`, `UserStatus`, `ResumeAnalysis`, `JobPosting`, `User` 등도 `prisma/models/*.prisma`에 존재하는지 먼저 확인합니다.

---

## 2. `/ai-analysis`, `/ai-analysis/details`는 건드리지 않음

현재 프론트에 `/ai-analysis`와 `/ai-analysis/details` 페이지가 이미 존재합니다. 
`AIAnalysisFront` 안에는 이미 `/ai-analysis/details`로 이동하는 CTA도 들어가 있습니다. 

하지만 이 페이지는 다른 팀원이 AI 모델 연동과 함께 작업 중이라고 했으므로, 이번 TODO에서는 **해당 페이지 입출력 연동을 하지 않습니다.**

---

## 3. 기존 `/documents` 페이지는 mock 목록 기반이라 교체 대상

현재 `Documents.tsx`는 `DOCUMENTS` 상수에 박힌 정적 데이터로 문서 목록을 보여주고 있습니다. 
따라서 실제 API 연동형 문서 보관함으로 바꾸는 작업이 필요합니다.

---

# 작업용 TODO LIST

## 기준 브랜치: `origin/daegyune/page/home`

---

# Phase 0. 브랜치 준비 및 기준 정리

* [x] 로컬에서 기준 브랜치를 최신화한다.

```bash
git fetch origin
git checkout -B feature/profile-document-version origin/daegyune/page/home
```

* [x] 루트에서 의존성 설치 및 기본 실행 확인.

```bash
corepack pnpm install
corepack pnpm dev
```

* [x] 현재 루트 스크립트가 backend/frontend를 workspace filter로 실행하는 구조임을 확인한다. 
* [x] 작업 범위를 아래로 확정한다.

```text
이번 작업 포함:
- 지원 프로필 관리
- 지원 프로필 버전 관리
- 이력서/자기소개서 문서 관리
- 문서 버전 관리
- /documents 페이지 API 연동형으로 전환

이번 작업 제외:
- /ai-analysis 구현
- /ai-analysis/details 구현
- AI 모델 호출
- AI 분석 결과 저장
- AI 분석 페이지와 실제 입출력 연동
```

---

# Phase 1. Prisma schema/model 추가

## 1-1. 기존 Prisma 구조 확인

* [x] `apps/backend/prisma/schema.prisma`를 확인한다.
* [x] 이 브랜치는 `schema.prisma`에 generator/datasource만 두고, 실제 model/enum은 `apps/backend/prisma/models/*.prisma`에 분리하는 구조임을 확인한다.
* [x] 기존 백엔드 코드가 참조하는 generated enum/model이 `prisma/models/*.prisma`에 존재하는지 확인한다.

확인해야 할 참조 예시:

```text
JobPostingStatus
UserStatus
ResumeAnalysis
JobPosting
User
```

---

## 1-2. 새 enum 파일 추가

아래 enum은 `apps/backend/prisma/models/*.prisma`에 각각 파일로 추가한다.

* [x] `ProfileVersionSource` 추가.

```prisma
enum ProfileVersionSource {
  user
  ai
  system
}
```

* [x] `ProfileVersionStatus` 추가.

```prisma
enum ProfileVersionStatus {
  draft
  active
  archived
}
```

* [x] `ApplicationDocumentType` 추가.

```prisma
enum ApplicationDocumentType {
  resume
  cover_letter
}
```

* [x] `ApplicationDocumentSource` 추가.

```prisma
enum ApplicationDocumentSource {
  user
  ai
  system
}
```

* [x] `ApplicationDocumentStatus` 추가.

```prisma
enum ApplicationDocumentStatus {
  draft
  active
  archived
}
```

---

## 1-3. `CandidateProfile` 모델 추가

* [x] `apps/backend/prisma/models/candidateProfile.prisma`에 추가한다.
* [x] `candidateKey`는 `@unique`로 만들지 않는다.
* [x] `profileJson`, `profileText`는 넣지 않는다.
* [x] `currentVersionId`는 current 포인터로만 사용한다. 초기 구현에서는 순환 relation 복잡도를 피하기 위해 Prisma relation을 걸지 않고 서비스에서 같은 profile의 version인지 검증한다.

```prisma
model CandidateProfile {
  id               String   @id @default(cuid())
  candidateKey     String   @map("candidate_key")

  title            String
  targetRole       String?  @map("target_role")
  targetCompany    String?  @map("target_company")
  targetJobId      String?  @map("target_job_id")

  name             String?
  email            String?
  desiredRoles     String[] @default([]) @map("desired_roles")
  skills           String[] @default([])

  currentVersionId String?  @map("current_version_id")

  isDefault        Boolean  @default(false) @map("is_default")
  isArchived       Boolean  @default(false) @map("is_archived")

  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  versions         CandidateProfileVersion[]

  @@index([candidateKey])
  @@index([candidateKey, isArchived])
  @@map("candidate_profiles")
}
```

---

## 1-4. `CandidateProfileVersion` 모델 추가

* [x] 실제 프로필 본문 저장용 모델을 추가한다.
* [x] `profileJson`, `profileText`는 여기에 저장한다.
* [x] `apps/backend/prisma/models/candidateProfileVersion.prisma`에 추가한다.
* [x] `profileId`는 `CandidateProfile`에 FK relation을 둔다.
* [x] `parentVersionId`는 초기 구현에서는 nullable string으로 두고 서비스에서 같은 profile의 version인지 검증한다.

```prisma
model CandidateProfileVersion {
  id              String   @id @default(cuid())

  profileId       String   @map("profile_id")
  candidateKey    String   @map("candidate_key")

  versionNo       Int      @map("version_no")
  title           String?
  memo            String?

  profileText     String   @map("profile_text")
  profileJson     Json     @map("profile_json")
  schemaVersion   Int      @default(1) @map("schema_version")

  source          ProfileVersionSource @default(user)
  status          ProfileVersionStatus @default(active)

  parentVersionId String?  @map("parent_version_id")
  changeSummary   String?  @map("change_summary")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  profile         CandidateProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([profileId, versionNo])
  @@index([candidateKey])
  @@index([profileId, status])
  @@map("candidate_profile_versions")
}
```

---

## 1-5. `ApplicationDocument` 모델 추가

* [x] `apps/backend/prisma/models/applicationDocument.prisma`에 추가한다.
* [x] `profileId`, `profileVersionId`, `jobId`, `currentVersionId`는 초기 구현에서는 nullable string으로 둔다.
* [x] 연결 대상 존재 여부와 candidate 범위 검증은 service에서 수행한다.
* [x] `jobId`는 기존 `JobPosting`과 연결 가능하지만, mock-first fallback과 기존 샘플 데이터 흐름을 위해 초기 구현에서는 강제 FK를 두지 않는다.

```prisma
model ApplicationDocument {
  id               String   @id @default(cuid())

  candidateKey     String   @map("candidate_key")

  title            String
  documentType     ApplicationDocumentType @map("document_type")

  profileId        String?  @map("profile_id")
  profileVersionId String?  @map("profile_version_id")
  jobId            String?  @map("job_id")

  currentVersionId String?  @map("current_version_id")

  isArchived       Boolean  @default(false) @map("is_archived")

  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  versions         ApplicationDocumentVersion[]

  @@index([candidateKey])
  @@index([profileId])
  @@index([profileVersionId])
  @@index([jobId])
  @@map("application_documents")
}
```

---

## 1-6. `ApplicationDocumentVersion` 모델 추가

* [x] `apps/backend/prisma/models/applicationDocumentVersion.prisma`에 추가한다.
* [x] `documentId`는 `ApplicationDocument`에 FK relation을 둔다.
* [x] `parentVersionId`는 초기 구현에서는 nullable string으로 두고 서비스에서 같은 document의 version인지 검증한다.

```prisma
model ApplicationDocumentVersion {
  id                  String   @id @default(cuid())

  documentId           String   @map("document_id")
  candidateKey         String   @map("candidate_key")

  versionNo            Int      @map("version_no")
  title                String?
  memo                 String?

  content              String
  contentJson          Json?    @map("content_json")

  source               ApplicationDocumentSource @default(user)
  status               ApplicationDocumentStatus @default(active)

  parentVersionId      String?  @map("parent_version_id")

  profileSnapshotText  String?  @map("profile_snapshot_text")
  profileSnapshotJson  Json?    @map("profile_snapshot_json")
  jobSnapshotJson      Json?    @map("job_snapshot_json")

  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")

  document             ApplicationDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, versionNo])
  @@index([candidateKey])
  @@index([documentId, status])
  @@map("application_document_versions")
}
```

---

## 1-7. Prisma 실행

이 브랜치는 루트 스크립트에서 backend Prisma 명령을 감싸고 있으므로 루트에서 실행한다. 

```bash
corepack pnpm install
corepack pnpm db:generate
corepack pnpm --filter @neet2work/backend run db:migrate --name add_profile_document_versions
```

또는 backend에서 직접 실행한다.

```bash
cd apps/backend
corepack pnpm run db:generate
corepack pnpm run db:migrate --name add_profile_document_versions
```

주의:

```text
db:generate는 DB 없이도 통과해야 한다.
db:migrate는 PostgreSQL 연결이 필요하므로 로컬 DB가 없으면 실패가 정상이다.
```

---

# Phase 2. 백엔드 파일 구조 추가

현재 백엔드는 `src/routes`, `src/services`, `src/database`, `src/errors` 구조를 사용합니다. `server.ts`에서 라우터를 import 후 `app.use()`로 등록합니다. 

## 2-1. 프로필 관련 파일 생성

* [x] `apps/backend/src/routes/profile.route.ts`
* [x] `apps/backend/src/services/profile.service.ts`
* [x] `apps/backend/src/types/profile.ts`
* [x] `apps/backend/src/utils/profile.ts`
* [x] `apps/backend/data/sampleProfiles.json`
* [x] `apps/backend/data/sampleProfileVersions.json`

---

## 2-2. 문서 관련 파일 생성

* [x] `apps/backend/src/routes/document.route.ts`
* [x] `apps/backend/src/services/document.service.ts`
* [x] `apps/backend/src/types/document.ts`
* [x] `apps/backend/data/sampleDocuments.json`
* [x] `apps/backend/data/sampleDocumentVersions.json`

---

## 2-3. 라우터 등록

`apps/backend/src/server.ts`에 추가한다.

```ts
import { profileRouter } from "./routes/profile.route.js";
import { documentRouter } from "./routes/document.route.js";
```

현재 라우터 등록부는 `/api/jobs`, `/api/analyze`, `/api/auth`만 있습니다. 
그 아래에 추가합니다.

```ts
app.use("/api/profiles", profileRouter);
app.use("/api/documents", documentRouter);
```

* [x] `profileRouter`, `documentRouter` import 추가.
* [x] `/api/profiles`, `/api/documents` 라우터 등록.

---

## 2-4. 공통 보안/스코프 규칙

프로필/문서 API는 로그인 계정 연동 전까지 `candidateKey` 기반 mock-first 구조로 간다. 단, 모든 변경/조회 서비스는 리소스 소유 범위를 함께 검증한다.

* [x] 목록 API는 `candidateKey`를 query로 받는다.
* [x] 생성 API는 body의 `candidateKey`를 필수로 받는다.
* [x] 상세/수정/삭제/버전 API는 `candidateKey`를 query 또는 body로 받아 `profileId/documentId/versionId`와 함께 검증한다.
* [x] 다른 candidate의 profile/document/version을 조회, 적용, 복원, 보관할 수 없게 한다.
* [x] `profileVersionId`가 전달되면 해당 version이 전달된 `profileId`와 같은 candidate에 속하는지 확인한다.
* [x] `documentId`와 `versionId`는 항상 같은 document에 속하는지 확인한다.
* [x] 사용자에게 반환하는 에러는 내부 경로, stack trace, DB 오류 원문을 노출하지 않는다.

---

# Phase 3. Profile Service 구현

## 3-1. `profileJson` 기본 구조 정의

* [x] `apps/backend/src/types/profile.ts`에 `CandidateProfileJson` 타입 작성.
* [x] `apps/backend/src/utils/profile.ts`에 기본 구조 작성.

```ts
export const defaultProfileJson = {
  basics: {
    name: "",
    email: "",
    phone: "",
    location: "",
    links: {
      github: "",
      portfolio: "",
      blog: ""
    }
  },
  desired: {
    roles: [],
    industries: [],
    locations: [],
    employmentTypes: []
  },
  summary: {
    headline: "",
    description: ""
  },
  skills: [],
  projects: [],
  experiences: [],
  certifications: [],
  education: [],
  activities: [],
  metadata: {
    lastUpdatedBy: "user",
    lastAiUpdatedAt: null
  }
};
```

---

## 3-2. `buildProfileText` 구현

* [x] `apps/backend/src/utils/profile.ts`에 작성.
* [x] 포함 항목:

```text
이름
희망 직무
기술 스택
요약 설명
프로젝트명
프로젝트 역할
프로젝트 성과
```

* [x] 빈 값은 문장에 포함하지 않도록 처리.

---

## 3-3. `extractProfileSummaryFields` 구현

* [x] `profileJson`에서 목록 표시용 필드를 추출한다.

```text
basics.name       → CandidateProfile.name
basics.email      → CandidateProfile.email
desired.roles     → CandidateProfile.desiredRoles
skills            → CandidateProfile.skills
```

---

## 3-4. `getProfiles(candidateKey)` 구현

* [x] `getPrismaClient()`를 사용한다.
* [x] Prisma client가 없거나 DB 조회 실패 시 sample fallback을 사용한다.
* [x] 기본 조회 조건은 `isArchived = false`.
* [x] current version 번호도 응답에 포함한다.

이 브랜치의 `job.service.ts`는 DB가 없거나 조회 실패 시 sample JSON/fallback을 사용하는 구조이므로 같은 패턴을 따르면 됩니다. 

---

## 3-5. `createProfile(input)` 구현

* [x] Prisma transaction으로 처리한다.
* [x] `CandidateProfile` 생성.
* [x] `CandidateProfileVersion` v1 생성.
* [x] `currentVersionId` 갱신.
* [x] `isDefault = true`면 같은 `candidateKey`의 다른 프로필은 `isDefault = false`.
* [x] `profileText` 자동 생성.
* [x] 목록 표시용 필드 동기화.

---

## 3-6. `getProfile(profileId)` 구현

* [x] 프로필 카드 조회.
* [x] `currentVersionId` 기준 현재 버전 조회.
* [x] current version이 없으면 최신 active version fallback.

---

## 3-7. `updateProfileMeta(profileId, input)` 구현

수정 허용 필드:

```text
title
targetRole
targetCompany
targetJobId
isDefault
isArchived
```

주의:

```text
profileJson 수정은 이 API에서 하지 않음
profileJson 수정은 새 버전 생성 API에서 처리
```

---

## 3-8. `archiveProfile(profileId)` 구현

* [x] 실제 삭제 대신 `isArchived = true`.
* [x] 연결된 버전은 유지.

---

## 3-9. 프로필 버전 서비스 구현

* [x] `getProfileVersions(profileId)`
* [x] `createProfileVersion(profileId, input)`
* [x] `getProfileVersion(profileId, versionId)`
* [x] `applyProfileVersion(profileId, versionId)`
* [x] `restoreProfileVersion(profileId, versionId)`
* [x] `archiveProfileVersion(profileId, versionId)`

핵심 규칙:

```text
기존 버전은 덮어쓰지 않음
수정/복원은 항상 새 버전 생성
archived 버전은 current로 적용 불가
currentVersionId가 가리키는 버전은 보관 불가
```

---

# Phase 4. Profile API 구현

`apps/backend/src/routes/profile.route.ts` 작성.

## 4-1. Zod schema 작성

현재 `analyze.route.ts`는 route 파일 안에서 zod schema로 body를 검증합니다. 
같은 패턴으로 작성합니다.

* [x] `createProfileSchema`
* [x] `updateProfileMetaSchema`
* [x] `createProfileVersionSchema`
* [x] `candidateKeyQuerySchema`
* [x] `candidateKeyBodySchema`

---

## 4-2. 프로필 API 라우트 구현

* [x] `GET /api/profiles?candidateKey=...`
* [x] `POST /api/profiles`
* [x] `GET /api/profiles/:profileId?candidateKey=...`
* [x] `PATCH /api/profiles/:profileId`
* [x] `DELETE /api/profiles/:profileId?candidateKey=...`

`PATCH` body에는 `candidateKey`를 포함한다.

---

## 4-3. 프로필 버전 API 라우트 구현

* [x] `GET /api/profiles/:profileId/versions?candidateKey=...`
* [x] `POST /api/profiles/:profileId/versions`
* [x] `GET /api/profiles/:profileId/versions/:versionId?candidateKey=...`
* [x] `POST /api/profiles/:profileId/versions/:versionId/apply`
* [x] `POST /api/profiles/:profileId/versions/:versionId/restore`
* [x] `DELETE /api/profiles/:profileId/versions/:versionId`

`POST apply`, `POST restore`, `DELETE` body에는 `candidateKey`를 포함한다.

---

# Phase 5. Document Service 구현

## 5-1. `getDocuments(candidateKey, filters)` 구현

* [x] `candidateKey` 기준 조회.
* [x] `documentType` 필터 지원.
* [x] 기본값은 `isArchived = false`.
* [x] current version 번호 포함.

---

## 5-2. `createDocument(input)` 구현

* [x] transaction으로 처리.
* [x] `ApplicationDocument` 생성.
* [x] `ApplicationDocumentVersion` v1 생성.
* [x] `currentVersionId` 갱신.
* [x] `profileVersionId`가 있으면 해당 프로필 버전 조회.
* [x] `profileId`와 `profileVersionId`가 둘 다 있으면 같은 프로필에 속하는지 확인.
* [x] `profileId`나 `profileVersionId`가 전달되면 같은 `candidateKey`에 속하는지 확인.
* [x] 문서 버전에 `profileSnapshotText`, `profileSnapshotJson` 저장.
* [x] `jobId`가 있으면 `JobPosting` 조회 후 `jobSnapshotJson` 저장.
* [x] `jobId`가 잘못된 경우는 400으로 처리.

---

## 5-3. 문서 메타/버전 서비스 구현

* [x] `getDocument(documentId)`
* [x] `updateDocumentMeta(documentId, input)`
* [x] `archiveDocument(documentId)`
* [x] `getDocumentVersions(documentId)`
* [x] `createDocumentVersion(documentId, input)`
* [x] `getDocumentVersion(documentId, versionId)`
* [x] `applyDocumentVersion(documentId, versionId)`
* [x] `restoreDocumentVersion(documentId, versionId)`
* [x] `archiveDocumentVersion(documentId, versionId)`

핵심 규칙:

```text
문서 본문 수정은 기존 버전을 덮어쓰지 않음
항상 ApplicationDocumentVersion 새 row 생성
복원도 기존 버전을 current로 바꾸지 않고 새 버전 생성
archived 버전은 current로 적용 불가
currentVersionId가 가리키는 버전은 보관 불가
```

---

# Phase 6. Document API 구현

`apps/backend/src/routes/document.route.ts` 작성.

## 6-1. Zod schema 작성

* [x] `createDocumentSchema`
* [x] `updateDocumentMetaSchema`
* [x] `createDocumentVersionSchema`
* [x] `candidateKeyQuerySchema`
* [x] `candidateKeyBodySchema`

---

## 6-2. 문서 API 라우트 구현

* [x] `GET /api/documents?candidateKey=...`
* [x] `POST /api/documents`
* [x] `GET /api/documents/:documentId?candidateKey=...`
* [x] `PATCH /api/documents/:documentId`
* [x] `DELETE /api/documents/:documentId?candidateKey=...`

`PATCH` body에는 `candidateKey`를 포함한다.

---

## 6-3. 문서 버전 API 라우트 구현

* [x] `GET /api/documents/:documentId/versions?candidateKey=...`
* [x] `POST /api/documents/:documentId/versions`
* [x] `GET /api/documents/:documentId/versions/:versionId?candidateKey=...`
* [x] `POST /api/documents/:documentId/versions/:versionId/apply`
* [x] `POST /api/documents/:documentId/versions/:versionId/restore`
* [x] `DELETE /api/documents/:documentId/versions/:versionId`

`POST apply`, `POST restore`, `DELETE` body에는 `candidateKey`를 포함한다.

---

# Phase 7. 백엔드 검증

## 7-1. API 수동 테스트

* [x] `GET /health`
* [x] `POST /api/profiles`
* [x] `GET /api/profiles?candidateKey=demo-candidate`
* [x] `POST /api/profiles/:profileId/versions`
* [x] `POST /api/profiles/:profileId/versions/:versionId/apply`
* [x] `POST /api/profiles/:profileId/versions/:versionId/restore`
* [x] `POST /api/documents`
* [x] `GET /api/documents?candidateKey=demo-candidate`
* [x] `POST /api/documents/:documentId/versions`
* [x] `POST /api/documents/:documentId/versions/:versionId/apply`
* [x] `POST /api/documents/:documentId/versions/:versionId/restore`

---

## 7-2. 빌드/테스트

* [x] backend lint.

```bash
corepack pnpm --filter @neet2work/backend lint
```

* [x] backend test.

```bash
corepack pnpm --filter @neet2work/backend test
```

* [x] backend build.

```bash
corepack pnpm --filter @neet2work/backend build
```

---

# Phase 8. 프론트 API client 확장

현재 프론트는 `apps/frontend/src/api/client.ts` 한 파일에 jobs, analyze, auth 관련 API 함수가 모여 있습니다. 
이 브랜치 기준으로는 둘 중 하나를 선택합니다.

```text
A안: client.ts에 profile/document 함수 추가
B안: profileClient.ts, documentClient.ts로 분리
```

추천은 **B안**입니다.

## 8-1. 파일 생성

* [x] `apps/frontend/src/api/profileClient.ts`
* [x] `apps/frontend/src/api/documentClient.ts`
* [x] `apps/frontend/src/types/profile.ts`
* [x] `apps/frontend/src/types/document.ts`

---

## 8-1-1. 프론트 응답 타입 정의

API client를 작성하기 전에 최소 응답 타입을 먼저 고정한다.

프로필 타입:

```ts
export type ProfileListItem = {
  id: string;
  candidateKey: string;
  title: string;
  targetRole: string | null;
  targetCompany: string | null;
  targetJobId: string | null;
  name: string | null;
  email: string | null;
  desiredRoles: string[];
  skills: string[];
  currentVersionId: string | null;
  currentVersionNo: number | null;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfileVersion = {
  id: string;
  profileId: string;
  candidateKey: string;
  versionNo: number;
  title: string | null;
  memo: string | null;
  profileText: string;
  profileJson: CandidateProfileJson;
  schemaVersion: number;
  source: "user" | "ai" | "system";
  status: "draft" | "active" | "archived";
  parentVersionId: string | null;
  changeSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfileDetail = ProfileListItem & {
  currentVersion: ProfileVersion | null;
};
```

문서 타입:

```ts
export type DocumentListItem = {
  id: string;
  candidateKey: string;
  title: string;
  documentType: "resume" | "cover_letter";
  profileId: string | null;
  profileVersionId: string | null;
  profileTitle: string | null;
  jobId: string | null;
  jobTitle: string | null;
  company: string | null;
  currentVersionId: string | null;
  currentVersionNo: number | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DocumentVersion = {
  id: string;
  documentId: string;
  candidateKey: string;
  versionNo: number;
  title: string | null;
  memo: string | null;
  content: string;
  contentJson: unknown | null;
  source: "user" | "ai" | "system";
  status: "draft" | "active" | "archived";
  parentVersionId: string | null;
  profileSnapshotText: string | null;
  profileSnapshotJson: unknown | null;
  jobSnapshotJson: unknown | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDetail = DocumentListItem & {
  currentVersion: DocumentVersion | null;
};
```

---

## 8-2. profile API 함수 작성

* [x] `getProfiles(candidateKey)`
* [x] `createProfile(payload)`
* [x] `getProfile(profileId)`
* [x] `updateProfileMeta(profileId, payload)`
* [x] `archiveProfile(profileId)`
* [x] `getProfileVersions(profileId)`
* [x] `createProfileVersion(profileId, payload)`
* [x] `getProfileVersion(profileId, versionId)`
* [x] `applyProfileVersion(profileId, versionId)`
* [x] `restoreProfileVersion(profileId, versionId)`
* [x] `archiveProfileVersion(profileId, versionId)`

---

## 8-3. document API 함수 작성

* [x] `getDocuments(candidateKey, filters)`
* [x] `createDocument(payload)`
* [x] `getDocument(documentId)`
* [x] `updateDocumentMeta(documentId, payload)`
* [x] `archiveDocument(documentId)`
* [x] `getDocumentVersions(documentId)`
* [x] `createDocumentVersion(documentId, payload)`
* [x] `getDocumentVersion(documentId, versionId)`
* [x] `applyDocumentVersion(documentId, versionId)`
* [x] `restoreDocumentVersion(documentId, versionId)`
* [x] `archiveDocumentVersion(documentId, versionId)`

---

## 8-4. candidateKey 관리 유틸 작성

로그인 계정과 완전히 연결하기 전에는 localStorage 기반 임시값을 사용합니다.

* [x] `apps/frontend/src/utils/candidateKey.ts` 생성.

```ts
export function getCandidateKey() {
  const stored = window.localStorage.getItem("neet2work.candidateKey");

  if (stored) {
    return stored;
  }

  const fallback = "demo-candidate";
  window.localStorage.setItem("neet2work.candidateKey", fallback);
  return fallback;
}
```

---

# Phase 9. 프론트 라우팅 분기 추가

현재 `App.tsx`는 pathname 조건문으로 페이지를 분기합니다. 
이 구조를 유지해서 추가합니다.

## 9-1. 새 페이지 컴포넌트 생성

* [x] `apps/frontend/src/pages/Profiles.tsx`
* [x] `apps/frontend/src/pages/ProfileNew.tsx`
* [x] `apps/frontend/src/pages/ProfileDetail.tsx`
* [x] `apps/frontend/src/pages/ProfileVersions.tsx`
* [x] `apps/frontend/src/pages/DocumentDetail.tsx`
* [x] `apps/frontend/src/pages/DocumentVersions.tsx`
* [x] `apps/frontend/src/pages/DocumentNew.tsx`

---

## 9-2. `App.tsx` 경로 추가

* [x] `/profiles`
* [x] `/profiles/new`
* [x] `/profiles/:profileId`
* [x] `/profiles/:profileId/versions`
* [x] `/documents/new`
* [x] `/documents/:documentId`
* [x] `/documents/:documentId/versions`

React Router가 없으므로 우선은 pathname split 방식으로 처리합니다.

예시:

```ts
const pathname = window.location.pathname;
const segments = pathname.split("/").filter(Boolean);
```

라우팅 순서 주의:

```text
/profiles/new는 /profiles/:profileId보다 먼저 검사
/documents/new는 /documents/:documentId보다 먼저 검사
/profiles/:profileId/versions는 /profiles/:profileId보다 먼저 검사
/documents/:documentId/versions는 /documents/:documentId보다 먼저 검사
/documents 단일 경로는 모든 /documents 하위 경로보다 뒤에서 검사
```

수동 라우팅이므로 잘못된 세그먼트는 홈으로 보내지 말고 해당 기능의 목록으로 돌린다.

```text
알 수 없는 /profiles/* → /profiles
알 수 없는 /documents/* → /documents
```

---

# Phase 10. `/documents` 페이지 교체

현재 `/documents`는 정적 `DOCUMENTS` 상수 기반입니다. 
이를 실제 API 기반으로 변경합니다.

## 10-1. `Documents.tsx` 수정

* [x] `DOCUMENTS` 상수 제거.
* [x] `getDocuments(candidateKey)` 호출.
* [x] loading/error/empty 상태 추가.
* [x] documentType 필터 추가.

필터:

```text
전체
이력서
자기소개서
```

* [x] 기존 `Profile` 타입 필터는 제거하거나 `/profiles`로 이동한다.

---

## 10-2. 버튼 연결

* [x] `새 문서 만들기` → `/documents/new`
* [x] `열기` → `/documents/{documentId}`
* [x] `버전 관리` → `/documents/{documentId}/versions`

---

# Phase 11. 프로필 화면 구현

## 11-1. `/profiles` 목록 화면

* [x] `getProfiles(candidateKey)` 호출.
* [x] 프로필 카드 목록 표시.
* [x] 표시 항목:

```text
프로필 제목
목표 직무
대표 기술
현재 버전 번호
최근 수정일
기본 프로필 여부
```

* [x] 버튼:

```text
새 프로필 만들기
보기/수정
버전 관리
이 프로필로 이력서 작성
이 프로필로 자기소개서 작성
보관
```

---

## 11-2. `/profiles/new` 생성 화면

* [x] 입력 필드:

```text
프로필 제목
목표 직무
이름
이메일
전화번호
거주지
희망 직무
기술 스택
간단 자기소개
프로젝트 경험
```

* [x] 저장 시 `POST /api/profiles`.
* [x] 저장 후 `/profiles/{profileId}`로 이동.

---

## 11-3. `/profiles/:profileId` 상세/편집 화면

* [x] `getProfile(profileId)` 호출.
* [x] 현재 버전의 `profileJson`을 폼에 바인딩.
* [x] 저장 버튼은 “새 버전으로 저장”.
* [x] 저장 시 `POST /api/profiles/:profileId/versions`.
* [x] `makeCurrent = true`.

---

## 11-4. `/profiles/:profileId/versions` 버전 관리 화면

* [x] `getProfileVersions(profileId)` 호출.
* [x] 버전 목록 표시.
* [x] 버튼:

```text
보기
현재 버전으로 적용
복원
보관
```

버튼 정책:

```text
현재 적용 중인 버전은 "현재 버전으로 적용" disabled
archived 버전은 "현재 버전으로 적용" disabled
현재 적용 중인 버전은 "보관" disabled
복원은 archived 여부와 무관하게 새 버전으로 복사 생성할지 정책 결정 필요
초기 구현 추천: archived 버전 복원은 허용, 새 active 버전 생성
```

---

# Phase 12. 문서 화면 구현

## 12-1. `/documents/new` 생성 화면

* [x] 문서 유형 선택.

```text
이력서
자기소개서
```

* [x] 사용할 지원 프로필 선택.
* [x] 사용할 프로필 버전 선택.
* [x] 연결할 채용공고 선택 또는 `jobId` 선택.
* [x] 문서 제목 입력.
* [x] 문서 본문 입력.
* [x] 저장 시 `POST /api/documents`.

초기 구현에서는 **AI 생성이 아니라 사용자가 입력한 본문 저장**으로 처리합니다.

---

## 12-2. `/documents/:documentId` 상세/편집 화면

* [x] `getDocument(documentId)` 호출.
* [x] 현재 문서 버전 본문 표시.
* [x] 본문 편집.
* [x] 저장 버튼은 “새 버전으로 저장”.
* [x] 저장 시 `POST /api/documents/:documentId/versions`.
* [x] `makeCurrent = true`.

---

## 12-3. `/documents/:documentId/versions` 버전 관리 화면

* [x] `getDocumentVersions(documentId)` 호출.
* [x] 버전 목록 표시.
* [x] 버튼:

```text
보기
현재 버전으로 적용
복원
보관
```

버튼 정책:

```text
현재 적용 중인 버전은 "현재 버전으로 적용" disabled
archived 버전은 "현재 버전으로 적용" disabled
현재 적용 중인 버전은 "보관" disabled
복원은 archived 여부와 무관하게 새 버전으로 복사 생성할지 정책 결정 필요
초기 구현 추천: archived 버전 복원은 허용, 새 active 버전 생성
```

---

# Phase 13. 네비게이션 반영

현재 상단 메뉴에는 “보관함”이 계정 드롭다운 안에 있고, 메인 네비게이션에는 “홈 / 채용공고 / AI 분석”이 있습니다. 

## 13-1. 메뉴 정리

* [x] 계정 드롭다운에 `/profiles` 링크 추가.

```text
지원 프로필
보관함
계정 정보
```

* [x] `/documents`는 기존 “보관함” 유지.
* [x] 메인 네비게이션의 `/ai-analysis` 링크는 수정하지 않는다.

---

## 13-2. `HomeTopNav` active 타입 확장

현재 active 타입에 `home`, `jobs`, `analysis`, `community`, `account`, `notifications`만 있습니다. 

* [x] 필요하면 `profiles` 또는 `documents` 추가.
* [x] 아니면 기존처럼 `/profiles`, `/documents`를 account section으로 처리.

추천:

```text
profiles/documents는 account section으로 유지
```

---

# Phase 14. AI 분석 연동 보류 처리

## 14-1. `/ai-analysis`, `/ai-analysis/details`는 수정하지 않음

* [x] `AIAnalysisFront.tsx` 직접 수정하지 않음.
* [x] `AIAnalysisDetails.tsx` 직접 수정하지 않음.
* [x] `/api/analyze` 직접 수정하지 않음.

현재 `/api/analyze`는 `resumeText`, `jobId`만 받는 단순 분석 구조입니다. 
이 작업에서는 건드리지 않습니다.

---

## 14-2. 문서 상세 화면에 안내성 버튼만 추가

* [x] `DocumentDetail.tsx`에 `AI 분석하기` 버튼 영역 추가.
* [x] 버튼은 disabled 처리.
* [x] 문구 추가.

```text
AI 분석 기능은 현재 연동 준비 중입니다.
분석 페이지 구현이 완료된 후 연결될 예정입니다.
```

* [x] `/ai-analysis`로 실제 데이터 전달 코드는 작성하지 않는다.
* [x] `/api/analysis-input`도 구현하지 않는다.

---

# Phase 15. Mock-first fallback

이 브랜치의 job service는 Prisma 사용 가능 시 DB를 조회하고, 실패하면 sample JSON 또는 fallback data를 반환합니다. 
프로필/문서도 같은 패턴으로 맞춥니다.

## 15-1. 샘플 데이터 작성

* [x] `apps/backend/data/sampleProfiles.json`
* [x] `apps/backend/data/sampleProfileVersions.json`
* [x] `apps/backend/data/sampleDocuments.json`
* [x] `apps/backend/data/sampleDocumentVersions.json`

---

## 15-2. fallback 정책

* [x] 조회 API는 sample fallback 제공.
* [x] 저장/수정/삭제/버전 API는 DB가 없거나 조회 실패 시 in-memory fallback을 사용한다.
* [x] in-memory fallback은 서버 프로세스 재시작 시 초기화된다.
* [x] fallback 응답은 실제 DB 응답과 같은 shape를 유지한다.
* [x] fallback 상태에서 저장한 데이터도 같은 `candidateKey` 스코프 검증을 적용한다.

정책:

```text
mock-first 시연 우선: 조회/생성/수정/삭제/버전 작업 모두 in-memory fallback 제공
프로덕션 품질 경고: 이 데이터는 영속 저장되지 않음
```

구현 위치:

```text
profile.service.ts 내부 module-level memory store
document.service.ts 내부 module-level memory store
sample JSON은 초기 memory store seed로 사용
```

---

# Phase 16. 통합 테스트

## 16-1. 백엔드 테스트

* [ ] `candidateKey` 하나로 프로필 여러 개 생성 가능.
* [ ] 프로필별 버전 여러 개 생성 가능.
* [ ] 특정 프로필 버전 적용 가능.
* [ ] 과거 프로필 버전 복원 가능.
* [ ] 문서 생성 시 프로필 스냅샷 저장.
* [ ] 문서별 버전 여러 개 생성 가능.
* [ ] 특정 문서 버전 적용 가능.
* [ ] 과거 문서 버전 복원 가능.
* [ ] archived 버전은 current로 적용 불가.
* [ ] current version은 보관할 수 없음.
* [ ] 다른 candidateKey의 profile/document/version 접근은 실패.
* [ ] 다른 profile의 versionId를 apply/restore/archive하려 하면 실패.
* [ ] 다른 document의 versionId를 apply/restore/archive하려 하면 실패.
* [ ] DB가 없어도 sample/in-memory fallback으로 demo flow가 동작.

---

## 16-2. 프론트 테스트

* [ ] `/profiles` 진입.
* [ ] `/profiles/new`에서 프로필 생성.
* [ ] `/profiles/:profileId`에서 새 버전 저장.
* [ ] `/profiles/:profileId/versions`에서 버전 적용/복원.
* [ ] `/documents`에서 API 기반 문서 목록 조회.
* [ ] `/documents/new`에서 문서 생성.
* [ ] `/documents/:documentId`에서 새 버전 저장.
* [ ] `/documents/:documentId/versions`에서 버전 적용/복원.
* [ ] AI 분석 버튼이 비활성화되어 있고 안내 문구가 표시되는지 확인.

---

## 16-3. 전체 검증 명령

루트에서 실행합니다.

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

루트 스크립트는 frontend와 backend를 함께 검사하도록 되어 있습니다. 

---

# Phase 17. README / 발표 문구 수정

* [ ] 기능명을 README에 추가.

```text
지원 프로필 기반 이력서·자기소개서 작성 및 버전 관리
```

* [ ] 구현 범위 명시.

```text
지원 프로필 여러 개 저장
지원 프로필 버전 관리
이력서/자기소개서 문서 관리
문서 버전 관리
```

* [ ] 제외 범위 명시.

```text
/ai-analysis 및 /ai-analysis/details 페이지는 다른 팀원이 구현 중이므로,
현재 기능에서는 실제 AI 분석 입출력 연동을 구현하지 않는다.
추후 해당 페이지의 요청/응답 구조가 확정되면
profileId, profileVersionId, documentId, documentVersionId, jobId 기준으로 연동한다.
```

---

# 최종 우선순위 압축본

```text
1. origin/daegyune/page/home에서 작업 브랜치 생성
2. Prisma models 분리 구조 확인
3. CandidateProfile / CandidateProfileVersion 추가
4. ApplicationDocument / ApplicationDocumentVersion 추가
5. Prisma migrate / generate
6. profile service / route 구현
7. document service / route 구현
8. server.ts에 /api/profiles, /api/documents 등록
9. frontend api client 추가
10. App.tsx에 /profiles, /documents 하위 경로 분기 추가
11. /documents 정적 mock 목록을 API 기반으로 교체
12. /profiles 관련 화면 추가
13. /documents/new, /documents/:id, /documents/:id/versions 추가
14. AI 분석 버튼은 비활성화 + 추후 연동 안내
15. sample fallback 추가
16. 통합 테스트
17. README 정리
```

---

# 이 브랜치 기준으로 절대 하지 말 것

```text
1. /ai-analysis, /ai-analysis/details 입출력 구조를 지금 확정하지 않기
2. AIAnalysisFront.tsx와 AIAnalysisDetails.tsx를 우리 기능에 맞춰 직접 개조하지 않기
3. /api/analyze에 profileId/documentId를 지금 붙이지 않기
4. /api/analysis-input을 지금 구현하지 않기
5. CandidateProfile.candidateKey를 unique로 만들지 않기
6. CandidateProfile에 profileJson/profileText를 저장하지 않기
7. Documents.tsx의 기존 mock 구조를 유지한 채 새 기능을 억지로 덧붙이지 않기
```
