# JobPosting 수집 표준 스키마

확정일: 2026-05-14

## 목적

채용 사이트별 HTML 구조가 달라도 앱과 DB에는 같은 `JobPosting` 계약으로 저장한다. 프론트엔드 카드와 자기소개서 분석에 필요한 필드는 정규화하고, selector 변경을 추적할 수 있는 원본 정보는 별도 필드로 보존한다.

## 표준 필드

| 필드 | 필수 | 용도 |
| --- | --- | --- |
| `id` | 예 | 앱 내부 공고 ID. 수집 데이터는 `{source}-{sourceJobId}` 사용 |
| `title` | 예 | 공고 제목 |
| `company` | 예 | 회사명 |
| `location` | 예 | 근무 지역 요약 |
| `careerLevel` | 예 | 신입, 경력, 신입/경력 등 |
| `skills` | 예 | 기술/직무 키워드 배열 |
| `description` | 예 | 분석에 사용할 공고 요약 또는 상세 본문 일부 |
| `source` | 예 | `sample`, `saramin`, `jobkorea` 같은 사이트 키 |
| `sourceJobId` | 아니오 | 원본 사이트의 공고 ID 또는 URL 기반 ID |
| `sourceUrl` | 예 | 원본 상세 URL |
| `country` | 예 | `KR`, `JP` 등 |
| `language` | 예 | `ko`, `ja`, `en` 등 |
| `employmentType` | 아니오 | 정규직, 계약직, 인턴 등 |
| `educationLevel` | 아니오 | 학력 조건 |
| `salaryText` | 아니오 | 원문 급여 조건 |
| `deadlineText` | 아니오 | 원문 마감/접수 기간 |
| `applyMethod` | 아니오 | 접수 방법 |
| `companyInfo` | 아니오 | 기업형태, 업종, 사원수 등 구조화 가능한 회사 정보 |
| `rawText` | 아니오 | 공개 상세 페이지에서 추출한 원문 텍스트 일부 |
| `rawJson` | 아니오 | parser 버전, 목록 힌트, fetch 상태 같은 수집 메타데이터 |
| `collectedAt` | 아니오 | 수집 시각 |

## 원본 보존 전략

- DB는 정규화 필드와 원본 추적 필드를 한 테이블에 둔다.
- `source + sourceJobId` 조합으로 중복 수집을 막는다.
- `rawText`는 사람이 재검토할 수 있는 공개 텍스트 일부만 보존한다.
- 원본 HTML 전체는 저장하지 않는다. 용량, 저작권, 개인정보 노출 리스크가 커서 디버깅에는 `rawJson.parser`, `rawJson.detailStatus`, `rawJson.detailFinalUrl` 같은 메타데이터를 우선 사용한다.
- 화면/API는 기존 카드 필드 중심으로 유지하고, `rawText`, `rawJson`, `companyInfo`는 일반 공고 목록 API와 프론트엔드 `JobPosting` 타입에 포함하지 않는다.
- 크롤러는 기본 1건, 최대 5건으로 제한하고 2건 이상 수집할 때 상세 요청 사이에 지연을 둔다.

## 1차 적용 범위

- DB: `apps/backend/prisma/schema.prisma`
- Migration: `apps/backend/prisma/migrations/20260514000000_job_posting_collection_fields/`
- Python skeleton: `scripts/job_crawler/`
- 첫 검증 대상: 사람인 공개 목록 1건 → 상세 → 표준 JSON

## 사람인 1건 검증 결과

- 실행일: 2026-05-14
- 실행 명령: `python scripts/job_crawler/saramin.py --limit 1 --list-url "https://www.saramin.co.kr/zf_user/search/recruit?searchword=python" --output docs/research/job-sites/saramin_sample_2026-05-14.json`
- 산출물: `docs/research/job-sites/saramin_sample_2026-05-14.json`
- 확인된 필드: 제목, 회사명, 지역, 경력, 학력, 고용형태, 직무 키워드, 마감 텍스트, 원본 상세 URL
- 한계: 단순 HTTP 상세 요청에서는 상세 본문보다 공통 내비게이션 텍스트가 많이 내려오므로, 1차 수집은 목록 카드의 구조화 필드를 기준으로 표준화한다. 상세 페이지는 `detailStatus`, `detailFinalUrl`, `detailTextLength`로 접근 가능 여부만 보존한다.
