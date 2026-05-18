import { StitchShell } from "./StitchShell";

const modules = [
  ["공고 적합도 매칭", "지원하시는 공고의 직무 기술서와 당신의 자소서를 정교하게 대조합니다."],
  ["문장별 개선 제안", "단순 단어 포함 여부를 넘어 문맥과 경험의 결을 분석하여 수정 방향을 제시합니다."],
  ["역량 키워드 추출", "직무에서 중요하게 보는 기술과 경험을 추출하고 누락된 근거를 확인합니다."]
];

export function StitchAi() {
  return (
    <StitchShell active="/stitch_export/ai">
      <section className="stitchOnlyDarkHero">
        <p className="stitchOnlyEyebrow">AI resume analysis</p>
        <h1>내 자소서의 잠재력을 AI로 확인하세요</h1>
        <p>회원가입 시 첫 분석 리포트가 무료로 제공됩니다.</p>
        <a className="stitchOnlyLightButton" href="/stitch_export/apply">
          내 자소서 업로드하기
        </a>
        <a className="stitchOnlyDarkGhost" href="/stitch_export/activity">
          분석 리포트 샘플 보기
        </a>
      </section>

      <section className="stitchOnlySection">
        <div className="stitchOnlySectionTitle">
          <p>Analysis modules</p>
          <h2>당신의 성공을 위한 정밀 분석 솔루션</h2>
        </div>
        <div className="stitchOnlyFeatureGrid">
          {modules.map(([title, text]) => (
            <article className="ai" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stitchOnlyReport">
        <div>
          <span>JD Match</span>
          <strong>87%</strong>
          <p>TypeScript, React, Performance 역량이 공고와 강하게 연결됩니다.</p>
        </div>
        <div>
          <span>Missing Keywords</span>
          <strong>3</strong>
          <p>접근성, 테스트 자동화, 협업 지표를 보강하면 분석 점수가 올라갑니다.</p>
        </div>
      </section>
      <section className="stitchOnlyCtaPanel">
        <h2>준비되셨나요? 지금 바로 첫 분석을 시작하세요.</h2>
        <a className="stitchOnlyPrimary" href="/stitch_export/apply">
          내 자소서 업로드하기
        </a>
      </section>
    </StitchShell>
  );
}
