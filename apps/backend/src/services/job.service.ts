import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPrismaClient } from "../database/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type {
  CareerStage,
  JobPosting,
  PublicCareerStage,
  PublicEmploymentTypeCategory
} from "../types/job.js";
import { redactSensitiveText } from "../utils/redact.js";

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const sampleJobsPath = path.resolve(serviceDir, "../../data/sampleJobs.json");

const fallbackJobs: JobPosting[] = [
  {
    id: "job-001",
    title: "프론트엔드 개발자",
    company: "샘플테크",
    location: "서울",
    careerLevel: "신입",
    skills: ["React", "TypeScript", "JavaScript", "HTML", "CSS"],
    description: "React 기반 웹 서비스 개발자를 채용합니다.",
    source: "sample",
    sourceJobId: "job-001",
    country: "KR",
    language: "ko",
    sourceUrl: "https://example.com/jobs/1"
  }
];

type PublicJobRow = {
  id: string;
  title: string;
  company: string;
  location: string;
  careerLevel: string;
  skills: string[];
  description: string;
  source: string;
  sourceJobId: string | null;
  sourceUrl: string;
  country: string;
  language: string;
  employmentType: string | null;
  educationLevel: string | null;
  salaryText: string | null;
  deadlineText: string | null;
  applyMethod: string | null;
  careerStage: string | null;
  rawJson: Prisma.JsonValue | null;
  collectedAt: Date | null;
};

export type JobListQuery = {
  q?: string;
  source?: string;
  country?: string;
  language?: string;
  careerStage?: PublicCareerStage;
  employmentTypeCategory?: PublicEmploymentTypeCategory | "unspecified";
  jobCategory?: string;
  region1?: string;
  region2?: string;
  region3?: string;
  skill?: string;
  salaryVisibility?: "disclosed" | "undisclosed";
  deadlineType?: "dated" | "rolling";
  newOnly?: boolean;
  page?: number;
  limit?: number;
};

type NormalizedJobListQuery = {
  q?: string;
  source?: string;
  country?: string;
  language?: string;
  careerStage?: PublicCareerStage;
  employmentTypeCategory?: PublicEmploymentTypeCategory | "unspecified";
  jobCategory?: string;
  region1?: string;
  region2?: string;
  region3?: string;
  skill?: string;
  salaryVisibility?: "disclosed" | "undisclosed";
  deadlineType?: "dated" | "rolling";
  newOnly?: boolean;
  page?: number;
  limit?: number;
};

export type JobPage = {
  data: JobPosting[];
  count: number;
  total: number;
  page: number;
  limit: number;
  availableSkills: string[];
};

export type JobFacetOption = {
  value: string;
  count: number;
};

export type JobFacets = {
  sources: JobFacetOption[];
  countries: JobFacetOption[];
  languages: JobFacetOption[];
  total: number;
};

const MAX_JOB_LIMIT = 100;
const DEFAULT_JOB_PAGE = 1;
const DEFAULT_JOB_PAGE_LIMIT = 9;
const ACTIVE_PUBLIC_JOB_WHERE = {
  status: "active"
} satisfies Prisma.JobPostingWhereInput;

export const PUBLIC_JOB_SELECT = {
  id: true,
  title: true,
  company: true,
  location: true,
  careerLevel: true,
  skills: true,
  description: true,
  source: true,
  sourceJobId: true,
  sourceUrl: true,
  country: true,
  language: true,
  employmentType: true,
  educationLevel: true,
  salaryText: true,
  deadlineText: true,
  applyMethod: true,
  careerStage: true,
  collectedAt: true
};
const INTERNAL_PUBLIC_JOB_SELECT = {
  ...PUBLIC_JOB_SELECT,
  rawJson: true
} satisfies Prisma.JobPostingSelect;

const publicCareerStages = new Set<PublicCareerStage>(["entry", "junior", "senior"]);
const publicEmploymentTypeCategories = new Set<PublicEmploymentTypeCategory>([
  "permanent",
  "contract",
  "intern",
  "freelance"
]);

const storedCareerStageMap: Partial<Record<CareerStage, PublicCareerStage>> = {
  intern: "entry",
  entry: "entry",
  junior: "junior",
  mid: "junior",
  senior: "senior",
  lead_manager: "senior"
};

const careerStageStoredValues: Record<PublicCareerStage, CareerStage[]> = {
  entry: ["intern", "entry"],
  junior: ["junior", "mid"],
  senior: ["senior", "lead_manager"]
};

const careerStageSearchTerms: Record<PublicCareerStage, string[]> = {
  entry: ["신입", "인턴", "Entry Level", "未経験", "0-2년", "1년", "2년"],
  junior: ["주니어", "Mid Career", "Experience welcome", "3년", "4년", "5년"],
  senior: ["시니어", "Senior", "Lead", "6년", "7년", "8년", "9년", "10년"]
};

const employmentTypeSearchTerms: Record<PublicEmploymentTypeCategory, string[]> = {
  permanent: ["정규직", "正社員", "Full-time employee", "Full-time", "Full time", "Permanent"],
  contract: ["계약직", "契約社員", "Contract employee", "Contract-based", "Contractual", "Fixed-term"],
  intern: ["인턴", "Internship", "Intern", "インターン"],
  freelance: ["프리랜서", "Freelance", "フリーランス", "業務委託"]
};
const remoteSearchTerms = [
  "재택",
  "재택근무",
  "원격",
  "원격근무",
  "리모트",
  "풀리모트",
  "remote",
  "full remote",
  "work from home",
  "wfh",
  "在宅",
  "在宅勤務",
  "リモート",
  "フルリモ",
  "フルリモート",
  "テレワーク"
] as const;
const remoteSearchKeywords = [
  "재택",
  "재택근무",
  "원격",
  "원격근무",
  "리모트",
  "풀리모트",
  "remote",
  "wfh",
  "在宅",
  "在宅勤務",
  "リモート",
  "フルリモ",
  "フルリモート",
  "テレワーク"
] as const;
const employmentTypeSearchFields = ["employmentType", "title", "careerLevel", "description"] as const;
const genericTextSearchFields = [
  "title",
  "company",
  "location",
  "description",
  "careerLevel",
  "employmentType",
  "jobCategory",
  "rawText"
] as const;
const regionSearchFields = ["location", "title", "description", "rawText"] as const;
const inferredJobCategorySearchTerms: Record<string, string[]> = {
  "AI/데이터": ["ai", "data", "ml", "llm", "machine", "python", "sql", "데이터", "머신러닝", "인공지능"],
  디자인: ["design", "ui", "ux", "figma", "디자인"],
  마케팅: ["marketing", "growth", "seo", "마케팅"],
  보안: ["security", "secops", "보안"],
  PM: ["project manager", "product manager", "pm", "기획"]
};
const nonDevelopmentCategories = Object.keys(inferredJobCategorySearchTerms);
const allEmploymentTypeTerms = Array.from(
  new Set(Object.values(employmentTypeSearchTerms).flat())
);
const ENGLISH_MONTH_INDEXES = new Map<string, number>([
  ["jan", 1],
  ["january", 1],
  ["feb", 2],
  ["february", 2],
  ["mar", 3],
  ["march", 3],
  ["apr", 4],
  ["april", 4],
  ["may", 5],
  ["jun", 6],
  ["june", 6],
  ["jul", 7],
  ["july", 7],
  ["aug", 8],
  ["august", 8],
  ["sep", 9],
  ["sept", 9],
  ["september", 9],
  ["oct", 10],
  ["october", 10],
  ["nov", 11],
  ["november", 11],
  ["dec", 12],
  ["december", 12]
]);
const countryLabels: Record<string, string> = {
  KR: "한국",
  JP: "일본",
  US: "미국"
};
const japaneseSubdivisionAliases: Record<string, readonly string[]> = {
  "치요다구": ["치요다구", "chiyoda", "千代田区"],
  "주오구": ["주오구", "chuo", "中央区"],
  "미나토구": ["미나토구", "minato", "港区"],
  "신주쿠구": ["신주쿠구", "shinjuku", "新宿区"],
  "분쿄구": ["분쿄구", "bunkyo", "文京区"],
  "다이토구": ["다이토구", "taito", "台東区"],
  "스미다구": ["스미다구", "sumida", "墨田区"],
  "고토구": ["고토구", "koto", "江東区"],
  "시나가와구": ["시나가와구", "shinagawa", "品川区"],
  "메구로구": ["메구로구", "meguro", "目黒区"],
  "오타구": ["오타구", "ota", "大田区"],
  "세타가와구": ["세타가와구", "setagaya", "世田谷区"],
  "시부야구": ["시부야구", "shibuya", "渋谷区"],
  "나카노구": ["나카노구", "nakano", "中野区"],
  "스기나미구": ["스기나미구", "suginami", "杉並区"],
  "도시마구": ["도시마구", "toshima", "豊島区"],
  "기타구": ["기타구", "kita", "北区"],
  "아라카와구": ["아라카와구", "arakawa", "荒川区"],
  "이타바시구": ["이타바시구", "itabashi", "板橋区"],
  "네리마구": ["네리마구", "nerima", "練馬区"],
  "아다치구": ["아다치구", "adachi", "足立区"],
  "가쓰시카구": ["가쓰시카구", "katsushika", "葛飾区"],
  "에도가와구": ["에도가와구", "edogawa", "江戸川区"],
  "하치오지시": ["하치오지시", "hachioji", "八王子市"],
  "다치카와시": ["다치카와시", "tachikawa", "立川市"],
  "무사시노시": ["무사시노시", "musashino", "武蔵野市"],
  "미타카시": ["미타카시", "mitaka", "三鷹市"],
  "마치다시": ["마치다시", "machida", "町田市"],
  "오사카시": ["오사카시", "osaka city", "大阪市"],
  "사카이시": ["사카이시", "sakai", "堺市"],
  "기시와다시": ["기시와다시", "kishiwada", "岸和田市"],
  "도요나카시": ["도요나카시", "toyonaka", "豊中市"],
  "이케다시": ["이케다시", "ikeda", "池田市"],
  "스이타시": ["스이타시", "suita", "吹田市"],
  "다카쓰키시": ["다카쓰키시", "takatsuki", "高槻市"],
  "히라카타시": ["히라카타시", "hirakata", "枚方市"],
  "이바라키시": ["이바라키시", "ibaraki city", "茨木市"],
  "야오시": ["야오시", "yao", "八尾市"],
  "히가시오사카시": ["히가시오사카시", "higashiosaka", "東大阪市"],
  "요코하마시": ["요코하마시", "yokohama", "横浜市"],
  "가와사키시": ["가와사키시", "kawasaki", "川崎市"],
  "사가미하라시": ["사가미하라시", "sagamihara", "相模原市"],
  "요코스카시": ["요코스카시", "yokosuka", "横須賀市"],
  "후지사와시": ["후지사와시", "fujisawa", "藤沢市"],
  "가마쿠라시": ["가마쿠라시", "kamakura", "鎌倉市"],
  "아쓰기시": ["아쓰기시", "atsugi", "厚木市"],
  "나고야시": ["나고야시", "nagoya", "名古屋市"],
  "도요타시": ["도요타시", "toyota", "豊田市"],
  "오카자키시": ["오카자키시", "okazaki", "岡崎市"],
  "이치노미야시": ["이치노미야시", "ichinomiya", "一宮市"],
  "도요하시시": ["도요하시시", "toyohashi", "豊橋市"],
  "교토시": ["교토시", "kyoto city", "京都市"],
  "우지시": ["우지시", "uji", "宇治市"],
  "가메오카시": ["가메오카시", "kameoka", "亀岡市"],
  "후쿠오카시": ["후쿠오카시", "fukuoka city", "福岡市"],
  "기타큐슈시": ["기타큐슈시", "kitakyushu", "北九州市"],
  "구루메시": ["구루메시", "kurume", "久留米市"],
  "이즈카시": ["이즈카시", "iizuka", "飯塚市"],
  "삿포로시": ["삿포로시", "sapporo", "札幌市"],
  "아사히카와시": ["아사히카와시", "asahikawa", "旭川市"],
  "하코다테시": ["하코다테시", "hakodate", "函館市"],
  "오타루시": ["오타루시", "otaru", "小樽市"],
  "오비히로시": ["오비히로시", "obihiro", "帯広市"],
  "고베시": ["고베시", "kobe", "神戸市"],
  "히메지시": ["히메지시", "himeji", "姫路市"],
  "니시노미야시": ["니시노미야시", "nishinomiya", "西宮市"],
  "아마가사키시": ["아마가사키시", "amagasaki", "尼崎市"],
  "사이타마시": ["사이타마시", "saitama city", "さいたま市"],
  "가와구치시": ["가와구치시", "kawaguchi", "川口市"],
  "가와고에시": ["가와고에시", "kawagoe", "川越市"],
  "도코로자와시": ["도코로자와시", "tokorozawa", "所沢市"],
  "치바시": ["치바시", "chiba city", "千葉市"],
  "후나바시시": ["후나바시시", "funabashi", "船橋市"],
  "마쓰도시": ["마쓰도시", "matsudo", "松戸市"],
  "가시와시": ["가시와시", "kashiwa", "柏市"],
  "이치카와시": ["이치카와시", "ichikawa", "市川市"],
  "센다이시": ["센다이시", "sendai", "仙台市"],
  "이시노마키시": ["이시노마키시", "ishinomaki", "石巻市"],
  "미토시": ["미토시", "mito", "水戸市"],
  "쓰쿠바시": ["쓰쿠바시", "tsukuba", "つくば市"],
  "우쓰노미야시": ["우쓰노미야시", "utsunomiya", "宇都宮市"],
  "마에바시시": ["마에바시시", "maebashi", "前橋市"],
  "다카사키시": ["다카사키시", "takasaki", "高崎市"],
  "니가타시": ["니가타시", "niigata city", "新潟市"],
  "나가오카시": ["나가오카시", "nagaoka", "長岡市"],
  "시즈오카시": ["시즈오카시", "shizuoka city", "静岡市"],
  "하마마쓰시": ["하마마쓰시", "hamamatsu", "浜松市"],
  "나가노시": ["나가노시", "nagano city", "長野市"],
  "마쓰모토시": ["마쓰모토시", "matsumoto", "松本市"],
  "기후시": ["기후시", "gifu city", "岐阜市"],
  "쓰시": ["쓰시", "tsu", "津市"],
  "욧카이치시": ["욧카이치시", "yokkaichi", "四日市市"],
  "오쓰시": ["오쓰시", "otsu", "大津市"],
  "구사쓰시": ["구사쓰시", "kusatsu", "草津市"],
  "나라시": ["나라시", "nara city", "奈良市"],
  "히로시마시": ["히로시마시", "hiroshima city", "広島市"],
  "후쿠야마시": ["후쿠야마시", "fukuyama", "福山市"],
  "오카야마시": ["오카야마시", "okayama city", "岡山市"],
  "구라시키시": ["구라시키시", "kurashiki", "倉敷市"],
  "구마모토시": ["구마모토시", "kumamoto city", "熊本市"],
  "가고시마시": ["가고시마시", "kagoshima city", "鹿児島市"],
  "나하시": ["나하시", "naha", "那覇市"],
  "오키나와시": ["오키나와시", "okinawa city", "沖縄市"],
  "가나자와시": ["가나자와시", "kanazawa", "金沢市"],
  "도야마시": ["도야마시", "toyama city", "富山市"],
  "후쿠이시": ["후쿠이시", "fukui city", "福井市"],
  "고후시": ["고후시", "kofu", "甲府市"],
  "와카야마시": ["와카야마시", "wakayama city", "和歌山市"],
  "다카마쓰시": ["다카마쓰시", "takamatsu", "高松市"],
  "마쓰야마시": ["마쓰야마시", "matsuyama", "松山市"],
  "나가사키시": ["나가사키시", "nagasaki city", "長崎市"]
};
const locationDisplayAliasesByCountry: Partial<
  Record<string, Record<string, readonly string[]>>
> = {
  KR: {
    "서울특별시": ["서울특별시", "서울"],
    "부산광역시": ["부산광역시", "부산"],
    "대구광역시": ["대구광역시", "대구"],
    "인천광역시": ["인천광역시", "인천"],
    "광주광역시": ["광주광역시", "광주"],
    "대전광역시": ["대전광역시", "대전"],
    "울산광역시": ["울산광역시", "울산"],
    "세종특별자치시": ["세종특별자치시", "세종"],
    "경기도": ["경기도", "경기"],
    "강원특별자치도": ["강원특별자치도", "강원"],
    "충청북도": ["충청북도", "충북"],
    "충청남도": ["충청남도", "충남"],
    "전북특별자치도": ["전북특별자치도", "전북"],
    "전라남도": ["전라남도", "전남"],
    "경상북도": ["경상북도", "경북"],
    "경상남도": ["경상남도", "경남"],
    "제주특별자치도": ["제주특별자치도", "제주"]
  },
  JP: {
    "도쿄도": ["도쿄도", "도쿄", "tokyo", "東京"],
    "오사카부": ["오사카부", "오사카", "osaka", "大阪"],
    "가나가와현": ["가나가와현", "가나가와", "kanagawa", "神奈川"],
    "아이치현": ["아이치현", "아이치", "aichi", "愛知"],
    "교토부": ["교토부", "교토", "kyoto", "京都"],
    "후쿠오카현": ["후쿠오카현", "후쿠오카", "fukuoka", "福岡"],
    "홋카이도": ["홋카이도", "hokkaido", "北海道"],
    "효고현": ["효고현", "효고", "hyogo", "兵庫"],
    "사이타마현": ["사이타마현", "사이타마", "saitama", "埼玉"],
    "치바현": ["치바현", "치바", "chiba", "千葉"],
    "미야기현": ["미야기현", "미야기", "miyagi", "宮城"],
    "이바라키현": ["이바라키현", "이바라키", "ibaraki", "茨城"],
    "도치기현": ["도치기현", "도치기", "tochigi", "栃木"],
    "군마현": ["군마현", "군마", "gunma", "群馬"],
    "니가타현": ["니가타현", "니가타", "niigata", "新潟"],
    "시즈오카현": ["시즈오카현", "시즈오카", "shizuoka", "静岡"],
    "나가노현": ["나가노현", "나가노", "nagano", "長野"],
    "기후현": ["기후현", "기후", "gifu", "岐阜"],
    "미에현": ["미에현", "미에", "mie", "三重"],
    "시가현": ["시가현", "시가", "shiga", "滋賀"],
    "나라현": ["나라현", "나라", "nara", "奈良"],
    "히로시마현": ["히로시마현", "히로시마", "hiroshima", "広島"],
    "오카야마현": ["오카야마현", "오카야마", "okayama", "岡山"],
    "구마모토현": ["구마모토현", "구마모토", "kumamoto", "熊本"],
    "가고시마현": ["가고시마현", "가고시마", "kagoshima", "鹿児島"],
    "오키나와현": ["오키나와현", "오키나와", "okinawa", "沖縄"],
    "이시카와현": ["이시카와현", "이시카와", "ishikawa", "石川"],
    "도야마현": ["도야마현", "도야마", "toyama", "富山"],
    "후쿠이현": ["후쿠이현", "후쿠이", "fukui", "福井"],
    "야마나시현": ["야마나시현", "야마나시", "yamanashi", "山梨"],
    "와카야마현": ["와카야마현", "와카야마", "wakayama", "和歌山"],
    "가가와현": ["가가와현", "가가와", "kagawa", "香川"],
    "에히메현": ["에히메현", "에히메", "ehime", "愛媛"],
    "나가사키현": ["나가사키현", "나가사키", "nagasaki", "長崎"],
    ...japaneseSubdivisionAliases
  }
};

function normalizePublicCareerStage(value?: string): PublicCareerStage | undefined {
  return publicCareerStages.has(value as PublicCareerStage)
    ? (value as PublicCareerStage)
    : undefined;
}

function normalizePublicEmploymentTypeCategory(
  value?: string
): PublicEmploymentTypeCategory | undefined {
  return publicEmploymentTypeCategories.has(value as PublicEmploymentTypeCategory)
    ? (value as PublicEmploymentTypeCategory)
    : undefined;
}

function normalizeEmploymentTypeFilter(
  value?: string
): PublicEmploymentTypeCategory | "unspecified" | undefined {
  if (value === "unspecified") {
    return value;
  }

  return normalizePublicEmploymentTypeCategory(value);
}

function normalizeStoredCareerStage(stage?: CareerStage | string | null): PublicCareerStage | null {
  if (!stage) return null;
  return storedCareerStageMap[stage as CareerStage] ?? null;
}

export function classifyCareerStage(
  careerLevel: string,
  storedStage?: CareerStage | string | null
): PublicCareerStage | null {
  const normalizedStoredStage = normalizeStoredCareerStage(storedStage);
  if (normalizedStoredStage) return normalizedStoredStage;

  const raw = careerLevel.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (
    /experience not specified|경력 확인 필요|経験条件一部ログイン後|즉시 지원|홈페이지 지원/.test(
      lower
    )
  ) {
    return null;
  }

  const yearMatches = [...raw.matchAll(/(\d+)\s*(?:년|年|years?|yrs?)/gi)].map((match) =>
    Number(match[1])
  );
  const maxYear = yearMatches.length > 0 ? Math.max(...yearMatches) : undefined;

  if (maxYear !== undefined) {
    if (maxYear >= 6) return "senior";
    if (maxYear >= 3) return "junior";
    return "entry";
  }

  if (/(senior|lead|시니어)/i.test(raw)) return "senior";
  if (/(mid career|experience welcome|junior|주니어)/i.test(raw)) return "junior";
  if (/(未経験|entry level|신입|인턴|intern|新卒)/i.test(raw)) return "entry";

  return null;
}

export function classifyEmploymentTypeCategory(
  employmentType?: string | null,
  title?: string | null,
  careerLevel?: string | null,
  description?: string | null
): PublicEmploymentTypeCategory | null {
  const rawEmploymentType = employmentType?.trim() ?? "";
  const explicitEmploymentTypeCategory = classifyEmploymentTypeSignalText(rawEmploymentType);
  if (explicitEmploymentTypeCategory) {
    return explicitEmploymentTypeCategory;
  }

  const fallbackSignalText = [title, careerLevel, description]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  if (!fallbackSignalText) {
    return null;
  }

  return classifyEmploymentTypeSignalText(fallbackSignalText);
}

function classifyEmploymentTypeSignalText(signalText: string): PublicEmploymentTypeCategory | null {
  if (!signalText) {
    return null;
  }

  if (/(freelance|フリーランス|業務委託|프리랜서)/i.test(signalText)) return "freelance";
  if (/(\binternship\b|\bintern\b|インターン|인턴십|체험형 인턴|채용연계형 인턴|인턴)/i.test(signalText)) {
    return "intern";
  }
  if (/(契約社員|\bcontract employee\b|\bcontract-based\b|\bcontractual\b|\bfixed-term\b|계약직)/i.test(signalText)) {
    return "contract";
  }
  if (/(正社員|\bfull-time employee\b|\bfull time\b|\bfull-time\b|\bpermanent\b|정규직)/i.test(signalText)) {
    return "permanent";
  }

  return null;
}

function readJsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, Prisma.JsonValue> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  return value as Record<string, Prisma.JsonValue>;
}

function readJsonPathString(
  value: Prisma.JsonValue | null | undefined,
  path: string[]
): string | undefined {
  let current: Prisma.JsonValue | null | undefined = value;

  for (const segment of path) {
    const record = readJsonRecord(current);
    if (!record) {
      return undefined;
    }
    current = record[segment];
  }

  return typeof current === "string" && current.trim() ? current.trim() : undefined;
}

function toUtcDateIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

function parseFlexibleDateToIso(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const ymdMatch =
    normalized.match(/(?<year>\d{4})[./-](?<month>\d{1,2})[./-](?<day>\d{1,2})/) ??
    normalized.match(/(?<year>\d{4})년\s*(?<month>\d{1,2})월\s*(?<day>\d{1,2})일/);
  if (ymdMatch?.groups) {
    return toUtcDateIso(
      Number(ymdMatch.groups.year),
      Number(ymdMatch.groups.month),
      Number(ymdMatch.groups.day)
    );
  }

  const monthDayYearMatch = normalized.match(
    /(?<month>[A-Za-z]+)\s+(?<day>\d{1,2}),\s*(?<year>\d{4})/
  );
  if (monthDayYearMatch?.groups) {
    const month = ENGLISH_MONTH_INDEXES.get(monthDayYearMatch.groups.month.toLowerCase());
    if (!month) {
      return null;
    }

    return toUtcDateIso(
      Number(monthDayYearMatch.groups.year),
      month,
      Number(monthDayYearMatch.groups.day)
    );
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractPostedAtFromDeadline(deadlineText?: string | null): string | null {
  const trimmed = deadlineText?.trim();
  if (!trimmed || !trimmed.includes("~")) {
    return null;
  }

  const [rangeStart] = trimmed.split("~", 1);
  return parseFlexibleDateToIso(rangeStart);
}

function resolvePostedAt(job: Pick<PublicJobRow, "deadlineText" | "rawJson">): string | null {
  const deadlineRangeStart = extractPostedAtFromDeadline(job.deadlineText);
  if (deadlineRangeStart) {
    return deadlineRangeStart;
  }

  return parseFlexibleDateToIso(readJsonPathString(job.rawJson, ["updateDate"]));
}

function displayCountry(value?: string | null): string {
  if (!value) {
    return "국가 미기재";
  }

  return countryLabels[value] ?? value;
}

function inferJobCategory(job: Pick<JobPosting, "title" | "description" | "skills">): string {
  const text = `${job.title} ${job.description} ${job.skills.join(" ")}`.toLowerCase();

  if (/(ai|data|ml|llm|machine|python|sql|데이터|머신러닝|인공지능)/.test(text)) {
    return "AI/데이터";
  }
  if (/(design|ui|ux|figma|디자인)/.test(text)) return "디자인";
  if (/(marketing|growth|seo|마케팅)/.test(text)) return "마케팅";
  if (/(security|secops|보안)/.test(text)) return "보안";
  if (/(project manager|product manager|pm|기획)/.test(text)) return "PM";
  return "개발";
}

function isNewlyPosted(postedAt?: string | null): boolean {
  if (!postedAt) {
    return false;
  }

  const postedTime = new Date(postedAt).getTime();
  if (Number.isNaN(postedTime)) {
    return false;
  }

  return Date.now() - postedTime <= 3 * 24 * 60 * 60 * 1000;
}

function buildCareerStageWhere(stage: PublicCareerStage): Prisma.JobPostingWhereInput {
  return {
    OR: [
      {
        careerStage: {
          in: careerStageStoredValues[stage]
        }
      },
      ...careerStageSearchTerms[stage].map((term) => ({
        careerLevel: {
          contains: term,
          mode: "insensitive" as const
        }
      }))
    ]
  };
}

function buildEmploymentTypeCategoryWhere(
  category: PublicEmploymentTypeCategory
): Prisma.JobPostingWhereInput {
  return {
    OR: employmentTypeSearchTerms[category].flatMap((term) =>
      employmentTypeSearchFields.map((field) => buildContainsWhere(field, term))
    )
  };
}

function withPublicJobClassifications(job: JobPosting): JobPosting {
  return {
    ...job,
    careerStage: classifyCareerStage(job.careerLevel, job.careerStage),
    employmentTypeCategory: classifyEmploymentTypeCategory(
      job.employmentType,
      job.title,
      job.careerLevel,
      job.description
    )
  };
}

function normalizeQuery(query: JobListQuery = {}): NormalizedJobListQuery {
  const limit = Number.isFinite(query.limit)
    ? Math.min(Math.max(Math.trunc(query.limit ?? MAX_JOB_LIMIT), 1), MAX_JOB_LIMIT)
    : undefined;
  const page = Number.isFinite(query.page)
    ? Math.max(Math.trunc(query.page ?? DEFAULT_JOB_PAGE), DEFAULT_JOB_PAGE)
    : undefined;

  return {
    q: query.q?.trim() || undefined,
    source: query.source?.trim() || undefined,
    country: query.country?.trim() || undefined,
    language: query.language?.trim() || undefined,
    careerStage: normalizePublicCareerStage(query.careerStage),
    employmentTypeCategory: normalizeEmploymentTypeFilter(query.employmentTypeCategory),
    jobCategory: query.jobCategory?.trim() || undefined,
    region1: query.region1?.trim() || undefined,
    region2: query.region2?.trim() || undefined,
    region3: query.region3?.trim() || undefined,
    skill: query.skill?.trim() || undefined,
    salaryVisibility:
      query.salaryVisibility === "disclosed" || query.salaryVisibility === "undisclosed"
        ? query.salaryVisibility
        : undefined,
    deadlineType:
      query.deadlineType === "dated" || query.deadlineType === "rolling"
        ? query.deadlineType
        : undefined,
    newOnly: query.newOnly === true ? true : undefined,
    page,
    limit
  };
}

function requiresPostQueryFiltering(query: NormalizedJobListQuery): boolean {
  return query.newOnly === true;
}

function includesText(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

function getLocationSearchAliases(country: string | undefined, label: string): string[] {
  const aliasMap = country ? locationDisplayAliasesByCountry[country] : undefined;
  const aliases = aliasMap?.[label] ?? [];

  return Array.from(new Set([label, ...aliases].filter(Boolean)));
}

function buildSearchTokenGroups(query: string): string[][] {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) =>
      remoteSearchKeywords.some((keyword) => keyword.toLowerCase() === token.toLowerCase())
        ? [...remoteSearchTerms]
        : [token]
    );
}

function buildContainsWhere(
  field: (typeof genericTextSearchFields)[number] | (typeof employmentTypeSearchFields)[number],
  term: string
): Prisma.JobPostingWhereInput {
  return {
    [field]: {
      contains: term,
      mode: "insensitive"
    }
  } as Prisma.JobPostingWhereInput;
}

function buildAnyContainsWhere(
  fields: readonly (
    | (typeof genericTextSearchFields)[number]
    | (typeof employmentTypeSearchFields)[number]
    | (typeof regionSearchFields)[number]
  )[],
  terms: readonly string[]
): Prisma.JobPostingWhereInput {
  return {
    OR: terms.flatMap((term) => fields.map((field) => buildContainsWhere(field, term)))
  };
}

function buildSearchWhere(query: string): Prisma.JobPostingWhereInput | undefined {
  const tokenGroups = buildSearchTokenGroups(query);
  if (tokenGroups.length === 0) {
    return undefined;
  }

  return {
    AND: tokenGroups.map((group) => ({
      OR: [
        ...group.flatMap((term) => genericTextSearchFields.map((field) => buildContainsWhere(field, term))),
        ...group.map((term) => ({
          skills: {
            has: term
          }
        }))
      ]
    }))
  };
}

function buildEmploymentTypeUnspecifiedWhere(): Prisma.JobPostingWhereInput {
  return {
    NOT: {
      OR: allEmploymentTypeTerms.flatMap((term) =>
        employmentTypeSearchFields.map((field) => buildContainsWhere(field, term))
      )
    }
  };
}

function buildJobCategoryWhere(category: string): Prisma.JobPostingWhereInput {
  if (category === "개발") {
    return {
      OR: [
        buildContainsWhere("jobCategory", "개발"),
        {
          NOT: {
            OR: nonDevelopmentCategories.map((otherCategory) =>
              buildAnyContainsWhere(
                ["title", "description", "jobCategory", "rawText"],
                inferredJobCategorySearchTerms[otherCategory]
              )
            )
          }
        }
      ]
    };
  }

  const searchTerms = inferredJobCategorySearchTerms[category];
  if (!searchTerms) {
    return buildContainsWhere("jobCategory", category);
  }

  return {
    OR: [
      buildContainsWhere("jobCategory", category),
      buildAnyContainsWhere(["title", "description", "jobCategory", "rawText"], searchTerms)
    ]
  };
}

function buildRegionWhere(country: string | undefined, regionLabel: string): Prisma.JobPostingWhereInput {
  return buildAnyContainsWhere(regionSearchFields, getLocationSearchAliases(country, regionLabel));
}

function buildJobWhere(query: NormalizedJobListQuery): Prisma.JobPostingWhereInput {
  const where: Prisma.JobPostingWhereInput = { ...ACTIVE_PUBLIC_JOB_WHERE };
  const andConditions: Prisma.JobPostingWhereInput[] = [];

  if (query.source) {
    where.source = query.source;
  }

  if (query.country) {
    where.country = query.country;
  }

  if (query.language) {
    where.language = query.language;
  }

  if (query.q) {
    const searchWhere = buildSearchWhere(query.q);
    if (searchWhere) {
      andConditions.push(searchWhere);
    }
  }

  if (query.careerStage) {
    andConditions.push(buildCareerStageWhere(query.careerStage));
  }

  if (query.employmentTypeCategory) {
    andConditions.push(
      query.employmentTypeCategory === "unspecified"
        ? buildEmploymentTypeUnspecifiedWhere()
        : buildEmploymentTypeCategoryWhere(query.employmentTypeCategory)
    );
  }

  if (query.jobCategory) {
    andConditions.push(buildJobCategoryWhere(query.jobCategory));
  }

  if (query.region1) {
    andConditions.push(buildRegionWhere(query.country, query.region1));
  }

  if (query.region2) {
    andConditions.push(buildRegionWhere(query.country, query.region2));
  }

  if (query.region3) {
    andConditions.push(buildRegionWhere(query.country, query.region3));
  }

  if (query.skill) {
    andConditions.push({
      skills: {
        has: query.skill
      }
    });
  }

  if (query.salaryVisibility === "disclosed") {
    andConditions.push({
      salaryText: {
        not: null
      }
    });
  }

  if (query.salaryVisibility === "undisclosed") {
    andConditions.push({
      salaryText: null
    });
  }

  if (query.deadlineType === "rolling") {
    andConditions.push({
      deadlineText: "상시 채용"
    });
  }

  if (query.deadlineType === "dated") {
    andConditions.push({
      OR: [
        {
          deadlineText: null
        },
        {
          deadlineText: {
            not: "상시 채용"
          }
        }
      ]
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

function matchesLocationAlias(signalText: string, alias: string): boolean {
  const normalizedSignalText = signalText.toLowerCase();
  const normalizedAlias = alias.toLowerCase().trim();
  if (!normalizedAlias) {
    return false;
  }

  if (/^[a-z0-9 -]+$/.test(normalizedAlias)) {
    const escapedAlias = normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escapedAlias}([^a-z0-9]|$)`, "i").test(signalText);
  }

  return normalizedSignalText.includes(normalizedAlias);
}

function getLocationDisplayAliases(country?: string, location?: string): string[] {
  const aliasMap = country ? locationDisplayAliasesByCountry[country] : undefined;
  if (!aliasMap || !location?.trim()) {
    return [];
  }

  return Object.entries(aliasMap)
    .filter(([, aliases]) => aliases.some((alias) => matchesLocationAlias(location, alias)))
    .map(([displayLabel]) => displayLabel);
}

function buildLocationSearchText(job: JobPosting): string {
  return Array.from(
    new Set([
      job.location,
      displayCountry(job.country),
      job.country,
      ...getLocationDisplayAliases(job.country, job.location)
    ].filter((value): value is string => Boolean(value)))
  ).join(" ");
}

function buildRegionSearchText(job: JobPosting): string {
  const regionSignalText = [job.location, job.title, job.description]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");

  return Array.from(
    new Set([
      job.location,
      displayCountry(job.country),
      job.country,
      ...getLocationDisplayAliases(job.country, regionSignalText)
    ].filter((value): value is string => Boolean(value)))
  ).join(" ");
}

function matchesJobQuery(job: JobPosting, query: NormalizedJobListQuery): boolean {
  if (query.source && job.source !== query.source) {
    return false;
  }

  if (query.country && job.country !== query.country) {
    return false;
  }

  if (query.language && job.language !== query.language) {
    return false;
  }

  if (
    query.careerStage &&
    classifyCareerStage(job.careerLevel, job.careerStage) !== query.careerStage
  ) {
    return false;
  }

  if (
    query.employmentTypeCategory &&
    (query.employmentTypeCategory === "unspecified"
      ? classifyEmploymentTypeCategory(
          job.employmentType,
          job.title,
          job.careerLevel,
          job.description
        ) !== null
      : classifyEmploymentTypeCategory(
          job.employmentType,
          job.title,
          job.careerLevel,
          job.description
        ) !== query.employmentTypeCategory)
  ) {
    return false;
  }

  if (query.jobCategory && inferJobCategory(job) !== query.jobCategory) {
    return false;
  }

  const locationSearchText = buildRegionSearchText(job).toLowerCase();
  if (query.region1 && !locationSearchText.includes(query.region1.toLowerCase())) {
    return false;
  }

  if (query.region2 && !locationSearchText.includes(query.region2.toLowerCase())) {
    return false;
  }

  if (query.region3 && !locationSearchText.includes(query.region3.toLowerCase())) {
    return false;
  }

  if (query.newOnly && !isNewlyPosted(job.postedAt)) {
    return false;
  }

  if (query.skill && !job.skills.includes(query.skill)) {
    return false;
  }

  if (query.salaryVisibility === "disclosed" && !job.salaryText) {
    return false;
  }

  if (query.salaryVisibility === "undisclosed" && job.salaryText) {
    return false;
  }

  const deadline = job.deadlineText ?? "마감일 미기재";
  if (query.deadlineType === "dated" && deadline === "상시 채용") {
    return false;
  }

  if (query.deadlineType === "rolling" && deadline !== "상시 채용") {
    return false;
  }

  if (query.q) {
    const searchableValues = [
      job.title,
      job.company,
      inferJobCategory(job),
      buildLocationSearchText(job),
      job.description,
      ...job.skills
    ];
    const tokenGroups = buildSearchTokenGroups(query.q);

    return tokenGroups.every((group) =>
      group.some((term) => searchableValues.some((value) => includesText(value, term)))
    );
  }

  return true;
}

function buildAvailableSkills(jobs: JobPosting[]): string[] {
  return Array.from(new Set(jobs.flatMap((job) => job.skills))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function buildAvailableSkillsFromRows(rows: Array<{ skills: string[] }>): string[] {
  return Array.from(new Set(rows.flatMap((row) => row.skills))).sort((a, b) => a.localeCompare(b));
}

function compareFacetOption(a: JobFacetOption, b: JobFacetOption): number {
  return b.count - a.count || a.value.localeCompare(b.value);
}

function countFacetValues(values: Array<string | undefined>): JobFacetOption[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts, ([value, count]) => ({ value, count })).sort(compareFacetOption);
}

function buildFallbackFacets(jobs: JobPosting[]): JobFacets {
  return {
    sources: countFacetValues(jobs.map((job) => job.source)),
    countries: countFacetValues(jobs.map((job) => job.country)),
    languages: countFacetValues(jobs.map((job) => job.language)),
    total: jobs.length
  };
}

function isDatabaseUnavailableError(error: unknown): boolean {
  const code = readErrorString(error, "code");
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const cause = readErrorString(error, "cause")?.toLowerCase() ?? "";
  const combined = `${code ?? ""} ${message} ${cause}`;

  return [
    "p1001",
    "econnrefused",
    "econnreset",
    "enotfound",
    "etimedout",
    "timeout",
    "timed out",
    "connection terminated",
    "connection refused",
    "can't reach database server",
    "cannot reach database server",
    "server closed the connection",
    "certificate",
    "tls",
    "ssl"
  ].some((pattern) => combined.includes(pattern));
}

function readErrorString(error: unknown, key: string): string | undefined {
  if (typeof error !== "object" || error === null || Array.isArray(error)) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function shouldFallbackToSamples(error: unknown, context: string): boolean {
  if (!isDatabaseUnavailableError(error)) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `${context} database unavailable; using sample fallback: ${redactSensitiveText(message)}`
  );
  return true;
}

function toJobPosting(job: PublicJobRow): JobPosting {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    careerLevel: job.careerLevel,
    skills: job.skills,
    description: job.description,
    source: job.source,
    sourceJobId: job.sourceJobId,
    sourceUrl: job.sourceUrl,
    country: job.country,
    language: job.language,
    employmentType: job.employmentType,
    educationLevel: job.educationLevel,
    salaryText: job.salaryText,
    deadlineText: job.deadlineText,
    applyMethod: job.applyMethod,
    careerStage: classifyCareerStage(job.careerLevel, job.careerStage),
    employmentTypeCategory: classifyEmploymentTypeCategory(
      job.employmentType,
      job.title,
      job.careerLevel,
      job.description
    ),
    postedAt: resolvePostedAt(job),
    collectedAt: job.collectedAt?.toISOString() ?? null
  };
}

async function getFallbackJobs(): Promise<JobPosting[]> {
  try {
    const file = await fs.readFile(sampleJobsPath, "utf-8");
    return JSON.parse(file) as JobPosting[];
  } catch {
    return fallbackJobs;
  }
}

export async function getJobs(query: JobListQuery = {}): Promise<JobPosting[]> {
  const normalizedQuery = normalizeQuery(query);
  const prisma = getPrismaClient();
  const hasExplicitFilters = Boolean(
    normalizedQuery.q ||
      normalizedQuery.source ||
      normalizedQuery.country ||
      normalizedQuery.language ||
      normalizedQuery.careerStage ||
      normalizedQuery.employmentTypeCategory ||
      normalizedQuery.jobCategory ||
      normalizedQuery.region1 ||
      normalizedQuery.region2 ||
      normalizedQuery.region3 ||
      normalizedQuery.skill ||
      normalizedQuery.salaryVisibility ||
      normalizedQuery.deadlineType ||
      normalizedQuery.newOnly
  );

  if (prisma) {
    try {
      const jobs = await prisma.jobPosting.findMany({
        where: buildJobWhere(normalizedQuery),
        select: INTERNAL_PUBLIC_JOB_SELECT,
        orderBy: [{ collectedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        take: hasExplicitFilters ? undefined : normalizedQuery.limit
      });

      const publicJobs = jobs.map(toJobPosting);
      const filteredJobs = publicJobs.filter((job) => matchesJobQuery(job, normalizedQuery));

      return normalizedQuery.limit === undefined
        ? filteredJobs
        : filteredJobs.slice(0, normalizedQuery.limit);
    } catch (error) {
      if (!shouldFallbackToSamples(error, "getJobs")) {
        throw error;
      }
    }
  }

  const jobs = (await getFallbackJobs()).map(withPublicJobClassifications);
  const filteredJobs = jobs.filter((job) => matchesJobQuery(job, normalizedQuery));
  return normalizedQuery.limit === undefined
    ? filteredJobs
    : filteredJobs.slice(0, normalizedQuery.limit);
}

export async function getJobsPage(query: JobListQuery = {}): Promise<JobPage> {
  const normalizedQuery = normalizeQuery(query);
  const page = normalizedQuery.page ?? DEFAULT_JOB_PAGE;
  const limit = normalizedQuery.limit ?? DEFAULT_JOB_PAGE_LIMIT;
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const where = buildJobWhere(normalizedQuery);
      const postQueryFiltering = requiresPostQueryFiltering(normalizedQuery);

      if (!postQueryFiltering) {
        const total = await prisma.jobPosting.count({ where });
        const totalPages = Math.max(DEFAULT_JOB_PAGE, Math.ceil(total / limit));
        const normalizedPage = Math.min(page, totalPages);
        const startIndex = (normalizedPage - 1) * limit;

        const [jobs, skillRows] = await Promise.all([
          prisma.jobPosting.findMany({
            where,
            select: INTERNAL_PUBLIC_JOB_SELECT,
            orderBy: [{ collectedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
            skip: startIndex,
            take: limit
          }),
          prisma.jobPosting.findMany({
            where,
            select: {
              skills: true
            }
          })
        ]);

        const data = jobs.map(toJobPosting);

        return {
          data,
          count: data.length,
          total,
          page: normalizedPage,
          limit,
          availableSkills: buildAvailableSkillsFromRows(skillRows)
        };
      }

      const jobs = await prisma.jobPosting.findMany({
        where,
        select: INTERNAL_PUBLIC_JOB_SELECT,
        orderBy: [{ collectedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
      });

      const filteredJobs = jobs.map(toJobPosting).filter((job) => matchesJobQuery(job, normalizedQuery));
      const total = filteredJobs.length;
      const totalPages = Math.max(DEFAULT_JOB_PAGE, Math.ceil(total / limit));
      const normalizedPage = Math.min(page, totalPages);
      const startIndex = (normalizedPage - 1) * limit;
      const data = filteredJobs.slice(startIndex, startIndex + limit);

      return {
        data,
        count: data.length,
        total,
        page: normalizedPage,
        limit,
        availableSkills: buildAvailableSkills(filteredJobs)
      };
    } catch (error) {
      if (!shouldFallbackToSamples(error, "getJobsPage")) {
        throw error;
      }
    }
  }

  const filteredJobs = (await getFallbackJobs())
    .map(withPublicJobClassifications)
    .filter((job) => matchesJobQuery(job, normalizedQuery));
  const total = filteredJobs.length;
  const totalPages = Math.max(DEFAULT_JOB_PAGE, Math.ceil(total / limit));
  const normalizedPage = Math.min(page, totalPages);
  const startIndex = (normalizedPage - 1) * limit;
  const data = filteredJobs.slice(startIndex, startIndex + limit);

  return {
    data,
    count: data.length,
    total,
    page: normalizedPage,
    limit,
    availableSkills: buildAvailableSkills(filteredJobs)
  };
}

export async function getJobFacets(): Promise<JobFacets> {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const [sources, countries, languages, total] = await Promise.all([
        prisma.jobPosting.groupBy({
          by: ["source"],
          where: ACTIVE_PUBLIC_JOB_WHERE,
          _count: { _all: true }
        }),
        prisma.jobPosting.groupBy({
          by: ["country"],
          where: ACTIVE_PUBLIC_JOB_WHERE,
          _count: { _all: true }
        }),
        prisma.jobPosting.groupBy({
          by: ["language"],
          where: ACTIVE_PUBLIC_JOB_WHERE,
          _count: { _all: true }
        }),
        prisma.jobPosting.count({
          where: ACTIVE_PUBLIC_JOB_WHERE
        })
      ]);

      return {
        sources: sources
          .map((row) => ({ value: row.source, count: row._count._all }))
          .sort(compareFacetOption),
        countries: countries
          .map((row) => ({ value: row.country, count: row._count._all }))
          .sort(compareFacetOption),
        languages: languages
          .map((row) => ({ value: row.language, count: row._count._all }))
          .sort(compareFacetOption),
        total
      };
    } catch (error) {
      if (!shouldFallbackToSamples(error, "getJobFacets")) {
        throw error;
      }
    }
  }

  const jobs = (await getFallbackJobs()).map(withPublicJobClassifications);
  return buildFallbackFacets(jobs);
}

export async function getJobById(id: string): Promise<JobPosting | undefined> {
  const prisma = getPrismaClient();

  if (prisma) {
    try {
      const job = await prisma.jobPosting.findFirst({
        where: { id, ...ACTIVE_PUBLIC_JOB_WHERE },
        select: INTERNAL_PUBLIC_JOB_SELECT
      });

      return job ? toJobPosting(job) : undefined;
    } catch (error) {
      if (!shouldFallbackToSamples(error, "getJobById")) {
        throw error;
      }
    }
  }

  const jobs = (await getFallbackJobs()).map(withPublicJobClassifications);
  return jobs.find((job) => job.id === id);
}
