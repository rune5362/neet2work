# Job Crawler Skeleton

채용 사이트 수집기는 대량 크롤러가 아니라, 공개 목록 1건을 상세 URL로 따라가 표준 `JobPosting` JSON으로 정규화하는 작은 검증 도구부터 시작한다.

## 원칙

- 로그인, 캡차, 우회성 API 호출은 하지 않는다.
- 목록 URL에서 공개 상세 URL만 수집한다.
- 기본 실행은 1건이고, 한 번에 최대 5건까지만 허용한다.
- 2건 이상 수집할 때는 상세 요청 사이에 기본 1초 지연을 둔다.
- DB에 바로 쓰지 않고 JSON 산출물을 먼저 확인한다.
- 앱 카드에 필요한 최소 필드와 수집 추적용 원본 필드를 분리한다.
- `rawText`는 검증 가능한 공개 텍스트 일부만 보존하고, 원본 HTML 전체는 저장하지 않는다.

## 사람인 1건 검증

프로젝트 루트에서 실행한다.

```bash
python scripts/job_crawler/saramin.py --limit 1 --output docs/research/job-sites/saramin_sample_2026-05-14.json
```

출력 JSON은 `apps/backend/prisma/schema.prisma`의 `JobPosting` 확장 필드와 맞춰 둔다.
