import type {
  CareerPortfolioAnalysis,
  CareerPortfolioFact
} from "../../types/career-document-workflow.js";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const URL_PATTERN = /https?:\/\/[^\s)>\]]+/gi;
const USER_AGENT = "Neet2Work-Career-Document-Coach";
const FALLBACK_MESSAGE = "포트폴리오 페이지를 직접 읽지 못했으므로 프로젝트 설명과 기술스택을 붙여넣어 달라.";
const PORTFOLIO_FETCH_TIMEOUT_MS = Number(process.env.PORTFOLIO_ANALYSIS_TIMEOUT_MS) || 8_000;
const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.", "0.0.0.0"]);
const SKILL_MARKERS = [
  "React",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Express",
  "Next.js",
  "Vite",
  "PostgreSQL",
  "Prisma",
  "SQL",
  "Python",
  "Java",
  "Spring",
  "Docker",
  "AWS",
  "Supabase",
  "REST API",
  "GraphQL",
  "Figma",
  "Git"
];

export class PortfolioAnalysisService {
  constructor(private readonly fetchFn?: FetchLike) {}

  extractUrls(text: string) {
    return Array.from(new Set(text.match(URL_PATTERN) ?? []))
      .map(cleanUrl)
      .filter((url) => {
        try {
          return new URL(url).hostname.toLowerCase() !== "github.com";
        } catch {
          return false;
        }
      });
  }

  async analyzeFromText(text: string): Promise<CareerPortfolioAnalysis[]> {
    const urls = this.extractUrls(text).slice(0, 3);
    const analyses: CareerPortfolioAnalysis[] = [];

    for (const [index, url] of urls.entries()) {
      analyses.push(await this.analyzeUrl(url, `portfolio-${index + 1}`));
    }

    return analyses;
  }

  async analyzeUrl(url: string, sourceId: string): Promise<CareerPortfolioAnalysis> {
    const parsedUrl = parseSafePortfolioUrl(url);
    if (!parsedUrl) {
      return unavailable(sourceId, url);
    }

    if (!this.fetchFn && await resolvesToBlockedAddress(parsedUrl.hostname)) {
      return unavailable(sourceId, url);
    }

    try {
      const response = await this.fetchWithTimeout(url, {
        headers: {
          Accept: "text/html,text/plain;q=0.8",
          "User-Agent": USER_AGENT
        }
      });

      if (!response.ok) {
        throw new Error(`portfolio_request_failed:${response.status}`);
      }

      const html = await response.text();
      const title = extractTitle(html);
      const text = htmlToText(html);
      const excerpt = summarizeText(text);
      const detectedSkills = detectSkills(text);
      const facts = buildFacts({ sourceId, title, excerpt, detectedSkills });

      if (facts.length === 0) {
        return unavailable(sourceId, url);
      }

      return {
        sourceId,
        url,
        status: "fetched",
        title,
        excerpt,
        detectedSkills,
        facts
      };
    } catch {
      return unavailable(sourceId, url);
    }
  }

  private async fetchWithTimeout(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PORTFOLIO_FETCH_TIMEOUT_MS);

    try {
      return await (this.fetchFn ?? fetch)(url, {
        ...init,
        redirect: "error",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

function cleanUrl(url: string) {
  return url.replace(/[.,;:!?]+$/, "");
}

function parseSafePortfolioUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || isBlockedHostname(parsed.hostname)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function resolvesToBlockedAddress(hostname: string) {
  if (isIP(hostname)) {
    return false;
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: false });
    return addresses.length === 0 || addresses.some(({ address }) => isBlockedHostname(address));
  } catch {
    return true;
  }
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/u, "");

  if (
    BLOCKED_HOSTNAMES.has(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    return isPrivateIpv4(normalized);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(normalized);
  }

  return false;
}

function isPrivateIpv4(ipAddress: string) {
  const parts = ipAddress.split(".").map((part) => Number(part));
  const [first, second] = parts;

  return (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255) ||
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first >= 224
  );
}

function isPrivateIpv6(ipAddress: string) {
  const normalized = ipAddress.toLowerCase();

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    /^::ffff:172\.(1[6-9]|2\d|3[01])\./u.test(normalized) ||
    normalized.startsWith("::ffff:169.254.")
  );
}

function unavailable(sourceId: string, url: string): CareerPortfolioAnalysis {
  return {
    sourceId,
    url,
    status: "unavailable",
    detectedSkills: [],
    facts: [],
    fallbackMessage: FALLBACK_MESSAGE
  };
}

function extractTitle(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeEntities(stripTags(title)).replace(/\s+/g, " ").trim().slice(0, 120) : undefined;
}

function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function summarizeText(text: string) {
  const summary = text.replace(/\s+/g, " ").trim().slice(0, 360);
  return summary.length > 0 ? summary : undefined;
}

function detectSkills(text: string) {
  const lower = text.toLowerCase();
  return SKILL_MARKERS.filter((skill) => lower.includes(skill.toLowerCase()));
}

function buildFacts(input: {
  sourceId: string;
  title?: string;
  excerpt?: string;
  detectedSkills: string[];
}): CareerPortfolioFact[] {
  const facts: CareerPortfolioFact[] = [];

  if (input.title) {
    facts.push({
      sourceId: input.sourceId,
      sourceType: "portfolio_page",
      fact: `포트폴리오 제목: ${input.title}`
    });
  }

  if (input.detectedSkills.length > 0) {
    facts.push({
      sourceId: input.sourceId,
      sourceType: "portfolio_page",
      fact: `포트폴리오 기술스택: ${input.detectedSkills.join(", ")}`
    });
  }

  if (input.excerpt) {
    facts.push({
      sourceId: input.sourceId,
      sourceType: "portfolio_page",
      fact: `포트폴리오 요약: ${input.excerpt}`
    });
  }

  return facts;
}

export const portfolioAnalysisService = new PortfolioAnalysisService();
