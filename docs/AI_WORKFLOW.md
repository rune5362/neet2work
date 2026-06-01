# AI Workflow

Neet2Work에서 AI 코딩 도구를 쓸 때의 기준이다. 두 ChatGPT 참고 답변의 핵심처럼, 상시 원칙은 `AGENTS.md`, 반복 절차는 `.codex/skills`, 프로젝트 고유 사실은 `docs`에 둔다.

## Where Rules Belong

| 구분 | 위치 | 예시 |
| --- | --- | --- |
| 항상 지킬 개발 원칙 | `AGENTS.md` | Mock-first 유지, 기존 구조 우선, 과한 추상화 금지 |
| 프로젝트 구조와 도메인 사실 | `docs/ARCHITECTURE.md`, `README.md`, `DESIGN.md` | 서비스 목적, 폴더 구조, API/DB 경계 |
| 반복 가능한 작업 절차 | `.codex/skills/*/SKILL.md` | 프로젝트 설계, DB 설계, API 설계, 리팩토링 |
| 이번 작업의 구체 지시 | 사용자 프롬프트 | MVP 범위, 작업 강도, 특정 파일/기능 |

## Default Prompt Pattern

작업을 맡길 때는 아래 정도만 명시해도 충분하다.

```txt
Neet2Work 프로젝트 규칙을 따라 작업해줘.
기존 Mock-first 동작은 유지하고, 필요한 경우 .codex/skills의 관련 스킬을 참고해.
변경 후 관련 lint/test/build 중 적절한 검증을 실행해줘.
```

구조 개선이 목적이면:

```txt
이번 작업은 구조 개선이 목적이야.
기존 동작은 유지하고, 책임 분리와 테스트 가능성을 높여줘.
과한 OOP나 불필요한 계층 추가는 피하고 현재 규모에 맞게 분리해줘.
```

DB 변경이 목적이면:

```txt
Prisma/PostgreSQL 변경이 필요해.
neet2work-db-design 스킬을 참고해서 엔티티, 제약조건, 인덱스, migration, seed 영향을 같이 검토해줘.
```

## Acceptance Checklist

- 기존 발표/로컬 데모 경로가 깨지지 않는다.
- 외부 API 키가 없어도 Mock analyzer가 동작한다.
- DB/R2 미설정 상태의 fallback 의도가 유지된다.
- route/service/storage 책임이 섞이지 않는다.
- frontend 타입과 backend 응답이 어긋나지 않는다.
- 변경 범위에 맞는 lint/test/build 또는 DB 검증 결과가 있다.

