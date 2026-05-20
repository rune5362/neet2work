# Frontend Agent UI Tasks

Date: 2026-05-20

Purpose: frontend agent에게 전달할 UI/UX 작업 목록이다. 이 문서는 데이터 연결,
하드코딩 정리, 백엔드 수정이 아니라 화면에 추가해야 할 UI 구성요소와 상태만 다룬다.

## Scope

프론트엔드 에이전트는 아래 UI를 구현한다.

- 채용공고 탐색 화면의 정보 구조 보강
- 공고 상세 화면 또는 상세 패널 추가
- AI 분석 입력 화면의 선택 공고/입력 상태 보강
- AI 분석 결과 화면의 섹션 구조 보강
- 로딩, 빈 상태, 오류, 비활성화 상태 추가
- 긴 텍스트, optional 필드, 다국어 텍스트 대응

하지 않는다.

- 백엔드 API 수정
- DB 스키마 수정
- 실제 데이터 fetching 로직 완성
- 인증, 알림, 계정 기능 구현
- PDF 다운로드, 즉시 지원, 이력서 자동 수정 같은 미구현 기능 완성

## Required UI Work

### 1. Jobs Page: Search And Filter Surface

채용공고 화면 상단 필터 영역을 실제 채용공고 탐색에 맞게 정리한다.

필요 UI:

- 검색어 입력
- 수집처 필터
- 국가 필터
- 언어 필터
- 표시 개수 선택
- 적용 중인 필터 칩
- 필터 초기화 버튼

UI 기준:

- 필터는 한 줄에 억지로 모두 넣지 말고, 모바일에서는 자연스럽게 2줄 이상으로 내려가야 한다.
- 선택된 필터가 없을 때와 있을 때가 시각적으로 구분되어야 한다.
- 필터 영역은 카드 목록보다 더 강하게 튀지 않게, 조용한 작업 도구처럼 보이게 한다.

### 2. Jobs Page: Result Header

검색 결과 영역 위에 현재 목록 상태를 알려주는 헤더를 추가한다.

필요 UI:

- 전체/표시 중 공고 수
- 현재 검색 조건 요약
- 정렬 또는 최신순 표시 라벨
- 데이터 상태 배지

상태 예시:

- `공고 95개`
- `JP · ja · green_japan`
- `최신 수집순`
- `샘플 표시 중`
- `백엔드 연결 실패`

### 3. Job Cards: Metadata Layout

공고 카드는 현재보다 정보 밀도를 올린다. 단, 카드가 과하게 무거워지면 안 된다.

카드에 넣을 UI:

- 회사명
- 공고 제목
- 출처 배지
- 국가/언어 배지
- 위치
- 경력 수준
- 고용 형태
- 급여
- 마감 정보
- 스킬 칩
- 수집일 또는 신규 표시
- 상세 보기 버튼
- AI 분석 버튼

표시 규칙:

- 제목은 2줄까지만 보이고 넘치면 말줄임 처리한다.
- 설명은 2-3줄까지만 보이고 상세에서 전체를 읽게 한다.
- 스킬은 최대 4-5개만 보이고 나머지는 `+N`으로 접는다.
- 급여, 마감, 학력, 지원 방식처럼 없을 수 있는 값은 빈 영역을 남기지 않는다.
- 일본어와 긴 영어 제목이 카드 밖으로 밀리지 않아야 한다.

### 4. Job Detail UI

공고 상세를 볼 수 있는 화면을 추가한다. 페이지 또는 오른쪽 drawer 중 하나를 선택한다.

권장: 오른쪽 drawer.

이유:

- 목록 탐색 흐름을 끊지 않는다.
- 긴 설명과 메타데이터를 목록 카드 밖으로 빼낼 수 있다.
- AI 분석으로 넘기기 쉽다.

상세 UI에 필요한 것:

- 공고 제목
- 회사명
- 출처/원문 ID
- 위치
- 국가/언어
- 경력 수준
- 고용 형태
- 급여
- 학력
- 마감
- 지원 방식
- 스킬 목록
- 긴 설명 본문
- 원문 공고 열기 버튼
- 이 공고로 AI 분석 버튼

상세 상태:

- 열림
- 닫힘
- 로딩
- 찾을 수 없음
- 오류

### 5. AI Analysis Entry: Selected Job Context

AI 분석 입력 화면은 사용자가 어떤 공고 기준으로 분석하는지 반드시 보여줘야 한다.

필요 UI:

- 선택된 공고 요약 카드
- 공고 선택 전 빈 상태
- 공고 변경 버튼
- 공고 검색/선택 UI
- 선택된 공고의 회사명, 제목, 출처, 국가/언어 표시

공고가 선택되지 않았을 때:

- 분석 버튼은 비활성화한다.
- `분석할 공고를 먼저 선택하세요` 같은 안내를 보여준다.

### 6. AI Analysis Entry: Resume Input State

자기소개서 입력 영역을 실제 입력 폼처럼 다듬는다.

필요 UI:

- textarea
- 글자 수 표시
- 최소 글자 수 안내
- 유효성 오류 메시지
- 분석 중 버튼 상태
- 분석 실패 메시지

버튼 상태:

- 공고 없음: disabled
- 글자 수 부족: disabled
- 분석 중: loading
- 제출 가능: primary

### 7. AI Analysis Result UI

분석 결과 화면은 고정된 리포트처럼 보이기보다, 결과 데이터가 들어오는 리포트 구조로 만든다.

필요 섹션:

- 선택 공고 요약
- 매칭 점수
- 강점
- 약점
- 누락 키워드
- 개선 가이드
- 추천 문장
- 분석 모드 배지

섹션 상태:

- 배열이 비어 있을 때의 빈 상태
- 분석 결과가 없을 때의 안내
- 분석 실패 상태
- 다시 분석하기 버튼

주의:

- PDF 다운로드, 즉시 지원, 이력서 자동 수정 버튼은 아직 실제 기능이 없으므로 숨기거나 `준비 중` 상태로 둔다.
- `Raw AI Insights`처럼 내부 도구 느낌의 문구는 사용자용 문구로 바꾼다.

### 8. Home Page: Product Status UI

홈은 서비스 소개 화면이지만, 현재 제품 상태를 더 정직하게 보여줄 필요가 있다.

추가하면 좋은 UI:

- 채용공고 수 요약
- 수집처 수 요약
- 지원 국가/언어 요약
- AI 분석 모드 안내
- 주요 CTA 두 개:
  - 채용공고 보기
  - AI 분석 시작

주의:

- 실제 근거 없는 대형 수치나 과장된 지표는 피한다.
- 홈은 랜딩 느낌을 유지하되, 사용자가 바로 공고 탐색으로 들어갈 수 있어야 한다.

### 9. Navigation And Footer

현재 네비게이션에는 아직 실제 기능이 없는 아이콘/링크가 있다.

필요 UI 정리:

- 알림 아이콘은 비활성 또는 준비 중 상태로 표시
- 계정 아이콘도 인증 기능이 없으면 준비 중 상태로 표시
- 푸터의 약관/개인정보/고객지원/문의하기 링크는 placeholder임을 알 수 있게 정리
- `/jobs` 하위 상세 화면에서도 채용공고 메뉴 active 상태 유지

## Cross-Cutting UI States

모든 주요 화면에서 아래 상태를 준비한다.

| State | Needed in |
| --- | --- |
| Loading | jobs list, filters, job detail, analysis result |
| Empty | jobs list, selected job, optional result sections |
| Error | jobs, detail, analysis |
| Disabled | invalid form, missing selected job, unsupported actions |
| Long text | job cards, job detail, result sections |
| Optional field missing | salary, deadline, education, apply method |
| Multilingual text | Korean, Japanese, English job content |

## Visual Priorities

프론트 에이전트는 아래 기준으로 UI를 잡는다.

- 채용공고 화면은 SaaS 대시보드처럼 조용하고 스캔하기 쉬워야 한다.
- 카드 안에 모든 정보를 욱여넣지 말고, 카드와 상세 화면의 역할을 나눈다.
- 필터는 눈에 잘 보이되, 주인공은 공고 목록이어야 한다.
- 버튼은 실제 가능한 행동만 강하게 보이게 한다.
- 긴 일본어/영어 텍스트 때문에 레이아웃이 흔들리면 안 된다.
- 모바일에서는 필터, 카드 액션, 상세 패널이 세로 흐름으로 자연스럽게 접혀야 한다.

## Suggested Build Order

1. Jobs filter/header/card UI 정리
2. Jobs loading/empty/error state 추가
3. Job detail drawer 또는 detail page 추가
4. AI Analysis selected job panel 추가
5. Resume input validation/loading/error UI 추가
6. Analysis result 섹션 구조 추가
7. Unsupported nav/footer/actions 정리
8. Home status/CTA 영역 정리

## Acceptance Checklist

- Jobs 카드가 긴 제목, 빈 스킬, 없는 급여, 긴 설명에서도 깨지지 않는다.
- 필터 영역이 데스크톱과 모바일에서 모두 읽기 쉽다.
- 공고 상세에서 긴 본문을 편하게 읽을 수 있다.
- AI 분석 화면에서 선택된 공고가 명확히 보인다.
- 분석 버튼은 공고/자기소개서 조건이 맞을 때만 활성화된다.
- 결과 화면은 점수, 강점, 약점, 키워드, 추천 문장을 각각 담을 자리가 있다.
- 준비되지 않은 기능은 실제 기능처럼 보이지 않는다.
- 콘솔 에러 없이 `/#home`, `/jobs`, `/ai-analysis`, `/ai-analysis/details`가 열린다.
