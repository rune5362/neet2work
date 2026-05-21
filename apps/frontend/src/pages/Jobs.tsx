import { useState, useEffect } from "react";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import { getJobs } from "../api/client";
import type { JobPosting } from "../types/job";

export function Jobs() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
          setError(err instanceof Error ? err.message : "채용공고를 불러오는 중 오류가 발생했습니다.");
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

        <header className="jobsHeading">
          <h1>
            총 <span>{jobs.length}</span>개의 공고가 당신을 기다리고 있습니다
          </h1>
        </header>

        {loading && (
          <div className="jobsLoading" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px", fontSize: "1.1rem", fontWeight: "bold", color: "var(--home-secondary)" }}>
            채용공고를 불러오는 중입니다...
          </div>
        )}

        {error && (
          <div className="jobsError" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px", fontSize: "1.1rem", fontWeight: "bold", color: "red" }}>
            오류: {error}
          </div>
        )}

        {!loading && !error && (
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
                  </div>
                  <div className="jobsCardActions">
                    <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">상세 보기</a>
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
