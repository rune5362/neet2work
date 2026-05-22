import { useEffect, useMemo, useState } from "react";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

type JobListing = {
  id: string;
  icon: string;
  isNew: boolean;
  title: string;
  company: string;
  source: string;
  category: string;
  country: string;
  language: string;
  location: string;
  salary?: string;
  experience: string;
  jobType: string;
  deadline: string;
  skills: string[];
  description: string;
};

type ActiveFilter = {
  key: string;
  value: string;
  onClear: () => void;
};

const jobsData: JobListing[] = [
  {
    id: "job-1",
    icon: "DEV",
    isNew: true,
    title: "시니어 풀스택 엔지니어 (SaaS)",
    company: "TechFlow Inc.",
    source: "Saramin",
    category: "개발",
    country: "한국",
    language: "한국어",
    location: "서울 강남구 (하이브리드)",
    salary: "6,000 - 8,000만 원",
    experience: "시니어 (6년 이상)",
    jobType: "정규직",
    deadline: "2026-06-30",
    skills: ["React", "TypeScript", "Node.js", "AWS", "Docker"],
    description:
      "AI 기반 SaaS 플랫폼 확장을 위한 기술 리더를 찾습니다. 최신 클라우드 인프라 설계와 대규모 아키텍처 개선 경험이 풍부한 리더를 환영합니다. 주도적인 개발 문화를 지향하며 엔지니어링 수준을 한 단계 높여줄 파트너를 구합니다."
  },
  {
    id: "job-2",
    icon: "UX",
    isNew: false,
    title: "글로벌 프로덕트 디자이너 (UI/UX Mobile App Designer)",
    company: "Creative Logic",
    source: "JobKorea",
    category: "디자인",
    country: "일본",
    language: "일본어",
    location: "도쿄 시부야",
    salary: "550 - 700만 엔",
    experience: "주니어 (3-5년)",
    jobType: "정규직",
    deadline: "2026-07-15",
    skills: ["Figma", "Sketch", "Prototyping", "Japanese"],
    description:
      "차세대 글로벌 협업 도구의 모바일 및 웹 UI/UX를 설계할 우수한 디자이너를 모십니다. 다국적 팀원들과의 적극적인 영어/일어 협업이 필요합니다. 아름답고 기능적인 컴포넌트를 설계하고, 완벽한 프로토타이핑을 구현하여 사용자 가치를 극대화합니다."
  },
  {
    id: "job-3",
    icon: "ML",
    isNew: true,
    title: "머신러닝 및 데이터 사이언티스트 (NLP/LLM)",
    company: "Insight Data Co.",
    source: "Wanted",
    category: "AI/데이터",
    country: "미국",
    language: "영어",
    location: "샌프란시스코 (원격 근무 가능)",
    salary: "$120k - $150k",
    experience: "시니어 (6년 이상)",
    jobType: "정규직",
    deadline: "상시 채용",
    skills: ["Python", "PyTorch", "LLM", "Transformers", "SQL"],
    description:
      "수백만 사용자에게 개인화된 AI 커리어 피드백과 이력서 정밀 분석을 전달하는 차세대 추천 엔진을 구축합니다. 대형 언어 모델 파인튜닝 경험자를 우대합니다. 자연어 처리, 데이터 분석 파이프라인의 고도화를 지향합니다."
  },
  {
    id: "job-4",
    icon: "MKT",
    isNew: false,
    title: "성장 마케팅 전략가 (Growth Hacker)",
    company: "Growth Dynamics",
    source: "Mynavi",
    category: "마케팅",
    country: "일본",
    language: "일본어",
    location: "오사카",
    salary: "450 - 600만 엔",
    experience: "주니어 (3-5년)",
    jobType: "계약직",
    deadline: "2026-06-15",
    skills: ["Google Analytics", "SQL", "SEO", "Growth Hacking"],
    description:
      "신흥 핀테크 스타트업 시장을 선점하기 위한 데이터 기반의 초고속 성장 마케팅 루프를 정의하고 실행합니다. A/B 테스트 및 유저 퍼널 분석 전문가를 환영합니다. 다양한 광고 플랫폼 유입 성과를 추적하고 캠페인을 최적화합니다."
  },
  {
    id: "job-5",
    icon: "SEC",
    isNew: false,
    title: "보안 운영 및 침해 대응 분석가 (SecOps Analyst)",
    company: "CyberGuard Global",
    source: "Green",
    category: "보안",
    country: "한국",
    language: "한국어",
    location: "서울 마포구",
    salary: "5,000 - 7,000만 원",
    experience: "주니어 (3-5년)",
    jobType: "정규직",
    deadline: "2026-08-31",
    skills: ["Firewall", "IDS/IPS", "Vulnerability Check", "Python"],
    description:
      "엔터프라이즈 글로벌 파트너의 중요한 디지털 인프라를 실시간 위협으로부터 안전하게 모니터링하고 차단하며 보안 위협의 인시던트 신속 대응 업무를 전담합니다. 취약점 모니터링 및 주기적인 침투 분석을 설계합니다."
  },
  {
    id: "job-6",
    icon: "PM",
    isNew: false,
    title: "Technical Project Manager (AI/Data Platform)",
    company: "ScaleUp Systems",
    source: "Saramin",
    category: "PM",
    country: "미국",
    language: "영어",
    location: "시애틀",
    experience: "시니어 (6년 이상)",
    jobType: "정규직",
    deadline: "2026-06-30",
    skills: ["Agile", "Scrum", "Jira", "Software Architecture"],
    description:
      "복잡한 비즈니스 엔지니어링 파이프라인과 인프라 요구사항 간의 가교 역할을 효율적으로 수행하며, 분산 애자일 스크럼 팀을 이끌어갈 소프트웨어 배경의 전문가를 구합니다. 비즈니스 이정표 수립 및 우선순위 정렬을 수행합니다."
  },
  {
    id: "job-7",
    icon: "DEV",
    isNew: true,
    title: "프론트엔드 개발자 (React/Next.js)",
    company: "PixelPerfect Inc.",
    source: "Wanted",
    category: "개발",
    country: "한국",
    language: "한국어",
    location: "서울 강남구",
    salary: "4,000 - 6,000만 원",
    experience: "신입 (0-2년)",
    jobType: "정규직",
    deadline: "2026-07-31",
    skills: ["React", "Next.js", "TypeScript", "Vanilla CSS"],
    description:
      "인터랙티브 웹 서비스를 구현하고 웹 성능 최적화를 진행할 신입 개발자를 모집합니다. 수준 높은 UX와 정교한 애니메이션 구현에 관심 있는 분을 찾습니다. 디자이너 및 기획자와의 긴밀한 커뮤니케이션 능력이 필요합니다."
  }
];

export function Jobs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const filteredJobs = useMemo(() => {
    return jobsData.filter((job) => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesText =
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.category.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.skills.some((skill) => skill.toLowerCase().includes(query));

        if (!matchesText) {
          return false;
        }
      }

      if (selectedCategory && job.category !== selectedCategory) return false;
      if (selectedCountry && job.country !== selectedCountry) return false;
      if (selectedLanguage && job.language !== selectedLanguage) return false;
      if (selectedExperience && job.experience !== selectedExperience) return false;
      if (selectedJobType && job.jobType !== selectedJobType) return false;

      return true;
    });
  }, [
    searchQuery,
    selectedCategory,
    selectedCountry,
    selectedLanguage,
    selectedExperience,
    selectedJobType
  ]);

  useEffect(() => {
    setIsLoading(true);
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    searchQuery,
    selectedCategory,
    selectedCountry,
    selectedLanguage,
    selectedExperience,
    selectedJobType
  ]);

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = [];
    if (searchQuery) {
      list.push({
        key: "query",
        value: `검색어: "${searchQuery}"`,
        onClear: () => setSearchQuery("")
      });
    }
    if (selectedCategory) {
      list.push({
        key: "category",
        value: `직무: ${selectedCategory}`,
        onClear: () => setSelectedCategory("")
      });
    }
    if (selectedCountry) {
      list.push({
        key: "country",
        value: `국가: ${selectedCountry}`,
        onClear: () => setSelectedCountry("")
      });
    }
    if (selectedLanguage) {
      list.push({
        key: "language",
        value: `언어: ${selectedLanguage}`,
        onClear: () => setSelectedLanguage("")
      });
    }
    if (selectedExperience) {
      list.push({
        key: "experience",
        value: `경력: ${selectedExperience}`,
        onClear: () => setSelectedExperience("")
      });
    }
    if (selectedJobType) {
      list.push({
        key: "jobType",
        value: `형태: ${selectedJobType}`,
        onClear: () => setSelectedJobType("")
      });
    }

    return list;
  }, [
    searchQuery,
    selectedCategory,
    selectedCountry,
    selectedLanguage,
    selectedExperience,
    selectedJobType
  ]);

  const selectedJob = useMemo(() => {
    return jobsData.find((job) => job.id === selectedJobId) ?? null;
  }, [selectedJobId]);

  const handleOpenDetail = (id: string) => {
    setSelectedJobId(id);
    setIsDetailLoading(true);
    window.setTimeout(() => {
      setIsDetailLoading(false);
    }, 300);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedCountry("");
    setSelectedLanguage("");
    setSelectedExperience("");
    setSelectedJobType("");
    setIsError(false);
  };

  return (
    <main className="jobsPage">
      <HomeTopNav active="jobs" />

      <section className="jobsContent">
        <div className="jobsStateSimulators">
          <span className="simLabel">기능 상태 리뷰</span>
          <button
            type="button"
            className={`simBtn ${isLoading ? "active" : ""}`}
            onClick={() => setIsLoading((current) => !current)}
          >
            로딩 {isLoading ? "OFF" : "ON"}
          </button>
          <button
            type="button"
            className={`simBtn ${isError ? "active" : ""}`}
            onClick={() => setIsError((current) => !current)}
          >
            에러 {isError ? "OFF" : "ON"}
          </button>
        </div>

        <div className="jobsFilterBar" aria-label="채용공고 검색과 필터">
          <label className="jobsSearchField">
            <span>검색어</span>
            <input
              placeholder="직무, 회사명, 스킬 또는 키워드 입력"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <div className="jobsFilterControls">
            <label>
              <span>직무</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="">직무 전체</option>
                <option value="개발">개발</option>
                <option value="AI/데이터">AI/데이터</option>
                <option value="디자인">디자인</option>
                <option value="마케팅">마케팅</option>
                <option value="보안">보안</option>
                <option value="PM">PM</option>
              </select>
            </label>
            <label>
              <span>국가</span>
              <select
                value={selectedCountry}
                onChange={(event) => setSelectedCountry(event.target.value)}
              >
                <option value="">국가 전체</option>
                <option value="한국">한국</option>
                <option value="일본">일본</option>
                <option value="미국">미국</option>
              </select>
            </label>
            <label>
              <span>언어</span>
              <select
                value={selectedLanguage}
                onChange={(event) => setSelectedLanguage(event.target.value)}
              >
                <option value="">언어 전체</option>
                <option value="한국어">한국어</option>
                <option value="일본어">일본어</option>
                <option value="영어">영어</option>
              </select>
            </label>
            <label>
              <span>경력 수준</span>
              <select
                value={selectedExperience}
                onChange={(event) => setSelectedExperience(event.target.value)}
              >
                <option value="">경력 전체</option>
                <option value="신입 (0-2년)">신입 (0-2년)</option>
                <option value="주니어 (3-5년)">주니어 (3-5년)</option>
                <option value="시니어 (6년 이상)">시니어 (6년 이상)</option>
              </select>
            </label>
            <label>
              <span>근무 형태</span>
              <select
                value={selectedJobType}
                onChange={(event) => setSelectedJobType(event.target.value)}
              >
                <option value="">근무형태 전체</option>
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="인턴">인턴</option>
              </select>
            </label>
            {activeFilters.length > 0 ? (
              <button
                type="button"
                className="jobsFilterResetBtn"
                onClick={handleResetFilters}
              >
                필터 초기화
              </button>
            ) : null}
          </div>
        </div>

        {activeFilters.length > 0 ? (
          <div className="jobsActiveFilterChips" aria-label="적용 중인 필터">
            {activeFilters.map((filter) => (
              <span className="jobsFilterChip" key={filter.key}>
                {filter.value}
                <button
                  aria-label={`${filter.value} 필터 지우기`}
                  type="button"
                  onClick={filter.onClear}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <header className="jobsHeading">
          <h1>
            총 <span>{filteredJobs.length}</span>개의 공고가 당신을 기다리고 있습니다
          </h1>
          {activeFilters.length > 0 ? (
            <p className="jobsFilterSummary">
              적용된 조건:{" "}
              <strong>{activeFilters.map((filter) => filter.value).join(", ")}</strong>
            </p>
          ) : null}
        </header>

        {isError ? (
          <div className="jobsErrorState" role="alert">
            <span className="material-symbols-outlined errorIcon">warning</span>
            <h3>서버와의 연결이 원활하지 않습니다</h3>
            <p>데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
            <button className="errorRetryBtn" type="button" onClick={() => setIsError(false)}>
              다시 시도하기
            </button>
          </div>
        ) : isLoading ? (
          <section className="jobsGrid skeletonGrid" aria-label="채용공고를 불러오는 중">
            {[1, 2, 3].map((item) => (
              <article className="jobsCard skeletonCard" key={`skeleton-${item}`}>
                <div className="jobsCardTop">
                  <div className="skeletonIcon pulse" />
                  <div className="skeletonBadge pulse" />
                </div>
                <div className="jobsCardBody">
                  <div className="skeletonTitle pulse" />
                  <div className="skeletonMeta pulse" />
                  <div className="skeletonConditions pulse" />
                  <div className="skeletonSkills pulse">
                    <span className="pulse" />
                    <span className="pulse" />
                    <span className="pulse" />
                  </div>
                  <div className="skeletonDesc pulse" />
                </div>
                <div className="jobsCardActions">
                  <div className="skeletonLink pulse" />
                  <div className="skeletonBtn pulse" />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <>
            <section className="jobsGrid" aria-label="채용공고 목록">
              {filteredJobs.map((job) => (
                <article className="jobsCard" key={job.id}>
                  <div className="jobsCardTop">
                    <div className="jobsCardIcon">{job.icon}</div>
                    <div className="jobsCardBadges">
                      {job.isNew ? <span className="jobsNewBadge">New</span> : null}
                      <span className="jobsSourceBadge">{job.source}</span>
                    </div>
                  </div>
                  <div className="jobsCardBody">
                    <h2 className="jobsCardTitle">{job.title}</h2>
                    <div className="jobsCardMeta">
                      <span className="jobsCardCompany">{job.company}</span>
                      <span className="jobsCardDivider">|</span>
                      <span className="jobsCardGeo">
                        {job.country} · {job.language}
                      </span>
                      <span className="jobsCardDivider">|</span>
                      <span className="jobsCardLoc">{job.location}</span>
                    </div>
                    <div className="jobsConditions">
                      <span className="jobsConditionItem">
                        <strong>경력:</strong> {job.experience}
                      </span>
                      <span className="jobsConditionItem">
                        <strong>형태:</strong> {job.jobType}
                      </span>
                      {job.salary ? (
                        <span className="jobsConditionItem">
                          <strong>급여:</strong> {job.salary}
                        </span>
                      ) : null}
                      <span className="jobsConditionItem">
                        <strong>마감:</strong> {job.deadline}
                      </span>
                    </div>
                    <div className="jobsCardSkills">
                      {job.skills.map((skill) => (
                        <span className="jobsSkillTag" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    <p className="jobsDescription">{job.description}</p>
                  </div>
                  <div className="jobsCardActions">
                    <button
                      className="jobsDetailLinkBtn"
                      type="button"
                      onClick={() => handleOpenDetail(job.id)}
                    >
                      상세 보기
                    </button>
                    <a className="jobsAnalyzeBtn" href={`/ai-analysis?jobId=${job.id}`}>
                      AI 적합도 분석
                    </a>
                  </div>
                </article>
              ))}
            </section>

            {filteredJobs.length === 0 ? (
              <div className="jobsEmptyState">
                <span className="material-symbols-outlined">search_off</span>
                <h3>일치하는 채용공고가 없습니다</h3>
                <p>검색어를 변경하거나 필터를 초기화해 보세요.</p>
                <button type="button" onClick={handleResetFilters}>
                  필터 초기화하기
                </button>
              </div>
            ) : null}
          </>
        )}

        <nav className="jobsPagination" aria-label="채용공고 페이지">
          <button aria-label="이전 페이지" disabled type="button">
            ‹
          </button>
          <button className="active" type="button">
            1
          </button>
          <button disabled type="button">
            2
          </button>
          <button disabled type="button">
            3
          </button>
          <span>...</span>
          <button disabled type="button">
            12
          </button>
          <button aria-label="다음 페이지" disabled type="button">
            ›
          </button>
        </nav>
      </section>

      {selectedJobId ? (
        <>
          <div
            aria-hidden="true"
            className="jobsDrawerBackdrop"
            onClick={() => setSelectedJobId(null)}
          />
          <aside
            aria-labelledby="drawer-title"
            className="jobsDetailDrawer open"
            role="dialog"
          >
            <div className="drawerHeader">
              <button
                aria-label="상세 보기 닫기"
                className="drawerCloseBtn"
                type="button"
                onClick={() => setSelectedJobId(null)}
              >
                ×
              </button>
              <div className="drawerBadges">
                {selectedJob?.isNew ? <span className="jobsNewBadge">New</span> : null}
                {selectedJob ? (
                  <span className="jobsSourceBadge">{selectedJob.source}</span>
                ) : null}
              </div>
            </div>

            {isDetailLoading ? (
              <div className="drawerLoadingState">
                <div className="spinner" />
                <p>공고 정보를 불러오는 중입니다...</p>
              </div>
            ) : selectedJob ? (
              <div className="drawerContent">
                <header className="drawerContentHeader">
                  <h2 id="drawer-title">{selectedJob.title}</h2>
                  <div className="drawerMeta">
                    <span className="drawerCompany">{selectedJob.company}</span>
                    <span className="drawerLoc">{selectedJob.location}</span>
                    <span className="drawerGeo">
                      {selectedJob.country} · {selectedJob.language}
                    </span>
                  </div>
                </header>

                <section className="drawerSection">
                  <h3>주요 계약 조건</h3>
                  <table className="drawerConditionsTable">
                    <tbody>
                      <tr>
                        <th>필요 경력</th>
                        <td>{selectedJob.experience}</td>
                      </tr>
                      <tr>
                        <th>고용 형태</th>
                        <td>{selectedJob.jobType}</td>
                      </tr>
                      {selectedJob.salary ? (
                        <tr>
                          <th>제시 급여</th>
                          <td>{selectedJob.salary}</td>
                        </tr>
                      ) : null}
                      <tr>
                        <th>지원 마감</th>
                        <td>{selectedJob.deadline}</td>
                      </tr>
                      <tr>
                        <th>수집 출처</th>
                        <td>{selectedJob.source} 플랫폼 연동</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <section className="drawerSection">
                  <h3>보유/요구 기술 스킬</h3>
                  <div className="drawerSkills">
                    {selectedJob.skills.map((skill) => (
                      <span className="drawerSkillTag" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="drawerSection">
                  <h3>상세 직무 설명</h3>
                  <div className="drawerDesc">
                    <p>{selectedJob.description}</p>
                    <p className="placeholderParagraph">
                      본 공고는 AI 매칭 엔진의 다국어 정밀 분석 시스템으로 구동되고
                      있습니다. Neet2Work에서 자기소개서를 준비하여 AI 적합도 분석을
                      실행하면, 현재 공고 요건과 자소서 간의 어휘, 기술 스택, 핵심
                      역량을 정밀하게 판별한 리포트를 받아볼 수 있습니다.
                    </p>
                  </div>
                </section>

                <div className="drawerActions">
                  <a
                    className="drawerOriginalLink"
                    href="https://wanted.co.kr"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    원문 공고 열기
                    <svg
                      aria-hidden="true"
                      className="externalIcon"
                      viewBox="0 0 24 24"
                    >
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                  <a className="drawerAnalyzeBtn" href={`/ai-analysis?jobId=${selectedJob.id}`}>
                    이 공고로 AI 분석하기
                  </a>
                </div>
              </div>
            ) : (
              <div className="drawerErrorState">
                <p>공고 정보를 찾을 수 없습니다.</p>
              </div>
            )}
          </aside>
        </>
      ) : null}

      <HomeFooter />
    </main>
  );
}
