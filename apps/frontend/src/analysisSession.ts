import type { AnalysisResult } from "./types/analysis";
import type { JobPosting } from "./types/job";

const ANALYSIS_SESSION_KEY = "neet2work.analysisResult";

export type StoredAnalysis = {
  result: AnalysisResult;
  job: JobPosting;
  resumeText: string;
  tone: "professional" | "friendly";
  createdAt: string;
};

export function saveAnalysisSession(analysis: StoredAnalysis): void {
  window.sessionStorage.setItem(ANALYSIS_SESSION_KEY, JSON.stringify(analysis));
}

export function readAnalysisSession(): StoredAnalysis | null {
  const raw = window.sessionStorage.getItem(ANALYSIS_SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAnalysis;
  } catch {
    window.sessionStorage.removeItem(ANALYSIS_SESSION_KEY);
    return null;
  }
}
