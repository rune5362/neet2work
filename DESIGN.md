---
version: alpha
name: Neet2Work-design-analysis-light-canvas
description: '쉬었음 청년(NEET)'이 '일하는 청년(WORK)'으로 도약하는 흐름을 지원하는 고기능성 AI 커리어 플랫폼을 위한 테크니컬 인터페이스 시스템입니다. 본 시스템은 깨끗하고 청량한 슬레이트 화이트 캔버스({colors.canvas})를 기반으로 구축되어 청년들에게 열린 기회와 밝은 에너지를 선사하며, 플랫폼의 핵심 신뢰 축인 딥 로열 네이비({colors.surface-dark})를 로고 및 AI 분석 서피스에 배치하여 테크니컬한 무게감을 확보합니다. 강력한 실행력을 상징하는 파워 블루({colors.primary})는 핵심 시각적 전압(Voltage)으로 작동하여 유저의 도약을 이끕니다.

colors:
  primary: "#0066FF"
  primary-active: "#0052CC"
  primary-disabled: "#E2E8F0"
  ink: "#0A1128"
  body: "#334155"
  body-strong: "#0F172A"
  muted: "#64748B"
  muted-soft: "#94A3B8"
  hairline: "#E2E8F0"
  hairline-soft: "#F1F5F9"
  canvas: "#F8FAFC"
  surface-soft: "#F1F5F9"
  surface-card: "#E2E8F0"
  surface-navy-strong: "#0A1128"
  surface-dark: "#0A1128"
  surface-dark-elevated: "#1E2640"
  surface-dark-soft: "#131C38"
  on-primary: "#ffffff"
  on-dark: "#F8FAFC"
  on-dark-soft: "#94A3B8"
  accent-teal: "#10B981"
  accent-amber: "#F59E0B"
  success: "#10B981"
  warning: "#F59E0B"
  error: "#EF4444"

typography:
  display-xl:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -1.5px
  display-lg:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 42px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -1px
  display-md:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.5px
  display-sm:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.3px
  title-lg:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  title-md:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0
  title-sm:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0
  body-md:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-sm:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  caption:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 1px
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0
  button:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0
  nav-link:
    fontFamily: "Pretendard, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 24px
    height: 44px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted-soft}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 24px
    height: 44px
  button-secondary-on-dark:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 24px
  button-text-link:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.button}"
  button-icon-circular:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 40px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: 70px
  hero-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    padding: 96px
  hero-illustration-card:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  feature-card:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  product-mockup-card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  code-window-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
    padding: 24px
  model-comparison-card:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  pricing-tier-card:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
  pricing-tier-card-featured:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
  callout-card-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  connector-tile:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.lg}"
    padding: 20px
  text-input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 44px
  text-input-focused:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  cookie-consent-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 24px
  category-tab:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    typography: "{typography.nav-link}"
    padding: 8px 16px
    rounded: "{rounded.md}"
  category-tab-active:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.md}"
  badge-pill:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  badge-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-uppercase}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  cta-band-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 64px
  cta-band-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 64px
  footer:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
    padding: 64px
---

## Overview

Neet2Work(일했음 청년)은 구직 및 커리어 전환 시장에서 가장 신뢰성 있고 미래지향적인 테크니컬 인터페이스를 제공합니다. 본 시스템은 요청하신 깨끗하고 청량한 **슬레이트 화이트 캔버스** (`{colors.canvas}` — #F8FAFC)를 메인 웹 사이트 배경으로 전면 채택하여, 청년들에게 열린 기회와 희망찬 도약의 공간을 선사합니다. 메인 타이틀과 데이터 라벨 텍스트는 깊고 진중한 **딥 로열 네이비 잉크** (`{colors.ink}` — #0A1128)를 사용하여 강력한 톤 대비와 완성도 높은 가독성을 확보합니다.

브랜드의 핵심 정체성은 **슬레이트 화이트 바탕 위에서 터지는 네이비와 파워 블루의 하이 콘트라스트 페어링**에서 나옵니다. 시그니처 엑센트인 파워 블루 (`{colors.primary}` — #0066FF)는 사용자의 핵심 행동을 유도하는 CTA 버튼, AI 매칭 스코어 하이라이트, 그래프 인디케이터에 집약적으로 사용됩니다. 이 블루는 대단히 지적이면서도 역동적인 청년의 에너지를 내포하여, 일반적인 채용 플랫폼을 넘어선 생성형 AI 테크 플랫폼으로서의 정체성을 확립합니다.

본 시스템은 명확한 레이어 가독성을 위해 세 가지 서피스 모드를 분리 배치합니다:
1. **슬레이트 화이트 캔버스** (`{colors.canvas}`) — 웹사이트의 디폴트 바닥 레이어
2. **소프트 그레이 서피스** (`{colors.surface-soft}`) — 피처 카드 및 컴포넌트 구획 레이어
3. **인텔리전스 다크 패널** (`{colors.surface-dark}`) — 로고 기본색이자, 실제 생성형 AI 자기소개서 분석창, 실시간 데이터 스트리밍 뷰가 시각화되는 최상위 테크니컬 윈도우 레이어

이 화이트 바탕과 딥 네이비 분석 패널 간의 명도 대비가 웹사이트 전반의 고급스러운 에디토리얼 리듬을 완성합니다.

**Key Characteristics:**
- 요청하신 청량한 슬레이트 화이트 캔버스 (`{colors.canvas}` — #F8FAFC)와 고대비 딥 로열 네이비 잉크 (`{colors.ink}` — #0A1128)의 결합. 플랫폼의 정교한 시각적 기반입니다.
- 고에너지 파워 블루 (`{colors.primary}` — #0066FF) 메인 CTA. 흰 바탕 위에서 압도적인 시각적 전압(Voltage)을 발산하며 유저의 '분석 시작' 행동을 강하게 이끕니다.
- Pretendard와 Inter 산세리프 서체의 고기능성 조합. 타이틀과 데이터 수치에 과감한 굵기(Bold)와 미세한 자간 압축(-0.5px to -1.5px)을 적용하여 스마트하고 신뢰감 있는 인상을 줍니다.
- 인텔리전스 다크 패널 (`{colors.surface-dark}` — #0A1128) 위에서 전개되는 채용 수집 데이터 파이프라인 가이드 크롬. 추상적인 일러스트레이션을 배제하고 실제 제품의 고정밀 가이드 뷰를 전면에 내세웁니다.
- 테두리(Border Radius)의 엄격한 계층 구조화: 버튼과 입력창에는 단단하고 조밀한 `{rounded.md}` (8px)를, 메인 콘텐츠 카드 및 가이드 패널에는 안정적인 `{rounded.lg}` (12px)를 적용합니다.
- 대담하고 일정한 컴포넌트 리듬 여백 `{spacing.section}` (96px)을 유지하여 차분하고 구조적인 탐색 경험을 유도합니다.

## Colors

### Brand & Accent
- **Power Blue / Primary** (`{colors.primary}` — #0066FF): 플랫폼을 관통하는 시그니처 엑센트 블루. Primary CTA 버튼 백그라운드, 메인 매칭 점수 링, 핵심 도약 그래프 그래픽에 독점적으로 사용되어 브랜드의 청년적 활력과 AI 테크 정체성을 선언합니다.
- **Power Blue Active** (`{colors.primary-active}` — #0052CC): 마우스 오버 및 컴포넌트 클릭 시 적용되는 딥 다운 블루 톤.
- **Power Blue Disabled** (`{colors.primary-disabled}` — #E2E8F0): 데이터가 비어있거나 비활성화된 상태를 채우는 라이트 그레이 레이어.
- **Accent Teal** (`{colors.accent-teal}` — #10B981): AI 적합도 분석 결과 '높음(90점 이상)' 상태, 또는 자기소개서의 '강점 키워드'를 하이라이트할 때 연동되는 시각적 신호입니다.
- **Accent Amber** (`{colors.accent-amber}` — #F59E0B): 보완이 필요한 자기소개서 문장이나 수정 가이드라인 제시 단계에서 주의를 환기하는 중간 톤 인디케이터입니다.

### Surface
- **Canvas** (`{colors.canvas}` — #F8FAFC): 웹사이트의 코어가 되는 바닥 전면부 컬러. 미세하게 청색조가 감도는 깨끗한 화이트 베이스.
- **Surface Soft** (`{colors.surface-soft}` — #F1F5F9): 캔버스보다 한 단계 어두운 영역 분할용 밴드, 혹은 푸터 배경 영역 컬러.
- **Surface Card** (`{colors.surface-card}` — #E2E8F0): 일반 채용 공고 카드, 직무 대시보드의 메인 블록 배경. 
- **Surface Navy Strong** (`{colors.surface-navy-strong}` — #0A1128): 상단 GNB 네비게이션 또는 특정 다크 모달창에 적용되는 고밀도 밀폐형 서피스.
- **Surface Dark** (`{colors.surface-dark}` — #0A1128): 로고의 기본색이 되는 스킨이자, 생성형 AI 자소서 분석 창 내부, 실제 코드/텍스트가 인풋/아웃풋되는 최상위 인텔리전스 딥 로열 네이비 패널.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #1E2640): 다크 패널 내부의 추가적인 결과 카드 및 세부 내역 레이어.
- **Hairline** (`{colors.hairline}` — #E2E8F0): 라이트 테마의 전면적인 경계를 짓는 1px 씬 보더 톤. 컴포넌트의 기하학적 그리드를 완성합니다.
- **Hairline Soft** (`{colors.hairline-soft}` — #F1F5F9): 카드 내부의 구획 정리용 로우 콘트라스트 디바이더 선.

### Text
- **Ink** (`{colors.ink}` — #0A1128): 모든 메인 헤드라인과 로고 워드마크, 핵심 수치 데이터에 적용되는 고밀도 딥 로열 네이비 잉크.
- **Body Strong** (`{colors.body-strong}` — #0F172A): 리드 텍스트, 하이라이트 문장용 고휘도 다크 그레이.
- **Body** (`{colors.body}` — #334155): 일반 설명글, 디폴트 러닝 텍스트용 미디움 슬레이트 그레이. 눈의 피로를 최소화합니다.
- **Muted** (`{colors.muted}` — #64748B): 채용 공고의 서브 정보(경력, 학력, 마감일), GNB 비활성 메뉴, 바디 캡션 텍스트.
- **Muted Soft** (`{colors.muted-soft}` — #94A3B8): 카피라이트 문구, 디스에이블드 텍스트 상태, 인풋창의 플레이스홀더 컬러.
- **On Primary** (`{colors.on-primary}` — #ffffff): 파워 블루 버튼 내부의 텍스트용 화이트.
- **On Dark** (`{colors.on-dark}` — #F8FAFC): 딥 네이비 AI 분석 패널 위 메인 텍스트 및 수정 제안 텍스트 컬러.
- **On Dark Soft** (`{colors.on-dark-soft}` — #94A3B8): 다크 스페이스 속 메타 데이터 서브 컬러.

### Semantic
- **Success** (`{colors.success}` — #10B981): 분석 완결, 매칭 우수 인디케이터.
- **Warning** (`{colors.warning}` — #F59E0B): 자기소개서 수정 필요 경고 가이드라인 안내 컬러.
- **Error** (`{colors.error}` — #EF4444): 필수 누락 직무 키워드 경고 서체 컬러.

## Typography

### Font Family
본 시스템은 정보의 명확성과 테크 플랫폼으로서의 구조적 완성도를 극대화하기 위해 글로벌 표준 산세리프인 **Pretendard**를 국문 메인으로, **Inter**를 영문 및 숫자 메인 서체로 지정합니다. AI 분석 코드 블록 및 데이터 스키마 명시 구역에는 **JetBrains Mono**를 연동합니다.

타이포그래피의 운용 원칙은 단단하고 고정밀화된 배치에 있습니다:
- 디스플레이 크기(H1, H2, H3) 서체 → Pretendard / Inter 조합 위 자간을 과감하게 축소(`-0.02em`에서 `-0.05em`)하여 데이터의 밀도감을 부여합니다.
- 본문 및 UI 레이블 서체 → Regular/Medium 굵기를 철저히 준수하고 충분한 행간(`1.6`에서 `1.65`)을 설정하여 복잡한 컨설팅 피드백 문장을 청년 사용자가 쾌적하게 정독할 수 있도록 제안합니다.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 56px | 700 | 1.15 | -1.5px | 메인 홈 히어로 카피 ("쉬었음에서 일했음으로") |
| `{typography.display-lg}` | 42px | 700 | 1.2 | -1px | 대형 대시보드 타이틀, 핵심 가치 인트로 섹션 헤드 |
| `{typography.display-md}` | 32px | 600 | 1.25 | -0.5px | 자소서 분석 대단원 헤더, 모델 매칭 결과 메인 점수 뷰 |
| `{typography.display-sm}` | 24px | 600 | 1.3 | -0.3px | 컴포넌트 모달 대제목, 카드형 메인 섹션 타이틀 |
| `{typography.title-lg}` | 20px | 600 | 1.4 | 0 | 리스트 항목별 메인 타이틀, 채용 공고명 제목 |
| `{typography.title-md}` | 18px | 500 | 1.45 | 0 | 피처 카드 타이틀, 유저 프로필 섹션 서브 헤드 |
| `{typography.title-sm}` | 16px | 500 | 1.45 | 0 | 세부 컨설팅 가이드 인덱스, 폼 필드 레이블명 |
| `{typography.body-md}` | 15px | 400 | 1.6 | 0 | 가이드라인 추천 문장 본문, 자기소개서 원문 피드백 텍스트 |
| `{typography.body-sm}` | 13px | 400 | 1.6 | 0 | 데이터 테이블 내부 텍스트, 푸터 세부 본문 카피 |
| `{typography.caption}` | 12px | 500 | 1.4 | 0 | 배지 컴포넌트 텍스트, 인풋 하단 안내 캡션 문구 |
| `{typography.caption-uppercase}`| 11px | 600 | 1.4 | 1px | 테크 스택 태그("REACT 19", "VITE 7"), "NEW" 강조 라벨 |
| `{typography.code}` | 14px | 400 | 1.65 | 0 | JSON 분석 페이로드 구조 뷰, API 가이드라인 (JetBrains Mono) |
| `{typography.button}` | 14px | 600 | 1.0 | 0 | 메인 Action 버튼 텍스트 일체 |
| `{typography.nav-link}` | 14px | 500 | 1.4 | 0 | GNB 메인 메뉴 아이템 텍스트 |

## Layout

### Spacing System
- **Base unit:** 4px 배수 시스템 적용.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- **Section padding:** 대형 섹션 간의 수직 리듬은 철저히 `{spacing.section}` (96px) 공백을 유지하여 인지적 과부하를 줄입니다.
- **Card internal padding:** 피처 블록 및 채용 카드 내부는 `{spacing.xl}` (32px)의 여백을 두어 정보가 밀착되지 않게 숨통을 틔워줍니다. 상세 가이드 로그 창 및 JSON 윈도우는 `{spacing.lg}` (24px)를 사용합니다.

### Grid & Container
- **Max content width:** 대시보드 및 콘텐츠 메인 가로 영역은 최대 `1200px` 중앙 정렬 그리드로 캡핑합니다.
- **Hero & Split Layout:** 메인 히어로 구역은 6-6 대칭 컬럼 구조를 취하여 좌측에는 명확한 가치 제안 텍스트와 메인 액션 버튼을, 우측에는 AI 분석 아티팩트를 시각화하는 `{component.hero-illustration-card}`를 배치합니다.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat Floor | 그림자 없음, 보더 없음 | 메인 웹 페이지 바닥 레이어 (`#F8FAFC`), GNB 메인 밴드 영역 |
| Tech Hairline | 1px `{colors.hairline}` 경계 테두리 | 인풋 박스 필드, 세부 내역 테이블 가이드 격자선 |
| Soft Card Elevation | `{colors.surface-soft}` 베이스, 그림자 최소화 | 채용 공고 정보 카드 블록 일체 |
| Intelligence Dark Panel | `{colors.surface-dark}` 베이스, 고대비 보더 탑재 | 실시간 생성형 AI 컨설팅 결과 뷰 스페이스 (`#0A1128`) |
| Focus Outer Ring | 3px 파워 블루 오프셋 라이트 링 투사 | 활성화된 입력 폼, 마우스 포커스 상태 컴포넌트 |

본 디자인 스펙은 **그림자를 통한 입체감(Shadow Effect)을 극도로 절제**합니다. 대신 서피스 고유의 컬러 블록 명도 대비와 정교한 `{colors.hairline}` (1px 테두리) 조합만으로 완벽한 인텔리전스 레이어를 구현해 냅니다.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | 인풋 필드 내부의 아주 작은 텍스트 삭제 뱃지, 상태 미니 점 |
| `{rounded.sm}` | 6px | 드롭다운 필터 리스트 박 팝업, 인라인 버튼 크롬 |
| `{rounded.md}` | 8px | 기본 CTA 작동 버튼, 텍스트 인풋창, 대시보드 탭 스위처 |
| `{rounded.lg}` | 12px | 대형 정보 콘텐츠 카드(채용 공고, AI 수정 피드백 스페이스 카드) |
| `{rounded.xl}` | 16px | 홈 스페이스 우측 메인 대형 아티팩트 보드 윈도우 |
| `{rounded.pill}` | 9999px | 기술 스택 뱃지 라벨 일체, 실시간 매칭 상태 표시 캡슐 |
| `{rounded.full}` | 50% / 9999px | 원형 유저 프로필 아바타 영역, 아이콘 전용 라운드 버튼 |

## Components

### Top Navigation

**`top-nav`** — 상단 전면에 고정되는 기술 네비게이션 허브. 높이 70px, `{colors.canvas}` 백그라운드. 좌측 영역에 Neet2Work 타이포그래피 워드마크 배치(텍스트 색상 `#0A1128`, 강조 색상 `#0066FF`). 중앙부에 플랫폼 핵심 메뉴 레이아웃 배치. `{typography.nav-link}` 스펙 바인딩.

### Buttons

**`button-primary`** — 플랫폼 최고의 시각적 타격점을 담당하는 파워 블루 메인 단추. 배경색 `{colors.primary}` (#0066FF), 텍스트색 `{colors.on-primary}` (화이트), 서체 `{typography.button}`, 최종 높이 44px 스케일 마운트, 라운드값 `{rounded.md}` (8px). 클릭 혹은 마우스 오버 시 `{component.button-primary-active}` 스펙인 `{colors.primary-active}` (#0052CC) 컬러 칩으로 부드럽게 트랜지션 처리.

**`button-secondary`** — 로우 이펙트 액션 단추. 배경색 `{colors.surface-soft}`, 글자색 `{colors.ink}`, 외곽선 `1px solid #E2E8F0` 결합 모듈.

**`button-secondary-on-dark`** — 짙은 다크 패널 창 내부 전용 제어 단추. 배경색 `{colors.surface-dark-elevated}` (#1E2640), 글자색 화이트 바인딩. 다크 서피스 특성을 헤치지 않기 위해 내부 톤을 지속 유지하는 성격을 띱니다.

### Cards & Containers

**`hero-band`** — 메인 게이트웨이 유닛. 6-6 대칭 구조 레이아웃 스페이스로 96px 세션 패딩 장착. `#F8FAFC` 베이스 위에서 웅장하게 전개됩니다.

**`feature-card`** — 3열 그리드 구조 하단 기능 설명 전용 블록. 배경색 `{colors.surface-soft}` (#F1F5F9), 라운드 `{rounded.lg}`, 내부 충전 마진 `{spacing.xl}` (32px).

**`product-mockup-card-dark`** — 유저가 마주하게 될 실제 AI 컨설팅 인터페이스 데모 크롬. 배경색 `{colors.surface-dark}` (#0A1128), 자소서 텍스트 분석 라인 하이라이팅 연출, 라운드 `{rounded.lg}` 규격화.

**`code-window-card`** — 백엔드 데이터 및 API 연동 구조를 증명하는 스페셜리스트 데이터 패널. 배경색 `{colors.surface-dark}` (#0A1128), 내부 원문 블록 `{colors.surface-dark-soft}`, 가독성 높은 폰트 스펙 `{typography.code}` (JetBrains Mono) 탑재.

### Inputs & Forms

**`text-input`** — 자기소개서 원문을 복사 붙여넣기 하거나 채용 조건 검색어를 타이핑하는 핵심 아웃라인 인풋 폼. 배경색 `#ffffff`, 서체 잉크 `{colors.ink}`, 높이 44px, 라운드 `{rounded.md}` 엄격 수용. 테두리는 기본 `{colors.hairline}` 셋업.

**`text-input-focused`** — 입력창 마우스 활성화 상태 포커스 로직. 외곽선 경계선 컬러 스위칭이 발생하며 보더 주위로 `3px` 두께의 파워 블루 알파 15% 감쇠 아우터 글로우 링 가동.

---

## Do's and Don'ts

### Do
- 모든 레이아웃의 기본 바닥 레이어는 요청하신 슬레이트 화이트 캔버스(`{colors.canvas}` — #F8FAFC) 스킨을 무조건 엄수하십시오.
- 디스플레이 크기의 대형 헤드라인 타이틀들은 반드시 딥 로열 네이비 잉크 컬러(`#0A1128`)를 적용하고, 글자 자간 간격을 좁게 미세 압축(-0.3px to -1.5px) 처리해 주십시오. 단단한 압축 자간만이 가볍지 않은 인텔리전스 무드를 발산합니다.
- 시그니처 파워 블루 컬러는 흰 바탕 위에서 핵심적인 액션 단추와 매칭 결과 하이라이트에만 엄격하게 한정 격리하여 투입하십시오.
- AI 가이드라인 제시 구역과 모달 내부, 코드 아티팩트 창은 반드시 딥 로열 네이비 서피스 패널(`{colors.surface-dark}` — #0A1128)을 적용하여 테크 플랫폼으로서의 반전 몰입감을 연출하십시오.

### Don't
- 웹 배경색인 슬레이트 화이트 캔버스 바닥면에 탁하고 누런 크림색이나 채도가 높은 그레이 칩을 절대 섞지 마십시오. 오직 청량한 `#F8FAFC`만이 핵심 정체성입니다.
- 정보 영역 경계선을 그릴 때 블랙이나 원색 라인을 마구 그어 화면을 쪼개지 마십시오. 오직 지정된 씬 그레이 `{colors.hairline}` 토큰만을 활용해 미세하고 비밀스럽게 경계를 구획하십시오.
- 모바일 화면 레이아웃 스케일 다운 시, 정보 유실을 방지한다는 핑계로 코드 블록 내부 문장들을 강제 줄바꿈(Word-wrap)해 깨뜨리지 마십시오. 가로 가변 스크롤링 정책을 그대로 고수하십시오.