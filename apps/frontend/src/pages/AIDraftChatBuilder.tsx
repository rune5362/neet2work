import { type ChangeEvent, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyzeResume, getJobById } from "../api/client";
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
import aiSymbol from "../assets/logo/neet2work_symbol_reference_curve 1.png";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { AnalysisResult } from "../types/analysis";
import type { JobPosting } from "../types/job";

type Sender = "ai" | "user";
type DraftState = "idle" | "ready" | "loading" | "complete";
type AnalysisStatus = "idle" | "ready" | "loading" | "complete" | "error";

type Message = {
  id: string;
  sender: Sender;
  text: string;
  time: string;
};

type Job = {
  id: string;
  company: string;
  title: string;
  link: string;
  skills: string[];
  isMock?: boolean;
};

type AiSettings = {
  model: "Gemini Pro" | "Fast Draft" | "Precision";
  tone: "담백한 실무형" | "성과 강조형" | "성장 서사형";
  sound: boolean;
  followUp: boolean;
};

type TextFormat = "TXT" | "Markdown";

type AttachedFileKind = "text" | "binary";

type AttachedFile = {
  id: string;
  name: string;
  kind: AttachedFileKind;
  textContent: string | null;
  readError: boolean;
  loading: boolean;
};

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const mockJobs: Job[] = [
  {
    id: "frontend",
    company: "네이트워크 테크",
    title: "프론트엔드 개발자 (신입)",
    link: "https://careers.neet2work.com/mock-frontend",
    skills: ["JavaScript", "React", "HTML/CSS", "Git", "REST API", "TypeScript", "Next.js", "성능 최적화", "테스트 코드", "배포/CI-CD"],
    isMock: true
  },
  {
    id: "backend",
    company: "니트투워크 랩스",
    title: "백엔드 소프트웨어 엔지니어",
    link: "https://careers.neet2work.com/mock-backend",
    skills: ["Node.js", "Express", "PostgreSQL", "REST API", "Git", "테스트 코드", "배포/CI-CD", "성능 최적화"],
    isMock: true
  },
  {
    id: "data",
    company: "일했음 데이터",
    title: "데이터 자동화 주니어",
    link: "https://careers.neet2work.com/mock-data",
    skills: ["Python", "SQL", "Git", "REST API", "테스트 코드", "배포/CI-CD"],
    isMock: true
  }
];

function toSelectedJob(job: JobPosting): Job {
  return {
    id: job.id,
    company: job.company,
    title: job.title,
    link: job.sourceUrl,
    skills: job.skills,
    isMock: false
  };
}

const initialMessages: Message[] = [
  {
    id: "m1",
    sender: "ai",
    time: "10:21",
    text: "안녕하세요. 저는 Neet2Work AI 스크래치입니다.\n\n지원하시는 직무에서 가장 중요한 역량을 발휘했던 경험을 구체적으로 들려주세요. 상황, 역할, 행동, 결과를 중심으로 자세히 설명해주시면 더 깊이 있는 질문으로 핵심을 함께 정리해드릴게요.",
  },
];

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

const draftText =
  "저는 대학 시절 교내 앱 개발 공모전에서 팀 리더로 참여하여 프로젝트를 성공적으로 이끈 경험이 있습니다. 초기에는 역할 분담과 일정 관리가 체계적이지 않아 진행 방향이 불명확해지는 문제가 있었습니다.\n\n이에 전체 일정을 재정리하고 매일 15분 스탠드업 미팅을 도입해 진행 상황을 공유하며 소통을 강화했습니다. 또한 사용자 인터뷰를 직접 수행해 핵심 니즈를 도출하고, MVP 기능을 우선순위에 따라 재구성했습니다.\n\n그 결과 최종 발표에서 최우수상을 수상했으며, 실제 사용자 200명 이상이 앱을 사용했습니다.";

const COMPOSER_INPUT_MIN_HEIGHT = 22;
const COMPOSER_INPUT_MAX_HEIGHT = 240;
const FILE_ACCEPT = "image/*,.txt,.md,.pdf,.doc,.docx";
const AI_MODEL_OPTIONS: AiSettings["model"][] = ["Gemini Pro", "Fast Draft", "Precision"];
const AI_TONE_OPTIONS: AiSettings["tone"][] = ["담백한 실무형", "성과 강조형", "성장 서사형"];

function isTextAttachment(file: File) {
  const lowerName = file.name.toLowerCase();
  return file.type.startsWith("text/") || lowerName.endsWith(".txt") || lowerName.endsWith(".md");
}

function isDocumentFileName(name: string) {
  const lowerName = name.toLowerCase();
  return lowerName.endsWith(".pdf") || lowerName.endsWith(".doc") || lowerName.endsWith(".docx");
}

function getAttachmentChipSuffix(file: AttachedFile) {
  if (file.loading) {
    return " · 읽는 중…";
  }
  if (file.readError) {
    return " · 읽기 실패";
  }
  if (file.kind === "binary") {
    return isDocumentFileName(file.name) ? " · 본문 미포함" : " · 미리보기만";
  }
  return "";
}

function buildResumeTextParts(messages: Message[], input: string, attachedFiles: AttachedFile[]) {
  const userMessageText = messages
    .filter((message) => message.sender === "user")
    .map((message) => message.text)
    .join("\n\n");
  const trimmedInput = input.trim();
  const attachedText = attachedFiles
    .filter((file) => file.kind === "text" && file.textContent && !file.readError && !file.loading)
    .map((file) => file.textContent as string)
    .join("\n\n");

  return [userMessageText, trimmedInput, attachedText].filter((part) => part.length > 0);
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
  const [input, setInput] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(mockJobs[0].id);
  const [selectedApiJob, setSelectedApiJob] = useState<Job | null>(null);
  const [jobQuery, setJobQuery] = useState("");
  const [draftState, setDraftState] = useState<DraftState>("idle");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [toneMenuOpen, setToneMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [textFormat, setTextFormat] = useState<TextFormat>("TXT");
  const [editorFontSize, setEditorFontSize] = useState(15);
  const [draftFitProgress, setDraftFitProgress] = useState(0);
  const [settings, setSettings] = useState<AiSettings>({
    model: "Gemini Pro",
    tone: "담백한 실무형",
    sound: true,
    followUp: true,
  });
  const [didFallback, setDidFallback] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [newChatConfirmOpen, setNewChatConfirmOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);
  const composerBarRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftFitProgressRef = useRef(0);
  const analyzeRequestIdRef = useRef(0);
  const sendReplyTimeoutRef = useRef<number | null>(null);

  const clearSendReplyTimeout = () => {
    if (sendReplyTimeoutRef.current !== null) {
      window.clearTimeout(sendReplyTimeoutRef.current);
      sendReplyTimeoutRef.current = null;
    }
  };

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

  const selectableJobs = useMemo(() => {
    if (!selectedApiJob) {
      return mockJobs;
    }

    return [selectedApiJob, ...mockJobs.filter((job) => job.id !== selectedApiJob.id)];
  }, [selectedApiJob]);
  const selectedJob = selectableJobs.find((job) => job.id === selectedJobId) ?? selectableJobs[0];
  const resumeText = useMemo(() => {
    return buildResumeTextParts(messages, input, attachedFiles).join("\n\n");
  }, [messages, input, attachedFiles]);
  const canAnalyze = resumeText.trim().length >= 10;
  const allText = `${resumeText}`.toLowerCase();
  const inferredFrontendSkills =
    selectedJob.id === "frontend" && /(앱|개발|프로젝트|mvp|사용자|인터뷰|팀|공모전)/.test(allText)
      ? ["JavaScript", "React", "HTML/CSS", "Git", "REST API", "Next.js", "테스트 코드"]
      : [];
  const matchedSkills = selectedJob.skills.filter((skill) => allText.includes(skill.toLowerCase()) || inferredFrontendSkills.includes(skill));
  const matchPercent =
    selectedJob.skills.length > 0
      ? Math.round((matchedSkills.length / selectedJob.skills.length) * 100)
      : 0;
  const estimatedFitScore = Math.min(92, 52 + matchedSkills.length * 3 + (draftState === "complete" ? 9 : 0));
  const draftFitTargetScore = analysisResult?.matchScore ?? estimatedFitScore;
  const atsScore = analysisResult?.matchScore ?? estimatedFitScore;
  const completedProgressStepCount = draftProgressSteps.filter((step) => draftFitProgress >= Math.min(step.threshold, draftFitTargetScore)).length;
  const resultBody =
    analysisResult?.suggestedSentences?.length
      ? analysisResult.suggestedSentences.join("\n\n")
      : draftText;
  const withSpaces = resultBody.length;
  const withoutSpaces = resultBody.replace(/\s/g, "").length;
  const displayDraft =
    textFormat === "Markdown"
      ? `## 팀 리더십 기반 문제 해결 경험\n\n${resultBody
          .split("\n\n")
          .map((paragraph) => `- ${paragraph}`)
          .join("\n")}`
      : resultBody;

  const filteredJobs = useMemo(() => {
    const query = jobQuery.trim().toLowerCase();
    if (!query) return selectableJobs;
    return selectableJobs.filter((job) =>
      `${job.company} ${job.title} ${job.skills.join(" ")}`.toLowerCase().includes(query)
    );
  }, [jobQuery, selectableJobs]);

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

    if (analysisResult?.strengths.length) {
      return analysisResult.strengths.slice(0, 3);
    }

    return [];
  }, [messages, analysisResult]);

  useEffect(() => {
    timelineRef.current?.scrollTo({
      top: timelineRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, draftState]);

  useEffect(() => {
    syncComposerHeight();
  }, [input, syncComposerHeight]);

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
    if (!composerMenuOpen && !modelMenuOpen && !toneMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (composerBarRef.current?.contains(event.target as Node)) {
        return;
      }

      setComposerMenuOpen(false);
      setToneMenuOpen(false);
      setModelMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setComposerMenuOpen(false);
        setToneMenuOpen(false);
        setModelMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [composerMenuOpen, modelMenuOpen, toneMenuOpen]);

  useEffect(() => {
    const queryJobId = new URLSearchParams(window.location.search).get("jobId")?.trim();
    if (!queryJobId) {
      setSelectedApiJob(null);
      setSelectedJobId(mockJobs[0].id);
      return;
    }

    let isCurrent = true;

    getJobById(queryJobId)
      .then((job) => {
        if (!isCurrent) return;

        const nextJob = toSelectedJob(job);
        setSelectedApiJob(nextJob);
        setSelectedJobId(nextJob.id);
      })
      .catch(() => {
        if (!isCurrent) return;

        setSelectedApiJob(null);
        setSelectedJobId(mockJobs[0].id);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const setMeterProgress = (nextValue: number) => {
      draftFitProgressRef.current = nextValue;
      setDraftFitProgress(nextValue);
    };

    if (draftState !== "loading" && draftState !== "complete") {
      setMeterProgress(0);
      return undefined;
    }

    const startValue = draftState === "loading" ? 0 : draftFitProgressRef.current;
    const targetValue = draftFitTargetScore;
    const duration = draftState === "loading" ? 1500 : 900;
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
    setModelMenuOpen(false);
  };

  const toggleComposerMenu = () => {
    setModelMenuOpen(false);
    setToneMenuOpen(false);
    setComposerMenuOpen((value) => !value);
    playTone(settings.sound, "open");
  };

  const toggleModelMenu = () => {
    setComposerMenuOpen(false);
    setToneMenuOpen(false);
    setModelMenuOpen((value) => !value);
    playTone(settings.sound, "open");
  };

  const toggleToneMenu = () => {
    setToneMenuOpen((value) => !value);
    playTone(settings.sound, "open");
  };

  const handleModelSelect = (model: AiSettings["model"]) => {
    updateSettings("model", model);
    closeComposerMenus();
  };

  const handleToneSelect = (tone: AiSettings["tone"]) => {
    updateSettings("tone", tone);
    closeComposerMenus();
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles?.length) {
      return;
    }

    resetAnalysis();
    setDraftState((prev) => (prev === "loading" ? prev : "idle"));

    const fileEntries = Array.from(selectedFiles).map((file) => ({
      file,
      attachment: {
        id: crypto.randomUUID(),
        name: file.name,
        kind: (isTextAttachment(file) ? "text" : "binary") as AttachedFileKind,
        textContent: null,
        readError: false,
        loading: isTextAttachment(file),
      },
    }));

    setAttachedFiles((prev) => [...prev, ...fileEntries.map((entry) => entry.attachment)]);
    event.target.value = "";
    playTone(settings.sound, "open");

    const promoteDraftStateIfAnalyzable = (nextFiles: AttachedFile[]) => {
      const nextResumeText = buildResumeTextParts(messages, input, nextFiles).join("\n\n").trim();
      if (nextResumeText.length >= 10) {
        setDraftState((prev) => (prev === "loading" ? prev : "ready"));
      }
    };

    await Promise.all(
      fileEntries.map(async ({ file, attachment }) => {
        if (!isTextAttachment(file)) {
          return;
        }

        try {
          const textContent = await file.text();
          setAttachedFiles((prev) => {
            const next = prev.map((item) =>
              item.id === attachment.id
                ? {
                    ...item,
                    textContent,
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

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
    resetAnalysis();
    playTone(settings.sound, "open");
  };

  const resetAnalysis = () => {
    analyzeRequestIdRef.current += 1;
    setAnalysisResult(null);
    setAnalysisStatus("idle");
    setAnalysisError(null);
    setDraftFitProgress(0);
    draftFitProgressRef.current = 0;
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowSearch(false);
    clearSendReplyTimeout();
    resetAnalysis();
    setDraftState(messages.some((message) => message.sender === "user") ? "ready" : "idle");
    playTone(settings.sound, "open");
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    clearSendReplyTimeout();
    resetAnalysis();
    setDraftState("idle");

    playTone(settings.sound, "send");
    const nextMessages: Message[] = [
      ...messages,
      {
        id: crypto.randomUUID(),
        sender: "user",
        time: nowTime(),
        text: trimmed,
      },
    ];
    setMessages(nextMessages);
    setInput("");
    window.requestAnimationFrame(syncComposerHeight);

    sendReplyTimeoutRef.current = window.setTimeout(() => {
      sendReplyTimeoutRef.current = null;

      if (settings.followUp && trimmed.length < 35 && !didFallback) {
        setDidFallback(true);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "ai",
            time: nowTime(),
            text: "답변이 조금 간결한 편입니다. 그 활동을 하면서 구체적으로 어떤 기술적 시도를 했거나, 어떤 점에 가장 집중했는지 한 가지만 더 말해줄 수 있나요?",
          },
        ]);
        setDraftState("idle");
        playTone(settings.sound, "ready");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          time: nowTime(),
          text: "충분한 경험 데이터가 확보되었습니다. 지금 초안을 생성하면 공고의 요구 역량과 연결해 문장을 재구성할 수 있습니다.",
        },
      ]);
      setDraftState("ready");
      playTone(settings.sound, "ready");
    }, 520);
  };

  const handleGenerate = async () => {
    if (!canAnalyze || draftState === "loading") {
      return;
    }

    const requestId = analyzeRequestIdRef.current;
    setAnalysisResult(null);
    setAnalysisError(null);
    setAnalysisStatus("loading");
    setDraftState("loading");
    setDraftFitProgress(0);
    draftFitProgressRef.current = 0;
    playTone(settings.sound, "open");

    try {
      const result = await analyzeResume({
        jobId: selectedJob.id,
        resumeText: resumeText.trim(),
      });
      if (requestId !== analyzeRequestIdRef.current) {
        return;
      }
      setAnalysisResult(result);
      setAnalysisStatus("complete");
      setDraftState("complete");
      playTone(settings.sound, "success");
    } catch {
      if (requestId !== analyzeRequestIdRef.current) {
        return;
      }
      setAnalysisResult(null);
      setAnalysisStatus("error");
      setAnalysisError("분석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setDraftState("ready");
      playTone(settings.sound, "ready");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(resultBody);
    setCopied(true);
    playTone(settings.sound, "success");
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleNewChat = () => {
    clearSendReplyTimeout();
    setMessages([initialMessages[0]]);
    setInput("");
    setAttachedFiles([]);
    setDraftState("idle");
    setDidFallback(false);
    resetAnalysis();
    setNewChatConfirmOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    window.requestAnimationFrame(syncComposerHeight);
    playTone(settings.sound, "open");
  };

  const handleComposerChange = (value: string) => {
    setInput(value);
    window.requestAnimationFrame(syncComposerHeight);
  };

  return (
    <main className="homePage aiDraftChatPage">
      <HomeTopNav active="analysis" />

      <section className="aiDraftShell" aria-label="AI 자기소개서 채팅 빌더">
        <div className="aiDraftWorkspace">
          <section className="aiDraftChatPanel" aria-label="AI 자소서 채팅">
            <header className="aiDraftChatHeader">
              <div>
                <div className="aiDraftTitleRow">
                  <h1>AI 자소서 채팅</h1>
                  <span>{settings.model}</span>
                  <strong>ONLINE</strong>
                </div>
                <p>소크라테스처럼 질문하고, 당신의 경험을 구조화합니다.</p>
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

            <div className="aiDraftTimeline" ref={timelineRef}>
              {messages.map((message) => (
                <article
                  className={`aiDraftMessage ${message.sender}`}
                  key={message.id}
                  aria-label={message.sender === "ai" ? "AI 답변" : "내 메시지"}
                >
                  <div className="aiDraftAvatar" aria-hidden="true">
                    {message.sender === "ai" ? (
                      <img src={aiSymbol} alt="" className="aiDraftAvatarLogo" />
                    ) : (
                      "나"
                    )}
                  </div>
                  <div className="aiDraftBubble">
                    <p>{message.text}</p>
                    <time>{message.time}</time>
                  </div>
                </article>
              ))}

              {(draftState === "ready" || draftState === "complete") && (
                <div className="aiDraftReadyRow">
                  <span>대화 완료</span>
                  <button type="button" onClick={handleGenerate} disabled={!canAnalyze}>
                    <Icon name="spark" />
                    AI 초안 생성 시작
                  </button>
                </div>
              )}

              {!canAnalyze && (draftState === "ready" || draftState === "complete") && (
                <p className="aiDraftInputHint">자기소개 내용을 10자 이상 입력해야 분석할 수 있습니다.</p>
              )}

              {analysisStatus === "error" && analysisError && (
                <p className="aiDraftErrorNote" role="alert">{analysisError}</p>
              )}

              {(draftState === "loading" || draftState === "complete") && (
                <section className="aiDraftProgressCard" aria-label="AI 초안 생성 진행">
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
                    <h2>{draftState === "loading" ? "AI가 당신의 이야기를 분석하고 초안을 작성하고 있습니다..." : "AI 초안 결과"}</h2>
                    <div className="aiDraftProgressSteps">
                      {draftProgressSteps.map((step, index) => (
                        <div className="aiDraftProgressStep" key={step.label}>
                          <span className={index < completedProgressStepCount ? "complete" : ""} />
                          <strong>{step.label}</strong>
                          <small>{step.helper}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                  {draftState === "loading" && <b aria-hidden="true">...</b>}
                </section>
              )}

              {draftState === "complete" && analysisResult && (
                <section className="aiDraftResultCard">
                  <div className="aiDraftResultHeader">
                    <div>
                      <h2>AI 초안 결과</h2>
                      <span>초안 v1</span>
                      {analysisResult && (
                        <span className={`aiDraftModeBadge ${analysisResult.mode}`}>
                          {analysisResult.mode === "mock" ? "mock 분석" : "ai 분석"}
                        </span>
                      )}
                    </div>
                    <strong>완료</strong>
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
                  {analysisResult && analysisResult.rewriteGuides.length > 0 && (
                    <ul className="aiDraftGuideList" aria-label="개선 가이드">
                      {analysisResult.rewriteGuides.map((guide) => (
                        <li key={guide}>{guide}</li>
                      ))}
                    </ul>
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
                    <button
                      type="button"
                      aria-label="TXT로 다운로드"
                      title="TXT로 다운로드"
                      data-tooltip="TXT로 다운로드"
                    >
                      <Icon name="download" />
                      다운로드 (TXT)
                    </button>
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
                  </div>
                </section>
              )}
            </div>

            <footer className="aiDraftComposer">
              <div className="aiDraftComposerDock">
                {attachedFiles.length > 0 && (
                  <div className="aiDraftAttachedFiles" aria-label="첨부 파일">
                    {attachedFiles.map((file) => (
                      <span
                        className={`aiDraftAttachedFileChip ${file.readError ? "error" : ""} ${file.kind === "binary" ? "binary" : ""} ${file.loading ? "loading" : ""}`}
                        key={file.id}
                      >
                        <span className="aiDraftAttachedFileChipLabel">
                          {file.name}
                          {getAttachmentChipSuffix(file)}
                        </span>
                        <button
                          type="button"
                          className="aiDraftAttachedFileChipRemove"
                          aria-label={`${file.name} 제거`}
                          onClick={() => removeAttachedFile(file.id)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="aiDraftComposerBar" ref={composerBarRef}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="aiDraftHiddenFileInput"
                    accept={FILE_ACCEPT}
                    multiple
                    onChange={handleFileInputChange}
                  />

                  {composerMenuOpen && (
                    <div
                      className="aiDraftComposerPopover aiDraftComposerOptionsMenu aiDraftComposerOptionsMenuCompact"
                      role="dialog"
                      aria-label="작성 옵션"
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
                        onClick={() => updateSettings("followUp", !settings.followUp)}
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
                    </div>
                  )}

                  {modelMenuOpen && (
                    <div
                      className="aiDraftComposerPopover aiDraftComposerModelMenu aiDraftComposerModelMenuCompact"
                      role="menu"
                      aria-label="AI 모델 선택"
                    >
                      {AI_MODEL_OPTIONS.map((model) => (
                        <button
                          key={model}
                          type="button"
                          className={`aiDraftComposerMenuItem ${settings.model === model ? "active" : ""}`}
                          role="menuitemradio"
                          aria-checked={settings.model === model}
                          onClick={() => handleModelSelect(model)}
                        >
                          <span>{model}</span>
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

                  <textarea
                    ref={composerInputRef}
                    value={input}
                    onChange={(event) => handleComposerChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="메시지를 입력하세요..."
                    rows={1}
                  />

                  <button
                    type="button"
                    className="aiDraftComposerModelButton"
                    aria-label={`AI 모델 선택, 현재 ${settings.model}`}
                    aria-expanded={modelMenuOpen}
                    aria-haspopup="menu"
                    title={`AI 모델: ${settings.model}`}
                    onClick={toggleModelMenu}
                  >
                    <span>{settings.model}</span>
                    <Icon name="chevron" />
                  </button>

                  <button
                    type="button"
                    className="aiDraftComposerSendButton"
                    onClick={handleSend}
                    disabled={!input.trim()}
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

            <section className="aiDraftInfoCard">
              <div className="aiDraftCardTitle">
                <span>{selectedJob.isMock ? "선택된 공고 (Mock)" : "선택된 공고"}</span>
                <button type="button" onClick={() => setShowSearch((value) => !value)}>수정</button>
              </div>
              {showSearch && (
                <div className="aiDraftJobSearch">
                  <input value={jobQuery} onChange={(event) => setJobQuery(event.target.value)} placeholder="공고 또는 기술 검색" />
                  <div>
                    {filteredJobs.map((job) => (
                      <button key={job.id} type="button" onClick={() => handleJobSelect(job.id)}>
                        <strong>{job.company}</strong>
                        <span>{job.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                    <a href={selectedJob.link}>{selectedJob.link}</a>
                    <Icon name="external" />
                  </dd>
                </div>
              </dl>
            </section>

            <section className="aiDraftInfoCard">
              <div className="aiDraftCardTitle">
                <span>직무 핵심 스킬</span>
                <small>대화 기반 체크</small>
              </div>
              <div className="aiDraftSkillGrid">
                {selectedJob.skills.length > 0 ? (
                  selectedJob.skills.map((skill) => {
                    const matched = matchedSkills.includes(skill);
                    return (
                      <span className={matched ? "matched" : ""} key={skill}>
                        {matched ? "✓" : "○"} {skill}
                      </span>
                    );
                  })
                ) : (
                  <span>핵심 스킬 정보 없음</span>
                )}
              </div>
              <p className="aiDraftFootnote">대화에서 언급한 스킬은 자동으로 체크됩니다.</p>
            </section>

            <section className="aiDraftInfoCard ats">
              <div className="aiDraftCardTitle">
                <span>ATS 적합도</span>
                <small>{analysisResult ? "API matchScore" : "대화 기반 추정"}</small>
              </div>
              <div className="aiDraftAtsGrid">
                <div className="aiDraftScoreRing" style={{ "--score": `${atsScore}%` } as CSSProperties}>
                  <strong>{atsScore}</strong>
                  <span>/100</span>
                </div>
                <div className="aiDraftScoreBars">
                  {analysisResult ? (
                    <div>
                      <span>키워드 적합도</span>
                      <i><b style={{ width: `${matchPercent}%` }} /></i>
                      <em>{matchPercent}</em>
                    </div>
                  ) : (
                    [
                      ["키워드 적합도", matchPercent],
                      ["경험 구체성 (추정)", 78],
                      ["구조화 STAR (추정)", 86],
                      ["문장 명료성 (추정)", draftState === "complete" ? 84 : 80],
                      ["기업/직무 적합도 (추정)", 82],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <i><b style={{ width: `${value}%` }} /></i>
                        <em>{value}</em>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <p>
                <strong>TIP</strong>
                {analysisResult
                  ? " 세부 강점·보완점·키워드는 아래 API 분석 결과를 참고하세요."
                  : " 더 구체적인 수치와 도구 사용 경험을 추가하면 점수가 상승합니다."}
              </p>
            </section>

            {analysisResult && (
              <>
                <section className="aiDraftInfoCard">
                  <div className="aiDraftCardTitle">
                    <span>강점</span>
                  </div>
                  <ul className="aiDraftSummary">
                    {analysisResult.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="aiDraftInfoCard">
                  <div className="aiDraftCardTitle">
                    <span>보완점</span>
                  </div>
                  {analysisResult.weaknesses.length > 0 ? (
                    <ul className="aiDraftSummary aiDraftSummaryWarn">
                      {analysisResult.weaknesses.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="aiDraftEmptyNote">뚜렷한 약점 없음</p>
                  )}
                </section>

                <section className="aiDraftInfoCard">
                  <div className="aiDraftCardTitle">
                    <span>누락 키워드</span>
                  </div>
                  {analysisResult.missingKeywords.length > 0 ? (
                    <div className="aiDraftKeywordGrid">
                      {analysisResult.missingKeywords.map((keyword) => (
                        <span className="aiDraftKeywordChip" key={keyword}>{keyword}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="aiDraftEmptyNote">누락 키워드 없음</p>
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
