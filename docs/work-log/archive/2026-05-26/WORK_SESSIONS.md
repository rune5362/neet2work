# Work Sessions

## 2026-05-26

### jobs 필터 컨트롤 폭 정리

- 브라우저 주석에 따라 `/jobs` 필터바의 기본 필터 컨트롤 폭을 데스크톱 기준 116px로 통일했다.
- 수정:
  - `apps/frontend/src/styles.css`에서 필터 label, select, `근무 지역`, `상세 필터`, `필터 초기화` 컨트롤의 데스크톱 폭을 116px로 맞췄다.
  - 기존 모바일 구간에서는 `width: 100%` 규칙을 유지해 작은 화면에서는 세로로 넓게 쌓이게 했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - 인앱 브라우저 1680x838 뷰포트에서 `경력`, `근무 지역`, `고용형태`, `상세 필터`가 모두 `116px`로 계산되는 것을 확인했다.
  - `/jobs` 화면에 `전체` 문구가 남아있지 않은 것을 확인했다.

### jobs 필터 컨트롤 화살표 정렬

- 브라우저 주석에 따라 `/jobs` 필터바의 드롭다운 화살표 위치와 버튼별 컨트롤 구조를 통일했다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`에 `FilterSelect` 공통 컴포넌트를 추가해 `직무`, `경력`, `고용형태` select를 같은 구조로 렌더링했다.
  - `근무 지역`과 `상세 필터` 버튼도 같은 `jobsFilterControl` 스타일과 `jobsFilterChevron` 화살표를 사용하게 맞췄다.
  - `apps/frontend/src/styles.css`에서 native select 화살표를 숨기고 커스텀 화살표를 오른쪽 12px, 수직 중앙 위치로 통일했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - 인앱 브라우저 1680x838 뷰포트에서 `직무`, `경력`, `근무 지역`, `고용형태`, `상세 필터`가 모두 `116x44px`이고 화살표가 오른쪽 12~13px, 수직 중앙에 놓인 것을 확인했다.

### jobs 필터 화살표 SVG 교체

- `/jobs` 필터바의 텍스트 화살표 `⌄`를 SVG 아이콘으로 교체하고 y축 중앙 정렬을 재확인했다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`에 `FilterChevronIcon` SVG 컴포넌트를 추가하고 `FilterSelect`, `근무 지역`, `상세 필터`가 같은 아이콘을 사용하게 했다.
  - `apps/frontend/src/styles.css`에서 화살표 SVG를 `14x14px`, 오른쪽 12px 기준으로 고정하고 중앙 정렬을 유지했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - 인앱 브라우저 `http://localhost:5174/jobs`에서 필터 컨트롤 5개의 SVG 화살표가 모두 표시되고 텍스트 화살표가 0개인 것을 확인했다.
  - 각 화살표가 `14x14px`, 오른쪽 12~13px, y축 중앙 오차 0px로 계산되는 것을 확인했다.
  - `근무 지역` 버튼 열기/닫기와 `직무` select 선택/초기화 동작이 유지되는 것을 확인했다.

### jobs 필터 컨트롤 120px 조정

- 브라우저 주석에 따라 `/jobs` 필터바 내부 컨트롤 크기를 `120x44px`로 조정했다.
- 수정:
  - `apps/frontend/src/styles.css`에서 `직무`, `경력`, `근무 지역`, `고용형태`, `상세 필터`의 기준 폭을 120px로 변경했다.
  - 같은 줄에 나타나는 `필터 초기화` 버튼도 같은 기준 크기를 쓰도록 맞췄다.
  - 컨트롤 높이는 `44px`로 고정해 hover, 선택 상태, SVG 화살표가 레이아웃을 흔들지 않게 했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - 인앱 브라우저 `http://localhost:5174/jobs`에서 필터 컨트롤 5개가 모두 `120x44px`로 계산되는 것을 확인했다.
  - SVG 화살표 y축 중앙 오차가 0px로 유지되는 것을 확인했다.

### jobs 근무 지역 선택지 확장

- 브라우저 주석에 따라 `/jobs` 근무 지역 팝오버의 지역 데이터가 너무 적어 보이는 문제를 보강했다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`의 `locationTree`를 확장해 한국은 17개 광역 지역, 일본은 10개 주요 도도부현, 미국은 8개 주요 주를 선택할 수 있게 했다.
  - 한국 주요 광역시/도에는 대표 시/구와 일부 세부 구를 추가했다.
  - `apps/frontend/src/styles.css`에서 지역 컬럼에 `max-height: 260px`와 `overflow-y: auto`를 적용해 선택지가 많아져도 팝오버 레이아웃이 유지되게 했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - Playwright Chrome 채널로 `/jobs`에서 근무 지역 팝오버를 열고 한국 17개, 일본 10개, 미국 8개 광역 선택지가 렌더링되는 것을 확인했다.
  - 지역 컬럼의 `max-height: 260px`, `overflow-y: auto` 적용을 확인했다.

### jobs 카드 국가/언어 메타 제거

- 브라우저 주석에 따라 `/jobs` 카드 메타에서 국가와 언어 조합을 제거했다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`에서 카드 메타의 `{country} · {language}` 표시와 양쪽 구분자를 제거했다.
  - 카드에는 회사명과 실제 근무지만 남겨 시각 정보를 더 간단하게 정리했다.
  - 더 이상 사용하지 않는 `.jobsCardGeo` 스타일을 제거했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - 인앱 브라우저 `http://localhost:5174/jobs`에서 카드 메타 7개가 모두 회사명과 근무지만 표시하고, `한국 · 한국어`, `일본 · 일본어`, `미국 · 영어` 패턴이 남아있지 않은 것을 확인했다.

### jobs 상세 필터 패널 구현

- 브라우저 주석에 따라 비어 있던 `/jobs` 상세 필터 버튼에 실제 필터 패널과 결과 반영 로직을 추가했다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`에 상세 필터 상태를 추가하고 `New 공고`, `기술 스택`, `급여 공개 여부`, `마감 유형` 조건을 결과 필터링에 연결했다.
  - 선택된 상세 조건은 기존 필터 칩에 함께 표시되고, `필터 초기화`와 상세 패널의 `조건 지우기`로 해제되게 했다.
  - `apps/frontend/src/styles.css`에 상세 필터 팝오버, 기술 스택 칩, 세그먼트 버튼, 액션 영역 스타일을 추가했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - Playwright Chrome 채널로 `/jobs`에서 상세 필터 패널이 열리고 `New 공고만` 선택 시 공고가 3개로 줄어드는 것을 확인했다.
  - `Python` 기술 스택 선택 시 공고가 2개로 줄고 필터 칩이 `기술: Python`으로 표시되는 것을 확인했다.

### jobs 근무 지역 초기 선택지 보강

- 브라우저 주석에 따라 `/jobs` 근무 지역 팝오버를 열었을 때 국가 3개만 보여 지역이 적어 보이는 문제를 수정했다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`의 `locationTree`에 캐나다, 호주, 싱가포르, 영국, 독일, 프랑스, 네덜란드, 베트남, 태국, 대만, 홍콩, 인도를 추가했다.
  - 국가를 먼저 누르지 않아도 광역 지역 컬럼에 전체 주요 지역이 `서울특별시 · 한국`처럼 국가와 함께 표시되게 했다.
  - 지역명 검색을 국가, 광역 지역, 시/구, 세부 지역 전체에 연결했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - Playwright Chrome 채널로 `/jobs`에서 근무 지역 팝오버를 열고 국가 15개, 광역 지역 68개가 초기 표시되는 것을 확인했다.
  - `도쿄` 검색 시 국가 `일본`, 광역 지역 `도쿄도 · 일본`만 남는 것을 확인했다.
  - `서울특별시 · 한국` 선택 시 `한국 > 서울특별시`가 선택되고 시/구 25개가 표시되는 것을 확인했다.

### jobs 근무 지역 국가 범위 재조정

- 사용자 정정에 따라 `/jobs` 근무 지역 필터의 국가는 한국/일본만 유지하고, 내부 도시/시구 선택지를 확장하는 방향으로 재조정했다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`의 `locationTree`에서 미국과 기타 국가 확장분을 제거했다.
  - 한국은 전국 광역 지역 안의 시군구를 크게 늘리고, 경기도/주요 광역시/도에는 실제 시군구와 일부 세부 구를 보강했다.
  - 일본은 주요 도도부현과 도쿄 23구/주요 시, 오사카/가나가와/아이치 등 주요 도시를 보강했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과.
  - Playwright Chrome 채널로 `/jobs` 근무 지역 팝오버의 국가가 `한국`, `일본` 2개만 표시되는 것을 확인했다.
  - 초기 광역 지역 51개, 경기도 시군 31개, 도쿄도 구/시 28개가 표시되는 것을 확인했다.
  - `치바` 검색 시 국가 `일본`, 광역 지역 `치바현`만 남는 것을 확인했다.

### jobs 근무 지역 세부 지역 컬럼 제거

- 브라우저 주석에 따라 `/jobs` 근무 지역 팝오버의 `세부 지역` 컬럼을 제거했다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`에서 세부 지역 선택 상태, 필터링 메모, 체크박스 렌더링을 제거했다.
  - `apps/frontend/src/styles.css`에서 지역 선택 그리드를 3열로 조정하고 세부 지역 체크박스 전용 스타일을 정리했다.
  - 시/구 안의 세부 지역 데이터는 검색 보조용으로 유지해 `분당구` 같은 검색어가 상위 도시를 찾는 동작은 살렸다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과. 최초 샌드박스 실행은 `tsbuildinfo` 쓰기 권한 때문에 실패했고, 승인된 빌드 검증으로 재실행해 통과했다.
  - 인앱 브라우저에서 근무 지역 팝오버가 `국가`, `광역 지역`, `시/구` 3개 컬럼만 렌더링되고 `세부 지역` 문구가 사라진 것을 확인했다.
  - Playwright Chrome 채널 1680x838 뷰포트에서 3열 폭이 `307px`대로 균등 계산되고 `한국 > 경기도 > 성남시` 선택이 정상 반영되는 것을 확인했다.

### 공통 상단 네비 휠 스크롤 보정

- 사용자 제보에 따라 상단 네비게이션 위에서 휠 스크롤이 페이지로 전달되지 않는 문제를 수정했다.
- 수정:
  - `apps/frontend/src/components/HomeTopNav.tsx`에 세로 휠 입력을 감지해 `window.scrollBy`로 넘기는 핸들러를 추가했다.
  - 공통 네비 컴포넌트에 적용해 홈과 jobs 화면 모두 같은 동작을 쓰게 했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과. 최초 샌드박스 실행은 `tsbuildinfo` 쓰기 권한 때문에 실패했고, 승인된 빌드 검증으로 재실행해 통과했다.
  - 인앱 브라우저에서 `http://localhost:5174/#home` 상단 네비 위 휠 입력 후 `scrollY`가 `0`에서 `900`으로 이동하는 것을 확인했다.
  - `http://localhost:5174/jobs`에서도 같은 상단 네비 휠 입력 후 `scrollY`가 `0`에서 `900`으로 이동하는 것을 확인했다.

### jobs 필터 바깥 클릭 닫힘 처리

- 브라우저 주석에 따라 `/jobs` 상세 필터 드롭다운이 바깥 클릭으로 닫히도록 수정했다.
- 수정:
  - `apps/frontend/src/pages/Jobs.tsx`에서 근무 지역 또는 상세 필터 팝오버가 열려 있을 때 문서 `pointerdown`을 감지하도록 했다.
  - 팝오버 자체와 해당 버튼을 제외한 클릭이면 열린 팝오버를 닫도록 처리했다.
  - 검색창이나 다른 필터 컨트롤처럼 필터바 안이지만 드롭다운 바깥인 영역을 눌러도 근무 지역 팝오버가 닫히게 했다.
- 검증:
  - `corepack pnpm --filter @neet2work/frontend lint` 통과.
  - `corepack pnpm --filter @neet2work/frontend build` 통과. 최초 샌드박스 실행은 `tsbuildinfo` 쓰기 권한 때문에 실패했고, 승인된 빌드 검증으로 재실행해 통과했다.
  - Playwright Chrome 채널 1680x838 뷰포트에서 `상세 필터` 클릭 시 `.jobsAdvancedPopover`가 1개 열리고, 카드 영역 바깥 클릭 후 0개로 닫히는 것을 확인했다.
  - 인앱 브라우저에서 `근무 지역` 클릭 시 `.jobsLocationPopover`가 열리고, 카드 영역 바깥 클릭 후 닫히는 것을 확인했다.
  - 인앱 브라우저에서 `근무 지역`을 연 뒤 검색창을 클릭하면 팝오버가 닫히는 것을 확인했다.

### Figma 작업일지 5/26 정리

- `docs/work-log/WORK_SESSIONS.md`의 5/26 상세 기록을 기준으로 `docs/work-log/WORK_LOG.md` Figma Summary를 작성했다.
- 피그마 요약은 jobs 필터 컨트롤, 근무 지역 필터, 상세 필터, 카드/drawer UI, 네비/팝오버 동작 보정 중심으로 압축했다.
- 검증:
  - `corepack pnpm run worklog:export` 통과.
  - bridge health check가 HTTP 200을 반환했다.
  - `git diff --check -- docs\work-log\WORK_LOG.md docs\work-log\WORK_SESSIONS.md` 통과.
  - `corepack pnpm run figma:apply-log -- --date=2026-05-26 --timeout-ms=60000` 완료: `Figma WORK_LOG appended`.
