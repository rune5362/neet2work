import type { AnalysisResult } from "../types/analysis";
import type { JobPosting } from "../types/job";

type AnalysisPanelProps = {
  analysis: AnalysisResult | null;
  selectedJob?: JobPosting;
};

export function AnalysisPanel({ analysis, selectedJob }: AnalysisPanelProps) {
  if (!analysis) {
    return (
      <section className="resultPanel empty">
        <p>채용공고를 선택하고 자기소개서를 분석하면 결과가 여기에 표시됩니다.</p>
      </section>
    );
  }

  return (
    <section className="resultPanel">
      <div className="scoreBox">
        <span>{analysis.mode === "ai" ? "AI 분석" : "Mock 분석"}</span>
        <strong>{analysis.matchScore}</strong>
        <p>{selectedJob ? `${selectedJob.company} · ${selectedJob.title}` : analysis.jobId}</p>
      </div>

      <ResultList title="강점" items={analysis.strengths} />
      <ResultList title="보완점" items={analysis.weaknesses} fallback="큰 보완점이 감지되지 않았습니다." />
      <ResultList
        title="부족한 키워드"
        items={analysis.missingKeywords}
        fallback="필수 키워드가 충분히 반영되어 있습니다."
      />
      <ResultList title="수정 가이드" items={analysis.rewriteGuides} />
      <ResultList title="추천 문장" items={analysis.suggestedSentences} />
    </section>
  );
}

function ResultList({
  title,
  items,
  fallback
}: {
  title: string;
  items: string[];
  fallback?: string;
}) {
  return (
    <div className="resultList">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">{fallback}</p>
      )}
    </div>
  );
}
