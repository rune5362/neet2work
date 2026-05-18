import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

const strengths = [
  "대규모 트래픽 처리 경험",
  "React 성능 최적화",
  "CI/CD 파이프라인 구축",
  "디자인 시스템 리딩",
  "TypeScript 아키텍처"
];

const optimizations = [
  {
    before: "프론트엔드 성능 최적화를 통해 사이트 속도를 개선했습니다.",
    after:
      "Lighthouse 성능 점수를 65점에서 92점으로 41% 향상시켰으며, 코드 스플리팅 적용으로 초기 로딩 속도를 1.2초 단축했습니다."
  },
  {
    before: "팀 프로젝트의 코드 리뷰를 주도하여 퀄리티를 높였습니다.",
    after:
      "주간 코드 리뷰 세션을 공식화하여 개발팀 코드 컨벤션 준수율을 95%까지 끌어올렸으며, 런타임 에러 발생률을 20% 감소시켰습니다."
  }
];

const skillMetrics = [
  { label: "React / Next.js", score: 100 },
  { label: "TypeScript", score: 90 },
  { label: "Unit/E2E Testing", score: 65, warning: "테스트 코드 작성 경험 보완 권장" },
  { label: "Node.js / GraphQL", score: 40 }
];

const keywords = ["SSR/SSG", "Webpack", "Recoil", "Docker"];

export function AIAnalysisDetails() {
  return (
    <main className="aiDetailsPage">
      <HomeTopNav active="analysis" />

      <section className="aiDetailsHero">
        <div className="aiDetailsHeroCard">
          <div className="aiDetailsHeroCopy">
            <div className="aiDetailsStatus">
              <span aria-hidden="true">✓</span>
              <strong>분석 완료</strong>
            </div>
            <h1>Senior Frontend Developer</h1>
            <p>
              귀하의 현재 이력서는 목표하신 Senior Frontend Developer 직무의 요구사항과 매우 높은
              일치도를 보이고 있습니다. 다만 일부 기술 스택과 테스트 경험 보완이 필요합니다.
            </p>
            <div className="aiDetailsActions">
              <button type="button">이력서 다운로드</button>
              <button type="button">즉시 지원하기</button>
            </div>
          </div>
          <div className="aiMatchScore" aria-label="매칭 점수 94%">
            <div className="aiCircularProgress" />
            <div>
              <strong>94%</strong>
              <span>Match Score</span>
            </div>
          </div>
        </div>
      </section>

      <section className="aiDetailsMain">
        <div className="aiDetailsLeft">
          <article className="aiDetailsPanel">
            <h2>
              <span aria-hidden="true">✓</span>
              핵심 강점 분석
            </h2>
            <div className="aiStrengthTags">
              {strengths.map((strength) => (
                <span key={strength}>{strength}</span>
              ))}
            </div>
            <p>
              공고에서 요구하는 시니어 수준의 아키텍처 설계 경험이 이력서 곳곳에 잘 녹아있습니다.
              특히 React 기반의 대규모 전환 프로젝트 경험은 가장 강력한 경쟁력입니다.
            </p>
          </article>

          <section className="aiOptimizationSection">
            <h2>
              <span aria-hidden="true">AI</span>
              AI 문장 최적화 제안
            </h2>
            {optimizations.map((item) => (
              <article className="aiOptimizationCard" key={item.before}>
                <div>
                  <span>Before</span>
                  <p>{item.before}</p>
                </div>
                <div>
                  <span>After (AI Optimized)</span>
                  <p>{item.after}</p>
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className="aiDetailsRight">
          <section className="aiDetailsPanel">
            <h2>기술 매칭 세부 지표</h2>
            <div className="aiSkillList">
              {skillMetrics.map((skill) => (
                <div className="aiSkillMetric" key={skill.label}>
                  <div>
                    <span>{skill.label}</span>
                    <strong>{skill.score}%</strong>
                  </div>
                  <div className="aiSkillTrack">
                    <span style={{ width: `${skill.score}%` }} />
                  </div>
                  {skill.warning ? <p>{skill.warning}</p> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="aiInsightPanel">
            <header>
              <span aria-hidden="true">DATA</span>
              <h2>Raw AI Insights</h2>
            </header>
            <div className="aiKeywordBox">
              <span>Keyword Optimization Map</span>
              <div>
                {keywords.map((keyword) => (
                  <em className={keyword === "Docker" ? "muted" : ""} key={keyword}>
                    {keyword}
                  </em>
                ))}
              </div>
            </div>
            <p>
              <strong>분석 엔진 비고:</strong>
              사용자의 이력서에는 확장성에 대한 표현이 부족합니다. 시스템 아키텍처 설명 시 Scalable
              또는 Robust와 관련된 키워드를 추가하면 ATS 통과 확률이 12% 증가할 것으로 예측됩니다.
            </p>
          </section>
        </aside>
      </section>

      <section className="aiDetailsFinalAction">
        <h2>완성된 리포트를 바탕으로 이력서를 업데이트할까요?</h2>
        <div>
          <button type="button">리포트 PDF 다운로드</button>
          <button type="button">이력서 자동 수정하기</button>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
