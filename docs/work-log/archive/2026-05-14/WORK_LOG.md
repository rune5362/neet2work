# Work Log

## 2026-05-14

### Figma Summary

- DB/크롤러 기준 확정: `JobPosting` 수집 필드, 원본 보존 전략, Python 사람인 수집 골격 정리
- Supabase 초기 DB 구성: Prisma 기준 테이블, 인덱스, FK, 배열 기본값, RLS 활성화 적용
- 채용공고 적재 검증: 샘플 3건과 사람인 1건을 `job_postings`에 반영하고 source/count 확인
- import 파이프라인 추가: 표준 `JobPosting` JSON 검증 및 upsert용 `db:import:jobs` 흐름 구성
- 사람인 import check 추가: 크롤러 JSON 생성 후 DB 미기록 dry-run으로 검증하는 `crawl:saramin:check` 명령 준비
- Git 정리 완료: package-only 변경은 `main`, 사람인 check runner와 작업 기록은 `playground`에 분리 반영
