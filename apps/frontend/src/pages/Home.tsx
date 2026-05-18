import logoUrl from "../assets/logo/neet2work_logo_lockup_reference_curve 1.png";
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
    <main className="remixStitchPage">
      <nav className="remixTopNav" aria-label="주요 메뉴">
        <div className="remixNavInner">
          <div className="remixNavLeft">
            <a href="/" aria-label="Neet2Work 홈">
              <img src={logoUrl} alt="Neet2Work Logo" />
            </a>
            <div className="remixNavLinks">
              <a className="active" href="#home">
                홈
              </a>
              <a href="#features">채용공고</a>
              <a href="#analysis">AI 분석</a>
              <a href="#support">커뮤니티</a>
            </div>
          </div>
          <div className="remixNavActions">
            <a className="remixIconButton" href="#support" aria-label="알림">
              <svg aria-hidden="true" height="24" viewBox="0 -960 960 960" width="24">
                <path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z" />
              </svg>
            </a>
            <a className="remixIconButton" href="#support" aria-label="계정">
              <svg aria-hidden="true" height="24" viewBox="0 -960 960 960" width="24">
                <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z" />
              </svg>
            </a>
            <a className="remixStartButton" href="#analysis">
              시작하기
            </a>
          </div>
        </div>
      </nav>

      <section className="remixHero" id="home">
        <div className="remixHeroCopy">
          <div className="remixHeroBadge">
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
          <div className="remixHeroActions">
            <a className="remixPrimaryAction" href="#analysis">
              지금 분석 시작하기
            </a>
            <a className="remixSecondaryAction" href="#features">
              서비스 둘러보기
            </a>
          </div>
        </div>

        <div className="remixHeroPanelWrap" id="analysis">
          <section className="remixAiPanel" aria-label="AI Resume Analyzer preview">
            <img className="remixPanelSymbol" src={symbolUrl} alt="" aria-hidden="true" />
            <div className="remixPanelChrome">
              <span />
              <span />
              <span />
              <strong>AI Resume Analyzer v1.2</strong>
            </div>
            <div className="remixPanelStack">
              <div className="remixInputCard">
                <p>입력된 자기소개서 내용</p>
                <span>"3년간의 공백기 동안 저는 다양한 프로젝트를 수행하며..."</span>
              </div>
              <div className="remixPulse">
                <span aria-hidden="true">AI</span>
              </div>
              <div className="remixSuggestionCard">
                <div>
                  <span aria-hidden="true">OK</span>
                  <p>AI 개선 제안</p>
                </div>
                <p>
                  '다양한 프로젝트'라는 표현 대신 <strong>'Vite와 React 19를 활용한 00 성능 최적화 프로젝트'</strong>와
                  같이 구체적인 기술 스택을 명시하면 전문성이 더욱 강조됩니다.
                </p>
              </div>
              <div className="remixMetricGrid">
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
          <div className="remixGlow" />
        </div>
      </section>

      <section className="remixFeatureSection" id="features">
        <div>
          <div className="remixSectionHeading">
            <h2>주요 기능</h2>
            <span />
          </div>
          <div className="remixFeatureGrid">
            {features.map((feature) => (
              <article className="remixFeatureCard" key={feature.title}>
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

      <section className="remixTechSection">
        <p>Powered by Modern Technology</p>
        <div>
          {techStack.map(([label, color]) => (
            <span className="remixTechChip" key={label}>
              <i style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </section>

      <section className="remixCtaSection" id="support">
        <div className="remixCtaCard">
          <div className="remixCtaDecor one" />
          <div className="remixCtaDecor two" />
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

      <footer className="remixFooter">
        <div>
          <img src={logoUrl} alt="Neet2Work Logo" />
          <p>© 2024 Neet2Work. All rights reserved.</p>
        </div>
        <nav aria-label="푸터 링크">
          <a href="#support">이용약관</a>
          <a href="#support">개인정보처리방침</a>
          <a href="#support">고객지원</a>
          <a href="#support">문의하기</a>
        </nav>
      </footer>
    </main>
  );
}
