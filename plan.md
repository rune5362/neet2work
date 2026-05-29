# `/ai-analysis` UI 피드백 추가 계획

## Summary

기존 `/ai-analysis` API 연동 계획 뒤에 “채팅 UX 정리” 작업을 추가한다. 범위는 `AIDraftChatBuilder.tsx`, `styles.css`, 해당 테스트, 그리고 페이지 전용 SVG 아이콘 자산만 건드린다. 새 의존성은 추가하지 않는다.

## Key Changes

- **새 대화 확인창**
  - `새 대화` 클릭 시 바로 초기화하지 않고 커스텀 확인 모달을 연다.
  - 문구는 `새 대화를 시작할까요? / 현재 대화와 분석 결과가 초기화됩니다.`
  - `취소`, 오버레이 클릭, `Escape`는 유지. `새 대화 시작`만 기존 대화/입력/분석 결과를 초기화한다.

- **입력창 자동 확장**
  - textarea에 `ref`를 달고 `input` 변경 시 `scrollHeight` 기준으로 높이를 재계산한다.
  - 내부 스크롤 대신 composer 영역이 위로 커지고, 위쪽 대화 타임라인 영역이 줄어드는 구조로 만든다.
  - 전송 버튼과 첨부 버튼은 입력창 하단에 맞춰 정렬한다.

- **아이콘 외부 SVG화**
  - `Icon` switch의 inline SVG를 `apps/frontend/src/assets/icons/ai-draft-*.svg` 자산 import 방식으로 교체한다.
  - 특히 `다음 질문 이어가기`의 sparkle 아이콘은 외부 SVG 파일을 사용한다.
  - Vite 기본 SVG asset import를 쓰고, `lucide-react` 같은 런타임 의존성은 추가하지 않는다.

- **버튼 의도 표시**
  - 아이콘만 있는 버튼과 애매한 액션 버튼에 `aria-label`, `title`, `data-tooltip`을 붙인다.
  - 예: `메시지 보내기`, `자기소개서 파일 첨부`, `초안 복사`, `TXT로 다운로드`, `편집기로 열기`, `다음 질문 이어가기`.
  - 실제 동작이 없는 첨부 버튼은 `준비 중` 상태로 표시하거나 비활성화해서 “눌러도 아무 일 없는 버튼”처럼 보이지 않게 한다.

- **AI 아바타 로고 교체**
  - AI 메시지의 `AI` 텍스트 원형 배지를 기존 로고 심볼 이미지로 교체한다.
  - 기존 자산 `neet2work_symbol_reference_curve 1.png`를 사용한다.
  - 접근성 보완으로 메시지 article에 `aria-label="AI 답변"` / `aria-label="내 메시지"`를 둔다.

## Test Plan

- `새 대화` 클릭 시 확인창이 뜨고 즉시 초기화되지 않는지 확인한다.
- `취소`/`Escape`는 대화와 분석 결과를 보존하고, `새 대화 시작`만 초기화하는지 확인한다.
- textarea에 줄바꿈 입력 시 높이가 증가하고 `overflow-y` 스크롤이 생기지 않는지 확인한다.
- 주요 버튼이 tooltip/label/title을 갖는지 확인한다.
- AI 메시지 아바타가 텍스트 `AI` 대신 로고 심볼 이미지를 렌더하는지 확인한다.
- 실행 명령:
  - `corepack pnpm --filter @neet2work/frontend test -- src/pages/AIDraftChatBuilder.test.tsx`
  - `corepack pnpm --filter @neet2work/frontend build`

## Assumptions

- 이 내용은 현재 `plan.md`의 API 연동 계획 뒤에 “추가 UI/UX 정리” 섹션으로 붙이면 된다.
- 첨부 기능 자체 구현은 이번 범위가 아니고, 버튼 의도 표시와 비활성/준비 중 처리가 우선이다.
- 작업 후 의미 있는 repo 변경이므로 canonical work log에 한국어 작업 기록을 남긴다.
