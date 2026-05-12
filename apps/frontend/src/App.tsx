import { useEffect, useState } from "react";
import { analyzeResume, getJobs } from "./api/client";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { JobCard } from "./components/JobCard";
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
      <section className="hero">
        <div>
          <p className="eyebrow">Mock-first career consulting</p>
          <h1>일했음 청년</h1>
          <p className="heroText">
            채용공고와 자기소개서를 비교해 직무 적합도, 부족한 키워드, 수정 방향을 빠르게
            확인하는 AI 커리어 컨설팅 데모입니다.
          </p>
        </div>
        <div className="heroCard">
          <span>API 상태</span>
          <strong>키 없이도 실행</strong>
          <p>DB, R2, AI 키가 없어도 로컬 JSON과 Mock 분석으로 발표 흐름을 유지합니다.</p>
        </div>
      </section>

      {errorMessage ? <p className="alert">{errorMessage}</p> : null}

      <section className="workspace">
        <div className="panel">
          <div className="sectionTitle">
            <p>Step 1</p>
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

        <div className="panel">
          <div className="sectionTitle">
            <p>Step 2</p>
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

      <AnalysisPanel analysis={analysis} selectedJob={selectedJob} />
    </main>
  );
}
