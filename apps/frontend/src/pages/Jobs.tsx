import { useState, useEffect } from "react";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import { getJobs } from "../api/client";
import type { JobPosting } from "../types/job";

const DUMMY_JOBS: JobPosting[] = [
  {
    id: "dummy-1",
    title: "시니어 풀스택 엔지니어",
    company: "TechFlow Inc.",
    location: "서울, KR",
    careerLevel: "시니어 (6년 이상)",
    skills: ["React", "Node.js", "TypeScript"],
    description: "AI 기반 SaaS 플랫폼 확장을 위한 기술 리더를 찾습니다. React, Node.js 및 클라우드 인프라 경험이 필요합니다.",
    source: "TechFlow",
    sourceUrl: "/jobs",
    employmentType: "정규직",
    educationLevel: "학사 이상",
    salaryText: "연봉 7,000만 ~ 9,000만원",
    deadlineText: "채용 시 마감",
    applyMethod: "간편 지원"
  },
  {
    id: "dummy-2",
    title: "프로덕트 디자이너 (UX/UI)",
    company: "Creative Logic",
    location: "강남, 서울",
    careerLevel: "주니어 (3-5년)",
    skills: ["Figma", "UI/UX", "Typography"],
    description: "생산성 도구의 미래를 설계하세요. 복잡한 시스템과 아름다운 타이포그래피를 사랑하는 디자이너를 환영합니다.",
    source: "Creative",
    sourceUrl: "/jobs",
    employmentType: "정규직",
    educationLevel: "학력 무관",
    salaryText: "연봉 4,500만 ~ 5,500만원",
    deadlineText: "2026.06.30",
    applyMethod: "포트폴리오 제출 지원"
  },
  {
    id: "dummy-3",
    title: "데이터 사이언티스트 (머신러닝)",
    company: "Insight Data Co.",
    location: "원격",
    careerLevel: "시니어 (6년 이상)",
    skills: ["Python", "PyTorch", "ML"],
    description: "수백만 명에게 영향을 미치는 추천 엔진을 구축할 AI 팀에 합류하세요. Python 및 PyTorch 역량이 필수입니다.",
    source: "Insight",
    sourceUrl: "/jobs",
    employmentType: "정규직 / 파트타임",
    educationLevel: "석사 이상",
    salaryText: "회사 내규 (협의 가능)",
    deadlineText: "상시 채용",
    applyMethod: "홈페이지 지원"
  },
  {
    id: "dummy-4",
    title: "마케팅 전략가",
    company: "Growth Dynamics",
    location: "부산, KR",
    careerLevel: "주니어 (3-5년)",
    skills: ["Growth Hacking", "SQL", "GA4"],
    description: "신흥 핀테크 스타트업을 위한 고영향력 성장 전략을 개발하세요. 데이터 중심 사고방식이 필수입니다.",
    source: "Growth",
    sourceUrl: "/jobs",
    employmentType: "계약직 (정규직 전환 가능)",
    educationLevel: "전문대졸 이상",
    salaryText: "연봉 3,800만원 ~",
    deadlineText: "2026.07.15",
    applyMethod: "이메일 지원"
  },
  {
    id: "dummy-5",
    title: "보안 운영 분석가",
    company: "CyberGuard Global",
    location: "원격",
    careerLevel: "신입 (0-2년)",
    skills: ["SIEM", "Pentesting", "Network Security"],
    description: "엔터프라이즈 고객의 디지털 인프라를 보호합니다. 모니터링, 위협 헌팅 및 사고 대응 업무를 수행합니다.",
    source: "CyberGuard",
    sourceUrl: "/jobs",
    employmentType: "정규직",
    educationLevel: "학사 이상",
    salaryText: "회사 내규에 따름",
    deadlineText: "채용 시 마감",
    applyMethod: "온라인 지원"
  },
  {
    id: "dummy-6",
    title: "기술 프로젝트 매니저",
    company: "ScaleUp Systems",
    location: "서울, KR",
    careerLevel: "시니어 (6년 이상)",
    skills: ["Agile", "Scrum", "Jira"],
    description: "비즈니스 요구사항과 엔지니어링 우수성 사이의 가교 역할을 수행하세요. 소프트웨어 개발 배경을 가진 애자일 전문가를 찾습니다.",
    source: "ScaleUp",
    sourceUrl: "/jobs",
    employmentType: "정규직",
    educationLevel: "학사 이상",
    salaryText: "연봉 6,500만 ~ 8,000만원",
    deadlineText: "2026.06.15",
    applyMethod: "간편 지원"
  }
];

export function Jobs() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    getJobs()
      .then((data) => {
        if (isMounted) {
          setJobs(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("API 페칭 실패, 폴백 더미 데이터 모드로 진입합니다.", err);
          setError("서버 및 데이터베이스 연결에 실패했습니다. 현재 화면에 표시된 공고는 데모용 오프라인(더미) 데이터입니다.");
          setJobs(DUMMY_JOBS);
          setIsFallbackMode(true);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const getIconText = (job: JobPosting) => {
    const name = job.company || job.source || "JB";
    return name.slice(0, 2).toUpperCase();
  };

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

        {/* DB 연결 실패 안내 배너 */}
        {error && (
          <div 
            className="jobsErrorBanner" 
            style={{
              background: "linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%)",
              border: "1px solid #ffa8a8",
              borderRadius: "12px",
              padding: "16px 20px",
              margin: "0 0 24px 0",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 4px 12px rgba(255, 107, 107, 0.08)",
              animation: "fadeIn 0.3s ease-in-out"
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>⚠️</span>
            <div>
              <h4 style={{ margin: "0 0 4px 0", color: "#e03131", fontWeight: "700", fontSize: "0.95rem" }}>
                데이터베이스 연결 지연 및 네트워크 장애 안내
              </h4>
              <p style={{ margin: "0", color: "#495057", fontSize: "0.85rem", lineHeight: "1.4" }}>
                {error}
              </p>
            </div>
          </div>
        )}

        <header className="jobsHeading">
          <h1>
            총 <span>{jobs.length}</span>개의 공고가 당신을 기다리고 있습니다
            {isFallbackMode && <span style={{ fontSize: "0.9rem", color: "#868e96", marginLeft: "10px", fontWeight: "normal" }}>(오프라인 데모 모드)</span>}
          </h1>
        </header>

        {loading && (
          <div className="jobsLoading" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px", fontSize: "1.1rem", fontWeight: "bold", color: "var(--home-secondary)" }}>
            채용공고를 불러오는 중입니다...
          </div>
        )}

        {!loading && (
          <section className="jobsGrid" aria-label="채용공고 목록">
            {jobs.map((job) => {
              const tags = [
                job.location,
                job.careerLevel,
                ...(job.skills || [])
              ].filter((tag) => typeof tag === "string" && tag.trim() !== "");

              return (
                <article className="jobsCard" key={job.id || `${job.company}-${job.title}`}>
                  <div className="jobsCardTop">
                    <div className="jobsCardIcon">{getIconText(job)}</div>
                    {isFallbackMode && <span className="jobsNewBadge" style={{ background: "#adb5bd" }}>Demo</span>}
                  </div>
                  
                  <div className="jobsCardBody">
                    <h2>{job.title}</h2>
                    <p className="jobsCompany">{job.company}</p>
                    <div className="jobsTags">
                      {tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <p className="jobsDescription">{job.description}</p>
                    
                    {/* 데이터베이스 상세 컬럼 메타 정보 매핑 영역 */}
                    <div className="jobsMetaInfo" style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px 16px",
                      margin: "16px 0 0 0",
                      fontSize: "0.8rem",
                      color: "#495057",
                      borderTop: "1px solid #f1f3f5",
                      paddingTop: "14px"
                    }}>
                      {job.employmentType && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ filter: "grayscale(1)", fontSize: "0.9rem" }}>💼</span>
                          <span style={{ fontWeight: "500" }}>{job.employmentType}</span>
                        </div>
                      )}
                      {job.educationLevel && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ filter: "grayscale(1)", fontSize: "0.9rem" }}>🎓</span>
                          <span>{job.educationLevel}</span>
                        </div>
                      )}
                      {job.salaryText && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2b8a3e", fontWeight: "600" }}>
                          <span style={{ filter: "grayscale(0.2)", fontSize: "0.9rem" }}>💰</span>
                          <span>{job.salaryText}</span>
                        </div>
                      )}
                      {job.deadlineText && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e03131", fontWeight: "500" }}>
                          <span style={{ filter: "grayscale(0.2)", fontSize: "0.9rem" }}>📅</span>
                          <span>{job.deadlineText}</span>
                        </div>
                      )}
                      {job.applyMethod && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#1c7ed6" }}>
                          <span style={{ filter: "grayscale(1)", fontSize: "0.9rem" }}>📨</span>
                          <span>{job.applyMethod}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="jobsCardActions">
                    <a href={job.sourceUrl} target={isFallbackMode ? undefined : "_blank"} rel={isFallbackMode ? undefined : "noopener noreferrer"}>상세 보기</a>
                    <button type="button">AI 적합도 분석</button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

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
