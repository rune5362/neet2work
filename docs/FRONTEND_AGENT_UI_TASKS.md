# Frontend UI Task Brief

Date: 2026-05-20

Purpose: frontend agent가 `apps/frontend`에서 바로 수정할 UI 작업만 정리한다.

## Work Boundary

수정 대상:

- `apps/frontend`
- 프론트 UI 컴포넌트, 라우팅 화면, 스타일, 반응형 레이아웃
- 프론트 화면에서 필요한 loading, empty, error, disabled 상태

수정하지 말 것:

- `apps/backend`
- DB, Prisma, migration, seed
- API 계약 문서
- `.env`
- 인증, 결제, 알림 같은 새 제품 기능

## Required UI Changes

### 1. Jobs Page

채용공고 목록 화면을 실제 탐색 화면처럼 정리한다.

필요한 수정:

- 검색 입력 UI 추가
- 수집처, 국가, 언어 필터 UI 추가
- 필터 초기화 버튼 추가
- 적용 중인 필터 칩 추가
- 결과 개수와 현재 조건을 보여주는 헤더 추가
- 목록 loading skeleton 추가
- 검색 결과 없음 empty state 추가
- 오류 state 추가

카드 수정:

- 회사명, 공고 제목, 출처, 국가/언어, 위치가 한눈에 보이게 정리
- 급여, 경력, 고용형태, 마감일, 스킬 칩 표시 영역 추가
- 긴 제목은 2줄 말줄임
- 긴 설명은 2-3줄 말줄임
- 없는 값은 빈칸으로 남기지 않고 숨김
- 모바일에서 카드 액션이 자연스럽게 세로로 내려가게 수정

### 2. Job Detail

공고 상세 UI를 추가한다.

권장 형태:

- desktop: 오른쪽 drawer
- mobile: 전체 폭 bottom sheet 또는 별도 detail view

필요한 수정:

- 상세 열기/닫기 UI
- 공고 제목, 회사명, 출처, 위치, 국가/언어 표시
- 급여, 경력, 고용형태, 학력, 마감일, 지원 방식 표시 영역
- 스킬 목록 표시
- 긴 설명 본문 표시
- 원문 공고 열기 버튼
- 이 공고로 AI 분석하기 버튼
- 상세 loading, empty, error 상태

### 3. AI Analysis Entry Page

AI 분석 시작 화면에서 사용자가 어떤 공고를 기준으로 분석하는지 명확하게 보여준다.

필요한 수정:

- 선택된 공고 요약 카드 추가
- 공고 미선택 empty state 추가
- 공고 변경 버튼 추가
- 공고 검색/선택 UI 추가
- 자기소개서 textarea 정리
- 글자 수 표시 추가
- 최소 글자 수 안내 추가
- 입력 오류 메시지 추가
- 분석 중 버튼 loading 상태 추가

버튼 상태:

- 공고 없음: disabled
- 글자 수 부족: disabled
- 분석 중: loading
- 제출 가능: primary

### 4. AI Analysis Result Page

분석 결과 화면을 결과 리포트 구조로 정리한다.

필요한 수정:

- 선택 공고 요약 섹션 추가
- 매칭 점수 섹션 추가
- 강점 섹션 추가
- 약점 섹션 추가
- 누락 키워드 섹션 추가
- 개선 가이드 섹션 추가
- 추천 문장 섹션 추가
- 다시 분석하기 버튼 추가
- 결과 없음 empty state 추가
- 분석 실패 error state 추가

문구 정리:

- 내부 도구처럼 보이는 문구는 사용자용 문구로 변경
- 실제 동작하지 않는 버튼은 숨기거나 `준비 중` 상태로 표시

### 5. Home Page

홈 화면에서 바로 주요 화면으로 이동하기 쉽게 정리한다.

필요한 수정:

- 채용공고 보기 CTA 정리
- AI 분석 시작 CTA 정리
- 현재 화면에서 실제로 이동 가능한 링크만 강하게 표시
- 과장된 수치나 실제 근거 없는 상태 문구 제거

### 6. Navigation And Footer

네비게이션과 푸터에서 아직 동작하지 않는 항목을 정리한다.

필요한 수정:

- 현재 페이지 active 상태 정확히 표시
- `/jobs` 상세 상태에서도 jobs 메뉴 active 유지
- 알림, 계정처럼 미구현 기능은 disabled 또는 준비 중 상태로 표시
- 푸터 placeholder 링크는 실제 기능처럼 보이지 않게 정리

## Global UI Rules

- 데스크톱과 모바일 모두 깨지지 않아야 한다.
- 긴 한국어, 일본어, 영어 텍스트가 카드 밖으로 밀리면 안 된다.
- 버튼은 실제 가능한 행동만 primary로 둔다.
- 없는 데이터 때문에 빈 공간이 크게 남으면 안 된다.
- loading, empty, error, disabled 상태를 화면별로 준비한다.
- 카드에 모든 정보를 넣지 말고, 목록 카드와 상세 UI의 역할을 나눈다.
- 새 패키지는 추가하지 말고 기존 프론트 구조 안에서 수정한다.

## Suggested Order

1. Jobs 필터, 결과 헤더, 카드 UI
2. Jobs loading, empty, error 상태
3. Job detail drawer/view
4. AI Analysis 공고 선택 UI
5. 자기소개서 입력 상태와 버튼 상태
6. AI Analysis 결과 리포트 섹션
7. Home CTA 정리
8. Navigation/Footer 미구현 항목 정리

## Acceptance Checklist

- `/jobs`에서 필터, 결과 헤더, 카드, 상세 UI가 보인다.
- 긴 제목과 긴 설명이 레이아웃을 깨지 않는다.
- 공고 선택 전에는 AI 분석 버튼이 비활성화된다.
- 자기소개서 글자 수 부족 상태가 표시된다.
- 분석 결과 화면에 점수, 강점, 약점, 키워드, 개선 가이드, 추천 문장 영역이 있다.
- 미구현 기능이 실제 기능처럼 보이지 않는다.
- `/#home`, `/jobs`, `/ai-analysis`, `/ai-analysis/details`가 콘솔 에러 없이 열린다.
- `corepack pnpm --filter @neet2work/frontend build`가 통과한다.
