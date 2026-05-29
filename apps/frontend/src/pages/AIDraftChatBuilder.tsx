import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { getJobById } from "../api/client";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { JobPosting } from "../types/job";

type Sender = "ai" | "user";
type DraftState = "idle" | "ready" | "loading" | "complete";

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
  {
    id: "m2",
    sender: "user",
    time: "10:24",
    text: "저는 대학 시절 교내 앱 개발 공모전에 참여했을 때 팀 리더로서 프로젝트를 성공적으로 이끈 경험이 있습니다. 당시 4명의 팀원이 각자 맡은 역할이 있었지만, 일정 관리와 요구사항 정리가 제대로 되지 않아 중간에 방향이 흔들리는 문제가 있었습니다. 그래서 저는 전체 일정을 재정리하고, 매일 15분 스탠드업 미팅을 도입해 진행 상황을 공유했습니다. 또한 사용자 인터뷰를 직접 진행해 문제를 정의하고, MVP 기능을 우선순위에 따라 재구성했습니다. 그 결과 최종 발표에서 최우수상을 수상했고, 실제 사용자 200명 이상이 앱을 사용했습니다.",
  },
  {
    id: "m3",
    sender: "ai",
    time: "10:25",
    text: "좋은 경험이네요. 말씀해주신 내용을 바탕으로 핵심 포인트를 정리했습니다.\n추가로 더 깊이 파고들 부분이 있다면 이어서 질문드릴게요.",
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

function Icon({ name }: { name: "history" | "plus" | "settings" | "send" | "copy" | "download" | "edit" | "spark" | "external" }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (name === "history") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.9l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.9-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.06a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.9.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05a1.7 1.7 0 0 0 .34-1.9 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.06a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.9l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05a1.7 1.7 0 0 0 1.9.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.06a1.7 1.7 0 0 0 1 1.55h.01a1.7 1.7 0 0 0 1.9-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05a1.7 1.7 0 0 0-.34 1.9v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.06a1.7 1.7 0 0 0-1.55 1Z" />
      </svg>
    );
  }

  if (name === "send") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="m22 2-7 20-4-9-9-4 20-7Z" />
        <path d="M22 2 11 13" />
      </svg>
    );
  }

  if (name === "copy") {
    return (
      <svg aria-hidden="true" {...common}>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }

  if (name === "download") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M13 2 8 13l-6 2 6 2 5 5 2-6 7-5-7-2-2-7Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" {...common}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

export function AIDraftChatBuilder() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(mockJobs[0].id);
  const [selectedApiJob, setSelectedApiJob] = useState<Job | null>(null);
  const [jobQuery, setJobQuery] = useState("");
  const [draftState, setDraftState] = useState<DraftState>("complete");
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const timelineRef = useRef<HTMLDivElement>(null);
  const draftFitProgressRef = useRef(0);

  const selectableJobs = useMemo(() => {
    if (!selectedApiJob) {
      return mockJobs;
    }

    return [selectedApiJob, ...mockJobs.filter((job) => job.id !== selectedApiJob.id)];
  }, [selectedApiJob]);
  const selectedJob = selectableJobs.find((job) => job.id === selectedJobId) ?? selectableJobs[0];
  const allText = `${messages.map((message) => message.text).join(" ")} ${input}`.toLowerCase();
  const inferredFrontendSkills =
    selectedJob.id === "frontend" && /(앱|개발|프로젝트|mvp|사용자|인터뷰|팀|공모전)/.test(allText)
      ? ["JavaScript", "React", "HTML/CSS", "Git", "REST API", "Next.js", "테스트 코드"]
      : [];
  const matchedSkills = selectedJob.skills.filter((skill) => allText.includes(skill.toLowerCase()) || inferredFrontendSkills.includes(skill));
  const matchPercent =
    selectedJob.skills.length > 0
      ? Math.round((matchedSkills.length / selectedJob.skills.length) * 100)
      : 0;
  const draftFitTargetScore = Math.min(92, 52 + matchedSkills.length * 3 + 9);
  const atsScore = Math.min(92, 52 + matchedSkills.length * 3 + (draftState === "complete" ? 9 : 0));
  const completedProgressStepCount = draftProgressSteps.filter((step) => draftFitProgress >= Math.min(step.threshold, draftFitTargetScore)).length;
  const withSpaces = draftText.length;
  const withoutSpaces = draftText.replace(/\s/g, "").length;
  const displayDraft =
    textFormat === "Markdown"
      ? `## 팀 리더십 기반 문제 해결 경험\n\n${draftText
          .split("\n\n")
          .map((paragraph) => `- ${paragraph}`)
          .join("\n")}`
      : draftText;

  const filteredJobs = useMemo(() => {
    const query = jobQuery.trim().toLowerCase();
    if (!query) return selectableJobs;
    return selectableJobs.filter((job) =>
      `${job.company} ${job.title} ${job.skills.join(" ")}`.toLowerCase().includes(query)
    );
  }, [jobQuery, selectableJobs]);

  useEffect(() => {
    timelineRef.current?.scrollTo({
      top: timelineRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, draftState]);

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

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

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

    window.setTimeout(() => {
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

  const handleGenerate = () => {
    setDraftState("loading");
    playTone(settings.sound, "open");

    window.setTimeout(() => {
      setDraftState("complete");
      playTone(settings.sound, "success");
    }, 1500);
  };

  const handleCopy = async () => {
    await navigator.clipboard?.writeText(draftText);
    setCopied(true);
    playTone(settings.sound, "success");
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleNewChat = () => {
    setMessages([initialMessages[0]]);
    setInput("");
    setDraftState("idle");
    setDidFallback(false);
    playTone(settings.sound, "open");
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
                <button type="button" className="aiDraftGhostButton" onClick={() => setSettingsOpen((value) => !value)}>
                  <Icon name="settings" />
                  AI 설정
                </button>
                <button type="button" className="aiDraftGhostButton">
                  <Icon name="history" />
                  대화 히스토리
                </button>
                <button type="button" className="aiDraftGhostButton" onClick={handleNewChat}>
                  <Icon name="plus" />새 대화
                </button>
              </div>

              {settingsOpen && (
                <div className="aiDraftSettingsPopover" role="dialog" aria-label="AI 설정">
                  <label>
                    모델
                    <select value={settings.model} onChange={(event) => updateSettings("model", event.target.value as AiSettings["model"])}>
                      <option>Gemini Pro</option>
                      <option>Fast Draft</option>
                      <option>Precision</option>
                    </select>
                  </label>
                  <label>
                    문체
                    <select value={settings.tone} onChange={(event) => updateSettings("tone", event.target.value as AiSettings["tone"])}>
                      <option>담백한 실무형</option>
                      <option>성과 강조형</option>
                      <option>성장 서사형</option>
                    </select>
                  </label>
                  <button type="button" className={settings.followUp ? "active" : ""} onClick={() => updateSettings("followUp", !settings.followUp)}>
                    단답 보완 질문 {settings.followUp ? "ON" : "OFF"}
                  </button>
                  <button type="button" className={settings.sound ? "active" : ""} onClick={() => updateSettings("sound", !settings.sound)}>
                    사운드 효과 {settings.sound ? "ON" : "OFF"}
                  </button>
                </div>
              )}
            </header>

            <div className="aiDraftTimeline" ref={timelineRef}>
              {messages.map((message) => (
                <article className={`aiDraftMessage ${message.sender}`} key={message.id}>
                  <div className="aiDraftAvatar">{message.sender === "ai" ? "AI" : "나"}</div>
                  <div className="aiDraftBubble">
                    <p>{message.text}</p>
                    <time>{message.time}</time>
                  </div>
                </article>
              ))}

              {(draftState === "ready" || draftState === "complete") && (
                <div className="aiDraftReadyRow">
                  <span>대화 완료</span>
                  <button type="button" onClick={handleGenerate}>
                    <Icon name="spark" />
                    AI 초안 생성 시작
                  </button>
                </div>
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
                  {draftState === "loading" && <b>1.5초</b>}
                </section>
              )}

              {draftState === "complete" && (
                <section className="aiDraftResultCard">
                  <div className="aiDraftResultHeader">
                    <div>
                      <h2>AI 초안 결과</h2>
                      <span>초안 v1</span>
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
                  <div className="aiDraftResultToolbar">
                    <button type="button" className={copied ? "success" : ""} onClick={handleCopy}>
                      <Icon name="copy" />
                      {copied ? "복사 완료" : "복사"}
                    </button>
                    <button type="button">
                      <Icon name="download" />
                      다운로드 (TXT)
                    </button>
                    <button type="button">
                      <Icon name="edit" />
                      편집기로 열기
                    </button>
                    <button type="button">
                      <Icon name="spark" />
                      다음 질문 이어가기
                    </button>
                  </div>
                </section>
              )}
            </div>

            <footer className="aiDraftComposer">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="메시지를 입력하세요..."
                rows={1}
              />
              <button type="button" className="aiDraftAttachButton" aria-label="파일 첨부">
                <Icon name="edit" />
              </button>
              <button type="button" className="aiDraftSendButton" onClick={handleSend} disabled={!input.trim()}>
                <Icon name="send" />
              </button>
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
              <button type="button" onClick={() => setSettingsOpen((value) => !value)}>관리</button>
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
                      <button key={job.id} type="button" onClick={() => { setSelectedJobId(job.id); setShowSearch(false); playTone(settings.sound, "open"); }}>
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
                <small>실시간 추정</small>
              </div>
              <div className="aiDraftAtsGrid">
                <div className="aiDraftScoreRing" style={{ "--score": `${atsScore}%` } as CSSProperties}>
                  <strong>{atsScore}</strong>
                  <span>/100</span>
                </div>
                <div className="aiDraftScoreBars">
                  {[
                    ["키워드 적합도", matchPercent],
                    ["경험 구체성", 78],
                    ["구조화 (STAR)", 86],
                    ["문장 명료성", draftState === "complete" ? 84 : 80],
                    ["기업/직무 적합도", 82],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <i><b style={{ width: `${value}%` }} /></i>
                      <em>{value}</em>
                    </div>
                  ))}
                </div>
              </div>
              <p><strong>TIP</strong> 더 구체적인 수치와 도구 사용 경험을 추가하면 점수가 상승합니다.</p>
            </section>

            <section className="aiDraftInfoCard">
              <div className="aiDraftCardTitle">
                <span>대화 요약</span>
              </div>
              <ul className="aiDraftSummary">
                <li>팀 리더로서 프로젝트 일정 재정비 및 소통 체계 구축</li>
                <li>사용자 인터뷰 기반 문제 정의 및 MVP 재구성</li>
                <li>최우수상 수상, 사용자 200명 이상 확보</li>
              </ul>
              <button type="button" className="aiDraftSummaryButton">전체 대화 요약 보기</button>
            </section>
          </aside>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
