import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

const jobs = [
  {
    icon: "DEV",
    isNew: true,
    title: "시니어 풀스택 엔지니어",
    company: "TechFlow Inc.",
    tags: ["원격", "서울, KR"],
    description:
      "AI 기반 SaaS 플랫폼 확장을 위한 기술 리더를 찾습니다. React, Node.js 및 클라우드 인프라 경험이 필요합니다."
  },
  {
    icon: "UX",
    title: "프로덕트 디자이너 (UX/UI)",
    company: "Creative Logic",
    tags: ["하이브리드", "강남"],
    description:
      "생산성 도구의 미래를 설계하세요. 복잡한 시스템과 아름다운 타이포그래피를 사랑하는 디자이너를 환영합니다."
  },
  {
    icon: "ML",
    title: "데이터 사이언티스트 (머신러닝)",
    company: "Insight Data Co.",
    tags: ["원격"],
    description:
      "수백만 명에게 영향을 미치는 추천 엔진을 구축할 AI 팀에 합류하세요. Python 및 PyTorch 역량이 필수입니다."
  },
  {
    icon: "MKT",
    title: "마케팅 전략가",
    company: "Growth Dynamics",
    tags: ["상주", "부산"],
    description:
      "신흥 핀테크 스타트업을 위한 고영향력 성장 전략을 개발하세요. 데이터 중심 사고방식이 필수입니다."
  },
  {
    icon: "SEC",
    title: "보안 운영 분석가",
    company: "CyberGuard Global",
    tags: ["원격"],
    description:
      "엔터프라이즈 고객의 디지털 인프라를 보호합니다. 모니터링, 위협 헌팅 및 사고 대응 업무를 수행합니다."
  },
  {
    icon: "PM",
    title: "기술 프로젝트 매니저",
    company: "ScaleUp Systems",
    tags: ["하이브리드", "서울"],
    description:
      "비즈니스 요구사항과 엔지니어링 우수성 사이의 가교 역할을 수행하세요. 소프트웨어 개발 배경을 가진 애자일 전문가를 찾습니다."
  }
];

export function Jobs() {
  return (
    <main className="jobsPage">
      <HomeTopNav active="jobs" />

      <section className="jobsContent">
        <div className="jobsFilterBar" aria-label="채용공고 검색과 필터">
          <label className="jobsSearchField">
            <span>검색어</span>
            <input placeholder="직무, 회사명 또는 키워드" type="search" />
          </label>
          <div className="jobsFilterControls">
            <label>
              <span>산업</span>
              <select defaultValue="산업">
                <option>산업</option>
                <option>기술</option>
                <option>금융</option>
                <option>디자인</option>
                <option>마케팅</option>
              </select>
            </label>
            <label>
              <span>경력 수준</span>
              <select defaultValue="경력 수준">
                <option>경력 수준</option>
                <option>신입 (0-2년)</option>
                <option>주니어 (3-5년)</option>
                <option>시니어 (6년 이상)</option>
              </select>
            </label>
            <label>
              <span>근무 형태</span>
              <select defaultValue="근무 형태">
                <option>근무 형태</option>
                <option>상주</option>
                <option>원격</option>
                <option>하이브리드</option>
              </select>
            </label>
            <button type="button">검색</button>
          </div>
        </div>

        <header className="jobsHeading">
          <h1>
            총 <span>1,240</span>개의 공고가 당신을 기다리고 있습니다
          </h1>
        </header>

        <section className="jobsGrid" aria-label="채용공고 목록">
          {jobs.map((job) => (
            <article className="jobsCard" key={`${job.company}-${job.title}`}>
              <div className="jobsCardTop">
                <div className="jobsCardIcon">{job.icon}</div>
                {job.isNew ? <span className="jobsNewBadge">New</span> : null}
              </div>
              <div className="jobsCardBody">
                <h2>{job.title}</h2>
                <p className="jobsCompany">{job.company}</p>
                <div className="jobsTags">
                  {job.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <p className="jobsDescription">{job.description}</p>
              </div>
              <div className="jobsCardActions">
                <a href="/jobs">상세 보기</a>
                <button type="button">AI 적합도 분석</button>
              </div>
            </article>
          ))}
        </section>

        <nav className="jobsPagination" aria-label="채용공고 페이지">
          <button type="button" aria-label="이전 페이지">
            ‹
          </button>
          <button className="active" type="button">
            1
          </button>
          <button type="button">2</button>
          <button type="button">3</button>
          <span>...</span>
          <button type="button">12</button>
          <button type="button" aria-label="다음 페이지">
            ›
          </button>
        </nav>
      </section>

      <HomeFooter />
    </main>
  );
}
