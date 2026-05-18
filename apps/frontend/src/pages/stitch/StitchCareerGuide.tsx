import { StitchShell } from "./StitchShell";

const guides = [
  ["1. 공고 기준 잡기", "관심 직무의 필수 기술과 우대 경험을 먼저 분리해 지원 우선순위를 정합니다."],
  ["2. 자소서 근거 보강", "공고의 핵심 키워드와 연결되는 프로젝트 결과, 수치, 협업 맥락을 문장에 추가합니다."],
  ["3. 지원 루틴 만들기", "AI 분석 리포트를 기준으로 공고 선택, 문서 수정, 지원 완료를 반복 가능한 루틴으로 만듭니다."]
];

export function StitchCareerGuide() {
  return (
    <StitchShell active="/stitch_export/career-guide">
      <section className="stitchOnlyJobHeader">
        <p className="stitchOnlyEyebrow">Career guide</p>
        <h1>커리어 전환을 위한 실행 가이드</h1>
        <p>stitch_export 메인 시안의 로드맵 흐름을 독립 페이지로 확장했습니다.</p>
      </section>
      <section className="stitchOnlyFeatureGrid stitchOnlyGuideGrid">
        {guides.map(([title, text]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <section className="stitchOnlyCtaPanel">
        <h2>분석 결과를 기준으로 다음 지원 공고를 선택하세요</h2>
        <a className="stitchOnlyPrimary" href="/stitch_export/jobs-filter">
          맞춤 공고 찾기
        </a>
      </section>
    </StitchShell>
  );
}

