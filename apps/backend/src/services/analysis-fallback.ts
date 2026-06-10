import type { AnalysisResult } from "../types/analysis.js";
import type { JobPosting } from "../types/job.js";

export type AnalyzeFallbackInput = {
  resumeText: string;
  jobId: string;
  job?: Pick<JobPosting, "title" | "company" | "description" | "skills"> | null;
};

function collectJobKeywords(job?: AnalyzeFallbackInput["job"]) {
  const skillKeywords = job?.skills ?? [];
  const textKeywords = `${job?.title ?? ""}\n${job?.description ?? ""}`
    .split(/[^A-Za-z0-9가-힣+#.]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 40);

  return Array.from(new Set([...skillKeywords, ...textKeywords]));
}

function keywordIncluded(text: string, keyword: string) {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

export function buildFallbackAnalysis(input: AnalyzeFallbackInput, mode: "mock" | "ai" = "mock"): AnalysisResult {
  const normalizedResume = input.resumeText.toLowerCase();
  const jobKeywords = collectJobKeywords(input.job);
  const matchedKeywords = jobKeywords.filter((keyword) => keywordIncluded(input.resumeText, keyword));
  const hasReact = normalizedResume.includes("react");
  const hasTypeScript =
    normalizedResume.includes("typescript") || normalizedResume.includes("type script");
  const hasApi = normalizedResume.includes("api") || normalizedResume.includes("연동");
  const keywordScore = jobKeywords.length > 0 ? Math.min(25, Math.round((matchedKeywords.length / jobKeywords.length) * 50)) : 0;
  const score = 45 + Number(hasReact) * 14 + Number(hasTypeScript) * 14 + Number(hasApi) * 8 + keywordScore;
  const missingKeywords = jobKeywords
    .filter((keyword) => !matchedKeywords.includes(keyword))
    .filter((keyword) => /react|typescript|node|api|test|테스트|자동화|프론트|백엔드|데이터/i.test(keyword))
    .slice(0, 5);

  return {
    jobId: input.jobId,
    matchScore: Math.min(score, 95),
    strengths: [
      hasReact
        ? "React 경험이 공고의 프론트엔드 요구 역량과 연결됩니다."
        : "보유 경험을 지원 직무의 문제 해결 역량으로 재구성할 수 있습니다.",
      matchedKeywords.length > 0
        ? `이력서에 공고 키워드 ${matchedKeywords.slice(0, 3).join(", ")}가 포함되어 있습니다.`
        : "프로젝트 흐름을 공고 요구사항과 직접 연결하면 설득력이 올라갑니다."
    ],
    weaknesses: [
      ...(hasTypeScript ? [] : ["TypeScript 경험이 명확하게 드러나지 않습니다."]),
      ...(missingKeywords.length > 0 ? [`공고 키워드 ${missingKeywords.slice(0, 3).join(", ")} 보완이 필요합니다.`] : [])
    ],
    missingKeywords,
    rewriteGuides: [
      "프로젝트 경험을 문제 상황, 본인 역할, 해결 행동, 결과 순서로 정리하세요.",
      "공고의 기술 키워드를 단순 나열하지 말고 실제 구현 맥락에 묶어 작성하세요.",
      "확인 가능한 결과가 있다면 수치 또는 변화 전후로 표현하세요."
    ],
    suggestedSentences: [
      "React와 TypeScript 기반 화면을 구현하며 사용자 흐름과 상태 변화를 안정적으로 관리한 경험이 있습니다.",
      "기능 구현 이후 테스트와 검증 과정을 통해 회귀 오류를 줄이고 문서 작성 흐름의 신뢰도를 높였습니다."
    ],
    mode
  };
}
