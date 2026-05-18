import { useEffect, useState } from "react";
import { analyzeResume, getJobs } from "./api/client";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { JobCard } from "./components/JobCard";
import logoUrl from "./assets/logo/neet2work_logo_lockup_reference_curve 1.png";
import type { AnalysisResult } from "./types/analysis";
import type { JobPosting } from "./types/job";

const defaultResume =
  "React와 TypeScript를 활용한 웹 프로젝트에서 채용공고 데이터를 조회하고 API와 연동한 경험이 있습니다. 사용자 관점에서 입력 흐름과 예외 상황을 고려하며 기능을 구현했습니다.";

export default function App() {
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
          <a href="#jobs">공고</a>
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
