import { StitchShell } from "./StitchShell";

const features = [
  {
    title: "AI 자소서 분석",
    text: "직무 기술서와 자기소개서를 정교하게 대조해 합격 가능성과 보완 포인트를 수치화합니다."
  },
  {
    title: "맞춤형 채용 공고",
    text: "Playwright 기반 수집으로 흩어진 공고를 조건에 맞춰 필터링하고 비교 가능한 목록으로 정리합니다."
  },
  {
    title: "커리어 로드맵",
    text: "분석 결과를 다음 행동으로 이어지도록 기술 스택, 문장 개선, 지원 우선순위로 나눕니다."
  }
];

const stack = ["React 19", "Express 5", "PostgreSQL 17", "Generative AI"];

export function StitchHome() {
  return (
    <StitchShell active="/stitch_export">
      <section className="stitchOnlyHero">
        <div>
          <p className="stitchOnlyEyebrow">From NEET to WORK</p>
          <h1>
            쉬었음에서 <span>일했음</span>으로, 당신의 가능성을 연결합니다
          </h1>
          <p>
            AI 기반 자소서 분석과 맞춤형 채용 공고 수집으로 불확실한 취업 준비의 시간을
            데이터 기반의 확신으로 바꿔보세요.
          </p>
          <div className="stitchOnlyActions">
            <a className="stitchOnlyPrimary" href="/stitch_export/ai">
              자소서 분석 시작하기
            </a>
            <a className="stitchOnlyGhost" href="/stitch_export/jobs">
              채용 공고 둘러보기
            </a>
          </div>
        </div>
        <aside className="stitchOnlyHeroVisual">
          <div className="stitchOnlyBadge">AI Career Matching</div>
          <strong>92%</strong>
          <p>회원님의 역량과 높은 일치도를 보이는 공고를 우선 추천합니다.</p>
        </aside>
      </section>

      <section className="stitchOnlyBand">
        <div className="stitchOnlySectionTitle">
          <p>Bridge</p>
          <h2>'Need to Work'가 '일했음'이 되기까지</h2>
        </div>
        <div className="stitchOnlySplit">
          <article>
            <span>Before</span>
            <h3>막연함</h3>
            <p>무엇부터 시작해야 할지 모르는 막연함, 직무에 대한 불확신, 파편화된 채용 정보 사이의 피로감.</p>
          </article>
          <article className="growth">
            <span>After</span>
            <h3>구조화된 실행</h3>
            <p>데이터로 증명된 자소서, 나에게 꼭 맞는 채용 기회, 성장을 향한 명확한 로드맵과 자신감.</p>
          </article>
        </div>
      </section>

      <section className="stitchOnlySection">
        <div className="stitchOnlySectionTitle">
          <p>Core features</p>
          <h2>취업의 모든 과정을 AI와 데이터로 혁신합니다</h2>
        </div>
        <div className="stitchOnlyFeatureGrid">
          {features.map((feature) => (
            <article key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <a href={feature.title.includes("자소서") ? "/stitch_export/ai" : "/stitch_export/jobs-filter"}>
                관련 화면 보기
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="stitchOnlyBand">
        <div className="stitchOnlySectionTitle">
          <p>Technology</p>
          <h2>최신 기술로 구축된 신뢰</h2>
        </div>
        <div className="stitchOnlyStackGrid">
          {stack.map((item) => (
            <div key={item}>
              <span>{item.split(" ")[0]}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="stitchOnlyCtaPanel">
        <h2>당신의 새로운 시작을 응원합니다.</h2>
        <p>AI 자소서 분석을 통해 잠재력을 발견하고, 당신에게 딱 맞는 커리어를 시작해 보세요.</p>
        <a className="stitchOnlyPrimary" href="/stitch_export/ai">
          무료로 분석 시작하기
        </a>
      </section>
    </StitchShell>
  );
}
