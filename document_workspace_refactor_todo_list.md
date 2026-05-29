# TODO LIST: 문서함 통합 / 버전관리 제거

## Phase 0. 작업 기준 고정

* [x] 새 TODO 문서를 만든다.
* [x] 기존 정책을 명시한다.
  * [x] 사용자-facing 버전관리 제거
  * [x] 프로필 복사 = 새 `CandidateProfile`
  * [x] 문서 복사 = 새 `ApplicationDocument`
  * [x] `/documents` = 통합 문서함
  * [x] `/documents/sets/:setId` = 묶음 편집
* [x] 기존 version table은 즉시 삭제하지 않고 이관 완료 후 제거한다고 명시한다.

완료 기준:
* [x] TODO 문서만 수정됨.
* [x] 코드 변경 없음.

---

## Phase 1. 현재 version 의존도 조사

* [x] `CandidateProfileVersion` 참조 위치를 전부 목록화한다.
* [x] `ApplicationDocumentVersion` 참조 위치를 전부 목록화한다.
* [x] 프론트 `/profiles/:id/versions` 사용처를 목록화한다.
* [x] 프론트 `/documents/:id/versions` 사용처를 목록화한다.
* [x] 현재 테스트 중 version 의존 테스트를 목록화한다.

조사 결과:

* `CandidateProfileVersion` 제거 대상
  * [ ] Prisma: `apps/backend/prisma/models/candidateProfileVersion.prisma`, `profileVersionSource.prisma`, `profileVersionStatus.prisma`
  * [ ] Prisma relation: `apps/backend/prisma/models/candidateProfile.prisma`의 `currentVersionId`, `versions`
  * [ ] Backend type: `apps/backend/src/types/profile.ts`의 `ProfileVersion`, `CreateProfileVersionInput`, `currentVersion*`
  * [ ] Backend route: `apps/backend/src/routes/profile.route.ts`의 `/api/profiles/:profileId/versions*`
  * [ ] Backend service: `apps/backend/src/services/profile.service.ts`의 version memory store, version CRUD/apply/restore/archive 함수
  * [ ] Frontend type/client: `apps/frontend/src/types/profile.ts`, `apps/frontend/src/api/profileClient.ts`의 version 타입/API 함수
  * [ ] Frontend pages: `ProfileVersions.tsx`, `ProfileDetail.tsx`, `Profiles.tsx`, `DocumentNew.tsx`, `App.tsx`
* `ApplicationDocumentVersion` 제거 대상
  * [ ] Prisma: `apps/backend/prisma/models/applicationDocumentVersion.prisma`
  * [ ] Prisma relation: `apps/backend/prisma/models/applicationDocument.prisma`의 `currentVersionId`, `versions`, `profileVersionId`
  * [ ] Backend type: `apps/backend/src/types/document.ts`의 `DocumentVersion`, `CreateDocumentVersionInput`, `currentVersion*`
  * [ ] Backend route: `apps/backend/src/routes/document.route.ts`의 `/api/documents/:documentId/versions*`
  * [ ] Backend service: `apps/backend/src/services/document.service.ts`의 version memory store, version CRUD/apply/restore/archive 함수
  * [ ] Frontend type/client: `apps/frontend/src/types/document.ts`, `apps/frontend/src/api/documentClient.ts`의 version 타입/API 함수
  * [ ] Frontend pages: `DocumentVersions.tsx`, `DocumentDetail.tsx`, `Documents.tsx`, `App.tsx`
* 프론트 `/profiles/:id/versions` 사용처
  * [ ] `apps/frontend/src/App.tsx`
  * [ ] `apps/frontend/src/pages/Profiles.tsx`
  * [ ] `apps/frontend/src/pages/ProfileDetail.tsx`
  * [ ] `apps/frontend/src/pages/ProfileVersions.tsx`
  * [ ] `apps/frontend/src/api/profileClient.ts`
  * [ ] `apps/frontend/src/App.test.tsx`
* 프론트 `/documents/:id/versions` 사용처
  * [ ] `apps/frontend/src/App.tsx`
  * [ ] `apps/frontend/src/pages/Documents.tsx`
  * [ ] `apps/frontend/src/pages/DocumentDetail.tsx`
  * [ ] `apps/frontend/src/pages/DocumentVersions.tsx`
  * [ ] `apps/frontend/src/api/documentClient.ts`
  * [ ] `apps/frontend/src/App.test.tsx`
* version 의존 테스트
  * [ ] `apps/backend/src/services/profile-document.integration.test.ts`
  * [ ] `apps/frontend/src/App.test.tsx`

완료 기준:
* [x] 제거 대상 파일/함수/API 목록이 TODO에 기록됨.
* [x] 아직 코드 제거는 하지 않음.

---

## Phase 2. Prisma schema 1차 추가

* [x] `CandidateProfile`에 현재 본문 필드 추가.
  * [x] `profileText`
  * [x] `profileJson`
  * [x] `schemaVersion`
  * [x] `source`
* [x] `ApplicationDocument`에 현재 본문 필드 추가.
  * [x] `content`
  * [x] `contentJson`
  * [x] `source`
  * [x] `profileSnapshotText`
  * [x] `profileSnapshotJson`
  * [x] `jobSnapshotJson`
* [x] `ApplicationSet` 모델 추가.
  * [x] `candidateKey`
  * [x] `title`
  * [x] `profileId?`
  * [x] `resumeDocumentId?`
  * [x] `coverLetterDocumentId?`
  * [x] `isArchived`
  * [x] timestamps
* [x] migration 생성.
* [x] `db:generate` 실행.

완료 기준:
* [x] 기존 version 모델은 아직 남아 있음.
* [x] build가 Prisma 타입 기준으로 깨지지 않음.

---

## Phase 3. 데이터 backfill migration

* [x] `CandidateProfile.currentVersionId` 기준으로 현재 version 데이터를 `CandidateProfile` 본문 필드에 복사한다.
* [x] `ApplicationDocument.currentVersionId` 기준으로 현재 version 데이터를 `ApplicationDocument` 본문/스냅샷 필드에 복사한다.
* [x] current version이 없는 row의 fallback 값을 정한다.
  * [x] profile: 빈 기본 profileJson + profileText
  * [x] document: 빈 content + null snapshots
* [x] sample data도 새 필드를 포함하도록 갱신한다.

완료 기준:
* [x] 기존 데이터가 새 필드로 읽힐 준비 완료.
* [x] version table은 아직 삭제하지 않음.

---

## Phase 4. 백엔드 Profile 읽기 전환

* [x] `getProfiles`가 `CandidateProfile` 본문 필드 기반으로 동작하게 변경.
* [x] `getProfile` 응답에서 `currentVersion` 의존 제거.
* [x] 기존 프론트 호환이 필요하면 임시 호환 필드를 만든다.
  * [x] `currentVersionId: null`
  * [x] `currentVersionNo: null`
  * [ ] 단, 신규 UI는 사용하지 않음.
* [x] profile fallback store도 version 없는 구조로 변경.

완료 기준:
* [x] profile 조회 API가 version table 없이도 응답 가능.
* [x] 기존 profile 생성/목록 테스트 통과.

1차 검증 결과:
* [x] Phase 1-4 범위에서 version table 삭제, route 삭제, frontend 교체 같은 후순위 작업은 진행하지 않음.
* [x] `CandidateProfile` 본문 필드 기반 profile list/detail 조회로 전환됨.
* [x] 임시 호환 응답은 `currentVersionId/currentVersionNo/currentVersion`을 `null`로 반환함.
* [x] `corepack pnpm --filter @neet2work/backend run build` 통과.
* [x] `corepack pnpm --filter @neet2work/backend run test -- src/services/profile-document.integration.test.ts` 통과.

---

## Phase 5. 백엔드 Profile 쓰기 전환

* [x] `createProfile`이 `CandidateProfileVersion`을 생성하지 않도록 변경.
* [x] `PATCH /api/profiles/:profileId`가 `profileJson/profileText` 수정까지 처리.
* [x] `POST /api/profiles/:profileId/copy` 추가.
* [x] copy 제목 규칙 적용.
  * [x] `기존제목 YYYY-MM-DD HH:mm`
* [x] 원본 프로필이 변경되지 않는지 보장.
* [x] fallback copy 동작 추가.

완료 기준:
* [x] 프로필 생성/수정/복사/보관이 version 없이 동작.
* [x] `/api/profiles/:profileId/versions*`는 아직 삭제하지 않아도 됨.

---

## Phase 6. 백엔드 Document 읽기 전환

* [x] `getDocuments`가 `ApplicationDocument` 본문 필드 기반으로 동작.
* [x] `getDocument` 응답에서 `currentVersion` 의존 제거.
* [x] 문서 응답에 직접 포함.
  * [x] `content`
  * [x] `contentJson`
  * [x] `profileSnapshotText`
  * [x] `profileSnapshotJson`
  * [x] `jobSnapshotJson`
* [x] document fallback store도 version 없는 구조로 변경.

완료 기준:
* [x] document 조회 API가 version table 없이도 응답 가능.
* [x] 기존 문서 목록/상세 테스트를 새 구조로 갱신 가능.

---

## Phase 7. 백엔드 Document 쓰기 전환

* [x] `createDocument`가 `ApplicationDocumentVersion`을 생성하지 않도록 변경.
* [x] `PATCH /api/documents/:documentId`가 본문 수정까지 처리.
* [x] `profileId` 변경 시 snapshot 갱신.
* [x] `profileId: null`이면 snapshot null 처리.
* [x] `POST /api/documents/:documentId/copy` 추가.
* [x] copy 제목 규칙 적용.
  * [x] `기존제목 YYYY-MM-DD HH:mm`
* [x] 원본 문서가 변경되지 않는지 보장.
* [x] fallback copy 동작 추가.

완료 기준:
* [x] 문서 생성/수정/복사/보관이 version 없이 동작.
* [x] 문서 생성 시 프로필 snapshot 저장 확인.

---

## Phase 8. ApplicationSet 백엔드 추가

* [x] `applicationSet.service.ts` 추가.
* [x] `applicationSet.route.ts` 추가.
* [x] `GET /api/document-sets` 구현.
* [x] `POST /api/document-sets` 구현.
* [x] `GET /api/document-sets/:setId` 구현.
* [x] `PATCH /api/document-sets/:setId` 구현.
* [x] `DELETE /api/document-sets/:setId` 구현.
* [x] 연결 검증 추가.
  * [x] 같은 `candidateKey`의 profile만 연결 가능
  * [x] 같은 `candidateKey`의 resume만 연결 가능
  * [x] 같은 `candidateKey`의 cover_letter만 연결 가능
* [x] 연결 해제는 null update로 처리.
* [x] server에 route 등록.
* [x] fallback store 추가.

완료 기준:
* [x] profile/resume/coverLetter가 모두 null인 set 생성 가능.
* [x] 일부만 연결된 set 조회 가능.
* [x] 다른 candidateKey 연결 실패.

2차 검증 결과:
* [x] Phase 5-8 범위에서 version API 제거, frontend client 전환, DB table 삭제 같은 후순위 작업은 진행하지 않음.
* [x] Profile/Document 생성과 조회는 본문 row 직접 필드 기준으로 동작함.
* [x] Profile/Document copy는 원본을 변경하지 않고 제목에 `YYYY-MM-DD HH:mm`을 붙이는 방식으로 동작함.
* [x] ApplicationSet은 빈 연결, 일부 연결, 연결 해제, 다른 candidateKey 연결 실패를 처리함.
* [x] `corepack pnpm --filter @neet2work/backend run build` 통과.
* [x] `corepack pnpm --filter @neet2work/backend run test -- src/services/profile-document.integration.test.ts` 통과.

---

## Phase 9. 백엔드 version API 사용 중단

* [x] profile route에서 `/versions*` 라우트를 deprecated 처리하거나 제거.
* [x] document route에서 `/versions*` 라우트를 deprecated 처리하거나 제거.
* [x] 프론트 client에서 version API 함수를 제거할 준비.
* [x] 테스트에서 version restore/apply/archive 기대 제거.

완료 기준:
* [x] 신규 기능은 version API를 전혀 호출하지 않음.
* [x] 아직 DB table은 남아 있어도 됨.

---

## Phase 10. 프론트 타입/API client 전환

* [x] `ProfileDetail`에서 `currentVersion` 의존 제거.
* [x] `DocumentDetail`에서 `currentVersion` 의존 제거.
* [x] `ProfileVersion` 사용처 제거.
* [x] `DocumentVersion` 사용처 제거.
* [x] `copyProfile` 추가.
* [x] `copyDocument` 추가.
* [x] `documentSetClient` 추가.
* [x] 기존 version client 함수 제거.

완료 기준:
* [x] TypeScript 기준으로 version 타입 사용처가 0개.
* [x] 신규 API client만 남음.

---

## Phase 11. `/documents` 통합 목록 1차

* [x] `/documents`에서 profile list를 조회.
* [x] `/documents`에서 document list를 조회.
* [x] `/documents`에서 set list를 조회.
* [x] 세 데이터를 하나의 카드 목록으로 합친다.
* [x] 필터 추가.
  * [x] 전체
  * [x] 프로필
  * [x] 이력서
  * [x] 자기소개서
  * [x] 묶음
* [x] 기존 문서 카드의 “버전 관리” 버튼 제거.
* [x] 프로필 카드에 “복사” 버튼 추가.
* [x] 문서 카드에 “복사” 버튼 추가.
* [x] 묶음 카드에 “묶음 편집” 버튼 추가.

완료 기준:
* [x] `/documents` 하나에서 세 종류가 보임.
* [x] version 관련 버튼이 보이지 않음.

---

## Phase 12. 프로필 생성/편집 경로 이동

* [x] 새 프로필 생성 경로 결정.
  * [x] `/documents/profiles/new`
* [x] 새 프로필 편집 경로 결정.
  * [x] `/documents/profiles/:profileId`
* [x] 기존 `ProfileNew`를 새 경로에서 사용하도록 조정.
* [x] 기존 `ProfileDetail`을 version 없는 저장 방식으로 조정.
* [x] 저장 시 `PATCH /api/profiles/:profileId` 사용.
* [x] 복사 시 `POST /api/profiles/:profileId/copy` 사용.
* [x] `/profiles`는 `/documents?type=profile`로 리다이렉트.
* [x] `/profiles/:profileId/versions`는 `/documents?type=profile`로 리다이렉트.

완료 기준:
* [x] 프로필 생성/편집이 documents 흐름에서 가능.
* [x] `/profiles*` 직접 접근도 깨지지 않음.

3차 검증 결과:
* [x] Phase 9-12 범위에서 DB version table 삭제나 묶음 편집 상세 구현 같은 후순위 작업은 진행하지 않음.
* [x] 프론트 타입/API client에서 `ProfileVersion`/`DocumentVersion` 및 version client 함수 사용처가 제거됨.
* [x] `/documents` 목록은 profile/document/set을 함께 조회하고 version 버튼을 표시하지 않음.
* [x] 프로필 생성/편집은 `/documents/profiles/*` 경로와 direct profile row 저장/copy API를 사용함.
* [x] `corepack pnpm --filter @neet2work/frontend run build` 통과.
* [x] `corepack pnpm --filter @neet2work/frontend run test -- App.test.tsx` 통과.

---

## Phase 13. 문서 상세/편집 전환

* [x] `/documents/:documentId`에서 `document.content`를 편집.
* [x] 저장 시 `PATCH /api/documents/:documentId` 사용.
* [x] 문서 복사 버튼 추가.
* [x] 연결 프로필 선택 UI 추가.
* [x] 연결 해제 UI 추가.
* [x] 참조 프로필 섹션 추가.
  * [x] snapshot 우선 표시
  * [x] snapshot 없으면 현재 profile fallback 표시
  * [x] 연결 없으면 안내 표시
* [x] `/documents/:documentId/versions`는 `/documents/:documentId`로 리다이렉트.

완료 기준:
* [x] 문서 상세에서 version 개념 없이 편집 가능.
* [x] 참조 프로필이 보임.
* [x] 연결 변경/해제가 가능.

---

## Phase 14. 묶음 편집 페이지 1차

* [x] `/documents/sets/:setId` 라우트 추가.
* [x] set detail 조회.
* [x] 묶음 제목 표시.
* [x] 프로필 섹션 추가.
  * [x] 있으면 편집 폼
  * [x] 없으면 새로 만들기 / 기존 연결
* [x] 이력서 섹션 추가.
  * [x] 있으면 편집 폼
  * [x] 없으면 새로 만들기 / 기존 연결
* [x] 자기소개서 섹션 추가.
  * [x] 있으면 편집 폼
  * [x] 없으면 새로 만들기 / 기존 연결
* [x] 연결 설정 섹션 추가.
* [x] 연결 해제 버튼 추가.

완료 기준:
* [x] 프로필만 있는 set 편집 가능.
* [x] 이력서만 있는 set 편집 가능.
* [x] 자소서만 있는 set 편집 가능.
* [x] 세 항목 모두 있는 set 편집 가능.

---

## Phase 15. 묶음 편집 저장 동작

* [x] 프로필 섹션 저장 구현.
* [x] 이력서 섹션 저장 구현.
* [x] 자소서 섹션 저장 구현.
* [x] 전체 저장 구현.
* [x] 새 프로필 생성 후 set에 자동 연결.
* [x] 새 이력서 생성 후 set에 자동 연결.
* [x] 새 자소서 생성 후 set에 자동 연결.
* [x] 기존 항목 연결 변경 구현.
* [x] 연결 해제 구현.

완료 기준:
* [x] 한 화면에서 연결된 항목들을 수정 가능.
* [x] 없는 항목은 생성하거나 연결 가능.
* [x] 연결 해제는 원본 삭제 없이 set만 수정.

---

## Phase 16. Navigation 정리

* [x] 상단 네비게이션에서 `/profiles` 직접 링크 제거.
* [x] 프로필 진입은 `/documents?type=profile`로 연결.
* [x] `/documents`를 주요 진입점으로 유지.
* [x] `/versions` 링크 전부 제거.
* [x] 오래된 버튼 텍스트 제거.
  * [x] 버전 관리
  * [x] 복원
  * [x] 현재 버전으로 적용

완료 기준:
* [x] UI에서 version 관리 용어가 보이지 않음.

4차 검증 결과:
* [x] Phase 13-16 범위에서 sample/fallback 정리, 테스트 전체 재작성, Prisma version 모델 삭제 같은 후순위 작업은 진행하지 않음.
* [x] 문서 상세는 `document.content` 직접 편집, `PATCH /api/documents/:documentId`, 문서 복사, 프로필 연결/해제를 사용함.
* [x] 묶음 편집 화면은 프로필/이력서/자소서 섹션 저장과 전체 저장을 API에 연결함.
* [x] 상단 네비게이션은 프로필 진입을 `/documents?type=profile`로 연결하고, UI에서 `버전 관리`/`복원`/`현재 버전으로 적용` 문구가 검색되지 않음.
* [x] `corepack pnpm --filter @neet2work/frontend run build` 통과.
* [x] `corepack pnpm --filter @neet2work/frontend run test -- App.test.tsx` 통과.

---

## Phase 17. Sample / fallback 정리

* [x] `sampleProfiles.json`을 version 없는 구조로 변경.
* [x] `sampleDocuments.json`을 version 없는 구조로 변경.
* [x] `sampleDocumentSets.json` 추가.
* [x] `sampleProfileVersions.json` 읽기 제거.
* [x] `sampleDocumentVersions.json` 읽기 제거.
* [x] in-memory fallback에서 version store 제거.
* [x] fallback copy profile 동작 확인.
* [x] fallback copy document 동작 확인.
* [x] fallback document set 동작 확인.

완료 기준:
* [x] DB 없이 `/documents`와 `/documents/sets/:setId` 사용 가능.

---

## Phase 18. 테스트 갱신

* [x] backend profile 테스트 갱신.
  * [x] 생성
  * [x] 수정
  * [x] 복사
  * [x] 보관
* [x] backend document 테스트 갱신.
  * [x] 생성
  * [x] 수정
  * [x] 복사
  * [x] 보관
  * [x] profile snapshot
* [x] backend set 테스트 추가.
  * [x] 생성
  * [x] 일부 연결
  * [x] 전체 연결
  * [x] 연결 변경
  * [x] 연결 해제
  * [x] 다른 candidateKey 차단
* [x] frontend `/documents` 테스트 갱신.
* [x] frontend profile edit 테스트 갱신.
* [x] frontend document edit 테스트 갱신.
* [x] frontend set edit 테스트 추가.
* [x] version UI 미노출 테스트 추가.

완료 기준:
* [x] `corepack pnpm run test` 통과.

---

## Phase 19. 최종 version 모델 제거

* [x] `rg CandidateProfileVersion` 결과가 generated/prisma 외 0개인지 확인.
* [x] `rg ApplicationDocumentVersion` 결과가 generated/prisma 외 0개인지 확인.
* [x] Prisma에서 `CandidateProfileVersion` 모델 제거.
* [x] Prisma에서 `ApplicationDocumentVersion` 모델 제거.
* [x] `CandidateProfile.currentVersionId` 제거.
* [x] `ApplicationDocument.currentVersionId` 제거.
* [x] `ApplicationDocument.profileVersionId` 제거.
* [x] migration 생성.
* [x] `db:generate` 실행.

완료 기준:
* [x] generated를 제외한 코드에서 version 모델 참조 없음.
* [x] build 통과.

5차 검증 결과:
* [x] Phase 19 범위에서 README 갱신, lint 같은 Phase 20 작업은 진행하지 않음.
* [x] `CandidateProfileVersion`/`ApplicationDocumentVersion` Prisma 모델과 관련 enum 모델을 제거함.
* [x] `CandidateProfile.currentVersionId`, `ApplicationDocument.currentVersionId`, `ApplicationDocument.profileVersionId`를 제거함.
* [x] backend/frontend 타입과 service에서 version 모델 및 current/profileVersion 필드 참조를 제거함.
* [x] `corepack pnpm run db:generate` 통과.
* [x] `corepack pnpm run test` 통과.
* [x] `corepack pnpm run build` 통과.

---

## Phase 20. 최종 검증 / 문서 정리

* [ ] `corepack pnpm run lint`
* [ ] `corepack pnpm run test`
* [ ] `corepack pnpm run build`
* [ ] README 기능 설명 갱신.
  * [ ] 통합 문서함
  * [ ] 프로필/이력서/자소서 복사 관리
  * [ ] 지원 묶음 편집
* [ ] 버전관리 설명 제거.
* [ ] AI 생성 후 사용자가 연결을 자유롭게 변경 가능하다고 명시.

완료 기준:
* [ ] 최종 검증 3종 통과.
* [ ] 문서와 UI 설명이 새 정책과 일치.
