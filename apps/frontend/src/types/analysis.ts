export type AnalysisResult = {
  jobId: string;
  matchScore: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  rewriteGuides: string[];
  suggestedSentences: string[];
  mode: "mock" | "ai";
};
