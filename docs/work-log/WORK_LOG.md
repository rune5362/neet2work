# Work Log

## 2026-05-14

### Figma Summary

- DB 스키마 초안 확정: `JobPosting`에 출처, 원본 ID, 국가/언어, 고용형태, 학력, 마감, 원본 보존 필드 추가
- Python 크롤러 공통 골격 완료: `scripts/job_crawler/`에 표준 모델, HTTP 클라이언트, 사람인 수집기 구성
- 사람인 1건 검증 완료: Python 검색 목록 1건을 상세 URL까지 확인하고 표준 JSON 산출물 저장
- 표준 `JobPosting` 필드와 원본 보존 전략 문서화 완료
