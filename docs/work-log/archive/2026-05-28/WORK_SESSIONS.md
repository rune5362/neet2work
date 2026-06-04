# Work Sessions

## 2026-05-28

### jobs 고용형태 필터 계약직 우선순위 보정
- `/jobs`에서 `인턴 0개`, `계약직 1개`만 보이는 원인을 API/프론트 fallback 기준으로 분리해 확인했다.
- 현재 3000 백엔드는 DB가 `not_configured` 상태라 실제 DB가 아니라 sample fallback을 응답하고 있음을 확인했다.
- `계약직/정규직 전환 가능`이 `정규직` 키워드 때문에 `permanent`로 먼저 분류되던 문제를 고쳐, 계약직 키워드를 정규직보다 우선 분류하도록 백엔드/프론트 로직을 맞췄다.
- API 연결 실패 시 fallback 데이터가 실데이터처럼 보이지 않도록 프론트에서 `isError`를 켜도록 보정했다.
- 검증:
  - `corepack pnpm --filter @neet2work/backend exec tsc` 통과.
  - `corepack pnpm --filter @neet2work/backend test -- src/services/job.service.test.ts` 통과(backend 16개 테스트 파일, 103개 테스트).
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과(3개 테스트).
  - 3000 백엔드 재시작 후 `employmentTypeCategory` API 결과가 `permanent=2`, `contract=1`, `intern=0`, `freelance=0`임을 확인했다.
  - `git diff --check` 통과, `http://localhost:5174/jobs` 200 응답 확인.

### jobs 무제한 조회 및 고용형태 fallback 보강
- `/api/jobs` 기본 `limit`을 제거해 쿼리 파라미터를 생략하면 활성 공고 전체를 반환하도록 백엔드 로직과 계약 문서를 정리했다.
- 고용형태 분류가 `employmentType` 태그에만 묶이지 않도록 `title`, `careerLevel`, `description` fallback을 쓰게 보강했다.
- 실제 DB에서 `employmentType="기타"`, `careerLevel="인턴"`인 공고가 누락되는 사례를 확인해, 명시적 고용형태가 애매하면 본문/제목 신호로 재분류하도록 수정했다.
- 영어 `intern` 매칭은 단어 경계 기준으로 조정해 `Internal` 같은 단어를 인턴으로 잘못 잡는 오분류 위험을 줄였다.
- 운영 수집 cap 의미도 재확인했다: `sourceCap=20`은 소스별 최종 배치 최대 개수, `categoryCap=12`는 한 소스 안 같은 직무 카테고리 최대 개수다.
- `apply_collection_caps`는 `IT_JOB_CATEGORY_VALUES = JOB_CATEGORY_VALUES - {"non_it"}` 기준으로 동작해 non-IT만 제외하고 IT 카테고리는 유지함을 테스트로 다시 확인했다.
- 검증:
  - `python -m unittest scripts.job_crawler.test_contract` 통과.
  - `corepack pnpm --filter @neet2work/backend test -- src/services/job.service.test.ts` 통과(backend 16개 테스트 파일, 106개 테스트).
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과(4개 테스트).
  - `corepack pnpm --filter @neet2work/backend build` 통과, 3000 백엔드 재기동 후 `/health` 정상 응답 확인.
  - 실DB 기준 `/api/jobs` 응답 수 `95`, 고용형태 필터 결과 `permanent=45`, `contract=2`, `intern=6`, `freelance=3` 확인.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - `git diff --check` 통과.

### jobs 5174 프론트 CORS 오류 복구
- 5174 `/jobs` 페이지를 headless Chrome으로 직접 열어 확인한 결과, `http://localhost:3000/api/jobs` 요청이 `Access-Control-Allow-Origin: http://localhost:5173` 때문에 CORS 차단되고 있었다.
- 백엔드 CORS 설정을 고쳐 `CLIENT_URL` 외에도 로컬 개발 origin(`localhost`, `127.0.0.1`, `::1`)을 허용하도록 보강했다.
- 서버 테스트에 `http://localhost:5174` origin 허용 케이스를 추가했다.
- 검증:
  - `corepack pnpm --filter @neet2work/backend test -- src/server.test.ts` 통과(backend 16개 테스트 파일, 107개 테스트).
  - `corepack pnpm --filter @neet2work/backend build` 통과.
  - 3000 백엔드 재기동 후 `/health` 정상 응답 확인.
  - headless Chrome으로 `http://localhost:5174/jobs` 재검증: 에러 상태 없음, 공고 카드 95개 렌더링 확인.

### jobs 고용형태 미기재 필터 추가
- `/jobs` 고용형태 드롭다운에 `미기재` 옵션을 추가했다.
- `미기재` 선택 시 API에 지원되지 않는 enum을 보내지 않고, 프론트에서 `jobTypeCategory`가 비어 있는 공고만 남기도록 필터링했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과(5개 테스트).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - headless Chrome으로 `http://localhost:5174/jobs` 검증: `고용형태: 미기재` 칩 표시, 결과 헤딩 `총 39개의 공고`, 카드 제목 39개 확인.

### Jobs New 배지 게시일 기준 전환
- `/jobs` 카드의 `New` 기준을 `collectedAt 14일`에서 `postedAt 3일`로 전환했다.
- 백엔드는 공개 응답에 `postedAt` 필드를 추가하고, `deadlineText`의 시작일 또는 source `updateDate`를 best-effort로 ISO 시각으로 정규화해 내려주도록 바꿨다.
- 프론트는 `postedAt`이 오늘 기준 3일 이내일 때만 `New`를 표시하도록 수정했다. 게시일을 찾지 못한 공고는 `New`를 붙이지 않는다.
- 타입/계약 문서와 테스트를 함께 갱신했다.
- 검증:
  - `corepack pnpm --filter @neet2work/backend test -- src/services/job.service.test.ts src/server.test.ts` 통과 (전체 108 tests passed).
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (6 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - canonical `.env`를 process env로 로드한 뒤 `corepack pnpm --filter @neet2work/backend build` 통과.
  - 3000 백엔드를 current worktree 코드로 재기동했고 `/api/jobs` 응답에서 `postedAt` 필드가 내려오는 것을 확인했다.
  - 5174 프론트를 current worktree 코드로 재기동했고 `/jobs` 200 응답을 확인했다.
- 참고: 현재 실데이터 95건 중 `postedAt`이 채워진 공고는 4건뿐이라, 기존보다 `New` 배지가 크게 줄거나 사라질 수 있다.

### Jobs 디버그 상태 패널 제거
- `/jobs` 상단의 `기능 상태 리뷰 / 로딩 ON / 에러 ON` 디버그 패널을 제거했다.
- `Jobs.tsx`의 수동 상태 토글 UI를 삭제하고, 관련 CSS(`jobsStateSimulators`, `simLabel`, `simBtn`)도 함께 정리했다.
- 테스트에 디버그 패널 비노출 검증을 추가했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (6 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.

### Jobs 목록 9개 단위 페이지네이션 적용
- `/jobs` 목록을 페이지당 9개씩만 보여주도록 바꾸고, 하단 페이지네이션 버튼을 실제 동작하도록 연결했다.
- `이전/다음` 버튼과 페이지 번호 버튼이 현재 페이지 기준으로 활성화되며, 필터 조건이 바뀌면 1페이지로 돌아가도록 처리했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (7 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.

### Jobs 페이지네이션 표시 방식 조정
- `/jobs` 페이지네이션의 첫 구간 표시를 `1 2 3 ... 마지막페이지` 형태로 조정했다.
- 전체 공고를 미리 불러온 뒤 `총 공고 수 / 9` 기준으로 마지막 페이지 번호를 동적으로 계산해 하단에 노출하도록 유지했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (8 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.

### Jobs 페이지 이동 시 목록 상단 스크롤 추가
- `/jobs` 페이지네이션 이동 시 목록 헤더(`jobsHeading`)로 부드럽게 스크롤되도록 `scrollIntoView` 동작을 추가했다.
- 전체 공고를 미리 불러와 마지막 페이지 수를 계산하는 현재 구조는 유지했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (8 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.

### Jobs 페이지 이동 시 페이지 최상단 스크롤로 변경
- `/jobs` 페이지네이션 이동 시 목록 헤더가 아니라 브라우저 페이지 최상단(`window.scrollTo`)으로 부드럽게 이동하도록 변경했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (8 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.

### Jobs 서버 페이지네이션 전환
- `/api/jobs`를 `data + count + total + page + limit + availableSkills` 응답으로 확장하고, `page`, `jobCategory`, `region1~3`, `skill`, `salaryVisibility`, `deadlineType`, `newOnly`, `employmentTypeCategory=unspecified`까지 서버에서 처리하도록 바꿨다.
- `/jobs` 프론트는 전체 공고 preload 후 slice 하던 구조를 걷어내고, `page=1&limit=9` 기준으로 서버 페이지를 직접 요청하도록 전환했다. 총 공고 수, 마지막 페이지 번호, `미기재` 고용형태 필터, 스킬 목록도 서버 응답 기준으로 맞추도록 정리했다.
- `docs/API_CONTRACT.md`에 새 목록 계약과 쿼리 파라미터를 반영했다.
- 검증:
  - `corepack pnpm --filter @neet2work/backend test -- src/services/job.service.test.ts src/server.test.ts` 통과 (110 tests passed).
  - `corepack pnpm --filter @neet2work/backend build` 통과 (`DATABASE_URL`만 canonical `.env`에서 프로세스 주입 후 확인).
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (8 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - `git diff --check` 통과.

### Jobs -> AI 분석 공고 컨텍스트 연동 수정
- `/jobs` 목록과 상세 드로어의 `AI 적합도 분석` 링크로 진입할 때, `AIDraftChatBuilder`가 URL의 `jobId`를 읽어 실제 `/api/jobs/:id` 데이터를 side panel에 반영하도록 수정했다.
- 기존 mock 공고 선택 흐름은 유지했고, 실제 공고 스킬이 비어 있을 때도 점수 계산이 깨지지 않도록 0분모 방어와 `핵심 스킬 정보 없음` 표시를 추가했다.
- `AIDraftChatBuilder.test.tsx`를 추가해 `jobId`가 있을 때 실제 공고로 바뀌는 케이스와, 없을 때 기존 mock 카드가 유지되는 케이스를 검증했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/AIDraftChatBuilder.test.tsx src/pages/Jobs.test.tsx` 통과 (10 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - Playwright 실검수: `/jobs` -> `AI 적합도 분석` 진입 후 `Clarion Events Japan Ltd.` / 실제 공고 제목 / 원문 링크 반영 확인, 콘솔 에러 없음.
  - `git diff --check` 통과.

### Jobs 근무 지역 광역/세부 필터 매칭 보정
- `/jobs` 근무 지역 필터에서 프론트는 `서울특별시`, `경기도` 같은 표시 라벨을 보내는데, DB `location` 값은 `서울`, `경기 성남시`처럼 축약 저장된 경우가 많아서 `region1~3` 서버 필터가 0건으로 빠지던 문제를 확인했다.
- `apps/backend/src/services/job.service.ts`에 국가별 지역 별칭 매핑을 추가해, 백엔드가 `서울특별시 -> 서울`, `경기도 -> 경기`, 주요 일본 광역 지역의 한글 라벨 -> 영문/원문 토큰도 함께 이해하도록 보정했다.
- `apps/backend/src/services/job.service.test.ts`에 `서울특별시`와 `경기도 > 성남시 > 분당구` 회귀 테스트를 추가해 표시 라벨 기준 지역 필터가 서버 페이지네이션 응답에서도 유지되는지 검증했다.
- 실서버 확인 결과 `country=KR&region1=서울특별시`는 13건, `country=KR&region1=서울특별시&region2=마포구`는 1건으로 정상 응답했다. `country=KR&region1=경기도&region2=성남시`는 4건이며, `분당구`는 현재 DB 공고에 구 단위 위치 데이터가 없어 0건인 것을 별도로 확인했다.
- 검증:
  - `corepack pnpm --filter @neet2work/backend test -- src/services/job.service.test.ts` 통과 (112 tests passed).
  - `corepack pnpm --filter @neet2work/backend build` 통과 (`DATABASE_URL`만 canonical `.env`에서 현재 프로세스에 주입해 확인).
  - 실 API 확인: `/api/jobs?country=KR&region1=서울특별시`, `/api/jobs?country=KR&region1=서울특별시&region2=마포구`, `/api/jobs?country=KR&region1=경기도&region2=성남시` 응답 정상.

### Jobs 일본 근무 지역 시/구 alias 및 본문 위치 신호 보강
- `/jobs` 일본 근무 지역 필터에서 `미나토구`, `시부야구`, `치요다구`, `다이토구` 같은 프론트 라벨이 API에서 0건으로 떨어지던 원인을 확인했다. DB의 실제 `location` 값은 `Asia Japan Tokyo Minato`, `... Shibuya`, `... Chiyoda`, `... Taito`처럼 영문 raw 문자열이었고, 일부는 제목/설명에도 같은 위치 신호가 반복되고 있었다.
- `apps/backend/src/services/job.service.ts`에 일본 시/구 단위 alias 매핑을 추가하고, 지역 필터는 `location`뿐 아니라 `title`, `description`의 위치 신호에서도 alias를 추론해 `region1~3` 매칭에 반영하도록 보강했다. free-text 검색과 기존 location 표시는 건드리지 않았다.
- `apps/backend/src/services/job.service.test.ts`에 `도쿄도 > 미나토구`의 영문 raw location 매칭, `도쿄도 > 시부야구`의 제목/설명 fallback 매칭 회귀 테스트를 추가했다.
- 실 API 확인 결과:
  - `/api/jobs?country=JP&region1=도쿄도&region2=미나토구` -> 4건
  - `/api/jobs?country=JP&region1=도쿄도&region2=시부야구` -> 2건
  - `/api/jobs?country=JP&region1=도쿄도&region2=치요다구` -> 2건
  - `/api/jobs?country=JP&region1=도쿄도&region2=다이토구` -> 1건
- 참고: `Tokyo - 23 Wards`처럼 구체 ward가 없는 공고는 여전히 `도쿄도` 광역 필터에는 걸리지만 특정 ward 선택에는 포함되지 않는다. 이건 현재 데이터의 위치 세분도 기준으로 정상 처리다.
- 검증:
  - `corepack pnpm --filter @neet2work/backend test -- src/services/job.service.test.ts` 통과 (114 tests passed).
  - `corepack pnpm --filter @neet2work/backend build` 통과 (`DATABASE_URL`만 canonical `.env`에서 현재 프로세스에 주입해 확인).

### Jobs 카드 조건영역 4칸 고정 및 표시 포맷 정리
- `/jobs` 카드의 조건영역을 `경력 / 고용 / 급여 / 마감` 4칸 고정으로 정리하고, 값이 비어 있을 때는 각각 `경력 미기재`, `고용 미기재`, `급여 미기재`, `마감 미기재`로 통일했다.
- `apps/frontend/src/pages/Jobs.tsx`에 표시 포맷터를 추가해 `Mid Career -> 주니어 (3-5년)`, `Permanent Full-time -> 정규직`처럼 정규화된 라벨을 우선 노출하고, 엔화 문자열 `4 million yen ~ 6 million yen`은 `400만 엔 ~ 600만 엔` 형식으로 축약해 표기하도록 정리했다.
- 카드 조건항목은 `strong + value span` 구조로 정리하고 `apps/frontend/src/styles.css`에서 줄바꿈/overflow를 보강해 2x2 그리드가 더 안정적으로 보이도록 조정했다.
- 상세 드로어의 계약 조건 표도 같은 포맷터를 재사용하도록 맞췄다.
- `apps/frontend/src/pages/Jobs.test.tsx`에 카드 조건영역 정규화/미기재 fallback 회귀 테스트를 추가했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (11 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.

### Jobs 급여 표기 정규화 확대 (한/일 적재 데이터 기준)
- `apps/frontend/src/pages/Jobs.tsx`의 급여 포맷터를 확장해 현재 적재된 한국/일본 공고 급여 문자열을 사용자용 표기로 정규화했다.
- 일본 공고는 `300万～500万円`, `JPY - Japanese Yen JPY 6000K - JPY 10000K`, `JPY - Japanese Yen JPY 4500K Over`, `Negotiable, based on experience ~ 9 million yen` 같은 패턴을 각각 `300만 엔 ~ 500만 엔`, `600만 엔 ~ 1,000만 엔`, `450만 엔 이상`, `최대 900만 엔 (협의)`처럼 통일했다.
- 한국 공고는 `연봉 3,000~6,000만원 (면접 후 결정)`, `연봉 4,800만원 이상 (면접 후 결정)`, `회사 내규에 따름` 계열을 각각 `3,000만 원 ~ 6,000만 원`, `4,800만 원 이상`, `급여 협의`로 정리했다.
- `apps/frontend/src/pages/Jobs.test.tsx`에 JPY K 범위/이상, 협의형 상한, 한국 연봉 범위/내규 문구 회귀 테스트를 추가해 현재 적재 패턴이 다시 깨지지 않도록 묶었다.
- 실 API 기준 확인한 현재 급여 원문 패턴:
  - 일본: `(blank)`, `300万～500万円`, `350万円〜500万円`, `JPY - Japanese Yen JPY 6000K - JPY 10000K`, `Negotiable, based on experience`, `Depends on experience ...` 등.
  - 한국: `(blank)`, `회사 내규에 따름`, `회사 내규에 따름 (면접 후 결정)`, `연봉 3,000~6,000만원 (면접 후 결정)`, `연봉 4,800만원 이상 (면접 후 결정)`.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (11 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - `git diff --check -- apps/frontend/src/pages/Jobs.tsx apps/frontend/src/pages/Jobs.test.tsx` 통과.

### Jobs 상세 보기 급여 참고 노출 추가
- 카드 목록의 급여 표기는 계속 정규화된 값만 유지하고, `면접 후 결정`, `회사 내규`, `협의형` 같은 보조 급여 문구는 상세 드로어에서만 `급여 참고` 행으로 따로 노출하도록 정리했다.
- `apps/frontend/src/pages/Jobs.tsx`에 `extractSalarySupplementaryNote()`를 추가해 한국어 `면접 후 결정`, `회사 내규에 따름`, 영어/일본어 협의형 문구를 상세 보기용 참고 문구로 추출하도록 했다.
- `apps/frontend/src/pages/Jobs.test.tsx`에 카드에는 `면접 후 결정`이 보이지 않고, 상세 보기 진입 후에만 `급여 참고`와 함께 노출되는 회귀 테스트를 추가했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (12 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - `git diff --check -- apps/frontend/src/pages/Jobs.tsx apps/frontend/src/pages/Jobs.test.tsx` 통과.

### Jobs 카드 지역 표기 요약 및 한글화
- `/jobs` 카드의 지역 표시는 원문 location을 그대로 노출하지 않고 카드 전용 포맷터를 거치도록 바꿨다. 필터/상세용 원문은 유지하고, 카드에서만 `한글화 + 요약`된 값을 보여준다.
- 일본 공고는 `도쿄도 미나토구` 같은 계층형 주소를 한글로 변환하고, 다지역 문자열은 `사이타마현 외 3곳`, 5개 이상 광범위한 지역 나열은 `일본 전국`으로 요약하도록 정리했다.
- `フルリモあり`, `フルリモート`, `remote`, `원격` 신호가 제목/설명/location에 있으면 카드 지역 표기에 `· 풀리모트 가능`을 붙이도록 했다.
- 한국 공고는 기존 한글 위치를 유지하되 `서울 강서구 외 14` 같은 문자열은 `서울 강서구 외 14곳`으로 정리하고, 위치 신호가 불명확한 값은 `지역 확인 필요`로 표기하도록 맞췄다.
- `apps/frontend/src/pages/Jobs.test.tsx`에 `일본 전국 · 풀리모트 가능`, `도쿄도 미나토구`, `서울 강서구 외 14곳` 회귀 테스트를 추가했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (13 tests passed).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - `git diff --check -- apps/frontend/src/pages/Jobs.tsx apps/frontend/src/pages/Jobs.test.tsx` 통과.

### Jobs 검색어 `재택` remote alias 추가
- 백엔드 `apps/backend/src/services/job.service.ts`에 remote 검색 alias를 추가해 검색어에 `재택`이 들어오면 `재택근무`, `원격`, `풀리모트`, `remote`, `full remote`, `在宅`, `在宅勤務`, `リモート`, `フルリモート` 등 한/일/영 원격근무 표현까지 함께 매칭되도록 보강했다.
- 같은 수정에서 `getJobs()` DB 경로가 `q`, `jobCategory`, `region`, `skill`, `salaryVisibility`, `deadlineType`, `newOnly` 같은 후처리 필터를 누락하던 문제를 함께 정리해 `getJobsPage()`와 동일하게 최종 `matchesJobQuery()`를 타도록 맞췄다.
- `apps/backend/src/services/job.service.test.ts`에 `재택` 검색어가 한국 원격 공고와 일본 리모트 공고를 함께 잡고, 상주 공고는 제외하는 회귀 테스트를 `getJobs`/`getJobsPage` 양쪽에 추가했다.
- 실 API 확인:
  - `GET http://localhost:3000/api/jobs?q=재택&limit=20` 응답에서 한국/일본 리모트 공고 14건 확인 (`フルリモート`, `Available across Japan`, `원격 근무 가능`, `在宅勤務` 계열 포함).
- 검증:
  - `corepack pnpm --filter @neet2work/backend test -- src/services/job.service.test.ts` 통과 (116 tests passed).
  - `corepack pnpm --filter @neet2work/backend build` 통과 (`DATABASE_URL`만 canonical `.env`에서 현재 프로세스에 주입해 확인).
  - `git diff --check -- apps/backend/src/services/job.service.ts apps/backend/src/services/job.service.test.ts` 통과.
### Jobs 검색/페이지네이션/에러 복구 보정
- `/jobs` 리뷰에서 나온 세 문제를 함께 정리했다. 프론트는 API 실패 시 에러 화면만 띄우지 않고 fallback 공고 목록을 계속 보여주도록 바꿨고, `다시 시도하기` 버튼은 실제 재요청이 발생하도록 `retryVersion` 기반 재시도 흐름으로 수정했다.
- 백엔드 `apps/backend/src/services/job.service.ts`는 `재택` remote alias가 다중 검색어 의미를 깨지 않도록 공백 단위 토큰 그룹 검색으로 바꾸고, `재택 Python` 같은 쿼리는 remote 조건과 Python 조건을 모두 만족해야만 통과하도록 고쳤다.
- 같은 파일에서 `/api/jobs` 서버 페이지네이션을 실제 DB `count + skip/take` 경로로 정리했다. 일반 목록 요청은 `count()`로 총량을 계산하고 현재 페이지 데이터만 조회하며, 필터용 스킬 목록은 별도 `skills` select로 계산한다. `newOnly`처럼 파생값이 필요한 경우만 후처리 경로를 유지한다.
- `getJobs()`는 DB where 이후에도 `matchesJobQuery()`로 최종 보정하도록 바꿔 mock/실DB 간 의미 차이를 줄였고, 필터가 있는 경우 `take: 100`으로 잘라서 결과가 누락되던 경로도 제거했다.
- 회귀 테스트를 추가했다. 백엔드는 `재택 Python` 다중 검색, `count/skip/take` 페이지네이션, 서버 route contract를 포함하도록 보강했고, 프론트는 API 실패 시 fallback 유지와 재시도 성공 흐름을 검증하도록 확장했다.
- 검증:
  - `corepack pnpm --filter @neet2work/backend test -- src/services/job.service.test.ts src/server.test.ts` 통과 (119 tests passed).
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx` 통과 (14 tests passed).
  - `corepack pnpm --filter @neet2work/backend build` 통과 (`DATABASE_URL`만 canonical `.env`에서 현재 프로세스에 주입해 확인).
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - `git diff --check -- apps/backend/src/services/job.service.ts apps/backend/src/services/job.service.test.ts apps/backend/src/server.test.ts apps/frontend/src/pages/Jobs.tsx apps/frontend/src/pages/Jobs.test.tsx` 통과.

### Jobs 페이지네이션 번호 노출 보정
- 3페이지 진입 시 다음 번호인 4페이지 버튼이 숨겨지던 하단 페이지네이션 규칙을 수정했다.
- 초반 구간은 `1 2 3 4 ... 마지막`, 후반 구간은 `1 ... 마지막-3 마지막-2 마지막-1 마지막`으로 보정했다.
- `apps/frontend/src/pages/Jobs.test.tsx`에 3페이지에서 4페이지 버튼이 노출되는 회귀 테스트를 추가했다.
- 검증: `cmd.exe /c corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx`, `cmd.exe /c corepack pnpm --filter @neet2work/frontend build`

### Jobs QA 및 상태 유지 보강
- `/jobs` 실사용 QA로 검색/경력/고용형태 조합, 일본 근무 지역 조합, 페이지네이션, 모바일 카드/드로어를 점검했다.
- 새로고침이나 다른 페이지 이동 후 재진입 시 필터/페이지 상태가 사라지던 문제를 URL 쿼리 동기화로 보강했다.
- `apps/frontend/src/pages/Jobs.test.tsx`에 URL 초기 복원과 URL 동기화 회귀 테스트를 추가했다.
- 브라우저 확인: `재택 -> 신입 -> 페이지 2`, `일본 > 도쿄도 > 미나토구`, 모바일 390x844 카드/드로어, 콘솔 error/warn 없음.
- 검증: `cmd.exe /c corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx`, `cmd.exe /c corepack pnpm --filter @neet2work/frontend build`, `git diff --check -- apps/frontend/src/pages/Jobs.tsx apps/frontend/src/pages/Jobs.test.tsx`

### Jobs 카드 아이콘을 직무 카테고리 아이콘으로 교체
- `/jobs` 카드 좌측 상단 박스를 출처 이니셜 대신 직무 카테고리 아이콘으로 교체했다.
- 개발, AI/데이터, 디자인, 마케팅, 보안, PM 카테고리별로 다른 SVG glyph와 색상 톤을 적용했다.
- 오른쪽 출처 배지는 유지해서 출처 정보 중복을 줄이고 카드 스캔 속도를 높였다.
- 검증: `cmd.exe /c corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx`, `cmd.exe /c corepack pnpm --filter @neet2work/frontend build`, 브라우저에서 `/jobs` 카드 9개 아이콘 렌더 및 콘솔 error/warn 없음 확인.

### Jobs 카드 직무 아이콘을 Lucide 공식 아이콘으로 교체
- `lucide-react`를 프론트에 추가하고 카드 좌측 상단 직무 아이콘을 Lucide 공식 아이콘으로 교체했다.
- 개발 `CodeXml`, AI/데이터 `Bot`, 디자인 `PenTool`, 마케팅 `Megaphone`, 보안 `Shield`, PM `ListChecks` 조합으로 적용했다.
- 브라우저에서 `jobCategory=AI/데이터` 필터 상태로 카드 9개 아이콘 SVG 렌더와 콘솔 error/warn 없음 확인.
- 검증: `cmd.exe /c corepack pnpm --filter @neet2work/frontend test -- src/pages/Jobs.test.tsx`, `cmd.exe /c corepack pnpm --filter @neet2work/frontend build`, `git diff --check -- apps/frontend/src/pages/Jobs.tsx apps/frontend/src/styles.css apps/frontend/package.json pnpm-lock.yaml`

- Daijob 일본어 상세 경로를 확인하고 ja 우선 + en fallback 수집으로 전환했다. scripts/job_crawler/daijob.py, scripts/job_crawler/test_daijob.py를 수정했고 python -m unittest scripts.job_crawler.test_daijob, corepack pnpm run crawl:daijob:check, batch dry-run, DB import(신규 12건 + 기존 영어 13건)까지 검증했다. 현재 Daijob 영어 잔여 2건은 영어 전용 1건, 모집 종료 페이지 1건이다.
### 운영 최신화 주기 6시간 / lifecycle 기준 보정
- 운영 공고 최신화 목표 cadence를 6시간으로 명시하고 pipeline/manual/scheduler/JP plan에 `targetRefreshCadenceHours: 6`을 추가했다.
- lifecycle 기본 inactive threshold를 3회 -> 2회 성공 crawl 부재 기준으로 조정했다.
- batch warning에 종료 신호가 있으면 partial crawl이어도 해당 공고를 즉시 `closed` 후보로 승격하도록 `apps/backend/src/scripts/jobLifecycleDryRun.ts`를 보강했다.
- Daijob 종료 안내 페이지는 `closed-page:<signal>` warning으로 남도록 조정해 다음 lifecycle run에서 바로 비노출될 수 있게 했다.
- `docs/plans/2026-05-15-operational-job-collection-scope.md`, `docs/runbooks/KR_BATCH_DB_WRITE_PREFLIGHT.md`, `docs/research/job-sites/OPERATIONAL_SOURCE_CONTRACTS.md`에 6시간 cadence와 2회 유예 기준을 반영했다.
- 검증:
  - `cmd.exe /c corepack pnpm --filter @neet2work/backend test -- src/scripts/jobLifecycleDryRun.test.ts src/scripts/jobLifecycleApply.test.ts src/scripts/jobOperationalPipeline.test.ts src/scripts/jobOperationalManualRun.test.ts src/scripts/jobOperationalScheduler.test.ts src/scripts/jobOperationalJpPlan.test.ts` 통과 (120 tests passed).
  - `python -m unittest scripts.job_crawler.test_daijob` 통과.
  - `cmd.exe /c corepack pnpm --filter @neet2work/backend build` 통과 (`DATABASE_URL`만 canonical `.env`에서 현재 프로세스에 주입해 확인).
  - `git diff --check -- apps/backend/src/scripts/jobLifecycleDryRun.ts apps/backend/src/scripts/jobLifecycleDryRun.test.ts apps/backend/src/scripts/jobLifecycleApply.test.ts apps/backend/src/scripts/jobOperationalPipeline.ts apps/backend/src/scripts/jobOperationalPipeline.test.ts apps/backend/src/scripts/jobOperationalManualRun.ts apps/backend/src/scripts/jobOperationalManualRun.test.ts apps/backend/src/scripts/jobOperationalScheduler.ts apps/backend/src/scripts/jobOperationalScheduler.test.ts apps/backend/src/scripts/jobOperationalJpPlan.ts apps/backend/src/scripts/jobOperationalJpPlan.test.ts scripts/job_crawler/daijob.py scripts/job_crawler/test_daijob.py docs/plans/2026-05-15-operational-job-collection-scope.md docs/runbooks/KR_BATCH_DB_WRITE_PREFLIGHT.md docs/research/job-sites/OPERATIONAL_SOURCE_CONTRACTS.md` 통과.

### Figma 작업일지 5/28 정리
- 5/28 상세 작업 기록을 기준으로 `docs/work-log/WORK_LOG.md` Figma Summary를 6개 한국어 bullet로 정리했다.
- 요약 범위는 Jobs 서버 페이지네이션/검색 fallback, 한일 지역·급여·원격 표기 정규화, 카드 UI, AI 분석 공고 컨텍스트, Daijob/운영 최신화 기준이다.
- 검증:
  - `corepack pnpm run worklog:export` 통과.
  - Figma 브리지 `http://localhost:3927/health`가 200을 반환하는 것을 확인했다.
  - `corepack pnpm run figma:apply-log -- --date=2026-05-28 --timeout-ms=60000` 실행 결과 `Figma WORK_LOG appended.`를 확인했다.
### 코드 리뷰 발견사항 패치
- lifecycle warning 기반 종료 판정을 좁혔다. generic transport 문구(`connection closed` 등)는 더 이상 종료 공고로 승격하지 않고, `closed-page:` sentinel 또는 강한 source-visible 종료 문구만 `closed` 후보로 본다.
- `scripts/job_crawler/run_source.py`에서 종료 안내 페이지 오류는 연속 실패 카운트에서 제외하도록 바꿨다. 종료 페이지가 여러 건 연달아 나와도 batch warning이 lifecycle까지 전달된다.
- 종료 안내 페이지만 있는 배치도 warning을 유지한 채 산출되도록 조정해, 실제 공고 0건이어도 lifecycle이 즉시 비노출 후보를 만들 수 있게 했다.
- scheduler/pipeline/manual/JP plan의 `targetRefreshCadenceHours`는 실제 자동 실행처럼 오해되지 않도록 `desiredRefreshCadenceHours`로 바꾸고, 관련 문서도 “자동화 연결 이후 목표 주기”라는 표현으로 정리했다.
- 검증:
  - `cmd.exe /c corepack pnpm --filter @neet2work/backend test -- src/scripts/jobLifecycleDryRun.test.ts src/scripts/jobOperationalPipeline.test.ts src/scripts/jobOperationalManualRun.test.ts src/scripts/jobOperationalScheduler.test.ts src/scripts/jobOperationalJpPlan.test.ts` 통과 (121 tests passed).
  - `python -m unittest scripts.job_crawler.test_runner scripts.job_crawler.test_daijob` 통과.
  - `cmd.exe /c corepack pnpm --filter @neet2work/backend build` 통과 (`DATABASE_URL`만 canonical `.env`에서 현재 프로세스에 주입해 확인).
  - `git diff --check -- apps/backend/src/scripts/jobLifecycleDryRun.ts apps/backend/src/scripts/jobLifecycleDryRun.test.ts apps/backend/src/scripts/jobOperationalPipeline.ts apps/backend/src/scripts/jobOperationalPipeline.test.ts apps/backend/src/scripts/jobOperationalManualRun.ts apps/backend/src/scripts/jobOperationalManualRun.test.ts apps/backend/src/scripts/jobOperationalScheduler.ts apps/backend/src/scripts/jobOperationalScheduler.test.ts apps/backend/src/scripts/jobOperationalJpPlan.ts apps/backend/src/scripts/jobOperationalJpPlan.test.ts scripts/job_crawler/run_source.py scripts/job_crawler/test_runner.py docs/plans/2026-05-15-operational-job-collection-scope.md docs/runbooks/KR_BATCH_DB_WRITE_PREFLIGHT.md docs/research/job-sites/OPERATIONAL_SOURCE_CONTRACTS.md` 통과.

### 원본 브랜치 반영
- Codex 작업 브랜치 HEAD(0827a3a)를 로컬 원본 워크트리는 건드리지 않고 origin/sungho로 fast-forward push 준비 확인
- 확인: git rev-list --left-right --count origin/sungho...HEAD -> 0 2
