import {
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { ChevronDown, ChevronUp, FileText, X } from "lucide-react";
import {
  answerCareerDocumentWorkflowQuestion,
  createCareerDocumentWorkflowSession,
  createCareerWorkflowSession,
  createDraftWorkflowDraft,
  createDraftWorkflowPlan,
  extractResumeFile,
  getCodexBridgeLoginStatus,
  getDraftWorkflowProviders,
  getJobById,
  reviseDraftWorkflowDraft,
  startCodexBridgeLogin,
} from "../api/client";
import { getRequiredAccessToken } from "../api/authSession";
import { createDocument, getDocuments as getSavedDocuments } from "../api/documentClient";
import { getProfiles } from "../api/profileClient";
import arrowUpIcon from "../assets/icons/ai-draft-arrow-up.svg";
import attachIcon from "../assets/icons/ai-draft-attach.svg";
import chevronIcon from "../assets/icons/ai-draft-chevron.svg";
import copyIcon from "../assets/icons/ai-draft-copy.svg";
import downloadIcon from "../assets/icons/ai-draft-download.svg";
import editIcon from "../assets/icons/ai-draft-edit.svg";
import externalIcon from "../assets/icons/ai-draft-external.svg";
import followUpIcon from "../assets/icons/ai-draft-follow-up.svg";
import historyIcon from "../assets/icons/ai-draft-history.svg";
import plusIcon from "../assets/icons/ai-draft-plus.svg";
import sparkIcon from "../assets/icons/ai-draft-spark.svg";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import { buildSelfIntroReferenceText } from "../data/selfIntroReferenceLibrary";
import type { DocumentListItem } from "../types/document";
import type { JobPosting } from "../types/job";
import type { ProfileListItem } from "../types/profile";
import type {
  AiExecutionMeta,
  AiProviderId,
  AiProviderStatus,
  DraftProfileContext,
  AiSelection,
  CodexBridgeLoginStatus,
  DraftWorkflowDraft,
  DraftWorkflowPlan,
  GapAnswer
} from "../types/draft-workflow";
import { fallbackReasonLabel, providerBadgeLabel } from "../types/draft-workflow";
import type {
  CareerWorkflowSession,
  CareerWorkflowSourceInput
} from "../types/career-workflow";
import { careerDocumentTypeLabel } from "../types/career-workflow";
import type { CareerDocumentPackage, CareerDocumentWorkflowSession } from "../types/career-document-workflow";
import { careerDocumentClassificationLabel } from "../types/career-document-workflow";

type Sender = "ai" | "user";
type DraftState = "idle" | "ready" | "planning" | "plan_ready" | "drafting" | "complete" | "revising";
type WorkflowStatus = "idle" | "loading" | "complete" | "error";
type ReferenceLoadStatus = "idle" | "loading" | "ready" | "unavailable";
type CodexLoginUiStatus = "idle" | "starting" | "pending" | "succeeded" | "failed";
type ProfileLoadStatus = "idle" | "loading" | "ready" | "unavailable";

type DraftTargetForm = {
  questionText: string;
  charLimit: number;
  jobPostingText: string;
};

type Message = {
  id: string;
  sender: Sender;
  text: string;
  time: string;
  attachments?: MessageAttachment[];
};

function formatAiExecutionLabel(meta: AiExecutionMeta) {
  const providerLabel = providerBadgeLabel(meta.providerId);

  if (!meta.usedFallback) {
    return `${providerLabel} · AI`;
  }

  const reasonLabel = fallbackReasonLabel(meta.fallbackReason);
  return reasonLabel ? `${providerLabel} (${reasonLabel})` : providerLabel;
}

const USER_MESSAGE_COLLAPSE_THRESHOLD = 180;

type Job = {
  id: string;
  company: string;
  title: string;
  link: string;
  skills: string[];
  description: string;
};

type AiSettings = {
  tone: "담백한 실무형" | "성과 강조형" | "성장 서사형";
  sound: boolean;
  followUp: boolean;
  blindRecruitment: boolean;
};

type TextFormat = "TXT" | "Markdown";
type DraftDownloadFormat = "txt" | "markdown" | "doc" | "pdf";
type SelfIntroFormatId = "role_competency" | "motivation" | "growth" | "collaboration";

type SelfIntroFormatOption = {
  id: SelfIntroFormatId;
  label: string;
  questionText: string;
  charLimit: number;
};

type DraftDownloadOption = {
  format: DraftDownloadFormat;
  label: string;
  ariaLabel: string;
};

type ResultInsightSection = {
  id: string;
  title: string;
  helper: string;
  tone?: "warning";
  items: string[];
};

type AttachedFileKind = "text" | "binary";

type AttachmentVisualTone = "pdf" | "docx" | "markdown" | "text" | "file";

type AttachmentVisual = {
  typeLabel: string;
  tone: AttachmentVisualTone;
  badge: string | null;
};

type AttachedFile = {
  id: string;
  name: string;
  kind: AttachedFileKind;
  mimeType: string;
  size: number;
  previewUrl: string | null;
  previewHtml: string | null;
  textContent: string | null;
  readError: boolean;
  loading: boolean;
};

type MessageAttachment = {
  id: string;
  name: string;
  kind: AttachedFileKind;
  readError: boolean;
  typeLabel: string;
  tone: AttachmentVisualTone;
};

type ComposerContextChipOrderItem =
  | { kind: "profile"; id: string }
  | { kind: "attachment"; id: string };

type AtsMetric = {
  label: string;
  value: number;
};

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const COMMON_SKILL_CATALOG = [
  "JavaScript",
  "React",
  "HTML/CSS",
  "Git",
  "REST API",
  "TypeScript",
  "Next.js",
  "Node.js",
  "Express",
  "PostgreSQL",
  "Python",
  "SQL",
  "SaaS",
  "Account Executive",
  "Sales",
  "Sales Pipeline",
  "Customer Success",
  "Revenue",
  "CRM",
  "B2B",
  "Account Management",
  "Operations Management",
  "Stakeholder Management",
  "Client Communication",
  "Project Management",
  "Team Leadership",
  "Budget/Cost Management",
  "영업",
  "고객 관리",
  "계약",
  "매출",
  "성능 최적화",
  "테스트 코드",
  "배포/CI-CD"
];

type SkillAliasDefinition = {
  label: string;
  aliases: string[];
};

const SKILL_ALIAS_DEFINITIONS: SkillAliasDefinition[] = [
  {
    label: "Account Management",
    aliases: ["account management", "account manager", "account executive", "고객사 관리", "거래처 관리", "アカウントマネジャー", "アカウント エグゼクティブ"]
  },
  {
    label: "Operations Management",
    aliases: ["operations management", "operation management", "운영 관리", "운영 총괄", "운영총괄", "運営", "統括"]
  },
  {
    label: "Stakeholder Management",
    aliases: ["stakeholder", "스테이크홀더", "이해관계자", "ステークホルダー"]
  },
  {
    label: "Client Communication",
    aliases: ["client communication", "client", "customer", "클라이언트", "고객 커뮤니케이션", "고객 응대", "コミュニケーション"]
  },
  {
    label: "Project Management",
    aliases: ["project management", "프로젝트 관리", "프로젝트 리딩", "マネジメント"]
  },
  {
    label: "Team Leadership",
    aliases: ["team leadership", "팀 리딩", "리더십", "leader", "매니저", "マネジャー", "育成"]
  },
  {
    label: "Budget/Cost Management",
    aliases: ["budget", "cost management", "cost", "예산", "비용", "손익", "コスト"]
  },
  {
    label: "Sales Pipeline",
    aliases: ["sales pipeline", "영업 파이프라인", "세일즈 파이프라인", "파이프라인"]
  },
  {
    label: "Customer Success",
    aliases: ["customer success", "고객 성공", "고객 성공팀", "cs 팀", "cs팀"]
  }
];

function toSelectedJob(job: JobPosting): Job {
  return {
    id: job.id,
    company: job.company,
    title: job.title,
    link: safeExternalJobUrl(job.sourceUrl),
    skills: job.skills,
    description: job.description
  };
}

function safeExternalJobUrl(value?: string | null) {
  if (!value) return "";

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

const initialMessages: Message[] = [];

const draftProgressSteps = [
  {
    label: "경험 구조화 (STAR)",
    helper: "핵심 사건 및 역할 파악",
    threshold: 18,
  },
  {
    label: "핵심 역량 매핑",
    helper: "직무 요구역량 연관 분석",
    threshold: 42,
  },
  {
    label: "초안 생성",
    helper: "문장 구성 및 연결",
    threshold: 66,
  },
  {
    label: "품질 검수",
    helper: "논리/표현 최적화",
    threshold: 82,
  },
];

const activeDraftProgressTargets = {
  planning: [18, 31, 42, 55, 63, 69, 74, 79, 83, 87, 90, 92, 94],
  drafting: [42, 55, 66, 74, 81, 85, 88, 91, 93, 95],
  revising: [50, 62, 74, 82, 88, 91, 93, 95]
} satisfies Record<"planning" | "drafting" | "revising", number[]>;

function getActiveDraftProgressTarget(
  state: DraftState,
  tick: number,
  fallbackScore: number
) {
  if (state !== "planning" && state !== "drafting" && state !== "revising") {
    return fallbackScore;
  }

  const targets = activeDraftProgressTargets[state];
  return Math.max(fallbackScore, targets[Math.min(tick, targets.length - 1)] ?? fallbackScore);
}

function getActiveDraftProgressTitle(state: DraftState, tick: number) {
  if (state === "planning") {
    return tick >= 4 ? "자료를 읽고 부족한 근거를 대조하고 있습니다..." : tick >= 2 ? "자료와 문항을 정밀 분석하고 있습니다..." : "문항과 경험을 분석하고 있습니다...";
  }
  if (state === "drafting") {
    return tick >= 4 ? "초안 표현과 근거 일관성을 확인하고 있습니다..." : tick >= 2 ? "근거를 문장 구조로 엮고 있습니다..." : "AI가 초안을 작성하고 있습니다...";
  }
  if (state === "revising") {
    return tick >= 2 ? "표현과 근거 일관성을 다시 확인하고 있습니다..." : "AI가 초안을 수정하고 있습니다...";
  }
  return "AI 초안 결과";
}

const COMPOSER_INPUT_MIN_HEIGHT = 22;
const COMPOSER_INPUT_MAX_HEIGHT = 240;
const FILE_ACCEPT = ".txt,.md,.pdf,.docx";
const EMPTY_JOB_POSTING_TEXT = "선택된 공고 없음. 사용자 대화와 첨부 자료를 기준으로 작성합니다.";
const DRAFT_DOWNLOAD_OPTIONS: DraftDownloadOption[] = [
  { format: "txt", label: "TXT", ariaLabel: "TXT 다운로드" },
  { format: "markdown", label: "MD", ariaLabel: "Markdown 다운로드" },
  { format: "doc", label: "DOCS", ariaLabel: "Word 문서 .doc 다운로드" },
  { format: "pdf", label: "PDF", ariaLabel: "PDF 다운로드" }
];

function getProviderModelIdForSelection(provider?: AiProviderStatus) {
  const modelId = provider?.models.find((model) => model.recommended)?.modelId ?? provider?.models[0]?.modelId;

  if (provider?.providerId === "codex_bridge" && modelId === "codex-app-server") {
    return undefined;
  }

  return modelId;
}

function buildDefaultJobPostingText(job: Job) {
  return [job.title, job.skills.join(", "), job.description].filter((part) => part.trim().length > 0).join("\n");
}

function extractGithubUrls(text: string) {
  const matches = text.match(/https?:\/\/github\.com\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?/gi) ?? [];
  return Array.from(
    new Set(
      matches
        .map((url) => url.replace(/\.git$/i, ""))
        .filter((url) => {
          try {
            return new URL(url).hostname.toLowerCase() === "github.com";
          } catch {
            return false;
          }
        })
    )
  );
}

function buildGapAnswersFromDrafts(
  neededQuestions: DraftWorkflowPlan["answerStrategy"]["neededQuestions"],
  drafts: Record<string, string>
): GapAnswer[] {
  return neededQuestions
    .map((question) => ({
      questionId: question.questionId,
      answer: (drafts[question.questionId] ?? "").trim()
    }))
    .filter((item) => item.answer.length > 0);
}

const SELF_INTRO_FORMAT_OPTIONS: SelfIntroFormatOption[] = [
  {
    id: "role_competency",
    label: "직무역량",
    questionText: "지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요.",
    charLimit: 800
  },
  {
    id: "motivation",
    label: "지원동기",
    questionText: "지원 동기와 입사 후 기여 계획을 작성해 주세요.",
    charLimit: 700
  },
  {
    id: "growth",
    label: "성장과정",
    questionText: "성장 과정에서 직무 역량으로 이어진 경험을 작성해 주세요.",
    charLimit: 700
  },
  {
    id: "collaboration",
    label: "협업/문제해결",
    questionText: "협업 또는 문제 해결 경험을 상황, 역할, 행동, 결과 중심으로 작성해 주세요.",
    charLimit: 800
  }
];
const DEFAULT_SELF_INTRO_FORMAT = SELF_INTRO_FORMAT_OPTIONS[0];
const DEFAULT_QUESTION_TEXT = DEFAULT_SELF_INTRO_FORMAT.questionText;
const DEFAULT_AI_PROVIDER_ID: AiProviderId = "codex_bridge";
const DEFAULT_AI_SELECTION: AiSelection = { mode: "manual", providerId: DEFAULT_AI_PROVIDER_ID };
const AI_TONE_OPTIONS: AiSettings["tone"][] = ["담백한 실무형", "성과 강조형", "성장 서사형"];
const CONDITION_PATTERNS = [
  /(\d{2,4})\s*(자|글자|byte|바이트)/i,
  /분량|제한|조건|요구\s*사항|작성\s*(규칙|요령|방법|지침)|가이드/,
  /문항|항목|질문|지원\s*동기|직무\s*역량|입사\s*후\s*포부/,
  /두괄식|STAR|소\s*제\s*목|문단|어조|톤|담백|성과|성장\s*서사/,
  /블라인드|학교명|나이|성별|사진|출신|개인정보|언급\s*금지|쓰지\s*마/
];
const BLIND_RECRUITMENT_PATTERN = /블라인드|학교명|나이|성별|사진|출신|개인정보|언급\s*금지|쓰지\s*마/;

function isTextAttachment(file: File) {
  const lowerName = file.name.toLowerCase();
  return file.type.startsWith("text/") || lowerName.endsWith(".txt") || lowerName.endsWith(".md");
}

function isDocumentFileName(name: string) {
  const lowerName = name.toLowerCase();
  return lowerName.endsWith(".pdf") || lowerName.endsWith(".docx");
}

function getFilesFromTransfer(transfer?: DataTransfer | null) {
  if (!transfer) {
    return [];
  }

  const directFiles = Array.from(transfer.files ?? []);
  if (directFiles.length > 0) {
    return directFiles;
  }

  return Array.from(transfer.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
}

function transferHasFiles(transfer?: DataTransfer | null) {
  if (!transfer) {
    return false;
  }

  return (
    Array.from(transfer.types ?? []).includes("Files") ||
    (transfer.files?.length ?? 0) > 0 ||
    Array.from(transfer.items ?? []).some((item) => item.kind === "file")
  );
}

async function fileToBase64(file: File) {
  const arrayBuffer =
    typeof file.arrayBuffer === "function"
      ? await file.arrayBuffer()
      : await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error ?? new Error("file_read_failed"));
          reader.readAsArrayBuffer(file);
        });
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function getAttachmentChipSuffix(file: AttachedFile) {
  if (file.loading) {
    return " · 읽는 중…";
  }
  if (file.readError) {
    return " · 읽기 실패";
  }
  if (file.kind === "binary") {
    return " · 지원하지 않는 파일";
  }
  return "";
}

function getAttachmentTypeLabel(file: AttachedFile) {
  const extension = file.name.split(".").pop()?.trim().toUpperCase();
  if (extension && extension !== file.name.toUpperCase()) {
    return extension;
  }

  return file.kind === "text" ? "TXT" : "FILE";
}

function getAttachmentVisual(file: AttachedFile): AttachmentVisual {
  const typeLabel = getAttachmentTypeLabel(file);
  const normalizedType = typeLabel.toLowerCase();

  if (normalizedType === "pdf") {
    return { typeLabel, tone: "pdf", badge: null };
  }
  if (normalizedType === "doc" || normalizedType === "docx") {
    return { typeLabel, tone: "docx", badge: "W" };
  }
  if (normalizedType === "md" || normalizedType === "markdown") {
    return { typeLabel, tone: "markdown", badge: "M" };
  }
  if (normalizedType === "txt" || normalizedType === "text") {
    return { typeLabel, tone: "text", badge: "T" };
  }

  return {
    typeLabel,
    tone: file.kind === "binary" ? "file" : "text",
    badge: typeLabel.slice(0, 1)
  };
}

function toMessageAttachment(file: AttachedFile): MessageAttachment {
  const visual = getAttachmentVisual(file);
  return {
    id: file.id,
    name: file.name,
    kind: file.kind,
    readError: file.readError,
    typeLabel: visual.typeLabel,
    tone: visual.tone
  };
}

function getSentAttachmentStatusLabel(attachment: MessageAttachment) {
  if (attachment.readError) {
    return "본문 추출 실패";
  }

  if (attachment.kind === "binary") {
    return "지원하지 않는 파일";
  }

  return "문서";
}

function safeCreateObjectUrl(file: File) {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return null;
  }

  return URL.createObjectURL(file);
}

function safeRevokeObjectUrl(url: string | null) {
  if (!url || typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") {
    return;
  }

  URL.revokeObjectURL(url);
}

function isPdfPreviewFile(file: AttachedFile) {
  return file.mimeType === "application/pdf" || /\.pdf$/i.test(file.name);
}

function isDocxPreviewFile(file: AttachedFile) {
  return /\.docx$/i.test(file.name) || file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function buildDocxPreviewSrcDoc(fileName: string, html: string) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(fileName)}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 32px;
      background: #f1f5f9;
      color: #0f172a;
      font-family: "Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif;
      line-height: 1.7;
    }
    main {
      box-sizing: border-box;
      width: min(100%, 820px);
      min-height: 100vh;
      margin: 0 auto;
      padding: 42px 48px;
      background: #ffffff;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.14);
    }
    p { margin: 0 0 12px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
    }
    td, th {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      vertical-align: top;
    }
    h1, h2, h3 { margin: 18px 0 10px; line-height: 1.35; }
    ul, ol { padding-left: 22px; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <main>${html}</main>
</body>
</html>`;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function findSourceFileForAnalysis(sourceFiles: AttachedFile[], sourceId: string) {
  return sourceFiles.find((file) => `attachment-${file.id}` === sourceId) ?? null;
}

function hasDraftWorkflowIntent(text: string) {
  return /문항\s*분석|분석\s*(?:해\s*줘|해줘|해\s*주세요|해 주세요|시작)|분석(?:한\s*뒤|한뒤|하고|해서).*(?:초안|작성|자소서)|초안|맞춰서|자소서\s*양식|자기소개서\s*양식|cover\s*letter|draft|analy[sz]e/i.test(
    text
  );
}

function buildResumeTextParts(messages: Message[], input: string, attachedFiles: AttachedFile[]) {
  const userMessageText = messages
    .filter((message) => message.sender === "user")
    .map((message) => message.text)
    .join("\n\n");
  const trimmedInput = input.trim();
  const attachedText = buildPortfolioSourceText(attachedFiles);

  return [userMessageText, trimmedInput, attachedText].filter((part) => part.length > 0);
}

function getUserText(messages: Message[], input = "") {
  const sentText = messages
    .filter((message) => message.sender === "user")
    .map((message) => message.text)
    .join("\n\n");

  return [sentText, input.trim()].filter((text) => text.length > 0).join("\n\n");
}

function isExpandableUserMessage(message: Message) {
  return message.sender === "user" && (message.text.length >= USER_MESSAGE_COLLAPSE_THRESHOLD || message.text.split(/\n/).length >= 5);
}

function splitConditionCandidates(text: string) {
  return text
    .split(/\n+|(?<=[.!?。！？])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isConversationConditionText(text: string) {
  return CONDITION_PATTERNS.some((pattern) => pattern.test(text));
}

function buildConversationRequirementSourceText(messages: Message[], input = "") {
  return splitConditionCandidates(getUserText(messages, input))
    .filter(isConversationConditionText)
    .join("\n")
    .trim();
}

function inferCharLimitFromText(text: string) {
  const match = text.match(/(\d{2,4})\s*(자|글자|byte|바이트)/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.min(5000, Math.max(200, value));
}

function inferQuestionTextFromText(text: string) {
  const candidates = splitConditionCandidates(text);
  const explicit = candidates.find((line) =>
    /^(문항|항목|질문)\s*[:：-]\s*\S/.test(line) ||
    /^\d+\s*[.)]\s*\S/.test(line)
  );
  return explicit && explicit.length >= 5 ? explicit.replace(/^(문항|항목|질문|\d+\s*[.)])\s*[:：-]?\s*/, "").trim() : null;
}

function uniqueSkillLabels(skills: string[]) {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    const key = skill.trim().toLowerCase();
    const isCoveredByExistingPhrase = Array.from(seen).some((existing) => {
      if (existing.length <= key.length || !existing.includes(" ")) {
        return false;
      }

      return existing.split(/[\s/.-]+/).includes(key);
    });

    if (!key || seen.has(key) || isCoveredByExistingPhrase) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function includesSkillAlias(text: string, skill: string) {
  const normalizedSkill = skill.trim().toLowerCase();
  if (!normalizedSkill) {
    return false;
  }

  if (text.includes(normalizedSkill)) {
    return true;
  }

  return SKILL_ALIAS_DEFINITIONS.some(
    ({ label, aliases }) =>
      label.toLowerCase() === normalizedSkill && aliases.some((alias) => text.includes(alias.toLowerCase()))
  );
}

function detectAliasedSkills(text: string) {
  return SKILL_ALIAS_DEFINITIONS.filter(({ aliases }) =>
    aliases.some((alias) => text.includes(alias.toLowerCase()))
  ).map(({ label }) => label);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function maxConsecutiveCharRun(text: string) {
  if (text.length === 0) {
    return 0;
  }

  let maxRun = 1;
  let currentRun = 1;

  for (let i = 1; i < text.length; i += 1) {
    if (text[i] === text[i - 1]) {
      currentRun += 1;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 1;
    }
  }

  return maxRun;
}

function isKeyboardMashToken(token: string) {
  return /qwerty|asdf|zxcv|hjkl|uiop/.test(token);
}

function calculateInputQualityPenalty(text: string) {
  const trimmed = text.trim();
  const compact = trimmed.replace(/\s+/g, "");
  if (trimmed.length < 10 || compact.length < 10) {
    return 0;
  }

  const words = trimmed
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/gu)
    .filter((token) => token.length > 0);
  const wordChars = compact.replace(/[^\p{L}\p{N}]/gu, "");
  const normalized = wordChars.toLowerCase();
  const uniqueChars = new Set([...normalized]).size;
  const uniqueRatio = uniqueChars / Math.max(1, normalized.length);
  const asciiTokens = words.filter((word) => /^[a-z]+$/.test(word));
  const asciiTokensNoVowel = asciiTokens.filter((word) => !/[aeiou]/.test(word));
  const keyboardMashTokenCount = asciiTokens.filter(isKeyboardMashToken).length;
  const shortWordRatio = words.length > 0 ? words.filter((word) => word.length <= 2).length / words.length : 0;
  const onlyJamoPattern = /^[\u1100-\u11FF\u3131-\u318E\uA960-\uA97F\uD7B0-\uD7FF]+$/u;
  const hasOnlyJamo = onlyJamoPattern.test(compact);
  const maxRunRatio = maxConsecutiveCharRun(compact) / compact.length;

  let penalty = 0;

  if (hasOnlyJamo) {
    penalty += 48;
  }

  if (asciiTokensNoVowel.length >= 1 && asciiTokensNoVowel.some((token) => token.length >= 7)) {
    penalty += 30;
  }

  if (keyboardMashTokenCount >= 2) {
    penalty += 30;
  }

  if (asciiTokens.length >= 2 && asciiTokens.every((token) => !/[aeiou]/.test(token))) {
    penalty += 10;
  }

  if (maxRunRatio >= 0.45) {
    penalty += 15;
  }

  if (uniqueRatio <= 0.28 && wordChars.length >= 12) {
    penalty += 12;
  }

  if (words.length >= 4 && shortWordRatio >= 0.75) {
    penalty += 10;
  }

  if (compact.length <= 18 && words.length <= 3 && uniqueRatio <= 0.5) {
    penalty += 8;
  }

  return Math.min(60, penalty);
}

const ATS_KEYWORD_STOP_WORDS = new Set([
  "and",
  "or",
  "the",
  "with",
  "for",
  "from",
  "job",
  "role",
  "company",
  "株式会社",
  "有限会社"
]);

function normalizeAtsKeyword(keyword: string) {
  return keyword.trim().toLowerCase().replace(/^[•・,，.。:：;；()[\]【】「」『』]+|[•・,，.。:：;；()[\]【】「」『』]+$/g, "");
}

function buildJobKeywordCandidates(job: Job) {
  const source = [job.title, job.description, ...job.skills].join("\n");
  const explicitSkillKeywords = job.skills.map(normalizeAtsKeyword);
  const alphaNumericTerms = source.match(/[A-Za-z][A-Za-z0-9+#./-]{1,}/g)?.map(normalizeAtsKeyword) ?? [];
  const separatedTerms = source
    .split(/[^\p{L}\p{N}+#.]+/u)
    .map(normalizeAtsKeyword);

  return Array.from(new Set([...explicitSkillKeywords, ...alphaNumericTerms, ...separatedTerms]))
    .filter((keyword) => keyword.length >= 2 && !ATS_KEYWORD_STOP_WORDS.has(keyword))
    .slice(0, 80);
}

function calculateJobKeywordScore(text: string, selectedJob: Job | null) {
  if (!selectedJob) {
    return 0;
  }

  const keywords = buildJobKeywordCandidates(selectedJob);
  if (keywords.length === 0) {
    return 0;
  }

  const matchCount = keywords.filter((keyword) => text.includes(keyword)).length;
  return clampScore((matchCount / Math.min(10, keywords.length)) * 100);
}

function calculateInputAtsMetrics({
  resumeText,
  selectedJob,
  detectedConversationSkills,
  matchPercent
}: {
  resumeText: string;
  selectedJob: Job | null;
  detectedConversationSkills: string[];
  matchPercent: number;
}): { score: number; metrics: AtsMetric[] } | null {
  const text = resumeText.trim();
  if (text.length < 10) {
    return null;
  }

  const lowerText = text.toLowerCase();
  const sentenceCount = Math.max(1, splitConditionCandidates(text).length);
  const averageSentenceLength = text.length / sentenceCount;
  const specificitySignals = countMatches(text, [
    /\d/,
    /결과|성과|개선|달성|감소|증가|수상|운영|배포|출시/,
    /담당|주도|설계|구현|분석|해결|개선/,
    /사용자|고객|팀|프로젝트|서비스|데이터/
  ]);
  const starSignals = countMatches(text, [
    /상황|문제|이슈|과제|목표|초기/,
    /역할|담당|맡아|주도|책임/,
    /행동|설계|구현|분석|도입|개선|해결/,
    /결과|성과|달성|향상|감소|증가|수상|운영/
  ]);
  const readabilityPenalty = averageSentenceLength > 95 ? (averageSentenceLength - 95) * 0.8 : 0;
  const readabilityBonus = sentenceCount > 1 ? 10 : 0;
  const inputQualityPenalty = calculateInputQualityPenalty(text);
  const qualityFactor = Math.max(0.2, 1 - inputQualityPenalty / 100);
  const titleTokens = selectedJob
    ? selectedJob.title
        .toLowerCase()
        .split(/[^\p{L}\p{N}+#.]+/u)
        .filter((token) => token.length >= 2)
    : [];
  const titleMatchPercent =
    titleTokens.length > 0
      ? (titleTokens.filter((token) => lowerText.includes(token)).length / titleTokens.length) * 100
      : 0;
  const jobKeywordScore = calculateJobKeywordScore(lowerText, selectedJob);
  const keywordScore = clampScore(
    (selectedJob
      ? Math.max(matchPercent, jobKeywordScore)
      : clampScore(detectedConversationSkills.length * 16)
    ) * qualityFactor
  );
  const specificityScore = clampScore((Math.min(42, text.length / 4) + specificitySignals * 14) * qualityFactor);
  const starScore = clampScore(starSignals * 25 * qualityFactor);
  const readabilityScore = clampScore((72 + readabilityBonus - readabilityPenalty) * qualityFactor);
  const jobFitScore = selectedJob
    ? clampScore(keywordScore * 0.72 + titleMatchPercent * 0.28)
    : null;
  const metrics: AtsMetric[] = [
    { label: selectedJob ? "공고 키워드 일치" : "기술 언급량", value: keywordScore },
    { label: "경험 구체성", value: specificityScore },
    { label: "STAR 구조", value: starScore },
    { label: "문장 명료성", value: readabilityScore }
  ];

  if (jobFitScore !== null) {
    metrics.push({ label: "공고 적합도", value: jobFitScore });
  }

  const weightedScore = selectedJob
    ? keywordScore * 0.3 + specificityScore * 0.25 + starScore * 0.2 + readabilityScore * 0.15 + (jobFitScore ?? 0) * 0.1
    : (keywordScore + specificityScore + starScore + readabilityScore) / 4;

  return {
    score: clampScore(weightedScore),
    metrics
  };
}

function readyTextAttachments(attachedFiles: AttachedFile[]) {
  return attachedFiles.filter((file) => file.kind === "text" && file.textContent && !file.readError && !file.loading);
}

function sendableAttachments(attachedFiles: AttachedFile[]) {
  return attachedFiles.filter((file) => !file.loading);
}

function isRequirementLikeText(text: string) {
  const markers = [
    /작성\s*요령|작성\s*방법|요구\s*사항|유의\s*사항/,
    /소\s*제\s*목|두괄식|글자\s*수/,
    /자기소개|성장\s*과정|성격\s*소개|직무\s*역량|지원\s*동기|입사\s*후\s*포부/,
    /경험을\s*구체|근거|문항|항목/
  ];
  return markers.filter((marker) => marker.test(text)).length >= 2;
}

function buildRequirementSourceText(attachedFiles: AttachedFile[]) {
  return readyTextAttachments(attachedFiles)
    .map((file) => file.textContent as string)
    .filter(isRequirementLikeText)
    .join("\n\n")
    .trim();
}

function buildPortfolioSourceText(attachedFiles: AttachedFile[]) {
  return readyTextAttachments(attachedFiles)
    .map((file) => file.textContent as string)
    .filter((text) => !isRequirementLikeText(text))
    .join("\n\n")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildMarkdownDraft(text: string) {
  const body = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `- ${paragraph.replace(/\n/g, "\n  ")}`)
    .join("\n");

  return `## 자기소개서 초안\n\n${body}`;
}

function buildWordCompatibleHtml(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>Neet2Work 자기소개서 초안</title>
  <style>
    body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; line-height: 1.75; color: #111827; }
    p { margin: 0 0 14px; }
  </style>
</head>
<body>
${paragraphs}
</body>
</html>`;
}

function buildPrintableDraftHtml(text: string) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>Neet2Work 자기소개서 초안 PDF 저장</title>
  <style>
    @page { margin: 18mm; }
    body {
      margin: 0;
      font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
      color: #111827;
      line-height: 1.75;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>${escapeHtml(text)}</body>
</html>`;
}

function buildDownloadFileName(extension: string) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "");

  return `neet2work-draft-${stamp}.${extension}`;
}

function downloadBlob(content: string, mimeType: string, extension: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = buildDownloadFileName(extension);
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const iconSources = {
  history: historyIcon,
  plus: plusIcon,
  attach: attachIcon,
  chevron: chevronIcon,
  arrowUp: arrowUpIcon,
  copy: copyIcon,
  download: downloadIcon,
  edit: editIcon,
  followUp: followUpIcon,
  spark: sparkIcon,
  external: externalIcon,
} as const;

type IconName = keyof typeof iconSources;

function Icon({ name }: { name: IconName }) {
  return <img src={iconSources[name]} alt="" aria-hidden="true" className="aiDraftIcon" data-icon-name={name} width={18} height={18} />;
}

function nowTime() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function playTone(enabled: boolean, type: "send" | "ready" | "open" | "success") {
  if (!enabled) return;

  const audioWindow = window as AudioWindow;
  const AudioContextCtor = window.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const frequencies = {
    send: 420,
    ready: 620,
    open: 520,
    success: 760,
  };

  oscillator.type = type === "success" ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(frequencies[type], context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.04, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.14);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.16);
}

export function AIDraftChatBuilder() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [submittedUserText, setSubmittedUserText] = useState("");
  const [expandedUserMessageIds, setExpandedUserMessageIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [selectedApiJob, setSelectedApiJob] = useState<Job | null>(null);
  const [draftState, setDraftState] = useState<DraftState>("idle");
  const [workflowPlan, setWorkflowPlan] = useState<DraftWorkflowPlan | null>(null);
  const [workflowDraft, setWorkflowDraft] = useState<DraftWorkflowDraft | null>(null);
  const [careerSession, setCareerSession] = useState<CareerWorkflowSession | null>(null);
  const [documentSession, setDocumentSession] = useState<CareerDocumentWorkflowSession | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>("idle");
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [documentSaveStatus, setDocumentSaveStatus] = useState<{
    status: "idle" | "saving" | "success" | "error";
    message: string | null;
    packageType?: CareerDocumentPackage["documentType"];
  }>({ status: "idle", message: null });
  const [gapAnswerDrafts, setGapAnswerDrafts] = useState<Record<string, string>>({});
  const [confirmedGapQuestionIds, setConfirmedGapQuestionIds] = useState<Set<string>>(() => new Set());
  const [outlineConfirmed, setOutlineConfirmed] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState("");
  const [targetForm, setTargetForm] = useState<DraftTargetForm>({
    questionText: DEFAULT_QUESTION_TEXT,
    charLimit: DEFAULT_SELF_INTRO_FORMAT.charLimit,
    jobPostingText: ""
  });
  const [selectedSelfIntroFormatId, setSelectedSelfIntroFormatId] =
    useState<SelfIntroFormatId>(DEFAULT_SELF_INTRO_FORMAT.id);
  const [providerStatuses, setProviderStatuses] = useState<AiProviderStatus[]>([]);
  const [aiSelection, setAiSelection] = useState<AiSelection>(() => ({ ...DEFAULT_AI_SELECTION }));
  const [codexLoginState, setCodexLoginState] = useState<{
    status: CodexLoginUiStatus;
    loginId: string | null;
    message: string | null;
  }>({ status: "idle", loginId: null, message: null });
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [toneMenuOpen, setToneMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [textFormat, setTextFormat] = useState<TextFormat>("TXT");
  const [editorFontSize, setEditorFontSize] = useState(15);
  const [draftFitProgress, setDraftFitProgress] = useState(0);
  const [settings, setSettings] = useState<AiSettings>({
    tone: "담백한 실무형",
    sound: true,
    followUp: true,
    blindRecruitment: false,
  });
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [submittedFiles, setSubmittedFiles] = useState<AttachedFile[]>([]);
  const [draftProgressTick, setDraftProgressTick] = useState(0);
  const [activeDocumentPreviewFileId, setActiveDocumentPreviewFileId] = useState<string | null>(null);
  const [sentAttachmentSignature, setSentAttachmentSignature] = useState("");
  const [composerFileDragActive, setComposerFileDragActive] = useState(false);
  const [autoStartPlanRequestId, setAutoStartPlanRequestId] = useState(0);
  const [autoStartDocumentRequestId, setAutoStartDocumentRequestId] = useState(0);
  const [profileOptions, setProfileOptions] = useState<ProfileListItem[]>([]);
  const [selectedProfileContexts, setSelectedProfileContexts] = useState<DraftProfileContext[]>([]);
  const [composerContextChipOrder, setComposerContextChipOrder] = useState<ComposerContextChipOrderItem[]>([]);
  const [profileLoadStatus, setProfileLoadStatus] = useState<ProfileLoadStatus>("idle");
  const [coverLetterReferences, setCoverLetterReferences] = useState<DocumentListItem[]>([]);
  const [selectedReferenceDocumentId, setSelectedReferenceDocumentId] = useState<string | null>(null);
  const [referenceLoadStatus, setReferenceLoadStatus] = useState<ReferenceLoadStatus>("idle");
  const timelineRef = useRef<HTMLDivElement>(null);
  const progressCardRef = useRef<HTMLElement>(null);
  const composerBarRef = useRef<HTMLDivElement>(null);
  const composerOptionsMenuRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftFitProgressRef = useRef(0);
  const workflowRequestIdRef = useRef(0);
  const referenceLoadRequestIdRef = useRef(0);
  const profileLoadRequestIdRef = useRef(0);
  const emptyComposerBackspaceCountRef = useRef(0);
  const shouldFocusComposerAfterFilePickerRef = useRef(false);
  const sendReplyTimeoutRef = useRef<number | null>(null);
  const composerFileDragDepthRef = useRef(0);
  const attachmentPreviewUrlsRef = useRef<Set<string>>(new Set());

  const createAttachmentPreviewUrl = (file: File) => {
    const previewUrl = safeCreateObjectUrl(file);
    if (previewUrl) {
      attachmentPreviewUrlsRef.current.add(previewUrl);
    }

    return previewUrl;
  };

  const revokeAttachmentPreviewUrl = (previewUrl: string | null) => {
    if (!previewUrl) {
      return;
    }

    safeRevokeObjectUrl(previewUrl);
    attachmentPreviewUrlsRef.current.delete(previewUrl);
  };

  const revokeAttachmentPreviewUrls = (files: AttachedFile[]) => {
    files.forEach((file) => revokeAttachmentPreviewUrl(file.previewUrl));
  };

  const clearSendReplyTimeout = () => {
    if (sendReplyTimeoutRef.current !== null) {
      window.clearTimeout(sendReplyTimeoutRef.current);
      sendReplyTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      attachmentPreviewUrlsRef.current.forEach((previewUrl) => safeRevokeObjectUrl(previewUrl));
      attachmentPreviewUrlsRef.current.clear();
    };
  }, []);

  const syncComposerHeight = useCallback(() => {
    const textarea = composerInputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    const scrollHeight = Math.max(textarea.scrollHeight, COMPOSER_INPUT_MIN_HEIGHT);

    if (scrollHeight > COMPOSER_INPUT_MAX_HEIGHT) {
      textarea.style.height = `${COMPOSER_INPUT_MAX_HEIGHT}px`;
      textarea.style.overflowY = "auto";
      return;
    }

    textarea.style.height = `${scrollHeight}px`;
    textarea.style.overflowY = "hidden";
  }, []);

  const selectedJob = selectedApiJob;
  const selectedSelfIntroFormat =
    SELF_INTRO_FORMAT_OPTIONS.find((option) => option.id === selectedSelfIntroFormatId) ?? DEFAULT_SELF_INTRO_FORMAT;
  const sourceFiles = useMemo(() => [...submittedFiles, ...attachedFiles], [submittedFiles, attachedFiles]);
  const resumeText = useMemo(() => {
    const messageText = buildResumeTextParts(messages, input, sourceFiles).join("\n\n");
    return [submittedUserText, messageText]
      .filter((text, index, texts) => text.trim().length > 0 && texts.indexOf(text) === index)
      .join("\n\n");
  }, [messages, input, sourceFiles, submittedUserText]);
  const hasAnalyzableUserMessage = messages.some(
    (message) => message.sender === "user" && message.text.trim().length >= 10
  );
  const canAnalyze =
    resumeText.trim().length >= 10 ||
    submittedUserText.trim().length >= 10 ||
    hasAnalyzableUserMessage ||
    selectedProfileContexts.length > 0;
  const hasAnalysisInput =
    resumeText.trim().length > 0 ||
    submittedUserText.trim().length > 0 ||
    sourceFiles.some((file) => (file.textContent ?? "").trim().length > 0) ||
    selectedProfileContexts.length > 0;
  const startAnalysisDisabled = hasAnalysisInput && !canAnalyze;
  const sendableAttachmentItems = useMemo(() => sendableAttachments(attachedFiles), [attachedFiles]);
  const sendableAttachmentSignature = useMemo(
    () => sendableAttachmentItems.map((file) => `${file.id}:${file.readError ? "error" : "ready"}`).join("|"),
    [sendableAttachmentItems]
  );
  const hasUnsentSendableAttachments =
    sendableAttachmentSignature.length > 0 && sendableAttachmentSignature !== sentAttachmentSignature;
  const orderedComposerContextChips = useMemo(() => {
    const profilesById = new Map(selectedProfileContexts.map((profile) => [profile.profileId, profile]));
    const attachmentsById = new Map(attachedFiles.map((file) => [file.id, file]));
    const renderedKeys = new Set<string>();
    const chips: Array<
      | { kind: "profile"; key: string; profile: DraftProfileContext }
      | { kind: "attachment"; key: string; file: AttachedFile }
    > = [];

    composerContextChipOrder.forEach((item) => {
      const key = `${item.kind}:${item.id}`;
      if (item.kind === "profile") {
        const profile = profilesById.get(item.id);
        if (profile) {
          renderedKeys.add(key);
          chips.push({ kind: "profile", key, profile });
        }
        return;
      }

      const file = attachmentsById.get(item.id);
      if (file) {
        renderedKeys.add(key);
        chips.push({ kind: "attachment", key, file });
      }
    });

    selectedProfileContexts.forEach((profile) => {
      const key = `profile:${profile.profileId}`;
      if (!renderedKeys.has(key)) {
        chips.push({ kind: "profile", key, profile });
      }
    });

    attachedFiles.forEach((file) => {
      const key = `attachment:${file.id}`;
      if (!renderedKeys.has(key)) {
        chips.push({ kind: "attachment", key, file });
      }
    });

    return chips;
  }, [attachedFiles, composerContextChipOrder, selectedProfileContexts]);
  const hasComposerContextChips = orderedComposerContextChips.length > 0;
  const canSendComposerMessage = input.trim().length > 0 || hasUnsentSendableAttachments;
  const selectedReferenceDocument = useMemo(
    () => coverLetterReferences.find((document) => document.id === selectedReferenceDocumentId) ?? null,
    [coverLetterReferences, selectedReferenceDocumentId]
  );
  const allText = `${resumeText}`.toLowerCase();
  const selectedJobSkills = useMemo(() => selectedJob?.skills ?? [], [selectedJob]);
  const selectedJobKeywordCandidates = useMemo(
    () => (selectedJob ? buildJobKeywordCandidates(selectedJob) : []),
    [selectedJob]
  );
  const aliasedConversationSkills = useMemo(() => detectAliasedSkills(allText), [allText]);
  const skillCatalog = useMemo(
    () =>
      uniqueSkillLabels([
        ...selectedJobSkills,
        ...COMMON_SKILL_CATALOG,
        ...selectedJobKeywordCandidates,
        ...aliasedConversationSkills
      ]),
    [aliasedConversationSkills, selectedJobKeywordCandidates, selectedJobSkills]
  );
  const inferredFrontendSkills =
    selectedJob?.id === "frontend" && /(앱|개발|프로젝트|mvp|사용자|인터뷰|팀|공모전)/.test(allText)
      ? ["JavaScript", "React", "HTML/CSS", "Git", "REST API", "Next.js", "테스트 코드"]
      : [];
  const detectedConversationSkills = skillCatalog.filter(
    (skill) => includesSkillAlias(allText, skill) || inferredFrontendSkills.includes(skill)
  );
  const visibleSkillCandidates = selectedJob
    ? uniqueSkillLabels([...selectedJobSkills, ...detectedConversationSkills])
    : detectedConversationSkills;
  const matchedSkills = visibleSkillCandidates.filter(
    (skill) => includesSkillAlias(allText, skill) || inferredFrontendSkills.includes(skill)
  );
  const matchedSelectedJobSkills = selectedJobSkills.filter(
    (skill) => includesSkillAlias(allText, skill) || inferredFrontendSkills.includes(skill)
  );
  const matchPercent =
    selectedJobSkills.length > 0
      ? Math.round((matchedSelectedJobSkills.length / selectedJobSkills.length) * 100)
      : 0;
  const skillPanelModeLabel = selectedJobSkills.length > 0
    ? "공고 기반 후보 · 대화 기반 추가"
    : visibleSkillCandidates.length > 0
      ? "대화에서 감지"
      : "대화 후 생성";
  const skillPanelFootnote = selectedJobSkills.length > 0
    ? "선택한 공고의 요구 스킬을 먼저 보여주고, 대화에서 새로 감지한 항목은 추가로 붙입니다."
    : selectedJob
      ? visibleSkillCandidates.length > 0
        ? "이 공고에는 스킬 태그가 없어, 채팅에서 감지한 기술과 공고 키워드만 정리했습니다."
        : "이 공고에는 스킬 태그가 없어, 채팅에서 기술이나 직무 키워드를 말하면 여기에 추가됩니다."
    : visibleSkillCandidates.length > 0
      ? "대화에서 언급한 기술만 정리했습니다. 공고를 선택하면 요구 스킬과 비교합니다."
      : "공고를 선택하거나 채팅에서 사용한 기술을 말하면 여기에 정리됩니다.";
  const inputAtsResult = useMemo(
    () =>
      calculateInputAtsMetrics({
        resumeText,
        selectedJob,
        detectedConversationSkills,
        matchPercent
      }),
    [detectedConversationSkills, matchPercent, resumeText, selectedJob]
  );
  const reviewAtsMetrics: AtsMetric[] | null = workflowDraft
    ? [
        { label: "문항 적합도", value: workflowDraft.reviewReport.scores.promptFit },
        { label: "직무 적합도", value: workflowDraft.reviewReport.scores.jobFit },
        { label: "구체성", value: workflowDraft.reviewReport.scores.specificity },
        { label: "증거 안전성", value: workflowDraft.reviewReport.scores.evidenceSafety },
        { label: "한국어 가독성", value: workflowDraft.reviewReport.scores.koreanReadability }
      ]
    : null;
  const planFitScore = workflowPlan?.fitAssessments[0]?.fitScore;
  const planAtsMetrics: AtsMetric[] | null =
    !workflowDraft && workflowPlan
      ? [
          ...(typeof planFitScore === "number" ? [{ label: "문항-경험 매칭", value: planFitScore }] : []),
          ...(inputAtsResult?.metrics ?? [])
        ]
      : null;
  const atsMetrics = reviewAtsMetrics ?? planAtsMetrics ?? inputAtsResult?.metrics ?? [];
  const atsScore = workflowDraft?.reviewReport.scores.promptFit ?? planFitScore ?? inputAtsResult?.score ?? null;
  const atsCardMode = workflowDraft
    ? "검수 리포트"
    : workflowPlan
      ? "AI 분석 결과"
      : inputAtsResult
        ? "입력 기반 계산"
        : "대화 후 계산";
  const baseDraftFitTargetScore =
    workflowDraft?.reviewReport.scores.promptFit ??
    workflowPlan?.fitAssessments[0]?.fitScore ??
    inputAtsResult?.score ??
    0;
  const isDraftProgressActive = draftState === "planning" || draftState === "drafting" || draftState === "revising";
  const draftFitTargetScore = getActiveDraftProgressTarget(draftState, draftProgressTick, baseDraftFitTargetScore);
  const draftProgressTitle = getActiveDraftProgressTitle(draftState, draftProgressTick);
  const completedProgressStepCount = draftProgressSteps.filter((step) => draftFitProgress >= Math.min(step.threshold, draftFitTargetScore)).length;
  const activeProgressStepIndex = isDraftProgressActive
    ? Math.min(completedProgressStepCount, draftProgressSteps.length - 1)
    : -1;
  const selectedProviderLabel = providerBadgeLabel(aiSelection.providerId ?? DEFAULT_AI_PROVIDER_ID);
  const activeAiMeta = documentSession?.aiMeta ?? workflowDraft?.aiMeta ?? workflowPlan?.aiMeta;
  const realAiProviderOnline = providerStatuses.some(
    (provider) => provider.providerId !== "fallback" && provider.online && !provider.quotaExceeded
  );
  const actualProviderSummary = activeAiMeta
    ? formatAiExecutionLabel(activeAiMeta)
    : "분석 전";
  const headerAiStatus = providerStatuses.length === 0
    ? { label: "확인 중", status: "checking" }
    : realAiProviderOnline
      ? { label: "연결됨", status: "online" }
      : { label: "연결 안됨", status: "offline" };
  const documentDraftsWithText = documentSession?.drafts.filter((draft) => draft.draftText?.trim()) ?? [];
  const hasProvisionalDocumentDraft =
    documentSession?.completion.status === "provisional" ||
    documentDraftsWithText.some((draft) => draft.status === "needs_more_evidence");
  const documentDraftText = documentDraftsWithText
    .map((draft, index) => `문항 ${index + 1}. ${draft.questionText}\n\n${draft.draftText ?? ""}`)
    .join("\n\n");
  const activeDocumentQuestion = documentSession?.interview.questions[0];
  const hasDocumentDraft = documentDraftText.trim().length > 0;
  const shouldShowDocumentDraft = Boolean(documentSession && hasDocumentDraft && (draftState === "plan_ready" || draftState === "complete"));
  const shouldShowResultDraft = Boolean((draftState === "complete" && workflowDraft) || shouldShowDocumentDraft);
  const documentDraftTitle = hasProvisionalDocumentDraft ? "가초안" : "완성본";
  const documentDraftSubtitle = hasProvisionalDocumentDraft ? "보완 중인 문서 기반 가초안" : "문서 기반 초안";
  const documentDraftStatusLabel = hasProvisionalDocumentDraft ? "보완 필요" : "완료";
  const documentFileViewerItems = useMemo(() => {
    if (!documentSession) {
      return [];
    }

    const usedAttachmentIds = new Set<string>();
    const analysisItems = documentSession.documentAnalyses.map((analysis) => {
      const sourceFile = findSourceFileForAnalysis(sourceFiles, analysis.sourceId);
      if (sourceFile) {
        usedAttachmentIds.add(sourceFile.id);
      }

      return {
        id: analysis.sourceId,
        fileName: analysis.fileName,
        detail: careerDocumentClassificationLabel(analysis.classification),
        sourceFile
      };
    });
    const extraItems = sourceFiles
      .filter((file) => !usedAttachmentIds.has(file.id))
      .map((file) => ({
        id: `attachment-${file.id}`,
        fileName: file.name,
        detail: getAttachmentVisual(file).typeLabel,
        sourceFile: file
      }));

    return [...analysisItems, ...extraItems];
  }, [documentSession, sourceFiles]);
  const activeDocumentPreviewItem = useMemo(() => {
    if (!documentSession || documentFileViewerItems.length === 0) {
      return null;
    }

    return (
      documentFileViewerItems.find((item) => item.id === activeDocumentPreviewFileId) ??
      documentFileViewerItems.find((item) => {
        const file = item.sourceFile;
        return Boolean(file?.previewHtml || (file?.previewUrl && isPdfPreviewFile(file)));
      }) ??
      documentFileViewerItems[0]
    );
  }, [activeDocumentPreviewFileId, documentFileViewerItems, documentSession]);
  const activeDocumentPreviewFile = activeDocumentPreviewItem?.sourceFile ?? null;
  const documentDraftCharCount = documentDraftText
    ? {
        withSpaces: documentDraftText.length,
        withoutSpaces: documentDraftText.replace(/\s/g, "").length
      }
    : null;
  const resultBody = documentDraftText || workflowDraft?.draftText || "";
  const withSpaces = workflowDraft?.charCount.withSpaces ?? documentDraftCharCount?.withSpaces ?? resultBody.length;
  const withoutSpaces = workflowDraft?.charCount.withoutSpaces ?? documentDraftCharCount?.withoutSpaces ?? resultBody.replace(/\s/g, "").length;
  const displayDraft =
    textFormat === "Markdown"
      ? buildMarkdownDraft(resultBody)
      : resultBody;
  const resultInsightSections = useMemo<ResultInsightSection[]>(() => {
    if (!workflowDraft) {
      return [];
    }

    const sections: ResultInsightSection[] = [];

    if (workflowDraft.revisionOptions.length > 0) {
      sections.push({
        id: "revision",
        title: "수정 우선순위",
        helper: "다음 수정 요청에 바로 반영할 항목입니다.",
        items: workflowDraft.revisionOptions
      });
    }

    if (workflowDraft.reviewReport.issues.length > 0) {
      sections.push({
        id: "issues",
        title: "주의해서 쓴 부분",
        helper: "근거가 부족하거나 조심스럽게 표현한 지점입니다.",
        tone: "warning",
        items: workflowDraft.reviewReport.issues.map((issue) => issue.message)
      });
    }

    if (workflowDraft.reviewReport.likelyInterviewQuestions.length > 0) {
      sections.push({
        id: "questions",
        title: "추가 확인 질문",
        helper: "답하면 초안의 구체성이 올라가는 질문입니다.",
        items: workflowDraft.reviewReport.likelyInterviewQuestions
      });
    }

    if (workflowDraft.evidenceMap.length > 0) {
      sections.push({
        id: "evidence",
        title: "문단별 근거",
        helper: "각 문단이 어떤 작성 근거에 기대는지 표시합니다.",
        items: workflowDraft.evidenceMap.map(
          (item) => `${item.textRangeLabel} · 작성 근거 ${item.claimIds.length}개`
        )
      });
    }

    return sections;
  }, [workflowDraft]);

  const conversationRequirementText = useMemo(
    () => buildConversationRequirementSourceText(messages, input),
    [messages, input]
  );
  const attachmentRequirementText = useMemo(
    () => buildRequirementSourceText(sourceFiles),
    [sourceFiles]
  );
  const requirementInputText = useMemo(
    () => [conversationRequirementText, attachmentRequirementText].filter((text) => text.length > 0).join("\n\n").trim(),
    [conversationRequirementText, attachmentRequirementText]
  );
  const inferredQuestionText = useMemo(
    () => inferQuestionTextFromText(requirementInputText) || targetForm.questionText,
    [requirementInputText, targetForm.questionText]
  );
  const inferredCharLimit = useMemo(
    () => inferCharLimitFromText(requirementInputText) ?? targetForm.charLimit,
    [requirementInputText, targetForm.charLimit]
  );
  const inferredBlindRecruitment = settings.blindRecruitment || BLIND_RECRUITMENT_PATTERN.test(requirementInputText);

  const conversationSummaryItems = useMemo(() => {
    const fromUser = messages
      .filter((message) => message.sender === "user")
      .flatMap((message) =>
        message.text
          .split(/\n+/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      );

    if (fromUser.length > 0) {
      return fromUser.slice(0, 5);
    }

    if (workflowDraft?.reviewReport.issues.length) {
      return workflowDraft.reviewReport.issues.slice(0, 3).map((issue) => issue.message);
    }

    return [];
  }, [messages, workflowDraft]);
  const careerSessionSummaryItems = useMemo(() => {
    if (!careerSession) {
      return [];
    }

    return [
      `문서 유형: ${careerDocumentTypeLabel(careerSession.documentType)}`,
      `완성도: ${careerSession.completion.progress}%`,
      `확보 근거: ${careerSession.evidenceVault.length}개`,
      `부족 슬롯: ${careerSession.completion.missingSlots.slice(0, 3).join(", ") || "없음"}`
    ];
  }, [careerSession]);
  const refreshProviderStatuses = useCallback(() => {
    return getDraftWorkflowProviders()
      .then((providers) => setProviderStatuses(providers))
      .catch(() => setProviderStatuses([]));
  }, []);

  const loadCoverLetterReferences = useCallback(() => {
    const requestId = referenceLoadRequestIdRef.current + 1;
    referenceLoadRequestIdRef.current = requestId;
    setReferenceLoadStatus("loading");

    return getSavedDocuments({ documentType: "cover_letter" })
      .then((documents) => {
        if (referenceLoadRequestIdRef.current !== requestId) {
          return;
        }

        const usableDocuments = documents.filter((document) => document.content.trim().length > 0);
        setCoverLetterReferences(usableDocuments);
        setSelectedReferenceDocumentId((currentId) =>
          currentId && usableDocuments.some((document) => document.id === currentId) ? currentId : null
        );
        setReferenceLoadStatus("ready");
      })
      .catch(() => {
        if (referenceLoadRequestIdRef.current !== requestId) {
          return;
        }

        setCoverLetterReferences([]);
        setSelectedReferenceDocumentId(null);
        setReferenceLoadStatus("unavailable");
      });
  }, []);

  const loadProfileOptions = useCallback(() => {
    const requestId = profileLoadRequestIdRef.current + 1;
    profileLoadRequestIdRef.current = requestId;
    setProfileLoadStatus("loading");

    return getProfiles({ includeArchived: false })
      .then((profiles) => {
        if (profileLoadRequestIdRef.current !== requestId) {
          return;
        }

        setProfileOptions(profiles);
        setSelectedProfileContexts((currentContexts) =>
          currentContexts.filter((context) => profiles.some((profile) => profile.id === context.profileId))
        );
        setProfileLoadStatus("ready");
      })
      .catch(() => {
        if (profileLoadRequestIdRef.current !== requestId) {
          return;
        }

        setProfileOptions([]);
        setProfileLoadStatus("unavailable");
      });
  }, []);

  useEffect(() => {
    void refreshProviderStatuses();
  }, [refreshProviderStatuses]);

  const applyCodexLoginStatus = useCallback(
    (status: CodexBridgeLoginStatus) => {
      if (status.status === "succeeded") {
        setCodexLoginState({
          status: "succeeded",
          loginId: status.loginId,
          message: "Codex 연결 완료"
        });
        void refreshProviderStatuses();
        return;
      }

      if (status.status === "failed" || status.status === "expired") {
        setCodexLoginState({
          status: "failed",
          loginId: status.loginId,
          message: status.error ?? "Codex 연결에 실패했습니다."
        });
        return;
      }

      setCodexLoginState({
        status: "pending",
        loginId: status.loginId,
        message: "브라우저에서 Codex 로그인을 완료해 주세요."
      });
    },
    [refreshProviderStatuses]
  );

  useEffect(() => {
    if (codexLoginState.status !== "pending" || !codexLoginState.loginId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      getRequiredAccessToken()
        .then((accessToken) => getCodexBridgeLoginStatus(codexLoginState.loginId as string, accessToken))
        .then(applyCodexLoginStatus)
        .catch(() => {
          setCodexLoginState({
            status: "failed",
            loginId: codexLoginState.loginId,
            message: "Codex 연결 상태를 확인하지 못했습니다."
          });
        });
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [applyCodexLoginStatus, codexLoginState.loginId, codexLoginState.status]);

  useEffect(() => {
    void loadCoverLetterReferences();

    const handleAuthChange = () => {
      void loadCoverLetterReferences();
      void loadProfileOptions();
    };

    window.addEventListener("neet2work.auth.changed", handleAuthChange);
    return () => {
      referenceLoadRequestIdRef.current += 1;
      profileLoadRequestIdRef.current += 1;
      window.removeEventListener("neet2work.auth.changed", handleAuthChange);
    };
  }, [loadCoverLetterReferences, loadProfileOptions]);

  useEffect(() => {
    const timeline = timelineRef.current;

    if (!timeline) {
      return undefined;
    }

    const scrollToLatest = (behavior: ScrollBehavior) => {
      if (isDraftProgressActive && progressCardRef.current?.scrollIntoView) {
        progressCardRef.current.scrollIntoView({
          block: "end",
          behavior
        });
        return;
      }

      timeline.scrollTo({
        top: timeline.scrollHeight,
        behavior
      });
    };

    scrollToLatest("smooth");

    let secondFrameId: number | null = null;
    const firstFrameId = window.requestAnimationFrame(() => {
      scrollToLatest("auto");
      secondFrameId = window.requestAnimationFrame(() => {
        scrollToLatest("auto");
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) {
        window.cancelAnimationFrame(secondFrameId);
      }
    };
  }, [messages, draftState, isDraftProgressActive]);

  useEffect(() => {
    syncComposerHeight();
  }, [input, syncComposerHeight]);

  useEffect(() => {
    if (!composerMenuOpen) {
      return undefined;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const menu = composerOptionsMenuRef.current;
      if (!menu) {
        return;
      }

      const activeElement = document.activeElement;
      if (activeElement instanceof Element && menu.contains(activeElement)) {
        return;
      }

      getComposerMenuFocusTargets(menu)[0]?.focus();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [composerMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen || profileLoadStatus !== "ready") {
      return undefined;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      focusFirstProfileOption();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [profileLoadStatus, profileMenuOpen, profileOptions.length]);

  useEffect(() => {
    if (!newChatConfirmOpen) {
      return undefined;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNewChatConfirmOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [newChatConfirmOpen]);

  useEffect(() => {
    if (!composerMenuOpen && !modelMenuOpen && !toneMenuOpen && !profileMenuOpen && !downloadMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const target = event.target;
      if (
        target.closest(
          ".aiDraftComposerPopover, .aiDraftComposerToneSubmenu, .aiDraftComposerPlusButton, .aiDraftDownloadMenu, .aiDraftDownloadButton"
            + ", .aiDraftComposerModelMenu, .aiDraftComposerModelButton"
        )
      ) {
        return;
      }

      setComposerMenuOpen(false);
      setToneMenuOpen(false);
      setProfileMenuOpen(false);
      setModelMenuOpen(false);
      setDownloadMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setComposerMenuOpen(false);
        setToneMenuOpen(false);
        setProfileMenuOpen(false);
        setModelMenuOpen(false);
        setDownloadMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [composerMenuOpen, modelMenuOpen, toneMenuOpen, profileMenuOpen, downloadMenuOpen]);

  useEffect(() => {
    const queryJobId = new URLSearchParams(window.location.search).get("jobId")?.trim();
    if (!queryJobId) {
      setSelectedApiJob(null);
      setTargetForm((prev) => ({ ...prev, jobPostingText: "" }));
      return;
    }

    let isCurrent = true;

    getJobById(queryJobId)
      .then((job) => {
        if (!isCurrent) return;

        const nextJob = toSelectedJob(job);
        setSelectedApiJob(nextJob);
        syncTargetFormForJob(nextJob);
      })
      .catch(() => {
        if (!isCurrent) return;

        setSelectedApiJob(null);
        setTargetForm((prev) => ({ ...prev, jobPostingText: "" }));
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!isDraftProgressActive) {
      setDraftProgressTick(0);
      return undefined;
    }

    setDraftProgressTick(0);
    const intervalId = window.setInterval(() => {
      setDraftProgressTick((value) => Math.min(value + 1, 12));
    }, 12_000);

    return () => window.clearInterval(intervalId);
  }, [draftState, isDraftProgressActive]);

  useEffect(() => {
    const setMeterProgress = (nextValue: number) => {
      draftFitProgressRef.current = nextValue;
      setDraftFitProgress(nextValue);
    };

    if (draftState !== "planning" && draftState !== "drafting" && draftState !== "complete" && draftState !== "revising") {
      setMeterProgress(0);
      return undefined;
    }

    const startValue = draftFitProgressRef.current;
    const targetValue = draftFitTargetScore;
    const duration = draftState === "planning" || draftState === "drafting" || draftState === "revising" ? 1500 : 900;
    const startedAt = performance.now();
    let animationFrame = 0;

    setMeterProgress(startValue);

    if (startValue === targetValue) {
      return undefined;
    }

    const animate = (now: number) => {
      const elapsed = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const nextValue = Math.round(startValue + (targetValue - startValue) * eased);

      setMeterProgress(nextValue);

      if (elapsed < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [draftFitTargetScore, draftState]);

  const updateSettings = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    playTone(settings.sound, "open");
  };

  const closeComposerMenus = () => {
    setComposerMenuOpen(false);
    setToneMenuOpen(false);
    setProfileMenuOpen(false);
    setModelMenuOpen(false);
    setDownloadMenuOpen(false);
  };

  const focusComposerInputSoon = () => {
    window.requestAnimationFrame(() => composerInputRef.current?.focus());
  };

  const focusComposerInputAfterFilePicker = () => {
    shouldFocusComposerAfterFilePickerRef.current = false;
    focusComposerInputSoon();
  };

  const closeComposerMenusAndFocusInput = () => {
    closeComposerMenus();
    focusComposerInputSoon();
  };

  useEffect(() => {
    const handleWindowFocus = () => {
      if (shouldFocusComposerAfterFilePickerRef.current) {
        shouldFocusComposerAfterFilePickerRef.current = false;
        window.requestAnimationFrame(() => composerInputRef.current?.focus());
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, []);

  const getComposerMenuFocusTargets = (menu: HTMLElement) => {
    return Array.from(
      menu.querySelectorAll<HTMLButtonElement>(
        "button.aiDraftComposerMenuItem, button.aiDraftComposerSubmenuTrigger, button.aiDraftComposerMenuToggle, button.aiDraftComposerToneOption, button.aiDraftComposerProfileOption"
      )
    ).filter((button) => !button.disabled);
  };

  const focusComposerMenuItem = (menu: HTMLElement, direction: 1 | -1) => {
    const targets = getComposerMenuFocusTargets(menu);
    if (targets.length === 0) {
      return;
    }

    const activeIndex = targets.findIndex((button) => button === document.activeElement);
    const nextIndex = activeIndex === -1
      ? direction === 1 ? 0 : targets.length - 1
      : (activeIndex + direction + targets.length) % targets.length;

    targets[nextIndex].focus();
  };

  const focusComposerMenuTrigger = (label: "프로필 추가" | "문체 설정") => {
    composerOptionsMenuRef.current
      ?.querySelector<HTMLButtonElement>(`button.aiDraftComposerSubmenuTrigger[aria-label="${label}"]`)
      ?.focus();
  };

  const focusFirstProfileOption = () => {
    composerOptionsMenuRef.current
      ?.querySelector<HTMLButtonElement>("button.aiDraftComposerProfileOption:not(:disabled)")
      ?.focus();
  };

  const focusFirstToneOption = () => {
    composerOptionsMenuRef.current
      ?.querySelector<HTMLButtonElement>("button.aiDraftComposerToneOption:not(:disabled)")
      ?.focus();
  };

  const handleComposerOptionsKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const menu = composerOptionsMenuRef.current;
    if (!menu) {
      return;
    }

    if (event.key === "ArrowRight" && event.target instanceof HTMLElement) {
      if (event.target.closest('button[aria-label="프로필 추가"]')) {
        event.preventDefault();
        setToneMenuOpen(false);
        setProfileMenuOpen(true);
        if (profileLoadStatus === "idle") {
          void loadProfileOptions();
        } else {
          window.requestAnimationFrame(focusFirstProfileOption);
        }
        return;
      }

      if (event.target.closest('button[aria-label="문체 설정"]')) {
        event.preventDefault();
        setProfileMenuOpen(false);
        setToneMenuOpen(true);
        window.requestAnimationFrame(focusFirstToneOption);
        return;
      }
    }

    if (event.key === "ArrowLeft" && event.target instanceof HTMLElement) {
      if (event.target.closest(".aiDraftComposerProfileSubmenu")) {
        event.preventDefault();
        setProfileMenuOpen(false);
        window.requestAnimationFrame(() => focusComposerMenuTrigger("프로필 추가"));
        return;
      }

      if (event.target.closest(".aiDraftComposerToneSubmenu")) {
        event.preventDefault();
        setToneMenuOpen(false);
        window.requestAnimationFrame(() => focusComposerMenuTrigger("문체 설정"));
        return;
      }
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusComposerMenuItem(menu, 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusComposerMenuItem(menu, -1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      getComposerMenuFocusTargets(menu)[0]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const targets = getComposerMenuFocusTargets(menu);
      targets[targets.length - 1]?.focus();
      return;
    }

    if (
      (event.key === "Enter" || event.key === " " || (event.key === "Tab" && !event.shiftKey)) &&
      event.target instanceof HTMLButtonElement
    ) {
      event.preventDefault();
      event.target.click();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeComposerMenus();
      composerInputRef.current?.focus();
    }
  };

  const toggleComposerMenu = () => {
    setToneMenuOpen(false);
    setProfileMenuOpen(false);
    setModelMenuOpen(false);
    setDownloadMenuOpen(false);
    setComposerMenuOpen((value) => !value);
    playTone(settings.sound, "open");
  };

  const toggleModelMenu = () => {
    setComposerMenuOpen(false);
    setToneMenuOpen(false);
    setProfileMenuOpen(false);
    setDownloadMenuOpen(false);
    setModelMenuOpen((value) => !value);
    playTone(settings.sound, "open");
  };

  const toggleToneMenu = () => {
    setProfileMenuOpen(false);
    setModelMenuOpen(false);
    setDownloadMenuOpen(false);
    setToneMenuOpen((value) => !value);
    playTone(settings.sound, "open");
  };

  const toggleProfileMenu = () => {
    setToneMenuOpen(false);
    setModelMenuOpen(false);
    setDownloadMenuOpen(false);
    const nextOpen = !profileMenuOpen;
    setProfileMenuOpen(nextOpen);
    if (nextOpen && profileLoadStatus === "idle") {
      void loadProfileOptions();
    }
    playTone(settings.sound, "open");
  };

  const buildDraftTarget = () => ({
    company: selectedJob?.company ?? "지원 기업 미정",
    role: selectedJob?.title ?? "지원 직무 미정",
    questionText: inferredQuestionText.trim() || DEFAULT_QUESTION_TEXT,
    charLimit: inferredCharLimit,
    charCountRule: "with_spaces" as const,
    jobPostingText: targetForm.jobPostingText.trim() || (selectedJob ? buildDefaultJobPostingText(selectedJob) : EMPTY_JOB_POSTING_TEXT),
    blindRecruitment: inferredBlindRecruitment,
    writingStyle: settings.tone,
    requirementSourceText: requirementInputText || undefined,
    previousDraftText: workflowDraft?.draftText
  });

  const neededGapQuestions = workflowPlan?.answerStrategy.neededQuestions ?? [];
  const pendingGapQuestions = neededGapQuestions.filter(
    (question) => !confirmedGapQuestionIds.has(question.questionId)
  );
  const activeGapQuestion = draftState === "plan_ready" ? pendingGapQuestions[0] : undefined;
  const activeGapAnswerDraft = activeGapQuestion ? gapAnswerDrafts[activeGapQuestion.questionId] ?? "" : "";
  const answeredGapQuestionCount = neededGapQuestions.filter((question) =>
    confirmedGapQuestionIds.has(question.questionId)
  ).length;
  const canConfirmDraft =
    (draftState === "plan_ready" || draftState === "complete") &&
    pendingGapQuestions.length === 0 &&
    neededGapQuestions.every((question) => (gapAnswerDrafts[question.questionId] ?? "").trim().length > 0) &&
    inferredQuestionText.trim().length >= 5 &&
    (targetForm.jobPostingText.trim() || (selectedJob ? buildDefaultJobPostingText(selectedJob) : EMPTY_JOB_POSTING_TEXT)).length >= 10;

  const updateGapAnswerDraft = (questionId: string, answer: string) => {
    setGapAnswerDrafts((prev) => ({ ...prev, [questionId]: answer }));
    setConfirmedGapQuestionIds((prev) => {
      if (!prev.has(questionId)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
    setOutlineConfirmed(false);
    resetWorkflowPartialAfterGapChange();
  };

  const resetWorkflowPartialAfterGapChange = () => {
    setWorkflowDraft(null);
    setWorkflowStatus("idle");
    setWorkflowError(null);
    setDocumentSaveStatus({ status: "idle", message: null });
    if (draftState === "complete") {
      setDraftState("plan_ready");
    }
  };

  const applyGapChoice = (questionId: string, choice: string) => {
    setGapAnswerDrafts((prev) => {
      const current = prev[questionId] ?? "";
      return {
        ...prev,
        [questionId]: current ? `${current} ${choice}` : choice
      };
    });
    setOutlineConfirmed(false);
    resetWorkflowPartialAfterGapChange();
  };

  const confirmGapAnswer = (questionId: string) => {
    if (!(gapAnswerDrafts[questionId] ?? "").trim()) {
      return;
    }

    setConfirmedGapQuestionIds((prev) => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
    resetWorkflowPartialAfterGapChange();
  };

  const buildExperienceInput = () => {
    const messageExperienceText = messages
      .filter((message) => message.sender === "user")
      .map((message) => message.text)
      .join("\n\n");
    const manualExperienceText = [submittedUserText, messageExperienceText]
      .filter((text, index, texts) => text.trim().length > 0 && texts.indexOf(text) === index)
      .join("\n\n");

    return {
      portfolioText: buildPortfolioSourceText(sourceFiles),
      manualExperienceText,
      additionalContext:
        [input.trim()]
        .filter((text) => text.length > 0)
        .join("\n\n") || undefined,
      referenceSelfIntroText: buildSelfIntroReferenceText({
        userReference: selectedReferenceDocument
          ? {
              title: selectedReferenceDocument.title,
              content: selectedReferenceDocument.content,
              company: selectedReferenceDocument.company,
              jobTitle: selectedReferenceDocument.jobTitle
            }
          : null
        }),
      profileContexts: selectedProfileContexts.length > 0 ? selectedProfileContexts : undefined
    };
  };

  const buildCareerWorkflowSources = (): CareerWorkflowSourceInput[] => {
    const sources: CareerWorkflowSourceInput[] = [];
    const messageConversationText = messages
      .filter((message) => message.sender === "user")
      .map((message) => message.text)
      .join("\n\n")
      .trim();
    const userConversationText = [submittedUserText, messageConversationText]
      .filter((text, index, texts) => text.trim().length > 0 && texts.indexOf(text) === index)
      .join("\n\n")
      .trim();

    if (userConversationText) {
      sources.push({
        sourceId: "conversation",
        label: "대화 경험",
        text: userConversationText
      });
    }

    for (const file of readyTextAttachments(sourceFiles)) {
      sources.push({
        sourceId: `attachment-${file.id}`,
        label: file.name,
        fileName: file.name,
        text: file.textContent ?? ""
      });
    }

    if (requirementInputText) {
      sources.push({
        sourceId: "requirements",
        sourceType: "blank_cover_letter_template",
        label: "지원 문항/양식",
        text: requirementInputText
      });
    }

    const jobPostingText = selectedJob ? buildDefaultJobPostingText(selectedJob) : targetForm.jobPostingText.trim();
    if (jobPostingText) {
      sources.push({
        sourceId: "job-posting",
        sourceType: "job_posting",
        label: "채용공고",
        text: jobPostingText
      });
    }

    const githubUrls = extractGithubUrls(`${userConversationText}\n${input}`).slice(0, 3);
    for (const [index, url] of githubUrls.entries()) {
      sources.push({
        sourceId: `github-${index + 1}`,
        sourceType: "github_url",
        label: "GitHub URL",
        url
      });
    }

    return sources.length > 0 ? sources : [{ sourceId: "empty", sourceType: "empty", label: "자료 없음" }];
  };

  const buildDocumentWorkflowRequest = () => {
    const userConversationText = messages
      .filter((message) => message.sender === "user")
      .map((message) => message.text)
      .join("\n\n")
      .trim();
    const messageText = [userConversationText, input.trim()].filter((text) => text.length > 0).join("\n\n");
    const jobPostingText = targetForm.jobPostingText.trim() || (selectedJob ? buildDefaultJobPostingText(selectedJob) : "");

    return {
      message: messageText || resumeText,
      attachments: readyTextAttachments(sourceFiles).map((file) => ({
        sourceId: `attachment-${file.id}`,
        fileName: file.name,
        mimeType: file.mimeType || undefined,
        text: file.textContent ?? ""
      })),
      target: {
        company: selectedJob?.company,
        role: selectedJob?.title ?? undefined,
        jobPostingText: jobPostingText || undefined,
        jobId: selectedJob?.id,
        writingStyle: settings.tone,
        formatLabel: selectedSelfIntroFormat.label,
        questionText: inferredQuestionText.trim() || selectedSelfIntroFormat.questionText,
        charLimit: inferredCharLimit,
        charCountRule: "with_spaces" as const
      },
      profileContexts: selectedProfileContexts.length > 0 ? selectedProfileContexts : undefined,
      aiSelection
    };
  };

  const handleToneSelect = (tone: AiSettings["tone"]) => {
    updateSettings("tone", tone);
    closeComposerMenusAndFocusInput();
  };

  const handleFollowUpToggle = () => {
    updateSettings("followUp", !settings.followUp);
    closeComposerMenusAndFocusInput();
  };

  const toDraftProfileContext = (profile: ProfileListItem): DraftProfileContext | null => {
    if (!profile.profileJson) {
      return null;
    }

    return {
      profileId: profile.id,
      title: profile.title,
      schemaVersion: profile.schemaVersion,
      profileJson: profile.profileJson,
      profileText: profile.profileText || undefined,
      targetRole: profile.targetRole,
      targetCompany: profile.targetCompany,
      desiredRoles: profile.desiredRoles,
      skills: profile.skills
    };
  };

  const handleProfileContextSelect = (profile: ProfileListItem) => {
    const context = toDraftProfileContext(profile);
    if (!context) {
      return;
    }

    setSelectedProfileContexts((prev) =>
      prev.some((item) => item.profileId === context.profileId) ? prev : [...prev, context]
    );
    setComposerContextChipOrder((prev) =>
      prev.some((item) => item.kind === "profile" && item.id === context.profileId)
        ? prev
        : [...prev, { kind: "profile", id: context.profileId }]
    );
    resetWorkflow();
    setDraftState((prev) => (prev === "planning" || prev === "drafting" ? prev : "ready"));
    closeComposerMenusAndFocusInput();
    setInput((current) => (current.trim() === "/" ? "" : current));
    window.requestAnimationFrame(syncComposerHeight);
    playTone(settings.sound, "open");
  };

  const removeProfileContext = (profileId: string) => {
    setSelectedProfileContexts((prev) => prev.filter((profile) => profile.profileId !== profileId));
    setComposerContextChipOrder((prev) =>
      prev.filter((item) => !(item.kind === "profile" && item.id === profileId))
    );
    setInput((current) => (typeof current === "string" ? current : ""));
    emptyComposerBackspaceCountRef.current = 0;
    resetWorkflow();
    window.requestAnimationFrame(syncComposerHeight);
    playTone(settings.sound, "open");
  };

  const removeLastComposerContextChip = () => {
    const lastChip = orderedComposerContextChips[orderedComposerContextChips.length - 1];
    if (!lastChip) {
      return;
    }

    if (lastChip.kind === "attachment") {
      const removedFileId = lastChip.file.id;
      setAttachedFiles((prev) => {
        const removedFiles = prev.filter((file) => file.id === removedFileId);
        revokeAttachmentPreviewUrls(removedFiles);
        return prev.filter((file) => file.id !== removedFileId);
      });
      setComposerContextChipOrder((prev) =>
        prev.filter((item) => !(item.kind === "attachment" && item.id === removedFileId))
      );
      setActiveDocumentPreviewFileId((prev) => (prev === `attachment-${removedFileId}` ? null : prev));
      setSentAttachmentSignature("");
    } else {
      setSelectedProfileContexts((prev) =>
        prev.filter((profile) => profile.profileId !== lastChip.profile.profileId)
      );
      setComposerContextChipOrder((prev) =>
        prev.filter((item) => !(item.kind === "profile" && item.id === lastChip.profile.profileId))
      );
    }

    setInput((current) => (typeof current === "string" ? current : ""));
    emptyComposerBackspaceCountRef.current = 0;
    resetWorkflow();
    window.requestAnimationFrame(syncComposerHeight);
    playTone(settings.sound, "open");
  };

  const openFilePicker = () => {
    shouldFocusComposerAfterFilePickerRef.current = true;
    closeComposerMenus();
    fileInputRef.current?.click();
  };

  const attachFiles = async (files: File[], options?: { focusAfter?: boolean }) => {
    if (files.length === 0) {
      if (options?.focusAfter) {
        focusComposerInputAfterFilePicker();
      }
      return;
    }

    resetWorkflow();
    closeComposerMenus();
    emptyComposerBackspaceCountRef.current = 0;
    setSentAttachmentSignature("");
    setDraftState((prev) => (prev === "planning" || prev === "drafting" ? prev : "idle"));

    const fileEntries = files.map((file) => {
      const canExtractText = isTextAttachment(file) || isDocumentFileName(file.name);
      return {
        file,
        canExtractText,
        attachment: {
          id: crypto.randomUUID(),
          name: file.name,
          kind: (canExtractText ? "text" : "binary") as AttachedFileKind,
          mimeType: file.type,
          size: file.size,
          previewUrl: createAttachmentPreviewUrl(file),
          previewHtml: null,
          textContent: null,
          readError: false,
          loading: canExtractText,
        },
      };
    });

    const nextAttachments = fileEntries.map((entry) => entry.attachment);
    setAttachedFiles((prev) => [...prev, ...nextAttachments]);
    setComposerContextChipOrder((prev) => [
      ...prev,
      ...nextAttachments.map((file) => ({ kind: "attachment" as const, id: file.id }))
    ]);
    if (options?.focusAfter) {
      focusComposerInputAfterFilePicker();
    }
    playTone(settings.sound, "open");

    const promoteDraftStateIfAnalyzable = (nextFiles: AttachedFile[]) => {
      const nextResumeText = buildResumeTextParts(messages, input, [...submittedFiles, ...nextFiles]).join("\n\n").trim();
      if (nextResumeText.length >= 10) {
        setDraftState((prev) => (prev === "planning" || prev === "drafting" ? prev : "ready"));
      }
    };

    await Promise.all(
      fileEntries.map(async ({ file, attachment, canExtractText }) => {
        if (!canExtractText) {
          return;
        }

        try {
          const extracted = isTextAttachment(file)
            ? { text: await file.text(), previewHtml: undefined }
            : await extractResumeFile(
                {
                  fileName: file.name,
                  mimeType: file.type,
                  contentBase64: await fileToBase64(file)
                },
                await getRequiredAccessToken()
              );
          const textContent = extracted.text;
          setAttachedFiles((prev) => {
            const next = prev.map((item) =>
              item.id === attachment.id
                ? {
                    ...item,
                    textContent,
                    previewHtml: isTextAttachment(file) ? null : extracted.previewHtml ?? null,
                    readError: textContent.trim().length === 0,
                    loading: false,
                  }
                : item
            );
            promoteDraftStateIfAnalyzable(next);
            return next;
          });
        } catch {
          setAttachedFiles((prev) =>
            prev.map((item) =>
              item.id === attachment.id ? { ...item, readError: true, loading: false } : item
            )
          );
        }
      })
    );
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    await attachFiles(selectedFiles, { focusAfter: true });
  };

  const handleComposerDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!transferHasFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    composerFileDragDepthRef.current += 1;
    setComposerFileDragActive(true);
  };

  const handleComposerDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!transferHasFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setComposerFileDragActive(true);
  };

  const handleComposerDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!transferHasFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    composerFileDragDepthRef.current = Math.max(0, composerFileDragDepthRef.current - 1);
    if (composerFileDragDepthRef.current === 0) {
      setComposerFileDragActive(false);
    }
  };

  const handleComposerDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    const droppedFiles = getFilesFromTransfer(event.dataTransfer);
    if (droppedFiles.length === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    composerFileDragDepthRef.current = 0;
    setComposerFileDragActive(false);
    void attachFiles(droppedFiles);
  };

  const handleComposerPaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    const pastedFiles = getFilesFromTransfer(event.clipboardData);
    if (pastedFiles.length === 0) {
      return;
    }

    event.preventDefault();
    void attachFiles(pastedFiles);
  };

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles((prev) => {
      const removedFiles = prev.filter((file) => file.id === fileId);
      revokeAttachmentPreviewUrls(removedFiles);
      return prev.filter((file) => file.id !== fileId);
    });
    setComposerContextChipOrder((prev) =>
      prev.filter((item) => !(item.kind === "attachment" && item.id === fileId))
    );
    setActiveDocumentPreviewFileId((prev) => (prev === `attachment-${fileId}` ? null : prev));
    setInput((current) => (typeof current === "string" ? current : ""));
    emptyComposerBackspaceCountRef.current = 0;
    setSentAttachmentSignature("");
    resetWorkflow();
    window.requestAnimationFrame(syncComposerHeight);
    playTone(settings.sound, "open");
  };

  const resetWorkflow = () => {
    workflowRequestIdRef.current += 1;
    setWorkflowPlan(null);
    setWorkflowDraft(null);
    setCareerSession(null);
    setDocumentSession(null);
    setActiveDocumentPreviewFileId(null);
    setWorkflowStatus("idle");
    setWorkflowError(null);
    setDocumentSaveStatus({ status: "idle", message: null });
    setAutoStartPlanRequestId(0);
    setAutoStartDocumentRequestId(0);
    setGapAnswerDrafts({});
    setConfirmedGapQuestionIds(new Set());
    setOutlineConfirmed(false);
    setRevisionRequest("");
    setDraftFitProgress(0);
    draftFitProgressRef.current = 0;
  };

  const handleReferenceDocumentSelect = (documentId: string | null) => {
    setSelectedReferenceDocumentId(documentId);
    resetWorkflow();
    playTone(settings.sound, "open");
  };

  const handleProviderSelect = (providerId: AiProviderId) => {
    const provider = providerStatuses.find((item) => item.providerId === providerId);
    setAiSelection({
      mode: "manual",
      providerId,
      modelId: getProviderModelIdForSelection(provider)
    });

    setModelMenuOpen(false);
    playTone(settings.sound, "open");
  };

  const handleCodexLoginStart = async () => {
    setCodexLoginState({ status: "starting", loginId: null, message: "Codex 연결 시작 중" });

    try {
      const loginStatus = await startCodexBridgeLogin(await getRequiredAccessToken());
      applyCodexLoginStatus(loginStatus);
      const authUrl = loginStatus.login?.authUrl;
      if (loginStatus.status === "pending" && authUrl) {
        window.open(authUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setCodexLoginState({
        status: "failed",
        loginId: null,
        message: "Codex 연결을 시작하지 못했습니다."
      });
    }
  };

  const handleSelfIntroFormatSelect = (format: SelfIntroFormatOption) => {
    setSelectedSelfIntroFormatId(format.id);
    setTargetForm((prev) => ({
      ...prev,
      questionText: format.questionText,
      charLimit: format.charLimit
    }));
    resetWorkflow();
    playTone(settings.sound, "open");
  };

  const syncTargetFormForJob = (job: Job) => {
    setTargetForm((prev) => ({
      ...prev,
      jobPostingText: buildDefaultJobPostingText(job)
    }));
  };

  const buildSendAssistantHint = (detectedConditionText: string) => {
    const conditionHint = detectedConditionText.length > 0 ? "입력한 작성 조건을 반영해 둘게요. " : "";
    return `${conditionHint}자료를 받았어. 초안 작성이 필요하면 문항과 근거를 기준으로 바로 분석할게.`;
  };

  const answerDocumentQuestionFromChat = async (questionId: string, answer: string) => {
    if (!documentSession) {
      return null;
    }

    const requestId = workflowRequestIdRef.current;
    setWorkflowStatus("loading");
    setWorkflowError(null);

    try {
      const session = await answerCareerDocumentWorkflowQuestion(
        {
          session: documentSession,
          questionId,
          answer,
          aiSelection
        },
        await getRequiredAccessToken()
      );
      if (requestId !== workflowRequestIdRef.current) {
        return null;
      }

      setDocumentSession(session);
      setWorkflowStatus("complete");
      setDraftState(session.state === "DRAFT_READY" ? "complete" : "plan_ready");
      playTone(settings.sound, "success");
      return session;
    } catch {
      if (requestId !== workflowRequestIdRef.current) {
        return null;
      }
      setWorkflowStatus("error");
      setWorkflowError("답변 저장에 실패했습니다. 다시 시도해 주세요.");
      playTone(settings.sound, "ready");
      return null;
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    const attachmentsToSubmit = hasUnsentSendableAttachments ? sendableAttachmentItems : [];
    if (!trimmed && attachmentsToSubmit.length === 0) return;

    clearSendReplyTimeout();
    if (activeDocumentQuestion && trimmed && workflowStatus !== "loading") {
      playTone(settings.sound, "send");
      const userMessage: Message = {
        id: crypto.randomUUID(),
        sender: "user",
        time: nowTime(),
        text: trimmed,
        attachments: attachmentsToSubmit.length > 0 ? attachmentsToSubmit.map(toMessageAttachment) : undefined,
      };
      const submittedAttachmentIds = new Set(attachmentsToSubmit.map((file) => file.id));
      const nextAttachedFiles =
        attachmentsToSubmit.length > 0
          ? attachedFiles.filter((file) => !submittedAttachmentIds.has(file.id))
          : attachedFiles;

      setMessages((prev) => [...prev, userMessage]);
      setSubmittedUserText((prev) => [prev, trimmed].filter((text) => text.trim().length > 0).join("\n\n"));
      if (attachmentsToSubmit.length > 0) {
        setSubmittedFiles((prev) => [...prev, ...attachmentsToSubmit]);
        setAttachedFiles(nextAttachedFiles);
        setSentAttachmentSignature("");
      } else if (sendableAttachmentSignature) {
        setSentAttachmentSignature(sendableAttachmentSignature);
      }
      setInput("");
      window.requestAnimationFrame(syncComposerHeight);

      void answerDocumentQuestionFromChat(activeDocumentQuestion.questionId, trimmed).then((session) => {
        if (!session) {
          return;
        }

        const nextQuestion = session.interview.questions[0];
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "ai",
            time: nowTime(),
            text: nextQuestion
              ? `답변을 반영해 가초안을 갱신했어. 다음으로 확인할게: ${nextQuestion.question}`
              : session.completion.status === "submission_ready"
                ? "답변을 반영해서 제출 준비 기준을 통과한 초안을 준비했어."
                : "답변을 반영해서 가초안을 갱신했어.",
          },
        ]);
      });
      return;
    }

    resetWorkflow();
    setDraftState("idle");

    playTone(settings.sound, "send");
    const nextMessages: Message[] = [
      ...messages,
      {
        id: crypto.randomUUID(),
        sender: "user",
        time: nowTime(),
        text: trimmed,
        attachments: attachmentsToSubmit.length > 0 ? attachmentsToSubmit.map(toMessageAttachment) : undefined,
      },
    ];
    const submittedAttachmentIds = new Set(attachmentsToSubmit.map((file) => file.id));
    const nextAttachedFiles =
      attachmentsToSubmit.length > 0
        ? attachedFiles.filter((file) => !submittedAttachmentIds.has(file.id))
        : attachedFiles;
    const nextSourceFiles = [...submittedFiles, ...attachmentsToSubmit, ...nextAttachedFiles];
    const shouldAutoStartDocumentWorkflow =
      hasDraftWorkflowIntent(trimmed) &&
      buildResumeTextParts(nextMessages, "", nextSourceFiles).join("\n\n").trim().length >= 10;
    const detectedConditionText = splitConditionCandidates(
      buildConversationRequirementSourceText(nextMessages)
    ).slice(-3).join(" / ");
    setMessages(nextMessages);
    setSubmittedUserText((prev) => [prev, trimmed].filter((text) => text.trim().length > 0).join("\n\n"));
    if (attachmentsToSubmit.length > 0) {
      setSubmittedFiles((prev) => [...prev, ...attachmentsToSubmit]);
      setAttachedFiles(nextAttachedFiles);
      setSentAttachmentSignature("");
    } else if (sendableAttachmentSignature) {
      setSentAttachmentSignature(sendableAttachmentSignature);
    }
    if (shouldAutoStartDocumentWorkflow) {
      setAutoStartDocumentRequestId((value) => value + 1);
    }
    setInput("");
    window.requestAnimationFrame(syncComposerHeight);

    sendReplyTimeoutRef.current = window.setTimeout(() => {
      sendReplyTimeoutRef.current = null;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          time: nowTime(),
          text: shouldAutoStartDocumentWorkflow
            ? "첨부 자료와 요청 내용을 읽고 근거 분석을 시작할게."
            : buildSendAssistantHint(detectedConditionText),
        },
      ]);
      setDraftState("ready");
      playTone(settings.sound, "ready");
    }, 520);
  };

  const handleStartPlan = async () => {
    if (startAnalysisDisabled || draftState === "planning" || draftState === "drafting") {
      return;
    }

    const requestId = workflowRequestIdRef.current;
    setWorkflowPlan(null);
    setWorkflowDraft(null);
    setCareerSession(null);
    setWorkflowError(null);
    setWorkflowStatus("loading");
    setDraftState("planning");
    setOutlineConfirmed(false);
    setGapAnswerDrafts({});
    setConfirmedGapQuestionIds(new Set());
    setDraftFitProgress(0);
    draftFitProgressRef.current = 0;
    playTone(settings.sound, "open");

    const target = buildDraftTarget();
    const experienceInput = buildExperienceInput();

    try {
      const accessToken = await getRequiredAccessToken();
      const workflowSources = buildCareerWorkflowSources();
      void createCareerWorkflowSession(
        {
          target: {
            company: target.company,
            role: target.role,
            questionText: target.questionText,
            jobPostingText: target.jobPostingText,
            charLimit: target.charLimit
          },
          sources: workflowSources
        },
        accessToken
      )
        .then((session) => {
          if (requestId === workflowRequestIdRef.current) {
            setCareerSession(session);
          }
        })
        .catch(() => {
          if (requestId === workflowRequestIdRef.current) {
            setCareerSession(null);
          }
        });

      const plan = await createDraftWorkflowPlan(
        {
          aiSelection,
          target,
          experienceInput
        },
        accessToken
      );
      if (requestId !== workflowRequestIdRef.current) {
        return;
      }

      setWorkflowPlan(plan);
      setWorkflowStatus("complete");
      setDraftState("plan_ready");
      playTone(settings.sound, "success");
    } catch {
      if (requestId !== workflowRequestIdRef.current) {
        return;
      }
      setWorkflowPlan(null);
      setWorkflowStatus("error");
      setWorkflowError("문항 분석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setDraftState("ready");
      playTone(settings.sound, "ready");
    }
  };

  const handleStartDocumentSession = async () => {
    if (startAnalysisDisabled || draftState === "planning" || draftState === "drafting") {
      return;
    }

    const requestId = workflowRequestIdRef.current;
    setWorkflowPlan(null);
    setWorkflowDraft(null);
    setCareerSession(null);
    setDocumentSession(null);
    setWorkflowError(null);
    setWorkflowStatus("loading");
    setDraftState("planning");
    setOutlineConfirmed(false);
    setGapAnswerDrafts({});
    setConfirmedGapQuestionIds(new Set());
    setDraftFitProgress(0);
    draftFitProgressRef.current = 0;
    playTone(settings.sound, "open");

    try {
      const session = await createCareerDocumentWorkflowSession(
        buildDocumentWorkflowRequest(),
        await getRequiredAccessToken()
      );
      if (requestId !== workflowRequestIdRef.current) {
        return;
      }

      setDocumentSession(session);
      setWorkflowStatus("complete");
      setDraftState(session.state === "DRAFT_READY" ? "complete" : "plan_ready");
      playTone(settings.sound, "success");
    } catch {
      if (requestId !== workflowRequestIdRef.current) {
        return;
      }
      setDocumentSession(null);
      setWorkflowStatus("error");
      setWorkflowError("자료 분석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setDraftState("ready");
      playTone(settings.sound, "ready");
    }
  };

  useEffect(() => {
    if (
      autoStartPlanRequestId <= 0 ||
      draftState !== "ready" ||
      startAnalysisDisabled ||
      workflowStatus === "loading" ||
      workflowPlan
    ) {
      return;
    }

    setAutoStartPlanRequestId(0);
    void handleStartPlan();
  }, [autoStartPlanRequestId, draftState, startAnalysisDisabled, workflowPlan, workflowStatus]);

  useEffect(() => {
    if (
      autoStartDocumentRequestId <= 0 ||
      draftState !== "ready" ||
      startAnalysisDisabled ||
      workflowStatus === "loading" ||
      documentSession
    ) {
      return;
    }

    setAutoStartDocumentRequestId(0);
    void handleStartDocumentSession();
  }, [autoStartDocumentRequestId, documentSession, draftState, startAnalysisDisabled, workflowStatus]);

  const handleGenerateDraft = async () => {
    if (!workflowPlan || !canConfirmDraft) {
      return;
    }

    const requestId = workflowRequestIdRef.current;
    const target = buildDraftTarget();
    const experienceInput = buildExperienceInput();
    const nextGapAnswers = buildGapAnswersFromDrafts(neededGapQuestions, gapAnswerDrafts);

    setWorkflowDraft(null);
    setWorkflowError(null);
    setWorkflowStatus("loading");
    setDraftState("drafting");
    setOutlineConfirmed(true);
    setDraftFitProgress(0);
    draftFitProgressRef.current = 0;
    playTone(settings.sound, "open");

    try {
      const draft = await createDraftWorkflowDraft(
        {
          aiSelection,
          target,
          experienceInput,
          plan: workflowPlan,
          gapAnswers: nextGapAnswers,
          confirmedOutline: workflowPlan.outline
        },
        await getRequiredAccessToken()
      );
      if (requestId !== workflowRequestIdRef.current) {
        return;
      }

      setWorkflowDraft(draft);
      setWorkflowStatus("complete");
      setDraftState("complete");
      playTone(settings.sound, "success");
    } catch {
      if (requestId !== workflowRequestIdRef.current) {
        return;
      }
      setWorkflowDraft(null);
      setWorkflowStatus("error");
      setWorkflowError("초안 생성 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setDraftState("plan_ready");
      playTone(settings.sound, "ready");
    }
  };

  const handleReviseDraft = async () => {
    if (!workflowPlan || !workflowDraft || revisionRequest.trim().length < 3 || draftState === "revising") {
      return;
    }

    const requestId = workflowRequestIdRef.current;
    const target = buildDraftTarget();
    setWorkflowError(null);
    setWorkflowStatus("loading");
    setDraftState("revising");
    playTone(settings.sound, "open");

    try {
      const revised = await reviseDraftWorkflowDraft(
        {
          aiSelection,
          target,
          plan: workflowPlan,
          draft: workflowDraft,
          revisionRequest: revisionRequest.trim()
        },
        await getRequiredAccessToken()
      );
      if (requestId !== workflowRequestIdRef.current) {
        return;
      }

      setWorkflowDraft(revised);
      setWorkflowStatus("complete");
      setDraftState("complete");
      setRevisionRequest("");
      playTone(settings.sound, "success");
    } catch {
      if (requestId !== workflowRequestIdRef.current) {
        return;
      }
      setWorkflowStatus("error");
      setWorkflowError("초안 수정 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setDraftState("complete");
      playTone(settings.sound, "ready");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(resultBody);
    setCopied(true);
    playTone(settings.sound, "success");
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleDownloadDraft = (format: DraftDownloadFormat) => {
    setDownloadMenuOpen(false);

    if (!resultBody.trim()) {
      return;
    }

    if (format === "pdf") {
      const printableHtml = buildPrintableDraftHtml(resultBody);
      const printWindow = window.open("", "_blank", "width=760,height=920");

      if (!printWindow) {
        downloadBlob(printableHtml, "text/html;charset=utf-8", "html");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(printableHtml);
      printWindow.document.close();
      printWindow.focus();
      window.setTimeout(() => printWindow.print(), 200);
      playTone(settings.sound, "success");
      return;
    }

    if (format === "markdown") {
      downloadBlob(buildMarkdownDraft(resultBody), "text/markdown;charset=utf-8", "md");
      playTone(settings.sound, "success");
      return;
    }

    if (format === "doc") {
      downloadBlob(buildWordCompatibleHtml(resultBody), "application/msword;charset=utf-8", "doc");
      playTone(settings.sound, "success");
      return;
    }

    downloadBlob(resultBody, "text/plain;charset=utf-8", "txt");
    playTone(settings.sound, "success");
  };

  const handleSaveDocumentPackage = async (documentPackage: CareerDocumentPackage) => {
    setDocumentSaveStatus({
      status: "saving",
      message: `${documentPackage.documentType === "resume" ? "이력서" : "자기소개서"}를 문서함에 저장 중입니다.`,
      packageType: documentPackage.documentType
    });

    try {
      const savedDocument = await createDocument({
        title: documentPackage.title,
        documentType: documentPackage.documentType,
        profileId: documentPackage.profileId ?? null,
        jobId: documentPackage.jobId ?? null,
        content: documentPackage.content,
        contentJson: documentPackage.contentJson
      });

      setDocumentSaveStatus({
        status: "success",
        message: `${savedDocument.title} 문서함 저장 완료`,
        packageType: documentPackage.documentType
      });
      playTone(settings.sound, "success");
    } catch (error) {
      setDocumentSaveStatus({
        status: "error",
        message: error instanceof Error ? error.message : "문서함 저장에 실패했습니다.",
        packageType: documentPackage.documentType
      });
      playTone(settings.sound, "ready");
    }
  };

  const handleNewChat = () => {
    clearSendReplyTimeout();
    revokeAttachmentPreviewUrls([...attachedFiles, ...submittedFiles]);
    setMessages(initialMessages);
    setSubmittedUserText("");
    setExpandedUserMessageIds(new Set());
    setInput("");
    setAttachedFiles([]);
    setSubmittedFiles([]);
    setSelectedProfileContexts([]);
    setComposerContextChipOrder([]);
    setSentAttachmentSignature("");
    setAiSelection({ ...DEFAULT_AI_SELECTION });
    setModelMenuOpen(false);
    setDraftState("idle");
    setDownloadMenuOpen(false);
    setSelectedSelfIntroFormatId(DEFAULT_SELF_INTRO_FORMAT.id);
    setTargetForm({
      questionText: DEFAULT_QUESTION_TEXT,
      charLimit: DEFAULT_SELF_INTRO_FORMAT.charLimit,
      jobPostingText: selectedApiJob ? buildDefaultJobPostingText(selectedApiJob) : ""
    });
    resetWorkflow();
    setNewChatConfirmOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    window.requestAnimationFrame(syncComposerHeight);
    playTone(settings.sound, "open");
  };

  const handleComposerChange = (value: string) => {
    emptyComposerBackspaceCountRef.current = 0;

    if (value === "/") {
      setInput("");
      setComposerMenuOpen(true);
      setToneMenuOpen(false);
      setProfileMenuOpen(false);
      setModelMenuOpen(false);
      setDownloadMenuOpen(false);
      window.requestAnimationFrame(syncComposerHeight);
      return;
    }

    setInput(value);
    window.requestAnimationFrame(syncComposerHeight);
  };

  const handleComposerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      emptyComposerBackspaceCountRef.current = 0;
      handleSend();
      return;
    }

    if (event.key !== "Backspace") {
      emptyComposerBackspaceCountRef.current = 0;
      return;
    }

    if (input.length > 0 || !hasComposerContextChips) {
      emptyComposerBackspaceCountRef.current = 0;
      return;
    }

    event.preventDefault();
    emptyComposerBackspaceCountRef.current += 1;

    if (emptyComposerBackspaceCountRef.current >= 2) {
      removeLastComposerContextChip();
    }
  };

  const handleComposerBarClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest(
        "button, input, textarea, .aiDraftComposerPopover, .aiDraftComposerToneSubmenu"
      )
    ) {
      return;
    }

    composerInputRef.current?.focus();
  };

  const toggleUserMessageExpansion = (messageId: string) => {
    setExpandedUserMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  return (
    <main className="homePage aiDraftChatPage">
      <HomeTopNav active="analysis" />

      <section className="aiDraftShell" aria-label="AI 자기소개서 채팅 빌더">
        <div className="aiDraftWorkspace">
          <section className="aiDraftChatPanel" aria-label="AI 커리어 문서 코치">
            <header className="aiDraftChatHeader">
              <div>
                <div className="aiDraftTitleRow">
                  <h1>AI 커리어 문서 코치</h1>
                  <span>{selectedProviderLabel}</span>
                  <strong className={`aiDraftProviderStatusBadge ${headerAiStatus.status}`}>
                    {headerAiStatus.label}
                  </strong>
                  <strong className="aiDraftProviderStatusBadge checking">
                    실제 생성 provider: {actualProviderSummary}
                  </strong>
                </div>
                <p>자료를 읽고, 부족한 근거만 질문해서 문서를 채웁니다.</p>
              </div>

              <div className="aiDraftHeaderActions">
                <button type="button" className="aiDraftGhostButton">
                  <Icon name="history" />
                  대화 히스토리
                </button>
                <button type="button" className="aiDraftGhostButton" onClick={() => setNewChatConfirmOpen(true)}>
                  <Icon name="plus" />새 대화
                </button>
              </div>
            </header>

            <div className={`aiDraftTimeline ${isDraftProgressActive ? "hasActiveProgress" : ""}`} ref={timelineRef}>
              {messages.map((message) => {
                const expandable = isExpandableUserMessage(message);
                const expanded = expandedUserMessageIds.has(message.id);
                const sentAttachments = message.attachments ?? [];
                const hasSentAttachments = sentAttachments.length > 0;
                const bubbleClassName = [
                  "aiDraftBubble",
                  hasSentAttachments ? "withSentAttachments" : "",
                  expandable ? "expandable" : "",
                  expandable && !expanded ? "collapsed" : "",
                  expandable && expanded ? "expanded" : ""
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <article
                    className={`aiDraftMessage ${message.sender}`}
                    key={message.id}
                    aria-label={message.sender === "ai" ? "AI 답변" : "내 메시지"}
                  >
                    {message.sender === "user" ? (
                      <div className={`aiDraftUserMessageStack ${hasSentAttachments ? "hasSentAttachments" : ""}`}>
                        {hasSentAttachments && (
                          <div className="aiDraftSentAttachments" aria-label="보낸 첨부 파일">
                            {sentAttachments.map((attachment) => (
                              <div
                                className={`aiDraftSentAttachmentCard type-${attachment.tone} ${attachment.readError ? "error" : ""} ${attachment.kind === "binary" ? "binary" : ""}`}
                                key={attachment.id}
                              >
                                <span className={`aiDraftSentAttachmentIcon ${attachment.tone}`} aria-hidden="true">
                                  <FileText size={18} strokeWidth={2.2} />
                                </span>
                                <span className="aiDraftSentAttachmentBody">
                                  <span className="aiDraftSentAttachmentName">{attachment.name}</span>
                                  <span className="aiDraftSentAttachmentMeta">{getSentAttachmentStatusLabel(attachment)}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {message.text && (
                          <div className={bubbleClassName}>
                            <div className="aiDraftBubbleContent">
                              <p>{message.text}</p>
                            </div>
                            {expandable && (
                              <button
                                type="button"
                                className="aiDraftBubbleMoreButton"
                                aria-expanded={expanded}
                                onClick={() => toggleUserMessageExpansion(message.id)}
                              >
                                {expanded ? "접기" : "더 보기"}
                                {expanded ? <ChevronUp size={15} strokeWidth={2.4} /> : <ChevronDown size={15} strokeWidth={2.4} />}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aiDraftAssistantResponse">
                        <p>{message.text}</p>
                        <time>{message.time}</time>
                      </div>
                    )}
                  </article>
                );
              })}

              {(draftState === "ready" || draftState === "complete") && !workflowPlan && !documentSession && (
                <div className="aiDraftReadyRow">
                  <span>대화 완료</span>
                  <button type="button" onClick={handleStartPlan} disabled={startAnalysisDisabled}>
                    <Icon name="spark" />
                    문항 분석 시작
                  </button>
                </div>
              )}

              {startAnalysisDisabled && (draftState === "ready" || draftState === "complete") && !workflowPlan && !documentSession && (
                <p className="aiDraftInputHint">자기소개 내용을 10자 이상 입력해야 분석할 수 있습니다.</p>
              )}

              {workflowStatus === "error" && workflowError && (
                <p className="aiDraftErrorNote" role="alert">{workflowError}</p>
              )}

              {documentSession && (
                <section className="aiDraftResultCard aiDraftDocumentSession aiDraftDocumentFocus" aria-label="자기소개서 작성 진행">
                  {documentFileViewerItems.length > 0 && (
                    <div className="aiDraftFileViewerStrip" aria-label="첨부 파일 열기">
                      {documentFileViewerItems.map((item) => {
                        const sourceFile = item.sourceFile;
                        const attachmentVisual = sourceFile ? getAttachmentVisual(sourceFile) : null;
                        const fileSizeLabel = sourceFile ? formatFileSize(sourceFile.size) : "";

                        return (
                          <div className="aiDraftFileViewerItem" key={item.id}>
                            <span className={`aiDraftSentAttachmentIcon ${attachmentVisual?.tone ?? "file"}`} aria-hidden="true">
                              <FileText size={18} strokeWidth={2.2} />
                              {attachmentVisual?.badge && (
                                <span className="aiDraftAttachedFileIconBadge">{attachmentVisual.badge}</span>
                              )}
                            </span>
                            <div>
                              <strong>{item.fileName}</strong>
                              <span>
                                {item.detail}
                                {fileSizeLabel ? ` · ${fileSizeLabel}` : ""}
                              </span>
                            </div>
                            <button
                              type="button"
                              className={`aiDraftFileViewerOpen ${activeDocumentPreviewItem?.id === item.id ? "active" : ""}`}
                              onClick={() => setActiveDocumentPreviewFileId(item.id)}
                            >
                              보기
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeDocumentPreviewItem && (
                    <div className="aiDraftEmbeddedFilePanel" aria-label="첨부 원본 미리보기">
                      <div className="aiDraftEmbeddedFileHeader">
                        <div>
                          <strong>{activeDocumentPreviewItem.fileName}</strong>
                          <span>{activeDocumentPreviewItem.detail}</span>
                        </div>
                        {activeDocumentPreviewFile?.previewUrl && (
                          <a href={activeDocumentPreviewFile.previewUrl} target="_blank" rel="noreferrer">
                            새 창
                          </a>
                        )}
                      </div>

                      {activeDocumentPreviewFile?.previewUrl && isPdfPreviewFile(activeDocumentPreviewFile) ? (
                        <iframe
                          className="aiDraftEmbeddedFileFrame pdf"
                          src={activeDocumentPreviewFile.previewUrl}
                          title={`${activeDocumentPreviewItem.fileName} PDF 미리보기`}
                        />
                      ) : activeDocumentPreviewFile?.previewHtml && isDocxPreviewFile(activeDocumentPreviewFile) ? (
                        <iframe
                          className="aiDraftEmbeddedFileFrame docx"
                          srcDoc={buildDocxPreviewSrcDoc(activeDocumentPreviewFile.name, activeDocumentPreviewFile.previewHtml)}
                          sandbox=""
                          referrerPolicy="no-referrer"
                          title={`${activeDocumentPreviewItem.fileName} DOCX 미리보기`}
                        />
                      ) : activeDocumentPreviewFile?.textContent ? (
                        <pre className="aiDraftEmbeddedTextPreview">{activeDocumentPreviewFile.textContent}</pre>
                      ) : activeDocumentPreviewFile?.loading ? (
                        <p className="aiDraftEmbeddedFileFallback">문서 미리보기를 불러오는 중</p>
                      ) : (
                        <p className="aiDraftEmbeddedFileFallback">이 파일은 앱 안 미리보기를 만들 수 없습니다.</p>
                      )}
                    </div>
                  )}

                  {activeDocumentQuestion ? (
                    <div className="aiDraftNextQuestionCard" aria-live="polite">
                      <span>다음 질문</span>
                      <strong>{activeDocumentQuestion.question}</strong>
                    </div>
                  ) : hasDocumentDraft ? (
                    <div className="aiDraftNextQuestionCard complete" aria-live="polite">
                      <span>{documentDraftTitle}</span>
                      <strong>
                        {documentSession?.completion.status === "submission_ready" ? "완성본 준비 완료" : "가초안 준비 완료"}
                      </strong>
                    </div>
                  ) : (
                    <div className="aiDraftNextQuestionCard pending" aria-live="polite">
                      <span>다음 질문</span>
                      <strong>다음 질문 준비 중</strong>
                    </div>
                  )}
                </section>
              )}

              {workflowPlan && (draftState === "plan_ready" || draftState === "drafting" || draftState === "complete") && (
                <section className="aiDraftResultCard" aria-label="경험 카드 및 개요">
                  <div className="aiDraftResultHeader">
                    <div>
                      <h2>문항 분석 및 경험 매칭</h2>
                      {workflowPlan.aiMeta && (
                        <span className={`aiDraftModeBadge ${workflowPlan.aiMeta.usedFallback ? "fallback" : "ai"}`}>
                          {formatAiExecutionLabel(workflowPlan.aiMeta)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="aiDraftInputHint">{workflowPlan.questionRubric.intent}</p>
                  <ul className="aiDraftGuideList" aria-label="경험 카드">
                    {workflowPlan.experienceCards.map((card) => (
                      <li key={card.experienceId}>
                        <strong>{card.title}</strong>
                        {card.claimLedger.length > 0 && (
                          <span>
                            {" "}
                            · 작성 근거 {card.claimLedger.filter((claim) => claim.allowedInDraft).length}/
                            {card.claimLedger.length}
                          </span>
                        )}
                        {card.missingSlots.length > 0 ? ` · 추가 확인 ${card.missingSlots.join(", ")}` : ""}
                        {card.blindRiskFlags.length > 0 ? ` · 블라인드 리스크 ${card.blindRiskFlags.join(", ")}` : ""}
                      </li>
                    ))}
                  </ul>
                  {activeGapQuestion && (
                    <div className="aiDraftGapPanel" aria-label="보완 질문">
                      <fieldset className="aiDraftGapFieldset" key={activeGapQuestion.questionId}>
                        <legend>{activeGapQuestion.question}</legend>
                        {activeGapQuestion.choices && activeGapQuestion.choices.length > 0 && (
                          <div className="aiDraftGapChoices" role="group" aria-label={`${activeGapQuestion.question} 선택지`}>
                            {activeGapQuestion.choices.map((choice) => (
                              <button
                                type="button"
                                key={choice}
                                className="aiDraftGapChoiceButton"
                                onClick={() => applyGapChoice(activeGapQuestion.questionId, choice)}
                              >
                                {choice}
                              </button>
                            ))}
                          </div>
                        )}
                        <textarea
                          className="aiDraftGapTextarea"
                          value={activeGapAnswerDraft}
                          placeholder="직접 입력"
                          rows={2}
                          onChange={(event) => updateGapAnswerDraft(activeGapQuestion.questionId, event.target.value)}
                        />
                        <div className="aiDraftGapActions">
                          <button
                            type="button"
                            className="aiDraftGapConfirmButton"
                            disabled={activeGapAnswerDraft.trim().length === 0}
                            onClick={() => confirmGapAnswer(activeGapQuestion.questionId)}
                          >
                            답변 저장
                          </button>
                        </div>
                      </fieldset>
                      {pendingGapQuestions.length > 0 && (
                        <p className="aiDraftInputHint">
                          보완 질문 {answeredGapQuestionCount + 1}/{neededGapQuestions.length}
                        </p>
                      )}
                    </div>
                  )}
                  <ul className="aiDraftGuideList" aria-label="개요">
                    {workflowPlan.outline.map((paragraph) => (
                      <li key={paragraph.paragraphId}>
                        {paragraph.purpose}
                        {paragraph.targetChars ? ` (${paragraph.targetChars}자)` : ""}
                      </li>
                    ))}
                  </ul>
                  {(draftState === "plan_ready" || draftState === "complete") && (
                    <div className="aiDraftReadyRow">
                      <span>{outlineConfirmed && draftState === "complete" ? "초안 생성 완료" : "개요 확인 후 초안 생성"}</span>
                      <button type="button" onClick={handleGenerateDraft} disabled={!canConfirmDraft}>
                        <Icon name="spark" />
                        개요 확인 및 초안 생성
                      </button>
                    </div>
                  )}
                </section>
              )}

              {(draftState === "planning" || draftState === "drafting" || draftState === "revising" || draftState === "complete") && (
                <section
                  className={`aiDraftProgressCard ${isDraftProgressActive ? "isLoading" : "isComplete"}`}
                  aria-label="AI 초안 생성 진행"
                  ref={progressCardRef}
                >
                  <div
                    className={`aiDraftFitMeter ${draftState}`}
                    role="meter"
                    aria-label="초안 적합도"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={draftFitProgress}
                    style={{ "--score": `${draftFitProgress}%` } as CSSProperties}
                  >
                    <strong>
                      {draftFitProgress}
                      <small>%</small>
                    </strong>
                    <span>적합도</span>
                  </div>
                  <div>
                    <h2>{draftProgressTitle}</h2>
                    <div className="aiDraftProgressSteps">
                      {draftProgressSteps.map((step, index) => {
                        const isComplete = index < completedProgressStepCount;
                        const isActive = index === activeProgressStepIndex;

                        return (
                          <div
                            className={`aiDraftProgressStep ${isComplete ? "complete" : ""} ${isActive ? "active" : ""}`}
                            aria-current={isActive ? "step" : undefined}
                            key={step.label}
                          >
                            <span />
                            <strong>{step.label}</strong>
                            <small>{step.helper}</small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {(draftState === "planning" || draftState === "drafting" || draftState === "revising") && (
                    <div className="aiDraftMotionGraph" aria-hidden="true">
                      <span className="aiDraftMotionTrack" />
                      <span className="aiDraftMotionNode nodeOne" />
                      <span className="aiDraftMotionNode nodeTwo" />
                      <span className="aiDraftMotionNode nodeThree" />
                      <span className="aiDraftMotionPulse" />
                    </div>
                  )}
                </section>
              )}

              {shouldShowResultDraft && (
                <section className="aiDraftResultCard">
                  <div className="aiDraftResultHeader">
                    <div>
                      <h2>{workflowDraft ? "AI 초안 결과" : documentDraftTitle}</h2>
                      <span>{workflowDraft ? "초안 v1" : documentDraftSubtitle}</span>
                      {activeAiMeta && (
                        <span className={`aiDraftModeBadge ${activeAiMeta.usedFallback ? "fallback" : "ai"}`}>
                          {formatAiExecutionLabel(activeAiMeta)}
                        </span>
                      )}
                    </div>
                    <strong>{workflowDraft ? "완료" : documentDraftStatusLabel}</strong>
                  </div>
                  <div className="aiDraftUtilityBar" aria-label="초안 편집 도구">
                    <div className="aiDraftCharCount">
                      <span>공백 포함 <strong>{withSpaces}</strong></span>
                      <span>공백 제외 <strong>{withoutSpaces}</strong></span>
                    </div>
                    <div className="aiDraftFormatSwitch" role="group" aria-label="텍스트 포맷">
                      {(["TXT", "Markdown"] as TextFormat[]).map((format) => (
                        <button
                          type="button"
                          className={textFormat === format ? "active" : ""}
                          key={format}
                          onClick={() => {
                            setTextFormat(format);
                            playTone(settings.sound, "open");
                          }}
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                    <div className="aiDraftFontControl" aria-label="에디터 글자 크기">
                      <button type="button" onClick={() => setEditorFontSize((value) => Math.max(13, value - 1))}>A-</button>
                      <span>{editorFontSize}px</span>
                      <button type="button" onClick={() => setEditorFontSize((value) => Math.min(18, value + 1))}>A+</button>
                    </div>
                  </div>
                  <p className="aiDraftResultText" style={{ "--draft-editor-font": `${editorFontSize}px` } as CSSProperties}>{displayDraft}</p>
                  {workflowDraft && resultInsightSections.length > 0 && (
                    <div className="aiDraftResultInsights" aria-label="초안 검토 요약">
                      {resultInsightSections.map((section) => (
                        <div
                          key={section.id}
                          className={`aiDraftResultInsightSection ${section.tone === "warning" ? "warning" : ""}`}
                        >
                          <div className="aiDraftResultInsightHeader">
                            <h3>{section.title}</h3>
                            <span>{section.items.length}개</span>
                          </div>
                          <p>{section.helper}</p>
                          <ul>
                            {section.items.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                  {documentSession && !workflowDraft && (
                    <div className="aiDraftResultInsights" aria-label="문서 초안 제출 준비도">
                      <div className={`aiDraftResultInsightSection ${hasProvisionalDocumentDraft ? "warning" : ""}`}>
                        <div className="aiDraftResultInsightHeader">
                          <h3>제출 준비도</h3>
                          <span>{documentSession.completion.score}%</span>
                        </div>
                        <p>{documentSession.completion.summary}</p>
                        <ul>
                          {documentSession.completion.gates.map((gate) => (
                            <li key={gate.id}>
                              {gate.passed ? "통과" : "보완"} · {gate.label}: {gate.detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  {documentSaveStatus.message && (
                    <p
                      className={`aiDraftInputHint ${documentSaveStatus.status === "error" ? "error" : ""}`}
                      role={documentSaveStatus.status === "error" ? "alert" : "status"}
                    >
                      {documentSaveStatus.message}
                    </p>
                  )}
                  {workflowDraft && (
                    <div className="aiDraftRevisePanel" aria-label="초안 수정">
                      <label htmlFor="aiDraftRevisionRequest">수정 요청</label>
                      <textarea
                        id="aiDraftRevisionRequest"
                        className="aiDraftGapTextarea"
                        value={revisionRequest}
                        rows={3}
                        placeholder="예: 첫 문단을 더 간결하게, 성과 수치를 강조해 주세요."
                        onChange={(event) => setRevisionRequest(event.target.value)}
                      />
                      <button
                        type="button"
                        className="aiDraftGapChoiceButton"
                        disabled={revisionRequest.trim().length < 3}
                        onClick={handleReviseDraft}
                      >
                        수정 적용
                      </button>
                    </div>
                  )}
                  <div className="aiDraftResultToolbar">
                    <button
                      type="button"
                      className={copied ? "success" : ""}
                      onClick={handleCopy}
                      aria-label="초안 복사"
                      title="초안 복사"
                      data-tooltip="초안 복사"
                    >
                      <Icon name="copy" />
                      {copied ? "복사 완료" : "복사"}
                    </button>
                    <div className="aiDraftDownloadMenuWrap">
                      <button
                        type="button"
                        className="aiDraftDownloadButton"
                        aria-label="다운로드"
                        aria-expanded={downloadMenuOpen}
                        aria-haspopup="menu"
                        title="다운로드"
                        data-tooltip="다운로드"
                        onClick={() => {
                          setComposerMenuOpen(false);
                          setToneMenuOpen(false);
                          setProfileMenuOpen(false);
                          setModelMenuOpen(false);
                          setDownloadMenuOpen((value) => !value);
                          playTone(settings.sound, "open");
                        }}
                      >
                        <Icon name="download" />
                        다운로드
                        <ChevronDown aria-hidden="true" size={14} strokeWidth={2.4} />
                      </button>
                      {downloadMenuOpen && (
                        <div className="aiDraftDownloadMenu" role="menu" aria-label="다운로드 형식 선택">
                          {DRAFT_DOWNLOAD_OPTIONS.map((option) => (
                            <button
                              type="button"
                              role="menuitem"
                              key={option.format}
                              aria-label={option.ariaLabel}
                              onClick={() => handleDownloadDraft(option.format)}
                            >
                              <span>{option.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {workflowDraft && (
                      <>
                        <button
                          type="button"
                          aria-label="편집기로 열기"
                          title="편집기로 열기"
                          data-tooltip="편집기로 열기"
                        >
                          <Icon name="edit" />
                          편집기로 열기
                        </button>
                        <button
                          type="button"
                          aria-label="다음 질문 이어가기"
                          title="다음 질문 이어가기"
                          data-tooltip="다음 질문 이어가기"
                        >
                          <Icon name="followUp" />
                          다음 질문 이어가기
                        </button>
                      </>
                    )}
                    {documentSession?.documentPackages.map((documentPackage) => (
                      <button
                        type="button"
                        key={`${documentPackage.documentType}-${documentPackage.title}`}
                        disabled={documentSaveStatus.status === "saving"}
                        onClick={() => {
                          void handleSaveDocumentPackage(documentPackage);
                        }}
                        aria-label={`${documentPackage.documentType === "resume" ? "이력서" : "자기소개서"} 문서함에 저장`}
                        title={`${documentPackage.documentType === "resume" ? "이력서" : "자기소개서"} 문서함에 저장`}
                        data-tooltip={`${documentPackage.documentType === "resume" ? "이력서" : "자기소개서"} 문서함에 저장`}
                      >
                        <Icon name="edit" />
                        {documentPackage.documentType === "resume" ? "이력서 저장" : "자소서 저장"}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <footer className="aiDraftComposer">
              <div className="aiDraftComposerDock">
                <div
                  className={`aiDraftComposerBar ${hasComposerContextChips ? "withAttachments" : ""} ${composerFileDragActive ? "isDraggingFile" : ""}`}
                  ref={composerBarRef}
                  onClick={handleComposerBarClick}
                  onDragEnter={handleComposerDragEnter}
                  onDragOver={handleComposerDragOver}
                  onDragLeave={handleComposerDragLeave}
                  onDrop={handleComposerDrop}
                  onPaste={handleComposerPaste}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="aiDraftHiddenFileInput"
                    accept={FILE_ACCEPT}
                    multiple
                    onChange={handleFileInputChange}
                  />

                  {hasComposerContextChips && (
                    <div className="aiDraftAttachedFiles" aria-label="첨부 파일">
                      {orderedComposerContextChips.map((chip) => {
                        if (chip.kind === "profile") {
                          const { profile } = chip;

                        return (
                          <span
                            key={chip.key}
                            className="aiDraftAttachedFileChip type-profile"
                            title={profile.title}
                          >
                            <span className="aiDraftAttachedFileIcon profile" aria-hidden="true">
                              <FileText size={18} />
                            </span>
                            <span className="aiDraftAttachedFileChipBody">
                              <span className="aiDraftAttachedFileName">{profile.title}</span>
                              <span className="aiDraftAttachedFileType">프로필 근거</span>
                            </span>
                            <button
                              type="button"
                              className="aiDraftAttachedFileChipRemove"
                              aria-label={`${profile.title} 제거`}
                              onClick={() => removeProfileContext(profile.profileId)}
                            >
                              <X size={13} strokeWidth={3} />
                            </button>
                          </span>
                        );
                        }

                        const { file } = chip;
                        const attachmentVisual = getAttachmentVisual(file);

                        return (
                          <span
                            className={`aiDraftAttachedFileChip type-${attachmentVisual.tone} ${file.readError ? "error" : ""} ${file.kind === "binary" ? "binary" : ""} ${file.loading ? "loading" : ""}`}
                            key={chip.key}
                          >
                            <span className={`aiDraftAttachedFileIcon ${attachmentVisual.tone}`} aria-hidden="true">
                              <FileText size={18} strokeWidth={2.2} />
                              {attachmentVisual.badge && (
                                <span className="aiDraftAttachedFileIconBadge">{attachmentVisual.badge}</span>
                              )}
                            </span>
                            <span className="aiDraftAttachedFileChipBody">
                              <span className="aiDraftAttachedFileName">
                                {file.name}
                                {getAttachmentChipSuffix(file)}
                              </span>
                              <span className="aiDraftAttachedFileType">{attachmentVisual.typeLabel}</span>
                            </span>
                            <button
                              type="button"
                              className="aiDraftAttachedFileChipRemove"
                              aria-label={`${file.name} 제거`}
                              onClick={() => removeAttachedFile(file.id)}
                            >
                              <X size={13} strokeWidth={3} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {composerMenuOpen && (
                    <div
                      ref={composerOptionsMenuRef}
                      className="aiDraftComposerPopover aiDraftComposerOptionsMenu aiDraftComposerOptionsMenuCompact"
                      role="dialog"
                      aria-label="작성 옵션"
                      onKeyDown={handleComposerOptionsKeyDown}
                    >
                      <button
                        type="button"
                        className="aiDraftComposerMenuItem"
                        aria-label="사진 및 파일 추가"
                        onClick={openFilePicker}
                      >
                        <Icon name="attach" />
                        <span>사진 및 파일 추가</span>
                      </button>

                      <div className="aiDraftComposerOptionsMenuBody">
                        <button
                          type="button"
                          className="aiDraftComposerSubmenuTrigger"
                          aria-label="프로필 추가"
                          aria-expanded={profileMenuOpen}
                          aria-haspopup="listbox"
                          onClick={toggleProfileMenu}
                        >
                          <span>프로필 추가</span>
                          <span className="aiDraftComposerSubmenuChevron" aria-hidden="true">
                            <Icon name="chevron" />
                          </span>
                        </button>
                      </div>

                      <div className="aiDraftComposerMenuDivider" role="separator" />

                      <div className="aiDraftComposerOptionsMenuBody">
                        <button
                          type="button"
                          className="aiDraftComposerSubmenuTrigger"
                          aria-label="문체 설정"
                          aria-expanded={toneMenuOpen}
                          aria-haspopup="listbox"
                          onClick={toggleToneMenu}
                        >
                          <span>문체 설정</span>
                          <span className="aiDraftComposerSubmenuChevron" aria-hidden="true">
                            <Icon name="chevron" />
                          </span>
                        </button>
                      </div>

                      <div className="aiDraftComposerMenuDivider" role="separator" />

                      <button
                        type="button"
                        className={`aiDraftComposerMenuToggle ${settings.followUp ? "active" : ""}`}
                        role="switch"
                        aria-checked={settings.followUp}
                        aria-label="단답 보완 질문"
                        onClick={handleFollowUpToggle}
                      >
                        <span className="aiDraftComposerMenuToggleLabel">단답 보완 질문</span>
                        <span className="aiDraftComposerMenuSwitch" aria-hidden="true" />
                      </button>

                      {toneMenuOpen && (
                        <div
                          className="aiDraftComposerToneSubmenu aiDraftComposerToneSubmenuAligned"
                          role="listbox"
                          aria-label="문체 설정"
                        >
                          {AI_TONE_OPTIONS.map((tone) => (
                            <button
                              key={tone}
                              type="button"
                              className={`aiDraftComposerToneOption ${settings.tone === tone ? "active" : ""}`}
                              role="option"
                              aria-selected={settings.tone === tone}
                              onClick={() => handleToneSelect(tone)}
                            >
                              <span>{tone}</span>
                              {settings.tone === tone ? <span className="aiDraftComposerToneCheck" aria-hidden="true">✓</span> : null}
                            </button>
                          ))}
                        </div>
                      )}

                      {profileMenuOpen && (
                        <div
                          className="aiDraftComposerProfileSubmenu aiDraftComposerProfileSubmenuAligned"
                          role="listbox"
                          aria-label="프로필 추가"
                        >
                          {profileLoadStatus === "loading" || profileLoadStatus === "idle" ? (
                            <p className="aiDraftComposerMenuNote">프로필을 불러오는 중입니다.</p>
                          ) : profileLoadStatus === "unavailable" ? (
                            <p className="aiDraftComposerMenuNote">로그인하면 프로필을 추가할 수 있습니다.</p>
                          ) : profileOptions.length === 0 ? (
                            <p className="aiDraftComposerMenuNote">저장된 프로필이 없습니다.</p>
                          ) : (
                            profileOptions.map((profile) => {
                              const selected = selectedProfileContexts.some((item) => item.profileId === profile.id);
                              const selectable = Boolean(profile.profileJson) && !selected;

                              return (
                                <button
                                  key={profile.id}
                                  type="button"
                                  className={`aiDraftComposerProfileOption ${selected ? "active" : ""}`}
                                  role="option"
                                  aria-selected={selected}
                                  disabled={!selectable}
                                  onClick={() => handleProfileContextSelect(profile)}
                                >
                                  <span>{profile.title}</span>
                                  <small>{selected ? "추가됨" : profile.profileJson ? "선택" : "본문 없음"}</small>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {modelMenuOpen && (
                    <div
                      className="aiDraftComposerPopover aiDraftComposerModelMenu aiDraftComposerModelMenuCompact"
                      role="menu"
                      aria-label="AI provider 선택"
                    >
                      {providerStatuses.map((provider) => (
                        <button
                          key={provider.providerId}
                          type="button"
                          className={`aiDraftComposerMenuItem ${aiSelection.providerId === provider.providerId ? "active" : ""}`}
                          role="menuitemradio"
                          aria-checked={aiSelection.providerId === provider.providerId}
                          onClick={() => handleProviderSelect(provider.providerId)}
                        >
                          <span>
                            {providerBadgeLabel(provider.providerId)}
                            {provider.online ? " · 온라인" : " · 오프라인"}
                            {provider.quotaExceeded ? " · 할당량 초과" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="aiDraftComposerPlusButton"
                    aria-label="작성 옵션"
                    aria-expanded={composerMenuOpen}
                    aria-haspopup="dialog"
                    title="작성 옵션"
                    data-tooltip="작성 옵션"
                    onClick={toggleComposerMenu}
                  >
                    <Icon name="plus" />
                  </button>

                  <button
                    type="button"
                    className="aiDraftComposerModelButton"
                    aria-label={`AI provider 선택, 현재 ${selectedProviderLabel}`}
                    aria-expanded={modelMenuOpen}
                    aria-haspopup="menu"
                    title={`AI provider: ${selectedProviderLabel}`}
                    data-tooltip={`AI provider: ${selectedProviderLabel}`}
                    onClick={toggleModelMenu}
                  >
                    <span>{selectedProviderLabel}</span>
                    <Icon name="chevron" />
                  </button>

                  <textarea
                    ref={composerInputRef}
                    value={input}
                    onChange={(event) => handleComposerChange(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="메시지를 입력하세요..."
                    rows={1}
                  />

                  <button
                    type="button"
                    className="aiDraftComposerSendButton"
                    onClick={handleSend}
                    disabled={!canSendComposerMessage}
                    aria-label="메시지 보내기"
                    title="메시지 보내기"
                    data-tooltip="메시지 보내기"
                  >
                    <Icon name="arrowUp" />
                  </button>
                </div>
              </div>
              <div className="aiDraftComposerHint">
                <span>Enter 전송</span>
                <span>Shift + Enter 줄바꿈</span>
                <span>공백 포함 {input.length}자</span>
              </div>
            </footer>
          </section>

          <aside className="aiDraftSidePanel" aria-label="취업 준비 활동 패널">
            <section className="aiDraftSideHeader">
              <div>
                <small>현재 활동 중인 취업 준비</small>
                <strong>{settings.tone}</strong>
              </div>
            </section>

            {!documentSession && (
              <section className="aiDraftInfoCard" aria-label="커리어 문서 코치 상태">
                <div className="aiDraftCardTitle">
                  <span>문서 코치</span>
                  <small>{careerSession ? careerDocumentTypeLabel(careerSession.documentType) : "대기 중"}</small>
                </div>
                {careerSession ? (
                  <>
                    <ul className="aiDraftSummary">
                      {careerSessionSummaryItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    {careerSession.nextQuestion && (
                      <div className="aiDraftQuestionMeta">
                        <strong>다음 질문</strong>
                        <p>{careerSession.nextQuestion.question}</p>
                        <span>{careerSession.nextQuestion.whyAsking}</span>
                        <em>{careerSession.nextQuestion.targetSection}에 사용</em>
                      </div>
                    )}
                    <p className="aiDraftFootnote">{careerSession.documentTypeReason}</p>
                  </>
                ) : (
                  <>
                    <ul className="aiDraftSummary">
                      <li>자료에서 채울 수 있는 정보 먼저 추출</li>
                      <li>없는 정보는 질문 1개씩 확인</li>
                      <li>사용자 근거가 있는 내용만 초안에 사용</li>
                    </ul>
                    <p className="aiDraftFootnote">문항 분석을 시작하면 다음 질문이 계산됩니다.</p>
                  </>
                )}
              </section>
            )}

            {providerStatuses.length > 0 && (
              <section className="aiDraftInfoCard" aria-label="AI Provider 상태">
                <div className="aiDraftCardTitle">
                  <span>AI Provider 상태</span>
                </div>
                <div className="aiDraftProviderList">
                  {providerStatuses.map((provider) => {
                    const canStartCodexLogin =
                      provider.providerId === "codex_bridge" &&
                      provider.configured &&
                      !provider.online &&
                      provider.reason === "codex_not_logged_in";
                    const isCodexLoginBusy =
                      codexLoginState.status === "starting" || codexLoginState.status === "pending";

                    return (
                      <div className="aiDraftProviderRow" key={provider.providerId}>
                        <span className={provider.online && !provider.quotaExceeded ? "matched" : ""}>
                          {providerBadgeLabel(provider.providerId)} ·{" "}
                          {provider.quotaExceeded ? "할당량 초과" : provider.online ? "온라인" : "오프라인"}
                        </span>
                        {canStartCodexLogin && (
                          <button
                            type="button"
                            className="aiDraftProviderConnectButton"
                            onClick={() => void handleCodexLoginStart()}
                            disabled={isCodexLoginBusy}
                          >
                            {isCodexLoginBusy ? "연결 중" : "Codex 연결"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {codexLoginState.message && (
                  <p className="aiDraftFootnote">{codexLoginState.message}</p>
                )}
              </section>
            )}

            <section className="aiDraftInfoCard">
              <div className="aiDraftCardTitle">
                <span>{selectedJob ? "선택된 공고" : "선택된 공고 없음"}</span>
                <a className="aiDraftCardAction" href="/jobs">{selectedJob ? "수정" : "공고 선택"}</a>
              </div>
              {selectedJob ? (
                <dl className="aiDraftJobMeta">
                  <div>
                    <dt>기업</dt>
                    <dd>{selectedJob.company}</dd>
                  </div>
                  <div>
                    <dt>직무</dt>
                    <dd>{selectedJob.title}</dd>
                  </div>
                  <div>
                    <dt>공고 링크</dt>
                    <dd>
                      {selectedJob.link ? (
                        <>
                          <a href={selectedJob.link} rel="noopener noreferrer" target="_blank">
                            {selectedJob.link}
                          </a>
                          <Icon name="external" />
                        </>
                      ) : (
                        <span>공고 링크 없음</span>
                      )}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="aiDraftEmptyNote">채용공고에서 공고를 선택하면 여기에 표시됩니다.</p>
              )}
            </section>

            <section className="aiDraftInfoCard" aria-label="자소서 형식">
              <div className="aiDraftCardTitle">
                <span>자소서 형식</span>
                <small>{selectedSelfIntroFormat.label}</small>
              </div>
              <div className="aiDraftFormatChoiceGrid" role="listbox" aria-label="자소서 형식 선택">
                {SELF_INTRO_FORMAT_OPTIONS.map((format) => (
                  <button
                    type="button"
                    key={format.id}
                    className={selectedSelfIntroFormatId === format.id ? "active" : ""}
                    role="option"
                    aria-selected={selectedSelfIntroFormatId === format.id}
                    onClick={() => handleSelfIntroFormatSelect(format)}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
              <p className="aiDraftFootnote">
                {inferredQuestionText} · {inferredCharLimit}자
              </p>
            </section>

            <section className="aiDraftInfoCard" aria-label="자소서 레퍼런스">
              <div className="aiDraftCardTitle">
                <span>자소서 레퍼런스</span>
                <a className="aiDraftCardAction" href="/documents/new?documentType=cover_letter">저장</a>
              </div>
              {referenceLoadStatus === "loading" || referenceLoadStatus === "idle" ? (
                <p className="aiDraftEmptyNote">저장된 자소서를 불러오는 중입니다.</p>
              ) : coverLetterReferences.length > 0 ? (
                <>
                  <div className="aiDraftProviderList">
                    {coverLetterReferences.map((document) => {
                      const selected = selectedReferenceDocumentId === document.id;
                      const meta = [document.company, document.jobTitle].filter(Boolean).join(" · ");

                      return (
                        <div className="aiDraftProviderRow" key={document.id}>
                          <span className={selected ? "matched" : ""} title={meta || document.title}>
                            {document.title}
                          </span>
                          <button
                            type="button"
                            className="aiDraftProviderConnectButton"
                            onClick={() => handleReferenceDocumentSelect(selected ? null : document.id)}
                          >
                            {selected ? "해제" : "선택"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="aiDraftFootnote">
                    {selectedReferenceDocument
                      ? "선택한 자소서는 문체와 구성만 참고합니다. 내용의 사실, 수치, 회사명은 새 초안 근거로 쓰지 않습니다."
                      : "선택하지 않으면 기본 레퍼런스 규칙만 사용합니다."}
                  </p>
                </>
              ) : (
                <p className="aiDraftEmptyNote">
                  {referenceLoadStatus === "unavailable"
                    ? "로그인하면 저장한 자소서를 레퍼런스로 선택할 수 있습니다."
                    : "저장된 자기소개서가 없습니다."}
                </p>
              )}
            </section>

            <section className="aiDraftInfoCard">
              <div className="aiDraftCardTitle">
                <span>직무 핵심 스킬</span>
                <small>{skillPanelModeLabel}</small>
              </div>
              <div className="aiDraftSkillGrid">
                {visibleSkillCandidates.length > 0 ? (
                  visibleSkillCandidates.map((skill) => {
                    const matched = matchedSkills.includes(skill);
                    return (
                      <span className={matched ? "matched" : ""} key={skill}>
                        {matched ? "✓" : "○"} {skill}
                      </span>
                    );
                  })
                ) : (
                  <p className="aiDraftEmptyNote">아직 감지된 스킬 없음</p>
                )}
              </div>
              <p className="aiDraftFootnote">{skillPanelFootnote}</p>
            </section>

            <section className="aiDraftInfoCard ats">
              <div className="aiDraftCardTitle">
                <span>ATS 적합도</span>
                <small>{atsCardMode}</small>
              </div>
              <div className="aiDraftAtsGrid">
                <div className="aiDraftScoreRing" style={{ "--score": `${atsScore ?? 0}%` } as CSSProperties}>
                  <strong>{atsScore ?? "대기"}</strong>
                  <span>{atsScore === null ? "입력 후 계산" : "/100"}</span>
                </div>
                <div className="aiDraftScoreBars">
                  {atsMetrics.length > 0 ? (
                    atsMetrics.map(({ label, value }) => (
                      <div key={label}>
                        <span>{label}</span>
                        <i><b style={{ width: `${value}%` }} /></i>
                        <em>{value}</em>
                      </div>
                    ))
                  ) : (
                    <p className="aiDraftEmptyNote">대화를 시작하면 적합도를 계산합니다.</p>
                  )}
                </div>
              </div>
              <p>
                <strong>TIP</strong>
                {workflowDraft
                  ? " 검수 리포트 점수와 이슈는 초안 결과 영역에서 확인할 수 있습니다."
                  : inputAtsResult
                    ? " 공고 키워드, 구체적 수치, 본인 역할, 결과를 더 말하면 점수가 다시 계산됩니다."
                    : " 경험과 조건을 채팅에 입력하면 대화 내용을 기준으로 점수를 계산합니다."}
              </p>
            </section>

            {workflowDraft && (
              <>
                <section className="aiDraftInfoCard">
                  <div className="aiDraftCardTitle">
                    <span>검수 이슈</span>
                  </div>
                  <ul className="aiDraftSummary aiDraftSummaryWarn">
                    {workflowDraft.reviewReport.issues.map((item) => (
                      <li key={`${item.type}-${item.message}`}>{item.message}</li>
                    ))}
                  </ul>
                </section>

                <section className="aiDraftInfoCard">
                  <div className="aiDraftCardTitle">
                    <span>예상 면접 질문</span>
                  </div>
                  <ul className="aiDraftSummary">
                    {workflowDraft.reviewReport.likelyInterviewQuestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="aiDraftInfoCard">
                  <div className="aiDraftCardTitle">
                    <span>민감 정보 경고</span>
                  </div>
                  {workflowDraft.reviewReport.sensitiveWarnings.length > 0 ? (
                    <ul className="aiDraftSummary aiDraftSummaryWarn">
                      {workflowDraft.reviewReport.sensitiveWarnings.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="aiDraftEmptyNote">민감 정보 경고 없음</p>
                  )}
                </section>
              </>
            )}

            <section className="aiDraftInfoCard">
              <div className="aiDraftCardTitle">
                <span>대화 요약</span>
              </div>
              {conversationSummaryItems.length > 0 ? (
                <>
                  <ul className="aiDraftSummary">
                    {conversationSummaryItems.map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                  <button type="button" className="aiDraftSummaryButton">전체 대화 요약 보기</button>
                </>
              ) : (
                <p className="aiDraftEmptyNote">대화를 시작하면 요약이 표시됩니다.</p>
              )}
            </section>
          </aside>
        </div>
      </section>

      {newChatConfirmOpen && (
        <div
          className="aiDraftConfirmOverlay"
          role="presentation"
          onClick={() => setNewChatConfirmOpen(false)}
        >
          <div
            className="aiDraftConfirmDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-draft-new-chat-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="ai-draft-new-chat-title">새 대화를 시작할까요?</h2>
            <p>현재 대화와 분석 결과가 초기화됩니다.</p>
            <div className="aiDraftConfirmActions">
              <button type="button" className="aiDraftConfirmCancel" onClick={() => setNewChatConfirmOpen(false)}>
                취소
              </button>
              <button type="button" className="aiDraftConfirmPrimary" onClick={handleNewChat}>
                새 대화 시작
              </button>
            </div>
          </div>
        </div>
      )}

      <HomeFooter />
    </main>
  );
}
