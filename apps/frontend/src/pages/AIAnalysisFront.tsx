import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

const beforeTags = ["모호한 표현", "자신감 부족"];
const afterTags = ["강점 추출", "직무 키워드 최적화", "능동적 태도 강조"];

const supportFeatures = [
  {
    icon: "OK",
    title: "현직자 데이터 기반",
    text: "실제 합격 자기소개서 5만 건 이상의 데이터를 학습하여 현업에서 선호하는 문장을 추천합니다."
  },
  {
    icon: "KEY",
    title: "핵심 키워드 분석",
    text: "작성하신 텍스트에서 직무와 연관된 핵심 역량 키워드를 자동으로 추출하여 강조합니다."
  },
  {
    icon: "DOC",
    title: "맞춤형 자기소개서 생성",
    text: "단순 문장 교정을 넘어, 지원하시는 기업의 인재상에 맞춘 전체 문항 구성을 도와드립니다."
  }
];

export function AIAnalysisFront() {
  return (
    <main className="aiAnalysisPage">
      <HomeTopNav active="analysis" />

      <section className="aiAnalysisHero">
        <div className="aiAnalysisHeroCopy">
          <span>AI 기반 경력 재구성 서비스</span>
          <h1>
            당신의 공백기를
            <br />
            <strong>전문적인 경력 언어</strong>로 바꿉니다.
          </h1>
          <p>
            니트(NEET) 청년들의 소중한 경험과 독학의 시간을 인사 담당자가 매력을 느낄 수 있는
            실무 중심의 텍스트로 전환해 드립니다. AI가 제안하는 직무 맞춤형 키워드를 확인해보세요.
          </p>
          <div className="aiAnalysisHeroActions">
            <a href="#experience">무료로 시작하기 →</a>
            <p>
              <span aria-hidden="true">✓</span>
              현재 12,402명의 청년이 이용 중
            </p>
          </div>
        </div>

        <aside className="aiAnalysisPreview" aria-label="AI 분석 인사이트 미리보기">
          <div className="aiAnalysisPreviewImage">
            <div>
              <span>CAREER</span>
              <strong>AI Resume Guide</strong>
              <p>workspace · keywords · growth</p>
            </div>
          </div>
          <div className="aiAnalysisInsight">
            <p>AI 통찰</p>
            <blockquote>
              "공백기는 정지된 시간이 아니라, 자신만의 경쟁력을 준비한 지속적인 성장의 과정입니다."
            </blockquote>
          </div>
        </aside>
      </section>

      <section className="aiComparisonSection">
        <div className="aiSectionTitle">
          <h2>놀라운 변화를 확인하세요</h2>
          <p>단순한 표현을 기업이 원하는 성과 중심의 언어로 교정합니다.</p>
        </div>

        <div className="aiComparisonGrid">
          <article className="aiBeforeCard">
            <div className="aiCardLabel">
              <span aria-hidden="true">!</span>
              <strong>변경 전</strong>
            </div>
            <div className="aiQuoteBox">
              <p>"집에서 그냥 코딩 공부 좀 했습니다. 프로젝트도 하나 해봤는데 그냥 평범해요."</p>
            </div>
            <div className="aiTagGroup muted">
              {beforeTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </article>

          <div className="aiArrow" aria-hidden="true">
            →
          </div>

          <article className="aiAfterCard">
            <div className="aiCardLabel">
              <span aria-hidden="true">AI</span>
              <strong>변경 후 (AI 가이드 적용)</strong>
            </div>
            <div className="aiQuoteBox">
              <p>
                <strong>
                  React와 Vite를 활용한 개인 프로젝트 수행을 통해 프론트엔드 개발 역량을 확보하고,
                  자기주도적인 지속 학습 루틴을 구축했습니다.
                </strong>{" "}
                기술적 문제 해결 과정을 블로그에 기록하며 역량을 고도화했습니다.
              </p>
            </div>
            <div className="aiTagGroup">
              {afterTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="aiExperienceSection" id="experience">
        <div className="aiExperiencePanel">
          <header>
            <div className="aiExperienceIcon">AI</div>
            <div>
              <h2>나의 경험 직접 변환해보기</h2>
              <p>솔직하고 편안하게 당신의 이야기를 적어주세요. AI가 보석을 찾아드릴게요.</p>
            </div>
          </header>

          <form className="aiExperienceForm">
            <div className="aiFormGrid">
              <label>
                <span>희망 직무 선택</span>
                <select defaultValue="">
                  <option value="">직무를 선택하세요</option>
                  <option value="frontend">프론트엔드 개발자</option>
                  <option value="backend">백엔드 개발자</option>
                  <option value="design">UI/UX 디자이너</option>
                  <option value="marketing">디지털 마케팅</option>
                  <option value="planning">서비스 기획</option>
                </select>
              </label>
              <fieldset>
                <legend>교정 톤(Tone)</legend>
                <div>
                  <button className="active" type="button">
                    전문적인
                  </button>
                  <button type="button">친근한</button>
                </div>
              </fieldset>
            </div>

            <label>
              <span>당신의 경험 (예: 공백기 동안 무엇을 했나요?)</span>
              <textarea
                placeholder="예: 6개월 동안 학원을 다니지 않고 혼자서 유튜브를 보며 파이썬을 공부했습니다. 간단한 크롤링 프로그램도 만들어봤는데 어디에 활용할 수 있을지 모르겠습니다."
                rows={6}
              />
            </label>

            <a className="aiSubmitButton" href="/ai-analysis/details">
              ✦ 내 자기소개서 생성하기
            </a>
          </form>

          <aside className="aiWritingTip">
            <span aria-hidden="true">💡</span>
            <p>
              <strong>작성 팁:</strong> 구체적인 성과나 수치가 없어도 괜찮습니다. 무언가를 시도했던 과정과
              동기를 적어주시면 AI가 그 안에서 직무 역량을 찾아냅니다.
            </p>
          </aside>
        </div>
      </section>

      <section className="aiSupportFeatureSection">
        <div className="aiSupportFeatureGrid">
          {supportFeatures.map((feature) => (
            <article key={feature.title}>
              <span aria-hidden="true">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
