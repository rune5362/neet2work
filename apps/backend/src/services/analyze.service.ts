import type { AnalysisResult } from "../types/analysis.js";

type AnalyzeInput = {
  resumeText: string;
  jobId: string;
};

export async function analyzeResume(input: AnalyzeInput): Promise<AnalysisResult> {
  return mockAnalyze(input);
}

function mockAnalyze(input: AnalyzeInput, mode: "mock" | "ai" = "mock"): AnalysisResult {
  const normalizedResume = input.resumeText.toLowerCase();
  const hasReact = normalizedResume.includes("react");
  const hasTypeScript =
    normalizedResume.includes("typescript") || normalizedResume.includes("type script");
  const hasApi = normalizedResume.includes("api") || normalizedResume.includes("연동");

  const score = 55 + Number(hasReact) * 18 + Number(hasTypeScript) * 17 + Number(hasApi) * 10;

  return {
    jobId: input.jobId,
    matchScore: Math.min(score, 95),
    strengths: [
      hasReact
        ? "React 경험이 채용공고의 핵심 기술과 잘 맞습니다."
        : "기본적인 웹 개발 경험을 직무 역량으로 연결할 수 있습니다.",
      hasApi
        ? "API 연동 경험을 통해 백엔드와 협업 가능한 역량을 보여줄 수 있습니다."
        : "프로젝트 흐름을 사용자 문제 해결 관점으로 설명할 여지가 있습니다."
    ],
    weaknesses: hasTypeScript ? [] : ["TypeScript 경험이 부족하게 보일 수 있습니다."],
    missingKeywords: hasTypeScript ? [] : ["TypeScript", "API 연동", "상태 관리"],
    rewriteGuides: [
      "프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요.",
      "채용공고의 기술 키워드를 자기소개서에 자연스럽게 반영하세요.",
      "수치화 가능한 성과가 있다면 함께 작성하세요."
    ],
    suggestedSentences: [
      "React 기반 프로젝트에서 사용자 입력 데이터를 API와 연동하여 분석 결과를 시각화한 경험이 있습니다.",
      "문제 해결 과정에서 기능 구현뿐 아니라 예외 상황과 사용자 경험을 함께 고려했습니다."
    ],
    mode
  };
}
