import { FormEvent, useEffect, useMemo, useState } from "react";
import { saveAnalysisSession } from "../analysisSession";
import { analyzeResume, getJobs } from "../api/client";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { JobPosting } from "../types/job";

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

const fallbackJobs: JobPosting[] = [
  {
    id: "job-001",
    title: "프론트엔드 개발자",
    company: "샘플테크",
    location: "서울",
    careerLevel: "신입",
    skills: ["React", "TypeScript", "JavaScript", "HTML", "CSS"],
    description: "React 기반 웹 서비스 개발자를 채용합니다. API 연동과 사용자 경험 개선 역량을 중요하게 봅니다.",
    sourceUrl: "https://example.com/jobs/1"
  }
];

const defaultResumeText =
  "React와 TypeScript를 활용한 개인 프로젝트에서 채용공고 데이터를 조회하고 API와 연동한 경험이 있습니다. 사용자 입력 흐름과 예외 상황을 고려해 화면을 구현했습니다.";

export function AIAnalysisFront() {
  const [jobs, setJobs] = useState<JobPosting[]>(fallbackJobs);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [resumeText, setResumeText] = useState(defaultResumeText);
  const [tone, setTone] = useState<"professional" | "friendly">("professional");
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const requestedJobId = new URLSearchParams(window.location.search).get("jobId") ?? "";

    async function loadJobs() {
      setIsLoadingJobs(true);

      try {
        const loadedJobs = await getJobs({ limit: 50 });

        if (!isMounted) {
          return;
        }

        const nextJobs = loadedJobs.length ? loadedJobs : fallbackJobs;
        setJobs(nextJobs);
        setSelectedJobId(
          nextJobs.some((job) => job.id === requestedJobId) ? requestedJobId : nextJobs[0]?.id ?? ""
        );
      } catch (error) {
        if (isMounted) {
          setJobs(fallbackJobs);
          setSelectedJobId(fallbackJobs[0]?.id ?? "");
          setErrorMessage(
            error instanceof Error
              ? `${error.message} 샘플 공고로 분석을 계속할 수 있습니다.`
              : "채용공고 조회에 실패해 샘플 공고로 분석을 계속할 수 있습니다."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingJobs(false);
        }
      }
    }

    void loadJobs();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0],
    [jobs, selectedJobId]
  );

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedJob) {
      setErrorMessage("분석할 채용공고를 먼저 선택해 주세요.");
      return;
    }

    if (resumeText.trim().length < 10) {
      setErrorMessage("자기소개서 내용을 10자 이상 입력해 주세요.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage("");

    try {
      const result = await analyzeResume({
        jobId: selectedJob.id,
        resumeText: resumeText.trim()
      });

      saveAnalysisSession({
        result,
        job: selectedJob,
        resumeText: resumeText.trim(),
        tone,
        createdAt: new Date().toISOString()
      });

      window.location.href = "/ai-analysis/details";
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "자기소개서 분석에 실패했습니다."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

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

          {errorMessage ? <p className="aiFormStatus error">{errorMessage}</p> : null}

          <form className="aiExperienceForm" onSubmit={handleAnalyze}>
            <div className="aiFormGrid">
              <label>
                <span>희망 직무 선택</span>
                <select
                  disabled={isLoadingJobs}
                  onChange={(event) => setSelectedJobId(event.target.value)}
                  value={selectedJobId}
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} · {job.company}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend>교정 톤(Tone)</legend>
                <div>
                  <button
                    className={tone === "professional" ? "active" : ""}
                    onClick={() => setTone("professional")}
                    type="button"
                  >
                    전문적인
                  </button>
                  <button
                    className={tone === "friendly" ? "active" : ""}
                    onClick={() => setTone("friendly")}
                    type="button"
                  >
                    친근한
                  </button>
                </div>
              </fieldset>
            </div>

            <label>
              <span>당신의 경험 (예: 공백기 동안 무엇을 했나요?)</span>
              <textarea
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="예: 6개월 동안 학원을 다니지 않고 혼자서 유튜브를 보며 파이썬을 공부했습니다. 간단한 크롤링 프로그램도 만들어봤는데 어디에 활용할 수 있을지 모르겠습니다."
                rows={6}
                value={resumeText}
              />
            </label>

            <button className="aiSubmitButton" disabled={isAnalyzing || isLoadingJobs} type="submit">
              {isAnalyzing ? "분석 중..." : "✦ 내 자기소개서 생성하기"}
            </button>
          </form>

          <aside className="aiWritingTip">
            <span aria-hidden="true">TIP</span>
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
