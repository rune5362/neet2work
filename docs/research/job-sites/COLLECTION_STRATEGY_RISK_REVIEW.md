# Job Collection Strategy Risk Review

검토일: 2026-05-14

## 결론

현재 전략은 코드/스키마/수집기 산출물 기준으로는 채택 가능하다. 다만 외부 채용 사이트 HTML과 실제 로컬 DB 실행 상태는 통제 밖이므로 수학적 100% 확신 대상이 아니다. 운영 전략은 "소량 JSON 검증 → migration/seed 적용 → 뷰어 확인 → API 노출 범위 제한"으로 둔다.

## 닫은 허점

| 허점 | 조치 |
| --- | --- |
| 원본 수집 필드가 공고 목록 API로 노출될 수 있음 | `job.service.ts`에서 public 필드만 `select` |
| 프론트 타입이 원본 필드 사용을 허용함 | `JobPosting`과 `CollectedJobPosting` 분리 |
| `collectedAt` null 정렬이 DB별로 애매함 | `nulls: "last"` 명시 |
| 사람인 수집기가 대량 요청으로 커질 수 있음 | 기본 1건, 최대 5건, 지연 옵션 추가 |
| 사람인 검색 URL의 `search_uuid`가 매번 바뀜 | `sourceUrl`을 `rec_idx` 기반 canonical URL로 저장 |
| pnpm shim이 없는 환경에서 setup이 실패할 수 있음 | setup 스크립트를 `corepack pnpm` 기준으로 변경 |
| Python 캐시가 실수로 커밋될 수 있음 | `__pycache__/`, `*.pyc` ignore 추가 |
| 배열 필드가 빈 배열 대신 null로 흐를 수 있음 | Prisma schema에 `@default([])` 추가 및 default migration 추가 |

## 남은 검증 gap

| gap | 현재 상태 | 닫는 방법 |
| --- | --- | --- |
| 실제 PostgreSQL migration 적용 | 현재 5432 포트 닫힘 | DB 실행 후 `corepack pnpm run db:migrate` |
| Prisma Studio 화면 확인 | 현재 5555 포트 닫힘 | `corepack pnpm run db:studio` 재실행 |
| Docker compose 검증 | 선택 경로로 하향 | Docker 기반 개인 DB를 쓰는 팀원만 `docker compose config`로 확인 |
| 사람인 selector 장기 안정성 | 외부 HTML 변경 가능 | 크롤러는 JSON-first 소량 검증으로 유지하고 실패 시 selector만 교체 |
| migration drift 완전 검증 | shadow DB 없음 | 로컬 PostgreSQL 준비 후 shadow DB 또는 같은 인스턴스의 별도 DB로 `prisma migrate diff` |

## 새 전략

1. `schema.prisma`와 migration을 DB 구조의 원본으로 둔다.
2. Python 크롤러는 DB에 직접 쓰지 않고 표준 JSON만 만든다.
3. 수집 JSON을 사람이 확인한 뒤 seed 또는 import 작업으로 DB에 넣는다.
4. 일반 API는 public 필드만 반환한다.
5. 원본/메타데이터는 DB와 검증 문서에만 남긴다.
6. 실제 DB가 준비되면 migration, seed, Studio 확인을 통과한 뒤에만 완료로 본다.

## 현재 확신 수준

- 코드/타입/문서/수집 JSON: 높음
- 실제 DB 적용: 아직 미검증
- 외부 사이트 장기 안정성: 본질적으로 100% 불가
