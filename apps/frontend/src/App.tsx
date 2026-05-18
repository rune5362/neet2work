import { useEffect, useState } from "react";
import { analyzeResume, getJobs } from "./api/client";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { JobCard } from "./components/JobCard";
import logoUrl from "./assets/logo/neet2work_logo_lockup_reference_curve 1.png";
import { RemixStitch } from "./pages/RemixStitch";
import { StitchActivity } from "./pages/stitch/StitchActivity";
import { StitchAi } from "./pages/stitch/StitchAi";
import { StitchApply } from "./pages/stitch/StitchApply";
import { StitchCareerGuide } from "./pages/stitch/StitchCareerGuide";
import { StitchHome } from "./pages/stitch/StitchHome";
import { StitchJobDetail } from "./pages/stitch/StitchJobDetail";
import { StitchJobs } from "./pages/stitch/StitchJobs";
import { StitchJobsFilter } from "./pages/stitch/StitchJobsFilter";
import type { AnalysisResult } from "./types/analysis";
import type { JobPosting } from "./types/job";

const defaultResume =
  "React와 TypeScript를 활용한 웹 프로젝트에서 채용공고 데이터를 조회하고 API와 연동한 경험이 있습니다. 사용자 관점에서 입력 흐름과 예외 상황을 고려하며 기능을 구현했습니다.";

const demoJobs: JobPosting[] = [
  {
    id: "demo-frontend-01",
    title: "Frontend Product Engineer",
    company: "Northstar Labs",
    location: "서울 강남",
    careerLevel: "3년 이상",
    skills: ["React", "TypeScript", "Design System", "Testing"],
    description:
      "채용공고 검색과 분석 워크플로우를 개선하는 제품 프론트엔드 개발자를 찾습니다. 사용자 행동 데이터를 바탕으로 실험과 개선을 반복합니다.",
    source: "demo",
    sourceUrl: "https://example.com/jobs/demo-frontend-01",
    employmentType: "정규직",
    salaryText: "5,800-7,200만원",
    deadlineText: "D-12"
  },
  {
    id: "demo-backend-01",
    title: "AI Matching Backend Engineer",
    company: "PromptLayer Korea",
    location: "서울 성수",
    careerLevel: "5년 이상",
    skills: ["Node.js", "PostgreSQL", "LLM", "Queue"],
    description:
      "자기소개서와 채용공고를 비교하는 매칭 API를 설계하고 운영합니다. 안정적인 비동기 처리와 데이터 품질 관리 경험을 중요하게 봅니다.",
    source: "demo",
    sourceUrl: "https://example.com/jobs/demo-backend-01",
    employmentType: "정규직",
    salaryText: "7,000-9,500만원",
    deadlineText: "채용시 마감"
  },
  {
    id: "demo-data-01",
    title: "Job Data Platform Engineer",
    company: "GridWorks",
    location: "경기 판교",
    careerLevel: "4년 이상",
    skills: ["Python", "Airflow", "ETL", "AWS"],
    description:
      "외부 채용공고 데이터를 수집, 정제, 중복 제거하는 데이터 파이프라인을 구축합니다. 운영 지표와 품질 리포트도 함께 관리합니다.",
    source: "demo",
    sourceUrl: "https://example.com/jobs/demo-data-01",
    employmentType: "정규직",
    salaryText: "6,200-8,000만원",
    deadlineText: "D-8"
  },
  {
    id: "demo-ux-01",
    title: "UX Engineer",
    company: "Makers Guild",
    location: "부산 해운대",
    careerLevel: "2년 이상",
    skills: ["Figma", "React", "Accessibility", "CSS"],
    description:
      "디자인 시스템과 실제 제품 화면 사이의 간격을 줄이는 UX 엔지니어 역할입니다. 접근성과 반응형 UI 구현 경험이 필요합니다.",
    source: "demo",
    sourceUrl: "https://example.com/jobs/demo-ux-01",
    employmentType: "계약직",
    salaryText: "5,000-6,400만원",
    deadlineText: "D-5"
  },
  {
    id: "demo-devops-01",
    title: "DevOps Engineer",
    company: "Cloud Harbor",
    location: "서울 마포",
    careerLevel: "5년 이상",
    skills: ["Kubernetes", "Terraform", "CI/CD", "Monitoring"],
    description:
      "프론트엔드와 백엔드 배포 파이프라인을 안정화하고 관측성을 개선합니다. 장애 대응 자동화와 비용 최적화 경험을 우대합니다.",
    source: "demo",
    sourceUrl: "https://example.com/jobs/demo-devops-01",
    employmentType: "정규직",
    salaryText: "7,500-10,000만원",
    deadlineText: "D-20"
  },
  {
    id: "demo-junior-01",
    title: "Junior Web Developer",
    company: "Orbit Commerce",
    location: "대전 유성",
    careerLevel: "신입 가능",
    skills: ["JavaScript", "Git", "SQL", "CSS"],
    description:
      "커머스 운영 도구의 웹 화면을 함께 개선할 주니어 개발자를 찾습니다. 코드 리뷰와 페어 프로그래밍 기반으로 성장할 수 있습니다.",
    source: "demo",
    sourceUrl: "https://example.com/jobs/demo-junior-01",
    employmentType: "정규직",
    salaryText: "3,400-4,400만원",
    deadlineText: "D-3"
  },
  {
    id: "demo-mobile-01",
    title: "Mobile Web Engineer",
    company: "Pocket Desk",
    location: "서울 잠실",
    careerLevel: "3년 이상",
    skills: ["PWA", "WebView", "Performance", "React"],
    description:
      "모바일 웹뷰 기반 채용 탐색 경험을 개선합니다. 로딩 성능, 입력 UX, 작은 화면에서의 정보 구조 설계 경험을 봅니다.",
    source: "demo",
    sourceUrl: "https://example.com/jobs/demo-mobile-01",
    employmentType: "정규직",
    salaryText: "5,600-7,000만원",
    deadlineText: "D-10"
  },
  {
    id: "demo-security-01",
    title: "Security Platform Developer",
    company: "Sentinel One KR",
    location: "인천 송도",
    careerLevel: "6년 이상",
    skills: ["Go", "Linux", "Security", "API"],
    description:
      "보안 로그 수집과 분석 화면을 연결하는 플랫폼 개발 역할입니다. 권한, 감사 로그, 안전한 API 설계 경험이 필요합니다.",
    source: "demo",
    sourceUrl: "https://example.com/jobs/demo-security-01",
    employmentType: "정규직",
    salaryText: "8,000-11,000만원",
    deadlineText: "상시"
  }
];

export default function App() {
  if (window.location.pathname === "/RemixStitch" || window.location.pathname === "/RemixStitch/") {
    return <RemixStitch />;
  }

  if (window.location.pathname.startsWith("/stitch_export")) {
    return <StitchExportRouter pathname={window.location.pathname} />;
  }

  if (window.location.pathname === "/jobs") {
    return <JobsPage />;
  }

  return <HomePage />;
}

function StitchExportRouter({ pathname }: { pathname: string }) {
  switch (pathname.replace(/\/$/, "")) {
    case "/stitch_export/ai":
      return <StitchAi />;
    case "/stitch_export/activity":
      return <StitchActivity />;
    case "/stitch_export/apply":
      return <StitchApply />;
    case "/stitch_export/career-guide":
      return <StitchCareerGuide />;
    case "/stitch_export/job-detail":
      return <StitchJobDetail />;
    case "/stitch_export/jobs":
      return <StitchJobs />;
    case "/stitch_export/jobs-filter":
      return <StitchJobsFilter />;
    case "/stitch_export":
    default:
      return <StitchHome />;
  }
}

function HomePage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [resumeText, setResumeText] = useState(defaultResume);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadJobs() {
      try {
        const loadedJobs = await getJobs();
        setJobs(loadedJobs);
        setSelectedJobId(loadedJobs[0]?.id ?? "");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setIsLoadingJobs(false);
      }
    }

    void loadJobs();
  }, []);

  async function handleAnalyze() {
    if (!selectedJobId) {
      setErrorMessage("분석할 채용공고를 먼저 선택해 주세요.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");

    try {
      const result = await analyzeResume({
        resumeText,
        jobId: selectedJobId
      });
      setAnalysis(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const selectedJob = jobs.find((job) => job.id === selectedJobId);

  return (
    <main className="shell">
      <header className="topNav">
        <a className="brand" href="/" aria-label="Neet2Work 홈">
          <img src={logoUrl} alt="Neet2Work" />
        </a>
        <nav aria-label="주요 메뉴">
          <a href="/jobs">공고</a>
          <a href="#resume">분석</a>
          <a href="#result">리포트</a>
        </nav>
        <a className="navCta" href="#resume">
          시작하기
        </a>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">AI career workspace</p>
          <h1>채용공고와 자기소개서를 한 화면에서 검증합니다</h1>
          <p className="heroText">
            Neet2Work는 공고 데이터와 자기소개서 초안을 비교해 적합도, 누락 키워드,
            수정 방향을 빠르게 정리하는 커리어 분석 워크스페이스입니다.
          </p>
          <div className="heroActions">
            <a className="primaryAction" href="#jobs">
              공고 선택하기
            </a>
            <a className="secondaryAction" href="#result">
              리포트 보기
            </a>
          </div>
        </div>
        <div className="productMockup" aria-label="분석 제품 UI 미리보기">
          <div className="mockupHeader">
            <span />
            <span />
            <span />
            <strong>resume_match.sql</strong>
          </div>
          <div className="codeBlock">
            <p>
              <span>select</span> role, match_score, missing_keywords
            </p>
            <p>
              <span>from</span> job_resume_analysis
            </p>
            <p>
              <span>where</span> candidate = "frontend"
            </p>
          </div>
          <div className="mockTable">
            <div>
              <span>match_score</span>
              <strong>87%</strong>
            </div>
            <div>
              <span>missing</span>
              <strong>3 keywords</strong>
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? <p className="alert">{errorMessage}</p> : null}

      <section className="workspace">
        <div className="panel" id="jobs">
          <div className="sectionTitle">
            <p>Step 01</p>
            <h2>채용공고 선택</h2>
          </div>

          {isLoadingJobs ? (
            <p className="muted">채용공고를 불러오는 중입니다.</p>
          ) : (
            <div className="jobList">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={job.id === selectedJobId}
                  onSelect={setSelectedJobId}
                />
              ))}
            </div>
          )}
        </div>

        <div className="panel" id="resume">
          <div className="sectionTitle">
            <p>Step 02</p>
            <h2>자기소개서 입력</h2>
          </div>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="자기소개서 내용을 입력해 주세요."
          />
          <button type="button" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? "분석 중..." : "적합도 분석하기"}
          </button>
        </div>
      </section>

      <section id="result">
        <AnalysisPanel analysis={analysis} selectedJob={selectedJob} />
      </section>
    </main>
  );
}

function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [searchText, setSearchText] = useState("");
  const [skillFilter, setSkillFilter] = useState("전체");
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadJobs() {
      try {
        const loadedJobs = await getJobs();
        const nextJobs = loadedJobs.length > 0 ? loadedJobs : demoJobs;
        setJobs(nextJobs);
        setSelectedJobId(nextJobs[0]?.id ?? "");
      } catch (error) {
        setJobs(demoJobs);
        setSelectedJobId(demoJobs[0]?.id ?? "");
        setErrorMessage(
          `${error instanceof Error ? error.message : "채용공고 조회에 실패했습니다."} 임시 더미데이터를 표시합니다.`
        );
      } finally {
        setIsLoadingJobs(false);
      }
    }

    void loadJobs();
  }, []);

  const skills = ["전체", ...Array.from(new Set(jobs.flatMap((job) => job.skills)))].slice(0, 9);
  const filteredJobs = jobs.filter((job) => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      [job.company, job.title, job.location, job.careerLevel, job.description, ...job.skills]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    const matchesSkill = skillFilter === "전체" || job.skills.includes(skillFilter);

    return matchesSearch && matchesSkill;
  });
  const selectedJob = filteredJobs.find((job) => job.id === selectedJobId) ?? filteredJobs[0];

  return (
    <main className="shell jobsShell">
      <header className="topNav">
        <a className="brand" href="/" aria-label="Neet2Work 홈">
          <img src={logoUrl} alt="Neet2Work" />
        </a>
        <nav aria-label="주요 메뉴">
          <a href="/">분석 홈</a>
          <a href="/jobs">공고</a>
          <a href="/#result">리포트</a>
        </nav>
        <a className="navCta" href="/">
          분석하기
        </a>
      </header>

      <section className="jobsHero">
        <div>
          <p className="eyebrow">Job database</p>
          <h1>수집된 채용공고를 검색하고 비교합니다</h1>
          <p className="heroText">
            서버에서 받아온 채용공고를 기술 스택과 직무 조건 기준으로 빠르게 탐색하는 공고 전용 페이지입니다.
          </p>
        </div>
        <div className="jobsStats" aria-label="채용공고 요약">
          <div>
            <span>전체 공고</span>
            <strong>{jobs.length}</strong>
          </div>
          <div>
            <span>현재 결과</span>
            <strong>{filteredJobs.length}</strong>
          </div>
          <div>
            <span>기술 태그</span>
            <strong>{Math.max(skills.length - 1, 0)}</strong>
          </div>
        </div>
      </section>

      {errorMessage ? <p className="alert">{errorMessage}</p> : null}

      <section className="jobsToolbar" aria-label="채용공고 검색과 필터">
        <label>
          <span>검색</span>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="회사, 직무, 지역, 기술 검색"
          />
        </label>
        <label>
          <span>기술 스택</span>
          <select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)}>
            {skills.map((skill) => (
              <option key={skill}>{skill}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="jobsLayout">
        <div className="jobsListPanel">
          <div className="sectionTitle">
            <p>Open roles</p>
            <h2>채용공고 목록</h2>
          </div>

          {isLoadingJobs ? (
            <p className="muted">채용공고를 불러오는 중입니다.</p>
          ) : filteredJobs.length === 0 ? (
            <p className="muted">검색 조건에 맞는 채용공고가 없습니다.</p>
          ) : (
            <div className="jobsGrid">
              {filteredJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className={`jobListing ${job.id === selectedJob?.id ? "selected" : ""}`}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <span>{job.company}</span>
                  <strong>{job.title}</strong>
                  <p>
                    {job.location} · {job.careerLevel}
                  </p>
                  <div className="chips">
                    {job.skills.slice(0, 4).map((skill) => (
                      <em key={skill}>{skill}</em>
                    ))}
                  </div>
                  {job.id === selectedJob?.id ? <InlineJobDetail job={job} /> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="jobDetailPanel">
          {selectedJob ? (
            <>
              <p className="eyebrow">Selected role</p>
              <h2>{selectedJob.title}</h2>
              <strong>{selectedJob.company}</strong>
              <dl>
                <div>
                  <dt>지역</dt>
                  <dd>{selectedJob.location}</dd>
                </div>
                <div>
                  <dt>경력</dt>
                  <dd>{selectedJob.careerLevel}</dd>
                </div>
                <div>
                  <dt>고용형태</dt>
                  <dd>{selectedJob.employmentType ?? "미기재"}</dd>
                </div>
                <div>
                  <dt>마감</dt>
                  <dd>{selectedJob.deadlineText ?? "상시"}</dd>
                </div>
              </dl>
              <p>{selectedJob.description}</p>
              <div className="chips">
                {selectedJob.skills.map((skill) => (
                  <em key={skill}>{skill}</em>
                ))}
              </div>
              <a className="primaryAction" href={selectedJob.sourceUrl} target="_blank" rel="noreferrer">
                원문 보기
              </a>
            </>
          ) : (
            <p className="muted">채용공고를 선택하면 상세 정보가 표시됩니다.</p>
          )}
        </aside>
      </section>
    </main>
  );
}

function InlineJobDetail({ job }: { job: JobPosting }) {
  return (
    <div className="inlineJobDetail">
      <dl>
        <div>
          <dt>고용형태</dt>
          <dd>{job.employmentType ?? "미기재"}</dd>
        </div>
        <div>
          <dt>마감</dt>
          <dd>{job.deadlineText ?? "상시"}</dd>
        </div>
      </dl>
      <p>{job.description}</p>
      <span>원문 보기는 넓은 화면의 상세 패널에서 사용할 수 있습니다.</span>
    </div>
  );
}
