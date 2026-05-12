import { chromium } from "playwright";
import type { JobPosting } from "../types/job.js";

export type CollectedJobPosting = Omit<JobPosting, "id">;

export async function collectJobPostingFromPage(url: string): Promise<CollectedJobPosting> {
  const browser = await chromium.launch({
    headless: true
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: "domcontentloaded"
    });

    const pageTitle = await page.title();

    return {
      title: pageTitle || "제목 미확인 채용공고",
      company: "수집 필요",
      location: "수집 필요",
      careerLevel: "수집 필요",
      skills: [],
      description: "Playwright RPA 수집 결과를 이 구조로 정규화합니다.",
      sourceUrl: url
    };
  } finally {
    await browser.close();
  }
}
