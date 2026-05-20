import { useMemo, useState } from "react";
import { readAnalysisSession, type StoredAnalysis } from "../analysisSession";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

const fallbackAnalysis: StoredAnalysis = {
  result: {
    jobId: "fallback-frontend",
    matchScore: 94,
    strengths: [
      "React 기반의 대규모 전환 프로젝트 경험은 가장 강력한 경쟁력입니다.",
      "API 연동 경험을 통해 백엔드와 협업 가능한 역량을 보여줄 수 있습니다."
    ],
    weaknesses: ["테스트 코드 작성 경험 보완 권장"],
    missingKeywords: ["Unit/E2E Testing", "Docker"],
    rewriteGuides: [
      "프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요.",
      "채용공고의 기술 키워드를 자기소개서에 자연스럽게 반영하세요."
    ],
    suggestedSentences: [
      "Lighthouse 성능 점수를 65점에서 92점으로 향상시키며 초기 로딩 속도를 개선했습니다.",
      "주간 코드 리뷰 세션을 공식화하여 개발팀 코드 컨벤션 준수율을 높였습니다."
    ],
    mode: "mock"
  },
  job: {
    id: "fallback-frontend",
    title: "Senior Frontend Developer",
    company: "TechFlow Inc.",
    location: "서울",
    careerLevel: "경력",
    skills: ["React", "TypeScript", "Unit/E2E Testing", "Node.js"],
    description: "시니어 프론트엔드 개발자를 찾습니다.",
    sourceUrl: "https://example.com/jobs/frontend"
  },
  resumeText:
    "React와 TypeScript를 활용한 프로젝트에서 사용자 입력 데이터를 API와 연동하여 분석 결과를 시각화한 경험이 있습니다.",
  tone: "professional",
  createdAt: new Date().toISOString()
};

function buildSkillMetrics(analysis: StoredAnalysis) {
  const missing = new Set(analysis.result.missingKeywords.map((keyword) => keyword.toLowerCase()));
  const skills = analysis.job.skills.length ? analysis.job.skills : ["React", "TypeScript", "API"];

  return skills.slice(0, 4).map((skill, index) => {
    const isMissing = missing.has(skill.toLowerCase());
    return {
      label: skill,
      score: isMissing ? 45 : Math.max(60, analysis.result.matchScore - index * 8),
      warning: isMissing ? "자기소개서에서 보완 권장" : undefined
    };
  });
}

export function AIAnalysisDetails() {
  const [analysis] = useState<StoredAnalysis>(() => readAnalysisSession() ?? fallbackAnalysis);
  const skillMetrics = useMemo(() => buildSkillMetrics(analysis), [analysis]);
  const { result, job } = analysis;
  const weaknesses = result.weaknesses.length
    ? result.weaknesses
    : ["현재 분석에서 뚜렷한 약점은 발견되지 않았습니다."];

  return (
    <main className="aiDetailsPage">
      <HomeTopNav active="analysis" />

      <section className="aiDetailsHero">
        <div className="aiDetailsHeroCard">
          <div className="aiDetailsHeroCopy">
            <div className="aiDetailsStatus">
              <span aria-hidden="true">✓</span>
              <strong>분석 완료 · {result.mode === "ai" ? "AI" : "Mock"}</strong>
            </div>
            <h1>{job.title}</h1>
            <p>
              {job.company} 공고 기준으로 자기소개서를 분석했습니다. 현재 이력서는 목표 직무와
              {result.matchScore >= 80 ? " 높은 일치도를 보이고 있습니다." : " 연결할 수 있는 강점이 있습니다."}
              {" "}아래 제안 문장을 활용해 직무 키워드를 더 선명하게 보강하세요.
            </p>
            <div className="aiDetailsActions">
              <button type="button">이력서 다운로드</button>
              <button type="button">즉시 지원하기</button>
            </div>
          </div>
          <div className="aiMatchScore" aria-label={`매칭 점수 ${result.matchScore}%`}>
            <div
              className="aiCircularProgress"
              style={{
                background: `radial-gradient(closest-side, #ffffff 80%, transparent 81% 100%), conic-gradient(var(--home-primary-container) ${result.matchScore}%, #f1f5f9 0)`
              }}
            />
            <div>
              <strong>{result.matchScore}%</strong>
              <span>Match Score</span>
            </div>
          </div>
        </div>
      </section>

      <section className="aiDetailsMain">
        <div className="aiDetailsLeft">
          <article className="aiDetailsPanel">
            <h2>
              <span aria-hidden="true">✓</span>
              핵심 강점 분석
            </h2>
            <div className="aiStrengthTags">
              {result.strengths.map((strength) => (
                <span key={strength}>{strength}</span>
              ))}
            </div>
            <p>
              선택한 공고의 핵심 역량은 {job.skills.slice(0, 3).join(", ") || "직무 경험"}입니다.
              자기소개서에서 이 키워드가 문제 해결 경험과 함께 드러날수록 설득력이 높아집니다.
            </p>
          </article>

          <section className="aiOptimizationSection">
            <h2>
              <span aria-hidden="true">AI</span>
              AI 문장 최적화 제안
            </h2>
            {result.rewriteGuides.slice(0, 2).map((guide, index) => (
              <article className="aiOptimizationCard" key={guide}>
                <div>
                  <span>Guide</span>
                  <p>{guide}</p>
                </div>
                <div>
                  <span>Suggested Sentence</span>
                  <p>{result.suggestedSentences[index] ?? result.suggestedSentences[0]}</p>
                </div>
              </article>
            ))}
          </section>
        </div>

        <aside className="aiDetailsRight">
          <section className="aiDetailsPanel">
            <h2>기술 매칭 세부 지표</h2>
            <div className="aiSkillList">
              {skillMetrics.map((skill) => (
                <div className="aiSkillMetric" key={skill.label}>
                  <div>
                    <span>{skill.label}</span>
                    <strong>{skill.score}%</strong>
                  </div>
                  <div className="aiSkillTrack">
                    <span style={{ width: `${skill.score}%` }} />
                  </div>
                  {skill.warning ? <p>{skill.warning}</p> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="aiInsightPanel">
            <header>
              <span aria-hidden="true">DATA</span>
              <h2>Raw AI Insights</h2>
            </header>
            <div className="aiKeywordBox">
              <span>Keyword Optimization Map</span>
              <div>
                {(result.missingKeywords.length ? result.missingKeywords : job.skills.slice(0, 4)).map(
                  (keyword) => (
                    <em className={result.missingKeywords.includes(keyword) ? "muted" : ""} key={keyword}>
                      {keyword}
                    </em>
                  )
                )}
              </div>
            </div>
            <p>
              <strong>분석 엔진 비고:</strong>
              {weaknesses[0]} {result.rewriteGuides[0]}
            </p>
          </section>
        </aside>
      </section>

      <section className="aiDetailsFinalAction">
        <h2>완성된 리포트를 바탕으로 이력서를 업데이트할까요?</h2>
        <div>
          <button type="button">리포트 PDF 다운로드</button>
          <button type="button">이력서 자동 수정하기</button>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
