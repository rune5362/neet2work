# Work Sessions

## 2026-05-13

### Figma Work Log Automation

- Figma Plugin API 기반 작업일지 자동화 구조 검토
- 로컬 bridge 서버와 Figma 플러그인 runner 구조 구현
- Figma manifest의 localhost 허용 설정 수정
- Figma plugin sandbox와 맞지 않는 최신 JS 문법 수정
- `#by Codex` 태그를 Figma 요약에 붙이고 작게 표시하는 로직 추가
- Figma `WORK_LOG` 텍스트 레이어 교체 반영 확인
- 5/13 Figma 요약에 채용공고 수집 대상 최종 확정 및 Notion 문서화 기록을 추가하고 `WORK_LOG` 레이어 반영 완료 확인

### Work Log Rules

- 작업 후 `WORK_SESSIONS.md` 기록을 최종 답변 전 수행하도록 규칙 강화
- `WORK_LOG.md`는 Figma 요약 요청 시에만 갱신하도록 흐름 유지
- `worklog:prepare` 스크립트로 날짜 변경 시 active 일지 파일을 archive로 이동하는 흐름 추가
- 기존 `WORK_LOG.md`의 2026-05-12 섹션을 `docs/work-log-archive/2026-05-12/WORK_LOG.md`로 보관

### Job Site Collection Audit

- README 기준으로 `neet2work`가 mock-first 채용/자소서 분석 포트폴리오 앱이라는 목적을 확인
- 국내/글로벌 채용 사이트 1차 후보를 정리하고 `docs/JOB_SITE_COLLECTION_AUDIT.md`에 수집 가능 필드, 리스크, 구현 우선순위를 기록
- 일본 확장 후보를 정리하고 `docs/JAPAN_JOB_SITE_COLLECTION_AUDIT.md`에 KOREC, CareerCross, Daijob, Green, 마이나비 전직, doda, 리쿠나비 NEXT 중심의 수집 가능 필드를 기록
- 상세 필드가 불확실한 사이트를 한국/일본 구분 없이 다시 확인하고 `docs/JOB_SITE_DETAIL_SAMPLE_AUDIT.md`에 샘플 URL, 확보 필드, 부족한 부분, 크롤러 반영안을 추가
- 잡코리아, 잡플래닛, Indeed Korea, CareerCross, Daijob, Green, 마이나비 전직, doda, 리쿠나비 NEXT 상세 샘플을 기준으로 상세 수집 우선순위를 정리
- Notion `일했음 청년 neet2work` 하위에 국내/글로벌 후보 감사, 일본 후보 감사, 상세 공고 샘플 감사 문서를 분리해 정리
- Notion 가독성 개선을 위해 긴 5열 표를 사이트별 카드형 섹션으로 바꾸고, `목록`, `상세`, `리스크`, `근거` 중심으로 재배치
- JS 렌더링이 필수인 사이트를 제외하고 최종 한국/일본 수집 대상 12개를 `docs/FINAL_JOB_SITE_COLLECTION_TARGETS.md`에 정리
- 최종 수집 대상은 한국 6개(사람인, 잡코리아, 캐치, 링커리어, 잡플래닛, Indeed Korea)와 일본 6개(마이나비 전직, doda, 리쿠나비 NEXT, Daijob, CareerCross, Green)로 확정
- KOREC, 로켓펀치, 프로그래머스 채용, LinkedIn Jobs Korea, Hello Work, paiza는 최종 제외 사유를 별도 정리
- Notion `일했음 청년 neet2work` 하위에 `최종 채용 사이트 수집 대상` 페이지를 생성하고 MD 최종본을 반영

검증:

- `Get-Content -Encoding UTF8`로 작성 문서의 한글/일본어 텍스트 readback 확인
- Notion fetch로 생성/수정된 페이지 내용 반영 확인
- 코드 변경이 아니라 앱 빌드/테스트는 실행하지 않음
