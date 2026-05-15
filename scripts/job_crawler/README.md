# Job Crawler Skeleton

채용 사이트 수집기는 대량 크롤러가 아니라, 공개 목록 1건을 상세 URL로 따라가 표준 `JobPosting` JSON으로 정규화하는 작은 검증 도구부터 시작한다.

## 원칙

- 로그인, 캡차, 우회성 API 호출은 하지 않는다.
- 목록 URL에서 공개 상세 URL만 수집한다.
- sample 실행은 1건이고, 한 번에 최대 5건까지만 허용한다.
- 2건 이상 수집할 때는 상세 요청 사이에 기본 1초 지연을 둔다.
- DB에 바로 쓰지 않고 JSON 산출물을 먼저 확인한다.
- 앱 카드에 필요한 최소 필드와 수집 추적용 원본 필드를 분리한다.
- `rawText`는 검증 가능한 공개 텍스트 일부만 보존하고, 원본 HTML 전체는 저장하지 않는다.
- 운영 batch 수집은 `docs/research/job-sites/OPERATIONAL_SOURCE_CONTRACTS.md`의 `GREEN` source 계약을 만족할 때만 허용한다.
- 운영 batch 수집에서도 Python은 JSON만 만들고, DB 적재는 TypeScript/Prisma import 경계에서만 한다.
- 마감/종료 신호가 명확한 공고는 active 공고로 취급하지 않는다.

## 운영 수집 전 계약

운영 수집은 아래 조건을 모두 만족해야 한다.

- source별 공개 list/detail URL 패턴이 문서화되어 있다.
- `sourceJobId`를 공개 HTML/URL에서 안정적으로 추출할 수 있다.
- title, company, location, career level, source URL을 확보할 수 있다.
- closed/expired 신호와 downgrade trigger가 source별로 정리되어 있다.
- `(source, sourceJobId)` 기준 중복 방지 계약을 유지한다.

운영 source 계약은
`docs/research/job-sites/OPERATIONAL_SOURCE_CONTRACTS.md`를 기준으로 한다.

## 사람인 1건 검증

프로젝트 루트에서 실행한다.

```bash
python scripts/job_crawler/saramin.py --limit 1 --output docs/research/job-sites/saramin_sample_2026-05-14.json
```

출력 JSON은 `apps/backend/prisma/schema.prisma`의 `JobPosting` 확장 필드와 맞춰 둔다.

공통 runner를 쓰면 기존 collector 결과를 import-ready batch envelope로 감쌀 수 있다.

```bash
python scripts/job_crawler/run_source.py --source saramin --limit 1 --format batch --mode sample --output tmp/saramin_import_check.json
```

## 일본 샘플 검증

Mynavi Tenshoku는 `country: JP`, `language: ja`를 가진 1건 샘플로 검증한다.

```bash
corepack pnpm run crawl:mynavi:check
```

Daijob은 `country: JP`, `language: en`을 가진 1건 샘플로 검증한다.

```bash
corepack pnpm run crawl:daijob:check
```

CareerCross는 `country: JP`, `language: en`을 가진 1건 샘플로 검증한다.

```bash
corepack pnpm run crawl:careercross:check
```

Green Japan은 `country: JP`, `language: ja`를 가진 1건 샘플로 검증한다.

```bash
corepack pnpm run crawl:green:check
```

검증 완료된 GREEN 수집원 전체는 matrix check로 묶어 실행한다.
matrix check는 각 source의 sample을 batch envelope로 감싼 뒤 dry-run import까지 확인한다.

```bash
corepack pnpm run crawl:matrix:check
```

## DB 적재 전 검증

크롤러 산출물은 먼저 dry-run import로 표준 필드가 맞는지 확인한다.

```bash
corepack pnpm run db:import:jobs --dry-run ../../docs/research/job-sites/saramin_sample_2026-05-14.json
```

개인 개발 DB의 `DATABASE_URL`을 설정한 뒤 실제 적재한다.

```bash
corepack pnpm run db:import:jobs -- ../../docs/research/job-sites/saramin_sample_2026-05-14.json
```

실제 DB 쓰기는 사용자 승인 후에만 실행한다. 운영 batch 도입 후에도 먼저
sample mode와 dry-run import가 통과해야 한다.
