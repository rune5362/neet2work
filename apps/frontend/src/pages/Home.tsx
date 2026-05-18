import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import symbolUrl from "../assets/logo/neet2work_symbol_reference_curve 1.png";

const features = [
  {
    icon: "W",
    title: "채용공고 수집",
    text: "수많은 채용 사이트를 돌아다닐 필요 없습니다. 당신의 조건에 맞는 최신 공고만 모아서 보여드립니다."
  },
  {
    icon: "AI",
    title: "AI 적합도 분석",
    text: "공고의 요구 역량과 당신의 보유 기술을 비교하여 합격 가능성을 정밀하게 수치화합니다."
  },
  {
    icon: "E",
    title: "자소서 수정 가이드",
    text: "AI가 당신의 경험을 가장 매력적인 전문 용어로 재구성하여 서류 통과율을 획기적으로 높여줍니다."
  }
];

const techStack = [
  ["React 19", "#61DAFB"],
  ["Vite 7", "#FFD62E"],
  ["Node.js", "#339933"],
  ["PostgreSQL 17", "#336791"],
  ["Tailwind CSS", "#0066FF"],
  ["Git", "#F05032"]
];

export function Home() {
  return (
    <main className="homePage">
      <HomeTopNav />

      <section className="homeHero" id="home">
        <div className="homeHeroCopy">
          <div className="homeHeroBadge">
            <span aria-hidden="true">AI</span>
            <span>AI 기반 커리어 도약 플랫폼</span>
          </div>
          <h1>
            쉬었음에서
            <br />
            <span>일했음</span>으로,
            <br />
            당신의 도약을 응원합니다
          </h1>
          <p>
            공백기를 커리어의 전환점으로 바꾸는 AI 엔진. 당신의 기술과 경험을 분석하여
            최적의 채용 공고와 맞춤형 자소서 가이드를 제공합니다.
          </p>
          <div className="homeHeroActions">
            <a className="homePrimaryAction" href="#analysis">
              지금 분석 시작하기
            </a>
            <a className="homeSecondaryAction" href="#features">
              서비스 둘러보기
            </a>
          </div>
        </div>

        <div className="homeHeroPanelWrap" id="analysis">
          <section className="homeAiPanel" aria-label="AI Resume Analyzer preview">
            <img className="homePanelSymbol" src={symbolUrl} alt="" aria-hidden="true" />
            <div className="homePanelChrome">
              <span />
              <span />
              <span />
              <strong>AI Resume Analyzer v1.2</strong>
            </div>
            <div className="homePanelStack">
              <div className="homeInputCard">
                <p>입력된 자기소개서 내용</p>
                <span>"3년간의 공백기 동안 저는 다양한 프로젝트를 수행하며..."</span>
              </div>
              <div className="homePulse">
                <span aria-hidden="true">AI</span>
              </div>
              <div className="homeSuggestionCard">
                <div>
                  <span aria-hidden="true">OK</span>
                  <p>AI 개선 제안</p>
                </div>
                <p>
                  '다양한 프로젝트'라는 표현 대신 <strong>'Vite와 React 19를 활용한 00 성능 최적화 프로젝트'</strong>와
                  같이 구체적인 기술 스택을 명시하면 전문성이 더욱 강조됩니다.
                </p>
              </div>
              <div className="homeMetricGrid">
                <div>
                  <p>기술 적합도</p>
                  <strong>94%</strong>
                </div>
                <div>
                  <p>취업 가능성</p>
                  <strong>High</strong>
                </div>
              </div>
            </div>
          </section>
          <div className="homeGlow" />
        </div>
      </section>

      <section className="homeFeatureSection" id="features">
        <div>
          <div className="homeSectionHeading">
            <h2>주요 기능</h2>
            <span />
          </div>
          <div className="homeFeatureGrid">
            {features.map((feature) => (
              <article className="homeFeatureCard" key={feature.title}>
                <div>
                  <span aria-hidden="true">{feature.icon}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="homeTechSection">
        <p>Powered by Modern Technology</p>
        <div>
          {techStack.map(([label, color]) => (
            <span className="homeTechChip" key={label}>
              <i style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="homeCtaSection" id="support">
        <div className="homeCtaCard">
          <div className="homeCtaDecor one" />
          <div className="homeCtaDecor two" />
          <div>
            <h2>지금 바로 당신의 커리어를 분석해보세요</h2>
            <p>
              무료 분석 리포트를 통해 당신의 숨겨진 가치를 발견하고
              <br />
              가장 잘 어울리는 공고를 확인하세요.
            </p>
            <a href="#analysis">무료로 시작하기</a>
          </div>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
