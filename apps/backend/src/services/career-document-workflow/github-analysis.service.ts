import type {
  CareerGithubAnalysis,
  CareerGithubFact,
  CareerGithubRepositorySummary
} from "../../types/career-document-workflow.js";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type GithubRepoResponse = {
  name?: string;
  full_name?: string;
  description?: string | null;
  language?: string | null;
  topics?: string[];
  updated_at?: string;
  pushed_at?: string;
  default_branch?: string;
  fork?: boolean;
  archived?: boolean;
};

type GithubUserResponse = {
  login?: string;
  name?: string | null;
  bio?: string | null;
  public_repos?: number;
};

type GithubReadmeResponse = {
  content?: string;
  encoding?: string;
  size?: number;
};

type GithubTreeResponse = {
  tree?: Array<{
    path?: string;
    type?: string;
    size?: number;
  }>;
  truncated?: boolean;
};

type GithubContentResponse = {
  content?: string;
  encoding?: string;
  size?: number;
};

type RepositoryInspection = {
  inspectedFiles: string[];
  sourceFileSignals: string[];
  techStack: string[];
};

type GithubAnalysisContext = {
  keywords: string[];
};

type RankedGithubRepo = {
  metadata: GithubRepoResponse;
  repoName?: string;
  score: number;
  matchedKeywords: string[];
  updatedTime: number;
};

type GithubCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type CacheLookup<T> =
  | {
      hit: true;
      value: T;
    }
  | {
      hit: false;
    };

class GithubRequestError extends Error {
  constructor(
    readonly status: number,
    readonly fallbackMessage: string
  ) {
    super(`github_request_failed:${status}`);
  }
}

const GITHUB_URL_PATTERN = /https?:\/\/github\.com\/[^\s)>\]]+/gi;
const USER_AGENT = "Neet2Work-Career-Document-Coach";
const FALLBACK_MESSAGE = "GitHub 내용을 직접 읽지 못했으므로 README나 프로젝트 설명을 붙여넣어 달라.";
const GITHUB_FETCH_TIMEOUT_MS = Number(process.env.GITHUB_ANALYSIS_TIMEOUT_MS) || 8_000;
const GITHUB_MANIFEST_MAX_FILES = 8;
const GITHUB_MANIFEST_MAX_BYTES = 160_000;
const GITHUB_TREE_PATH_LIMIT = 5_000;
const GITHUB_PROFILE_REPO_LIST_LIMIT = 50;
const GITHUB_PROFILE_REPO_SUMMARY_LIMIT = 8;
const GITHUB_PROFILE_REPO_DEEP_READ_LIMIT = 3;
const GITHUB_ANALYSIS_CACHE_TTL_MS = Number(process.env.GITHUB_ANALYSIS_CACHE_TTL_MS) || 15 * 60 * 1000;
const COMMON_MANIFEST_PATHS = [
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  "tsconfig.json",
  "prisma/schema.prisma",
  "Dockerfile",
  "docker-compose.yml",
  "requirements.txt",
  "pyproject.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "go.mod",
  "Cargo.toml",
  "tailwind.config.ts",
  "tailwind.config.js"
];

export class GithubAnalysisService {
  private readonly responseCache = new Map<string, GithubCacheEntry<unknown>>();

  constructor(private readonly fetchFn?: FetchLike) {}

  extractUrls(text: string) {
    return Array.from(new Set(text.match(GITHUB_URL_PATTERN) ?? [])).map(cleanGithubUrl);
  }

  async analyzeFromText(text: string): Promise<CareerGithubAnalysis[]> {
    const urls = this.extractUrls(text).slice(0, 3);
    const analyses: CareerGithubAnalysis[] = [];

    for (const [index, url] of urls.entries()) {
      analyses.push(await this.analyzeUrl(url, `github-${index + 1}`, buildAnalysisContext(text)));
    }

    return analyses;
  }

  async analyzeUrl(url: string, sourceId: string, context: GithubAnalysisContext = buildAnalysisContext("")): Promise<CareerGithubAnalysis> {
    const parsed = parseGithubUrl(url);

    if (!parsed) {
      return unavailable(sourceId, url);
    }

    try {
      return parsed.repo
        ? await this.analyzeRepositoryUrl(sourceId, url, parsed.owner, parsed.repo)
        : await this.analyzeProfileUrl(sourceId, url, parsed.owner, context);
    } catch (error) {
      return unavailable(sourceId, url, parsed.owner, parsed.repo, githubFailureMessage(error));
    }
  }

  private async analyzeRepositoryUrl(sourceId: string, url: string, owner: string, repo: string) {
    const [repoMetadata, readme, languages] = await Promise.all([
      this.getJson<GithubRepoResponse>(`https://api.github.com/repos/${owner}/${repo}`),
      this.getReadme(owner, repo),
      this.getJson<Record<string, number>>(`https://api.github.com/repos/${owner}/${repo}/languages`).catch(() => ({}))
    ]);
    const languageNames = Object.keys(languages);
    const inspection = await this.inspectRepository(owner, repo, repoMetadata.default_branch, languageNames).catch(() =>
      emptyInspection(languageNames)
    );
    const repository = buildRepositorySummary(owner, repo, repoMetadata, languageNames, readme);
    const facts = buildRepoFacts(sourceId, repository, inspection);

    return {
      sourceId,
      url,
      status: "fetched" as const,
      owner,
      repo,
      repositories: [repository],
      facts
    };
  }

  private async analyzeProfileUrl(sourceId: string, url: string, owner: string, context: GithubAnalysisContext) {
    const [profile, repos] = await Promise.all([
      this.getJson<GithubUserResponse>(`https://api.github.com/users/${owner}`),
      this.getJson<GithubRepoResponse[]>(
        `https://api.github.com/users/${owner}/repos?type=owner&sort=full_name&per_page=${GITHUB_PROFILE_REPO_LIST_LIMIT}`
      )
    ]);
    const rankedRepos = rankProfileRepositories(owner, repos, context);
    const repositoriesToSummarize = rankedRepos.slice(0, GITHUB_PROFILE_REPO_SUMMARY_LIMIT);
    const deeplyInspectedRepoNames = new Set(
      repositoriesToSummarize
        .slice(0, GITHUB_PROFILE_REPO_DEEP_READ_LIMIT)
        .map((repo) => repo.repoName)
        .filter((repoName): repoName is string => Boolean(repoName))
    );
    const repositoriesWithInspection = await Promise.all(
      repositoriesToSummarize.map(async ({ metadata: repoMetadata, repoName }) => {
        const effectiveRepoName = repoName ?? extractRepoName(owner, repoMetadata);
        const baseLanguages = repoMetadata.language ? [repoMetadata.language] : [];

        if (!effectiveRepoName || !deeplyInspectedRepoNames.has(effectiveRepoName)) {
          return {
            repository: buildRepositorySummary(owner, effectiveRepoName ?? "unknown", repoMetadata, baseLanguages),
            inspection: emptyInspection(baseLanguages)
          };
        }

        const [languages, readme] = await Promise.all([
          this.getJson<Record<string, number>>(`https://api.github.com/repos/${owner}/${effectiveRepoName}/languages`).catch(() => ({})),
          this.getReadme(owner, effectiveRepoName).catch(() => undefined)
        ]);
        const languageNames = Object.keys(languages);
        const effectiveLanguages = languageNames.length > 0 ? languageNames : baseLanguages;
        const inspection = await this.inspectRepository(owner, effectiveRepoName, repoMetadata.default_branch, effectiveLanguages).catch(() =>
          emptyInspection(effectiveLanguages)
        );

        return {
          repository: buildRepositorySummary(owner, effectiveRepoName, repoMetadata, effectiveLanguages, readme),
          inspection
        };
      })
    );
    const repositories = repositoriesWithInspection.map((item) => item.repository);
    const facts: CareerGithubFact[] = [];

    if (profile.login) {
      facts.push({
        sourceId,
        sourceType: "github_profile",
        fact: `GitHub 프로필 ${profile.login}은 public repository ${profile.public_repos ?? repositories.length}개를 공개하고 있습니다.`
      });
    }
    if (profile.bio) {
      facts.push({
        sourceId,
        sourceType: "github_profile",
        fact: `GitHub 프로필 소개: ${profile.bio}`
      });
    }
    const selectionFact = buildProfileRepoSelectionFact(sourceId, rankedRepos, context);
    if (selectionFact) {
      facts.push(selectionFact);
    }

    facts.push(
      ...repositoriesWithInspection.flatMap(({ repository, inspection }, index) =>
        buildRepoFacts(sourceId, repository, inspection).slice(0, index < GITHUB_PROFILE_REPO_DEEP_READ_LIMIT ? 5 : 2)
      )
    );

    return {
      sourceId,
      url,
      status: "fetched" as const,
      owner,
      repositories,
      facts
    };
  }

  private async getJson<T>(url: string): Promise<T> {
    const cacheKey = buildCacheKey("json", url);
    const cached = this.getCached<T>(cacheKey);
    if (cached.hit) {
      return cached.value;
    }

    const response = await this.fetchWithTimeout(url, {
      headers: githubHeaders()
    });

    if (!response.ok) {
      throw new GithubRequestError(response.status, buildGithubFallbackMessage(response));
    }

    const data = (await response.json()) as T;
    this.setCached(cacheKey, data);

    return data;
  }

  private async getReadme(owner: string, repo: string) {
    const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
    const cacheKey = buildCacheKey("readme", url);
    const cached = this.getCached<string | undefined>(cacheKey);
    if (cached.hit) {
      return cached.value;
    }

    const response = await this.fetchWithTimeout(url, {
      headers: githubHeaders()
    });

    if (!response.ok) {
      this.setCached(cacheKey, undefined);
      return undefined;
    }

    const data = (await response.json()) as GithubReadmeResponse;
    if (data.encoding !== "base64" || !data.content) {
      this.setCached(cacheKey, undefined);
      return undefined;
    }

    const readme = Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8");
    this.setCached(cacheKey, readme);

    return readme;
  }

  private async inspectRepository(
    owner: string,
    repo: string,
    defaultBranch: string | undefined,
    languageNames: string[]
  ): Promise<RepositoryInspection> {
    const branch = defaultBranch?.trim() || "main";
    const tree = await this.getJson<GithubTreeResponse>(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
    ).catch(() => undefined);
    const treePaths = Array.isArray(tree?.tree)
      ? tree.tree
          .filter((item) => item.type === "blob" && item.path)
          .map((item) => item.path as string)
          .slice(0, GITHUB_TREE_PATH_LIMIT)
      : [];
    const manifestPaths = selectManifestPaths(treePaths);
    const inspectedManifestEntries = (
      await Promise.all(
        manifestPaths.map(async (path) => {
          const text = await this.getTextFile(owner, repo, path, branch).catch(() => undefined);
          return text ? { path, text } : null;
        })
      )
    ).filter((entry): entry is { path: string; text: string } => Boolean(entry));
    const techStack = detectTechStack({
      languageNames,
      manifestEntries: inspectedManifestEntries,
      treePaths
    });

    return {
      inspectedFiles: inspectedManifestEntries.map((entry) => entry.path),
      sourceFileSignals: summarizeSourceFileSignals(treePaths),
      techStack
    };
  }

  private async getTextFile(owner: string, repo: string, path: string, branch: string) {
    const encodedPath = encodeGithubPath(path);
    const encodedBranch = encodeURIComponent(branch);
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodedBranch}`;
    const cacheKey = buildCacheKey("content", url);
    const cached = this.getCached<string | undefined>(cacheKey);
    if (cached.hit) {
      return cached.value;
    }

    const response = await this.fetchWithTimeout(url, {
      headers: githubHeaders()
    });

    if (!response.ok) {
      this.setCached(cacheKey, undefined);
      return undefined;
    }

    const data = (await response.json()) as GithubContentResponse;
    if (data.size && data.size > GITHUB_MANIFEST_MAX_BYTES) {
      this.setCached(cacheKey, undefined);
      return undefined;
    }
    if (data.encoding !== "base64" || !data.content) {
      this.setCached(cacheKey, undefined);
      return undefined;
    }

    const text = Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8").slice(0, GITHUB_MANIFEST_MAX_BYTES);
    this.setCached(cacheKey, text);

    return text;
  }

  private async fetchWithTimeout(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GITHUB_FETCH_TIMEOUT_MS);

    try {
      return await (this.fetchFn ?? fetch)(url, {
        ...init,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private getCached<T>(key: string): CacheLookup<T> {
    const entry = this.responseCache.get(key) as GithubCacheEntry<T> | undefined;
    if (!entry) {
      return { hit: false };
    }

    if (entry.expiresAt <= Date.now()) {
      this.responseCache.delete(key);
      return { hit: false };
    }

    return {
      hit: true,
      value: entry.value
    };
  }

  private setCached<T>(key: string, value: T) {
    this.responseCache.set(key, {
      expiresAt: Date.now() + GITHUB_ANALYSIS_CACHE_TTL_MS,
      value
    });
  }
}

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT
  };
  const token = githubToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function buildCacheKey(kind: string, url: string) {
  const authScope = githubToken() ? "server-token" : "anonymous";

  return `${authScope}:${kind}:${url}`;
}

function githubToken() {
  return (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
}

function cleanGithubUrl(url: string) {
  return url
    .replace(/[.,;:!?]+$/, "")
    .replace(/(?<=[A-Za-z0-9_.-])[가-힣]+$/u, "");
}

function buildAnalysisContext(text: string): GithubAnalysisContext {
  const keywords = new Set<string>();
  const normalized = normalizeSearchText(text);
  const rawKeywords = normalized.match(/[a-z0-9+#.]+|[가-힣]{2,}/g) ?? [];

  for (const keyword of rawKeywords) {
    addContextKeyword(keywords, keyword);
  }

  for (const [pattern, semanticKeywords] of SEMANTIC_KEYWORD_RULES) {
    if (pattern.test(text) || pattern.test(normalized)) {
      semanticKeywords.forEach((keyword) => addContextKeyword(keywords, keyword));
    }
  }

  return {
    keywords: Array.from(keywords).slice(0, 80)
  };
}

const CONTEXT_STOP_KEYWORDS = new Set([
  "github",
  "http",
  "https",
  "com",
  "www",
  "readme",
  "읽고",
  "분석",
  "작성",
  "해줘",
  "자소서",
  "양식",
  "첨부",
  "문항",
  "지원",
  "직무",
  "관련",
  "프로젝트",
  "경험",
  "구체적으로"
]);

const SEMANTIC_KEYWORD_RULES: Array<[RegExp, string[]]> = [
  [
    /백엔드|backend|back\s*end|서버|api|rest|db|데이터베이스|postgres|sql|node|express|spring|fastapi|django/i,
    ["backend", "server", "api", "rest", "nodejs", "express", "database", "db", "postgresql", "postgres", "sql", "prisma", "spring", "fastapi", "django"]
  ],
  [
    /프론트|frontend|front\s*end|화면|ui|ux|react|next|vite|css|html|tailwind/i,
    ["frontend", "ui", "react", "nextjs", "vite", "typescript", "javascript", "html", "css", "tailwind"]
  ],
  [
    /풀스택|full\s*stack|fullstack/i,
    ["fullstack", "backend", "frontend", "api", "server", "react", "nodejs", "database"]
  ],
  [
    /ai|인공지능|생성형|llm|gpt|codex|gemini|모델|프롬프트|prompt/i,
    ["ai", "llm", "gpt", "codex", "gemini", "model", "prompt", "automation"]
  ],
  [
    /커리어|채용|지원자|이력서|resume|career|applicant|ats|recruit|hire/i,
    ["career", "resume", "applicant", "ats", "recruit", "job", "cover", "letter"]
  ],
  [
    /사진|이미지|보정|photo|image|lightroom|raw/i,
    ["photo", "image", "raw", "editor", "lightroom", "vision"]
  ],
  [
    /보안|인증|권한|security|auth|protect|login/i,
    ["security", "auth", "login", "protect", "permission"]
  ],
  [
    /크롤|crawler|crawl|rpa|자동화|automation|batch|scheduler/i,
    ["crawler", "crawl", "rpa", "automation", "batch", "scheduler"]
  ]
];

function addContextKeyword(keywords: Set<string>, value: string) {
  const normalized = normalizeSearchText(value).trim();
  if (normalized.length < 2 || CONTEXT_STOP_KEYWORDS.has(normalized)) {
    return;
  }

  keywords.add(normalized);
}

function rankProfileRepositories(
  owner: string,
  repos: GithubRepoResponse[],
  context: GithubAnalysisContext
): RankedGithubRepo[] {
  const rankedRepos = repos.map((repoMetadata) => scoreProfileRepository(owner, repoMetadata, context));
  const hasRelevantScore = rankedRepos.some((repo) => repo.score > 0);

  return rankedRepos.sort((a, b) => {
    if (hasRelevantScore && a.score !== b.score) {
      return b.score - a.score;
    }
    if (a.updatedTime !== b.updatedTime) {
      return b.updatedTime - a.updatedTime;
    }

    return (a.repoName ?? "").localeCompare(b.repoName ?? "");
  });
}

function scoreProfileRepository(
  owner: string,
  repoMetadata: GithubRepoResponse,
  context: GithubAnalysisContext
): RankedGithubRepo {
  const repoName = extractRepoName(owner, repoMetadata);
  const nameText = normalizeSearchText([repoName, repoMetadata.full_name].filter(Boolean).join(" "));
  const descriptionText = normalizeSearchText(repoMetadata.description ?? "");
  const languageText = normalizeSearchText(repoMetadata.language ?? "");
  const topicText = normalizeSearchText((repoMetadata.topics ?? []).join(" "));
  const matchedKeywords = new Set<string>();
  let score = 0;

  for (const keyword of context.keywords) {
    if (keywordMatchesField(nameText, keyword)) {
      score += 8;
      matchedKeywords.add(keyword);
    }
    if (keywordMatchesField(topicText, keyword)) {
      score += 6;
      matchedKeywords.add(keyword);
    }
    if (keywordMatchesField(descriptionText, keyword)) {
      score += 5;
      matchedKeywords.add(keyword);
    }
    if (keywordMatchesField(languageText, keyword)) {
      score += 4;
      matchedKeywords.add(keyword);
    }
  }

  if (repoMetadata.archived) {
    score -= 8;
  }
  if (repoMetadata.fork) {
    score -= 4;
  }

  return {
    metadata: repoMetadata,
    repoName,
    score,
    matchedKeywords: Array.from(matchedKeywords).slice(0, 8),
    updatedTime: Date.parse(repoMetadata.pushed_at ?? repoMetadata.updated_at ?? "") || 0
  };
}

function buildProfileRepoSelectionFact(
  sourceId: string,
  rankedRepos: RankedGithubRepo[],
  context: GithubAnalysisContext
): CareerGithubFact | undefined {
  const selectedRepos = rankedRepos.slice(0, GITHUB_PROFILE_REPO_DEEP_READ_LIMIT).filter((repo) => repo.repoName);
  if (selectedRepos.length === 0) {
    return undefined;
  }

  const selectedNames = selectedRepos.map((repo) => repo.metadata.full_name ?? repo.repoName).join(", ");
  const matchedKeywords = uniqueStrings(selectedRepos.flatMap((repo) => repo.matchedKeywords)).slice(0, 8);
  const selectionMode =
    context.keywords.length > 0 && matchedKeywords.length > 0
      ? `지원 맥락 관련도(${matchedKeywords.join(", ")})`
      : "관련 키워드 부족으로 최근 업데이트 보조 기준";

  return {
    sourceId,
    sourceType: "github_profile",
    fact: `GitHub 프로필 저장소 ${rankedRepos.length}개 중 ${selectionMode}으로 ${selectedNames}를 우선 분석했습니다.`
  };
}

function keywordMatchesField(field: string, keyword: string) {
  if (!field || !keyword) {
    return false;
  }

  const tokens = field.split(" ").filter(Boolean);
  if (tokens.includes(keyword)) {
    return true;
  }

  const aliasMatches: Record<string, string[]> = {
    postgres: ["postgresql"],
    postgresql: ["postgres"],
    node: ["nodejs"],
    nodejs: ["node"],
    next: ["nextjs"],
    nextjs: ["next"],
    tailwind: ["tailwindcss"],
    tailwindcss: ["tailwind"]
  };

  return (aliasMatches[keyword] ?? []).some((alias) => tokens.includes(alias));
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/node\.js/g, "nodejs")
    .replace(/next\.js/g, "nextjs")
    .replace(/react\.js/g, "react")
    .replace(/postgresql/g, "postgresql")
    .replace(/[_/\\-]+/g, " ")
    .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGithubUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== "github.com") {
      return null;
    }

    const [owner, repo] = parsed.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);

    if (!owner) {
      return null;
    }

    return {
      owner,
      repo
    };
  } catch {
    return null;
  }
}

function unavailable(sourceId: string, url: string, owner?: string, repo?: string, fallbackMessage = FALLBACK_MESSAGE): CareerGithubAnalysis {
  return {
    sourceId,
    url,
    status: "unavailable",
    owner,
    repo,
    repositories: [],
    facts: [],
    fallbackMessage
  };
}

function githubFailureMessage(error: unknown) {
  if (error instanceof GithubRequestError) {
    return error.fallbackMessage;
  }

  return "GitHub API 연결이 실패해 저장소 내용을 확인하지 못했습니다. 네트워크 상태를 확인하거나 README/프로젝트 설명을 붙여넣어 달라.";
}

function buildGithubFallbackMessage(response: Response) {
  const remaining = response.headers.get("x-ratelimit-remaining");

  if (response.status === 403 && remaining === "0") {
    const resetText = formatGithubRateLimitReset(response.headers.get("x-ratelimit-reset"));
    return [
      "GitHub API rate limit이 소진되어 저장소 내용을 직접 읽지 못했습니다.",
      "서버 .env에 GITHUB_TOKEN 또는 GH_TOKEN을 설정하면 더 높은 한도로 읽을 수 있습니다.",
      resetText ? `제한 초기화 예정: ${resetText}` : undefined
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (response.status === 404) {
    return "GitHub 프로필 또는 저장소를 찾지 못했습니다. URL이 맞는지 확인하거나 README/프로젝트 설명을 붙여넣어 달라.";
  }

  if (response.status === 401) {
    return "GitHub 인증이 실패해 저장소 내용을 직접 읽지 못했습니다. GITHUB_TOKEN 값을 확인하거나 README/프로젝트 설명을 붙여넣어 달라.";
  }

  return `GitHub API 요청 실패(${response.status})로 저장소 내용을 직접 읽지 못했습니다. README나 프로젝트 설명을 붙여넣어 달라.`;
}

function formatGithubRateLimitReset(value: string | null) {
  const timestampSeconds = Number(value);
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) {
    return undefined;
  }

  return new Date(timestampSeconds * 1000).toISOString();
}

function extractRepoName(owner: string, repoMetadata: GithubRepoResponse) {
  const repoName = repoMetadata.name?.trim();
  if (repoName) {
    return repoName;
  }

  const fullName = repoMetadata.full_name?.trim();
  if (!fullName) {
    return undefined;
  }

  const [fullNameOwner, fullNameRepo] = fullName.split("/");
  if (fullNameOwner?.toLowerCase() === owner.toLowerCase() && fullNameRepo) {
    return fullNameRepo;
  }

  return fullNameRepo;
}

function buildRepositorySummary(
  owner: string,
  repo: string,
  repoMetadata: GithubRepoResponse,
  languageNames: string[],
  readme?: string
): CareerGithubRepositorySummary {
  const fullName = repoMetadata.full_name?.trim() || `${owner}/${repo}`;
  const metadataLanguage = repoMetadata.language?.trim();
  const languages = languageNames.length > 0 ? languageNames : metadataLanguage ? [metadataLanguage] : [];
  const readmeExcerpt = readme ? summarizeReadme(readme) : undefined;

  return {
    fullName,
    description: repoMetadata.description?.trim() || undefined,
    primaryLanguage: metadataLanguage || normalizeTechStack(languages)[0],
    languages: normalizeTechStack(languages),
    updatedAt: repoMetadata.updated_at,
    readmeExcerpt: readmeExcerpt || undefined
  };
}

function summarizeReadme(readme: string) {
  const clean = readme
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\([^)]+\)/g, (match) => match.replace(/\(([^)]+)\)/, ""))
    .replace(/[#>*_`|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return clean.slice(0, 320);
}

function buildRepoFacts(
  sourceId: string,
  repository: CareerGithubRepositorySummary,
  inspection: RepositoryInspection = emptyInspection(repository.languages)
): CareerGithubFact[] {
  const facts: CareerGithubFact[] = [
    {
      sourceId,
      sourceType: "github_repo_metadata",
      fact: `GitHub 저장소 ${repository.fullName} 메타데이터가 확인됐습니다.`
    }
  ];

  if (repository.description) {
    facts.push({
      sourceId,
      sourceType: "github_repo_metadata",
      fact: `GitHub 저장소 ${repository.fullName} 설명: ${repository.description}`
    });
  }

  if (repository.languages.length > 0) {
    facts.push({
      sourceId,
      sourceType: "github_repo_metadata",
      fact: `GitHub 저장소 ${repository.fullName} 사용 언어: ${repository.languages.join(", ")}`
    });
  }

  if (inspection.techStack.length > 0) {
    facts.push({
      sourceId,
      sourceType: "github_repo_metadata",
      fact: `GitHub 저장소 ${repository.fullName} 감지 기술스택: ${inspection.techStack.join(", ")}`
    });
  }

  if (inspection.inspectedFiles.length > 0) {
    facts.push({
      sourceId,
      sourceType: "github_repo_metadata",
      fact: `GitHub 저장소 ${repository.fullName} 기술스택 근거 파일: ${inspection.inspectedFiles.join(", ")}`
    });
  }

  if (inspection.sourceFileSignals.length > 0) {
    facts.push({
      sourceId,
      sourceType: "github_repo_metadata",
      fact: `GitHub 저장소 ${repository.fullName} 주요 소스 구성: ${inspection.sourceFileSignals.join(", ")}`
    });
  }

  if (repository.updatedAt) {
    facts.push({
      sourceId,
      sourceType: "github_repo_metadata",
      fact: `GitHub 저장소 ${repository.fullName} 최근 업데이트: ${repository.updatedAt}`
    });
  }

  if (repository.readmeExcerpt) {
    facts.push({
      sourceId,
      sourceType: "github_readme",
      fact: `GitHub 저장소 ${repository.fullName} README 요약: ${repository.readmeExcerpt}`
    });
  }

  return facts;
}

function emptyInspection(languageNames: string[] = []): RepositoryInspection {
  return {
    inspectedFiles: [],
    sourceFileSignals: [],
    techStack: normalizeTechStack(languageNames)
  };
}

function selectManifestPaths(treePaths: string[]) {
  const normalizedPaths = uniqueStrings([...treePaths, ...COMMON_MANIFEST_PATHS])
    .map((path) => path.replace(/\\/g, "/"))
    .filter((path) => !/(^|\/)(node_modules|dist|build|coverage|\.git)\//i.test(path));
  const priorityPatterns = [
    /^package\.json$/i,
    /(^|\/)package\.json$/i,
    /^pnpm-lock\.yaml$/i,
    /^package-lock\.json$/i,
    /^yarn\.lock$/i,
    /^vite\.config\.[cm]?[jt]s$/i,
    /^next\.config\.[cm]?js$/i,
    /^tsconfig\.json$/i,
    /^prisma\/schema\.prisma$/i,
    /(^|\/)schema\.prisma$/i,
    /^Dockerfile$/i,
    /^docker-compose\.ya?ml$/i,
    /^requirements\.txt$/i,
    /^pyproject\.toml$/i,
    /^pom\.xml$/i,
    /^build\.gradle(?:\.kts)?$/i,
    /^go\.mod$/i,
    /^Cargo\.toml$/i,
    /^tailwind\.config\.[cm]?[jt]s$/i
  ];
  const selected: string[] = [];

  for (const pattern of priorityPatterns) {
    const match = normalizedPaths.find((path) => pattern.test(path));
    if (match && !selected.includes(match)) {
      selected.push(match);
    }
    if (selected.length >= GITHUB_MANIFEST_MAX_FILES) {
      break;
    }
  }

  return selected;
}

function detectTechStack(input: {
  languageNames: string[];
  manifestEntries: Array<{ path: string; text: string }>;
  treePaths: string[];
}) {
  const tech = new Set<string>(normalizeTechStack(input.languageNames));
  const lowerPaths = input.treePaths.map((path) => path.toLowerCase());
  const hasPath = (pattern: RegExp) => lowerPaths.some((path) => pattern.test(path));

  if (hasPath(/(^|\/)package\.json$/)) addTech(tech, "Node.js");
  if (hasPath(/(^|\/)tsconfig\.json$/) || input.languageNames.some((language) => /typescript/i.test(language))) addTech(tech, "TypeScript");
  if (hasPath(/(^|\/)vite\.config\./)) addTech(tech, "Vite");
  if (hasPath(/(^|\/)next\.config\./)) addTech(tech, "Next.js");
  if (hasPath(/(^|\/)prisma\/schema\.prisma$/) || hasPath(/(^|\/)schema\.prisma$/)) addTech(tech, "Prisma");
  if (hasPath(/(^|\/)dockerfile$/) || hasPath(/(^|\/)docker-compose\.ya?ml$/)) addTech(tech, "Docker");
  if (hasPath(/(^|\/)\.github\/workflows\//)) addTech(tech, "GitHub Actions");
  if (hasPath(/(^|\/)tailwind\.config\./)) addTech(tech, "Tailwind CSS");
  if (hasPath(/(^|\/)requirements\.txt$/) || hasPath(/(^|\/)pyproject\.toml$/)) addTech(tech, "Python");
  if (hasPath(/(^|\/)pom\.xml$/) || hasPath(/(^|\/)build\.gradle/)) addTech(tech, "Java");
  if (hasPath(/(^|\/)go\.mod$/)) addTech(tech, "Go");
  if (hasPath(/(^|\/)cargo\.toml$/)) addTech(tech, "Rust");
  if (hasPath(/(^|\/)supabase\//)) addTech(tech, "Supabase");

  for (const entry of input.manifestEntries) {
    detectTechFromManifest(entry.path, entry.text).forEach((item) => addTech(tech, item));
  }

  return sortTechStack(Array.from(tech));
}

function detectTechFromManifest(path: string, text: string) {
  const lowerPath = path.toLowerCase();
  const tech = new Set<string>();

  if (lowerPath.endsWith("package.json")) {
    const packageJson = parsePackageJson(text);
    const dependencyNames = packageJson
      ? Object.keys({
          ...(packageJson.dependencies ?? {}),
          ...(packageJson.devDependencies ?? {}),
          ...(packageJson.peerDependencies ?? {}),
          ...(packageJson.optionalDependencies ?? {})
        })
      : [];

    for (const dependency of dependencyNames) {
      addTechFromPackageName(tech, dependency);
    }
  }

  if (lowerPath.endsWith("schema.prisma")) {
    addTech(tech, "Prisma");
    const provider = text.match(/provider\s*=\s*"([^"]+)"/)?.[1];
    if (provider === "postgresql") addTech(tech, "PostgreSQL");
    if (provider === "mysql") addTech(tech, "MySQL");
    if (provider === "mongodb") addTech(tech, "MongoDB");
    if (provider === "sqlite") addTech(tech, "SQLite");
  }

  if (/dockerfile|docker-compose\.ya?ml$/i.test(lowerPath)) addTech(tech, "Docker");
  if (lowerPath.endsWith("requirements.txt") || lowerPath.endsWith("pyproject.toml")) {
    addTech(tech, "Python");
    if (/fastapi/i.test(text)) addTech(tech, "FastAPI");
    if (/django/i.test(text)) addTech(tech, "Django");
    if (/flask/i.test(text)) addTech(tech, "Flask");
  }
  if (lowerPath.endsWith("pom.xml") || /build\.gradle(?:\.kts)?$/i.test(lowerPath)) {
    addTech(tech, "Java");
    if (/spring-boot|org\.springframework\.boot/i.test(text)) addTech(tech, "Spring Boot");
  }
  if (lowerPath.endsWith("go.mod")) addTech(tech, "Go");
  if (lowerPath.endsWith("cargo.toml")) addTech(tech, "Rust");
  if (/tailwind\.config\./i.test(lowerPath)) addTech(tech, "Tailwind CSS");
  if (/vite\.config\./i.test(lowerPath)) addTech(tech, "Vite");
  if (/next\.config\./i.test(lowerPath)) addTech(tech, "Next.js");

  return Array.from(tech);
}

function parsePackageJson(text: string) {
  try {
    return JSON.parse(text) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

function addTechFromPackageName(tech: Set<string>, packageName: string) {
  const lowerName = packageName.toLowerCase();
  const packageMap: Array<[RegExp, string]> = [
    [/^react$/, "React"],
    [/^@vitejs\/plugin-react$/, "React"],
    [/^vite$/, "Vite"],
    [/^next$/, "Next.js"],
    [/^typescript$/, "TypeScript"],
    [/^express$/, "Express"],
    [/^@nestjs\//, "NestJS"],
    [/^prisma$|^@prisma\/client$/, "Prisma"],
    [/^pg$|postgres/, "PostgreSQL"],
    [/^mysql2?$|mysql/, "MySQL"],
    [/^mongodb$|^mongoose$/, "MongoDB"],
    [/^sqlite3$|better-sqlite3/, "SQLite"],
    [/supabase/, "Supabase"],
    [/tailwindcss/, "Tailwind CSS"],
    [/^zod$/, "Zod"],
    [/^vitest$/, "Vitest"],
    [/^jest$/, "Jest"],
    [/playwright/, "Playwright"],
    [/^react-router-dom$/, "React Router"],
    [/^@tanstack\//, "TanStack"],
    [/^axios$/, "Axios"]
  ];

  for (const [pattern, label] of packageMap) {
    if (pattern.test(lowerName)) {
      addTech(tech, label);
    }
  }
}

function summarizeSourceFileSignals(treePaths: string[]) {
  const counts = new Map<string, number>();
  const extensionLabels: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TSX",
    ".js": "JavaScript",
    ".jsx": "JSX",
    ".py": "Python",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".sql": "SQL"
  };

  for (const path of treePaths) {
    const extension = Object.keys(extensionLabels).find((candidate) => path.toLowerCase().endsWith(candidate));
    if (!extension) {
      continue;
    }
    const label = extensionLabels[extension];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => `${label} 파일 ${count}개`);
}

function normalizeTechStack(values: string[]) {
  return sortTechStack(values.map(normalizeTechName).filter(Boolean));
}

function normalizeTechName(value: string) {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  const languageMap: Record<string, string> = {
    typescript: "TypeScript",
    javascript: "JavaScript",
    html: "HTML",
    css: "CSS",
    python: "Python",
    java: "Java",
    go: "Go",
    rust: "Rust",
    sql: "SQL"
  };

  return languageMap[lower] ?? trimmed;
}

function addTech(tech: Set<string>, value: string) {
  const normalized = normalizeTechName(value);
  if (normalized) {
    tech.add(normalized);
  }
}

function sortTechStack(values: string[]) {
  const order = [
    "TypeScript",
    "JavaScript",
    "Node.js",
    "React",
    "Vite",
    "Next.js",
    "Express",
    "NestJS",
    "Prisma",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "SQLite",
    "Supabase",
    "Docker",
    "GitHub Actions",
    "Tailwind CSS",
    "Python",
    "FastAPI",
    "Django",
    "Flask",
    "Java",
    "Spring Boot",
    "Go",
    "Rust",
    "Zod",
    "Vitest",
    "Jest",
    "Playwright"
  ];

  return uniqueStrings(values).sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function encodeGithubPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export const githubAnalysisService = new GithubAnalysisService();
