import { FormEvent, useEffect, useMemo, useState } from "react";
import { getJobs } from "../api/client";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { JobPosting } from "../types/job";

const fallbackJobs: JobPosting[] = [
  {
    id: "fallback-frontend",
    title: "시니어 풀스택 엔지니어",
    company: "TechFlow Inc.",
    location: "서울, KR",
    careerLevel: "경력",
    skills: ["React", "Node.js", "Cloud"],
    description:
      "AI 기반 SaaS 플랫폼 확장을 위한 기술 리더를 찾습니다. React, Node.js 및 클라우드 인프라 경험이 필요합니다.",
    sourceUrl: "https://example.com/jobs/frontend"
  },
  {
    id: "fallback-design",
    title: "프로덕트 디자이너 (UX/UI)",
    company: "Creative Logic",
    location: "강남",
    careerLevel: "주니어/미들",
    skills: ["UX", "UI", "Design System"],
    description:
      "생산성 도구의 미래를 설계하세요. 복잡한 시스템과 아름다운 타이포그래피를 사랑하는 디자이너를 환영합니다.",
    sourceUrl: "https://example.com/jobs/design"
  },
  {
    id: "fallback-ml",
    title: "데이터 사이언티스트 (머신러닝)",
    company: "Insight Data Co.",
    location: "원격",
    careerLevel: "경력",
    skills: ["ML", "Python", "PyTorch"],
    description:
      "수백만 명에게 영향을 미치는 추천 엔진을 구축할 AI 팀에 합류하세요. Python 및 PyTorch 역량이 필수입니다.",
    sourceUrl: "https://example.com/jobs/ml"
  }
];

function getJobIcon(job: JobPosting): string {
  const source = job.skills[0] ?? job.title;
  return source.replace(/[^0-9A-Za-z가-힣]/g, "").slice(0, 3).toUpperCase() || "JOB";
}

function getJobTags(job: JobPosting): string[] {
  return [
    job.employmentType,
    job.location,
    job.careerLevel,
    job.deadlineText,
    ...job.skills.slice(0, 2)
  ].filter((tag): tag is string => Boolean(tag));
}

function filterFallbackJobs(query: string): JobPosting[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return fallbackJobs;
  }

  return fallbackJobs.filter((job) =>
    [job.title, job.company, job.description, ...job.skills]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}

export function Jobs() {
  const [jobs, setJobs] = useState<JobPosting[]>(fallbackJobs);
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadJobs() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const loadedJobs = await getJobs({
          q: submittedQuery || undefined,
          limit: 24
        });

        if (isMounted) {
          setJobs(loadedJobs);
        }
      } catch (error) {
        if (isMounted) {
          setJobs(filterFallbackJobs(submittedQuery));
          setErrorMessage(
            error instanceof Error
              ? `${error.message} 샘플 공고로 계속 표시합니다.`
              : "채용공고 조회에 실패해 샘플 공고로 계속 표시합니다."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadJobs();

    return () => {
      isMounted = false;
    };
  }, [submittedQuery]);

  const totalLabel = useMemo(() => jobs.length.toLocaleString("ko-KR"), [jobs.length]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(searchInput.trim());
  }

  return (
    <main className="jobsPage">
      <HomeTopNav active="jobs" />

      <section className="jobsContent">
        <form className="jobsFilterBar" aria-label="채용공고 검색과 필터" onSubmit={handleSearch}>
          <label className="jobsSearchField">
            <span>검색어</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="직무, 회사명 또는 키워드"
              type="search"
              value={searchInput}
            />
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
            <button disabled={isLoading} type="submit">
              {isLoading ? "검색 중" : "검색"}
            </button>
          </div>
        </form>

        {errorMessage ? <p className="jobsStatus">{errorMessage}</p> : null}

        <header className="jobsHeading">
          <h1>
            총 <span>{totalLabel}</span>개의 공고가 당신을 기다리고 있습니다
          </h1>
        </header>

        {isLoading ? <p className="jobsStatus">채용공고를 불러오는 중입니다.</p> : null}

        {!isLoading && jobs.length === 0 ? (
          <p className="jobsStatus">검색 조건에 맞는 공고가 없습니다.</p>
        ) : null}

        <section className="jobsGrid" aria-label="채용공고 목록">
          {jobs.map((job, index) => (
            <article className="jobsCard" key={job.id}>
              <div className="jobsCardTop">
                <div className="jobsCardIcon">{getJobIcon(job)}</div>
                {index === 0 ? <span className="jobsNewBadge">New</span> : null}
              </div>
              <div className="jobsCardBody">
                <h2>{job.title}</h2>
                <p className="jobsCompany">{job.company}</p>
                <div className="jobsTags">
                  {getJobTags(job).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <p className="jobsDescription">{job.description}</p>
              </div>
              <div className="jobsCardActions">
                <a href={job.sourceUrl} rel="noreferrer" target="_blank">
                  상세 보기
                </a>
                <a className="jobsAnalyzeLink" href={`/ai-analysis?jobId=${encodeURIComponent(job.id)}`}>
                  AI 적합도 분석
                </a>
              </div>
            </article>
          ))}
        </section>
      </section>

      <HomeFooter />
    </main>
  );
}
