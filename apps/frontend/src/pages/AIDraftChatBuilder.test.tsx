import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIDraftChatBuilder } from "./AIDraftChatBuilder";

const SAMPLE_DEMO_RESUME_SNIPPET = "교내 앱 개발 공모전";
const USER_RESUME =
  "Node.js와 PostgreSQL로 REST API 서버를 구축하고 운영한 백엔드 개발 경험이 있습니다.";

const apiJob = {
  id: "careercross-1591647",
  title: "실전 백엔드 엔지니어",
  company: "Backend Bridge",
  location: "Tokyo",
  careerLevel: "Mid Career",
  skills: ["Node.js", "REST API", "PostgreSQL"],
  description: "실서비스 API와 데이터 처리를 담당합니다.",
  source: "careercross",
  sourceJobId: "1591647",
  sourceUrl: "https://example.com/jobs/careercross-1591647",
  country: "JP",
  language: "en",
  employmentType: "Permanent Full-time",
  careerStage: "junior",
  employmentTypeCategory: "permanent",
  educationLevel: null,
  salaryText: null,
  deadlineText: null,
  applyMethod: null,
  postedAt: null,
  collectedAt: "2026-05-19T03:16:08.341Z"
};

const savedCoverLetterReference = {
  id: "cover-letter-reference-1",
  candidateKey: "candidate-1",
  title: "백엔드 지원 자소서",
  documentType: "cover_letter" as const,
  profileId: null,
  profileTitle: null,
  jobId: "careercross-1591647",
  jobTitle: "실전 백엔드 엔지니어",
  company: "Backend Bridge",
  content:
    "문제 상황을 먼저 제시한 뒤 본인 역할, 판단 기준, 결과를 차례로 연결하는 구성을 사용했습니다. 기존 회사명과 수치는 새 초안에 쓰면 안 됩니다.",
  contentJson: null,
  source: "user" as const,
  profileSnapshotText: null,
  profileSnapshotJson: null,
  jobSnapshotJson: null,
  isArchived: false,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z"
};

const savedCandidateProfileJson = {
  basics: {
    name: "김백엔드",
    email: "backend@example.com",
    phone: "010-0000-0000",
    location: "Seoul",
    links: {
      github: "https://github.com/backend"
    }
  },
  desired: {
    roles: ["백엔드 엔지니어"],
    industries: ["SaaS"],
    locations: ["Tokyo"],
    employmentTypes: ["Full-time"]
  },
  summary: {
    headline: "Node.js API 운영 경험",
    description: "PostgreSQL 기반 REST API 서버를 설계하고 운영했습니다."
  },
  skills: ["Node.js", "PostgreSQL", "REST API"],
  projects: [
    {
      title: "채용 API 개선",
      role: "백엔드 개발",
      result: "응답 시간을 단축했습니다.",
      impact: "운영 안정성을 높였습니다.",
      achievements: ["장애 대응 절차를 문서화했습니다."]
    }
  ],
  experiences: [],
  certifications: [],
  education: [],
  activities: [],
  metadata: {
    lastUpdatedBy: "user" as const,
    lastAiUpdatedAt: null
  }
};

const savedCandidateProfile = {
  id: "candidate-profile-1",
  candidateKey: "candidate-1",
  title: "백엔드 지원 프로필",
  targetRole: "백엔드 엔지니어",
  targetCompany: "Backend Bridge",
  targetJobId: "careercross-1591647",
  name: "김백엔드",
  email: "backend@example.com",
  desiredRoles: ["백엔드 엔지니어"],
  skills: ["Node.js", "PostgreSQL", "REST API"],
  profileText: "Node.js와 PostgreSQL로 REST API 서버를 설계하고 운영한 프로필 본문입니다.",
  profileJson: savedCandidateProfileJson,
  schemaVersion: 1,
  source: "user",
  isDefault: true,
  isArchived: false,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  deletedAt: null,
  createdBy: "user-1",
  updatedBy: null,
  deletedBy: null
};

const savedSecondaryCandidateProfile = {
  ...savedCandidateProfile,
  id: "candidate-profile-2",
  title: "프론트엔드 지원 프로필",
  targetRole: "프론트엔드 엔지니어",
  desiredRoles: ["프론트엔드 엔지니어"],
  skills: ["React", "TypeScript", "Accessibility"],
  profileText: "React와 TypeScript로 접근성 높은 화면을 구현한 프로필 본문입니다.",
  isDefault: false,
  updatedAt: "2026-06-03T00:00:00.000Z"
};

const aiMeta = {
  providerId: "fallback" as const,
  modelId: "hardcoded-demo",
  routingMode: "auto" as const,
  usedFallback: true,
  fallbackReason: "all_providers_unavailable" as const
};

const documentFormatting = {
  encoding: "UTF-8" as const,
  fontFamily: "Malgun Gothic" as const,
  fontDisplayName: "맑은 고딕" as const,
  lineSpacing: "normal" as const,
  normalizeWhitespace: true as const,
  forbidMojibake: true as const
};

const workflowPlanResult = {
  mode: "fallback" as const,
  state: "OUTLINE_READY" as const,
  aiMeta,
  questionRubric: {
    intent: "협업 경험을 문제-행동-결과로 연결합니다.",
    requiredEvidence: ["문제 상황", "본인 역할", "결과"],
    mustAvoid: ["근거 없는 수치"],
    blindRules: []
  },
  experienceCards: [
    {
      experienceId: "manual-experience-1",
      source: "manual" as const,
      title: "사용자 입력 경험",
      actions: [{ action: "API 서버 구축" }],
      tools: ["Node.js", "PostgreSQL"],
      outputs: ["REST API"],
      results: [{ type: "output" as const, description: "서버 운영", verified: true }],
      skills: ["Node.js", "PostgreSQL"],
      evidenceItems: [
        {
          evidenceId: "manual-evidence-1",
          type: "user_statement" as const,
          content: USER_RESUME,
          confidence: "medium" as const
        }
      ],
      claimLedger: [
        {
          claimId: "manual-claim-1",
          text: "백엔드 API 운영 경험",
          supportedBy: ["manual-evidence-1"],
          confidence: "medium" as const,
          allowedInDraft: true
        }
      ],
      missingSlots: [],
      blindRiskFlags: [],
      interviewDefensibility: "medium" as const
    }
  ],
  fitAssessments: [
    {
      questionId: "question-1",
      experienceId: "manual-experience-1",
      fitScore: 78,
      recommendedUsage: "main" as const,
      fitReasons: ["REST API 경험이 직무와 연결됩니다."],
      risks: []
    }
  ],
  answerStrategy: {
    mainClaim: "백엔드 API 운영 경험",
    narrativePattern: "STAR" as const,
    primaryExperienceId: "manual-experience-1",
    questionBudget: 800,
    neededQuestions: []
  },
  materialStore: {
    requirements: [
      {
        requirementId: "job-posting-fit-1",
        source: "job_posting" as const,
        text: "실서비스 API와 데이터 처리를 담당합니다.",
        priority: "high" as const,
        appliesTo: ["자기소개"]
      }
    ],
    referenceRules: [],
    profile: {
      coreStrengths: ["백엔드 API 운영"],
      tone: "담백한 실무형",
      privateConstraints: []
    },
    experiences: [
      {
        experienceId: "manual-experience-1",
        facts: ["REST API 서버 구축"],
        skills: ["Node.js", "PostgreSQL"],
        usableSections: ["자기소개"],
        privateConstraints: [],
        sourceEvidenceIds: ["manual-evidence-1"]
      }
    ],
    sectionPlan: [
      {
        sectionName: "자기소개",
        mainClaim: "백엔드 API 운영 경험",
        evidenceIds: ["manual-evidence-1"],
        avoidRepeating: []
      }
    ],
    outputRules: documentFormatting
  },
  outline: [{ paragraphId: "p1", purpose: "문제 상황", plannedClaims: ["manual-claim-1"] }]
};

const workflowDraftResult = {
  mode: "fallback" as const,
  state: "REVIEW_COMPLETED" as const,
  aiMeta,
  draftText:
    "Node.js와 PostgreSQL로 REST API 서버를 구축하고 운영한 백엔드 개발 경험이 있습니다. 문제 상황에서 API 안정성을 확보하기 위해 모니터링과 예외 처리를 강화했습니다.",
  charCount: { withSpaces: 90, withoutSpaces: 74, limit: 800 },
  evidenceMap: [
    {
      textRangeLabel: "전체 초안",
      claimIds: ["manual-claim-1"],
      experienceIds: ["manual-experience-1"]
    }
  ],
  documentFormatting,
  reviewReport: {
    scores: {
      promptFit: 74,
      jobFit: 70,
      specificity: 72,
      evidenceSafety: 76,
      koreanReadability: 80,
      aiLikenessRisk: 42,
      blindRisk: 8,
      interviewDefensibility: 70
    },
    issues: [
      {
        type: "evidence_gap",
        severity: "medium" as const,
        message: "결과 수치가 확인되면 설득력이 더 높아집니다."
      }
    ],
    likelyInterviewQuestions: ["API 장애 대응 경험을 설명해 주세요."],
    sensitiveWarnings: []
  },
  revisionOptions: ["프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요."]
};

const careerSessionResult = {
  sessionId: "career-session-1",
  state: "QUESTION_READY" as const,
  documentType: "specified_cover_letter" as const,
  documentTypeReason: "빈 자소서 양식 또는 지원 문항이 감지됐습니다.",
  target: {
    role: "실전 백엔드 엔지니어",
    questionText: "협업 경험을 구체적으로 작성하세요.",
    charLimit: 800
  },
  sources: [
    {
      sourceId: "conversation",
      sourceType: "experience_text" as const,
      label: "대화 경험",
      extractedSignals: ["Node.js", "PostgreSQL"],
      requiresUserConfirmation: false
    }
  ],
  templateAnalysis: {
    detected: true,
    questions: [
      {
        questionId: "template-1-1",
        text: "협업 경험을 구체적으로 작성하세요.",
        charLimit: 800,
        intent: "협업 경험",
        requiredSlots: ["project_name", "problem_context", "user_role", "actions", "result"],
        missingSlots: ["user_role", "result"]
      }
    ]
  },
  evidenceVault: [
    {
      evidenceId: "ev-conversation",
      sourceType: "experience_text" as const,
      sourceId: "conversation",
      claim: "백엔드 API 운영 경험",
      evidenceText: USER_RESUME,
      confidence: "high" as const,
      status: "user_provided" as const,
      confirmedByUser: true,
      usableForResume: true,
      usableForCoverLetter: true,
      usableForCareerDescription: true,
      blindRisk: false,
      privacyRisk: false,
      targetSlots: ["project_name", "actions", "skills"]
    }
  ],
  completion: {
    requiredSlots: ["target_role", "project_name", "problem_context", "user_role", "actions", "result"],
    filledSlots: ["target_role", "project_name", "actions"],
    missingSlots: ["problem_context", "user_role", "result"],
    progress: 50
  },
  answeredQuestions: [],
  nextQuestion: {
    questionId: "q-user_role",
    question: "그 프로젝트에서 네가 직접 맡은 범위는 어디까지였어?",
    whyAsking: "GitHub나 자료만으로는 본인이 직접 한 일을 확정할 수 없어.",
    targetDocument: "specified_cover_letter" as const,
    targetSection: "본인 역할",
    expectedAnswerType: "short_text" as const,
    priority: 2,
    canSkip: false,
    targetSlot: "user_role"
  }
};

const careerDocumentSessionResult = {
  sessionId: "career-document-session-1",
  state: "INTERVIEW_REQUIRED" as const,
  target: {
    role: "실전 백엔드 엔지니어"
  },
  stages: [
    { id: "material_collection" as const, label: "자료 수집", status: "complete" as const },
    { id: "evidence_analysis" as const, label: "근거 분석", status: "complete" as const },
    { id: "gap_interview" as const, label: "부족 정보 질문", status: "active" as const },
    { id: "section_drafts" as const, label: "문항별 초안", status: "active" as const }
  ],
  documentAnalyses: [
    {
      sourceId: "attachment-template",
      fileName: "template.txt",
      classification: "self_intro_template" as const,
      classificationReason: "문항, 작성 조건, 글자수 제한 신호가 감지됐습니다.",
      extractedText: "문항: 지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내.",
      template: {
        questions: [
          {
            questionId: "attachment-template-q1",
            text: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내.",
            charLimit: 700,
            charCountRule: "unknown" as const,
            intent: "role_competency",
            requiredSlots: ["target_role", "project_name", "user_role", "actions", "result"],
            writingRules: ["700자 이내."]
          }
        ],
        writingRules: ["700자 이내."]
      },
      summary: "문항 1개를 추출했습니다."
    }
  ],
  githubAnalyses: [
    {
      sourceId: "github-1",
      url: "https://github.com/example/applicant-tracker",
      status: "fetched" as const,
      owner: "example",
      repo: "applicant-tracker",
      repositories: [
        {
          fullName: "example/applicant-tracker",
          description: "지원자 상태 관리 API",
          primaryLanguage: "TypeScript",
          languages: ["TypeScript"],
          updatedAt: "2026-06-01T00:00:00Z",
          readmeExcerpt: "지원자 상태 관리 API와 이력 추적 기능"
        }
      ],
      facts: [
        {
          sourceId: "github-1",
          sourceType: "github_readme" as const,
          fact: "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능"
        }
      ]
    }
  ],
  portfolioAnalyses: [],
  evidenceVault: [
    {
      evidenceId: "ev-1",
      sourceId: "github-1",
      sourceType: "github_readme" as const,
      fact: "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능",
      confidence: "medium" as const,
      allowedInDraft: true,
      privacyRisk: "none" as const,
      needsUserConfirmation: false,
      targetSlots: ["project_name", "actions"]
    }
  ],
  profileContexts: [],
  interview: {
    questions: [
      {
        questionId: "gap-user_role",
        slot: "user_role",
        question: "그 프로젝트에서 네가 직접 맡은 역할과 범위는 어디까지였어?",
        whyAsking: "GitHub 자료만으로는 본인이 직접 한 일을 확정할 수 없어.",
        priority: 4,
        targetQuestionIds: ["attachment-template-q1"]
      }
    ],
    answers: []
  },
  drafts: [
    {
      questionId: "attachment-template-q1",
      questionText: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내.",
      charLimit: 700,
      charCountRule: "unknown" as const,
      status: "needs_more_evidence" as const,
      draftText:
        "실전 백엔드 엔지니어 직무에 맞춰 지원자 상태 관리 API 경험을 중심으로 정리하겠습니다. GitHub 자료에서는 지원자 상태 관리 API와 이력 추적 기능이 확인됩니다.",
      charCount: { withSpaces: 91, withoutSpaces: 72, limit: 700 },
      usedEvidenceSourceIds: ["github-1"],
      usedEvidenceFacts: [
        "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능"
      ],
      missingEvidence: ["본인 역할"],
      risks: ["근거가 부족한 항목은 가초안에서 단정하지 않고 보완 질문으로 남겼습니다."]
    }
  ],
  completion: {
    status: "provisional" as const,
    score: 50,
    summary: "가초안 상태입니다. 남은 질문을 답하면 같은 초안을 갱신해 완성도를 높입니다.",
    gates: [
      {
        id: "draft_available" as const,
        label: "가초안 생성",
        passed: true,
        detail: "1개 문항의 가초안이 있습니다."
      },
      {
        id: "required_questions_answered" as const,
        label: "필수 보완 질문",
        passed: false,
        detail: "1개 보완 질문이 남아 있습니다."
      },
      {
        id: "missing_evidence_resolved" as const,
        label: "부족 근거 해소",
        passed: false,
        detail: "본인 역할 보완이 필요합니다."
      },
      {
        id: "evidence_locked" as const,
        label: "근거 잠금",
        passed: true,
        detail: "초안 문장이 첨부/대화/GitHub/포트폴리오 근거에 연결되어 있습니다."
      }
    ]
  },
  documentPackages: [
    {
      documentType: "cover_letter" as const,
      title: "실전 백엔드 엔지니어 자기소개서 가초안",
      content:
        "문항 1. 지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내.\n\n실전 백엔드 엔지니어 직무에 맞춰 지원자 상태 관리 API 경험을 중심으로 정리하겠습니다. GitHub 자료에서는 지원자 상태 관리 API와 이력 추적 기능이 확인됩니다.",
      profileId: null,
      jobId: null,
      contentJson: {
        schemaVersion: 1 as const,
        source: {
          workflow: "career-document-workflow" as const,
          sessionId: "career-document-session-1",
          state: "INTERVIEW_REQUIRED" as const,
          generatedAt: "2026-06-08T00:00:00.000Z",
          completionStatus: "provisional" as const
        },
        target: { role: "실전 백엔드 엔지니어" },
        sections: [
          {
            sectionId: "attachment-template-q1",
            title: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내.",
            body: "실전 백엔드 엔지니어 직무에 맞춰 지원자 상태 관리 API 경험을 중심으로 정리하겠습니다. GitHub 자료에서는 지원자 상태 관리 API와 이력 추적 기능이 확인됩니다.",
            usedEvidenceFacts: [
              "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능"
            ],
            missingEvidence: ["본인 역할"],
            risks: ["근거가 부족한 항목은 가초안에서 단정하지 않고 보완 질문으로 남겼습니다."]
          }
        ],
        evidence: {
          usedFacts: [
            "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능"
          ],
          missingEvidence: ["본인 역할"],
          risks: []
        },
        formatting: {
          charCountRule: "with_spaces" as const,
          withSpaces: 132,
          withoutSpaces: 104,
          limit: 700
        }
      }
    },
    {
      documentType: "resume" as const,
      title: "실전 백엔드 엔지니어 이력서 가초안",
      content: "희망 직무: 실전 백엔드 엔지니어\n프로젝트 경험:\n- GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능\n보완 필요: 본인 역할",
      profileId: null,
      jobId: null,
      contentJson: {
        schemaVersion: 1 as const,
        source: {
          workflow: "career-document-workflow" as const,
          sessionId: "career-document-session-1",
          state: "INTERVIEW_REQUIRED" as const,
          generatedAt: "2026-06-08T00:00:00.000Z",
          completionStatus: "provisional" as const
        },
        target: { role: "실전 백엔드 엔지니어" },
        sections: [
          {
            sectionId: "resume-summary",
            title: "이력서 요약",
            body: "희망 직무: 실전 백엔드 엔지니어\n프로젝트 경험:\n- GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능\n보완 필요: 본인 역할",
            usedEvidenceFacts: [
              "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능"
            ],
            missingEvidence: ["본인 역할"],
            risks: []
          }
        ],
        evidence: {
          usedFacts: [
            "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능"
          ],
          missingEvidence: ["본인 역할"],
          risks: []
        },
        formatting: {
          charCountRule: "with_spaces" as const,
          withSpaces: 96,
          withoutSpaces: 80
        }
      }
    }
  ],
  missingEvidence: ["본인 역할"],
  risks: []
};

const careerDocumentAnsweredSessionResult = {
  ...careerDocumentSessionResult,
  state: "DRAFT_READY" as const,
  stages: careerDocumentSessionResult.stages.map((stage) => ({
    ...stage,
    status: "complete" as const
  })),
  evidenceVault: [
    ...careerDocumentSessionResult.evidenceVault,
    {
      evidenceId: "ev-answer-1",
      sourceId: "answer-gap-user_role",
      sourceType: "interview_answer" as const,
      fact: "백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다.",
      confidence: "high" as const,
      allowedInDraft: true,
      privacyRisk: "none" as const,
      needsUserConfirmation: false,
      targetSlots: ["user_role", "actions"]
    }
  ],
  interview: {
    questions: [],
    answers: [
      {
        questionId: "gap-user_role",
        answer: "백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다."
      }
    ]
  },
  drafts: [
    {
      questionId: "attachment-template-q1",
      questionText: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내.",
      charLimit: 700,
      charCountRule: "unknown" as const,
      status: "drafted" as const,
      draftText:
        "실전 백엔드 엔지니어 직무에 맞춰 지원자 상태 관리 API 경험을 중심으로 답변하겠습니다. 이 경험에서 제가 직접 맡은 범위는 백엔드 API 명세와 상태 변경 로직 구현입니다.",
      charCount: { withSpaces: 98, withoutSpaces: 78, limit: 700 },
      usedEvidenceSourceIds: ["github-1", "answer-gap-user_role"],
      usedEvidenceFacts: [
        "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능",
        "백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다."
      ],
      missingEvidence: [],
      risks: ["GitHub 근거는 README 기반이라 세부 기여는 사용자 확인이 필요합니다."]
    }
  ],
  documentPackages: [
    {
      documentType: "cover_letter" as const,
      title: "실전 백엔드 엔지니어 자기소개서 완성본",
      content:
        "문항 1. 지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내.\n\n실전 백엔드 엔지니어 직무에 맞춰 지원자 상태 관리 API 경험을 중심으로 답변하겠습니다. 이 경험에서 제가 직접 맡은 범위는 백엔드 API 명세와 상태 변경 로직 구현입니다.",
      profileId: null,
      jobId: null,
      contentJson: {
        schemaVersion: 1 as const,
        source: {
          workflow: "career-document-workflow" as const,
          sessionId: "career-document-session-1",
          state: "DRAFT_READY" as const,
          generatedAt: "2026-06-08T00:00:00.000Z",
          completionStatus: "submission_ready" as const
        },
        target: { role: "실전 백엔드 엔지니어" },
        sections: [
          {
            sectionId: "attachment-template-q1",
            title: "지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내.",
            body: "실전 백엔드 엔지니어 직무에 맞춰 지원자 상태 관리 API 경험을 중심으로 답변하겠습니다. 이 경험에서 제가 직접 맡은 범위는 백엔드 API 명세와 상태 변경 로직 구현입니다.",
            usedEvidenceFacts: [
              "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능",
              "백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다."
            ],
            missingEvidence: [],
            risks: ["GitHub 근거는 README 기반이라 세부 기여는 사용자 확인이 필요합니다."]
          }
        ],
        evidence: {
          usedFacts: [
            "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능",
            "백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다."
          ],
          missingEvidence: [],
          risks: []
        },
        formatting: {
          charCountRule: "with_spaces" as const,
          withSpaces: 139,
          withoutSpaces: 111,
          limit: 700
        }
      }
    },
    {
      documentType: "resume" as const,
      title: "실전 백엔드 엔지니어 이력서 완성본",
      content:
        "희망 직무: 실전 백엔드 엔지니어\n프로젝트 경험:\n- GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능\n- 백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다.",
      profileId: null,
      jobId: null,
      contentJson: {
        schemaVersion: 1 as const,
        source: {
          workflow: "career-document-workflow" as const,
          sessionId: "career-document-session-1",
          state: "DRAFT_READY" as const,
          generatedAt: "2026-06-08T00:00:00.000Z",
          completionStatus: "submission_ready" as const
        },
        target: { role: "실전 백엔드 엔지니어" },
        sections: [
          {
            sectionId: "resume-summary",
            title: "이력서 요약",
            body: "희망 직무: 실전 백엔드 엔지니어\n프로젝트 경험:\n- GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능\n- 백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다.",
            usedEvidenceFacts: [
              "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능",
              "백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다."
            ],
            missingEvidence: [],
            risks: []
          }
        ],
        evidence: {
          usedFacts: [
            "GitHub 저장소 example/applicant-tracker README 요약: 지원자 상태 관리 API와 이력 추적 기능",
            "백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다."
          ],
          missingEvidence: [],
          risks: []
        },
        formatting: {
          charCountRule: "with_spaces" as const,
          withSpaces: 122,
          withoutSpaces: 99
        }
      }
    }
  ],
  completion: {
    status: "submission_ready" as const,
    score: 100,
    summary: "제출 준비 기준을 통과했습니다.",
    gates: [
      {
        id: "draft_available" as const,
        label: "가초안 생성",
        passed: true,
        detail: "1개 문항의 가초안이 있습니다."
      },
      {
        id: "required_questions_answered" as const,
        label: "필수 보완 질문",
        passed: true,
        detail: "남은 필수 보완 질문이 없습니다."
      },
      {
        id: "missing_evidence_resolved" as const,
        label: "부족 근거 해소",
        passed: true,
        detail: "문항별 부족 근거가 없습니다."
      },
      {
        id: "evidence_locked" as const,
        label: "근거 잠금",
        passed: true,
        detail: "초안 문장이 첨부/대화/GitHub/포트폴리오 근거에 연결되어 있습니다."
      }
    ]
  },
  missingEvidence: [],
  risks: []
};

const providerStatuses = [
  {
    providerId: "codex_bridge",
    label: "Codex Bridge",
    online: false,
    configured: false,
    quotaExceeded: false,
    models: []
  },
  {
    providerId: "gemini",
    label: "Gemini",
    online: false,
    configured: false,
    quotaExceeded: false,
    models: []
  },
  {
    providerId: "local",
    label: "Local AI",
    online: false,
    configured: false,
    quotaExceeded: false,
    models: []
  },
  {
    providerId: "agy_cli",
    label: "Agy CLI",
    online: false,
    configured: false,
    quotaExceeded: false,
    models: []
  },
  {
    providerId: "fallback",
    label: "Fallback Demo",
    online: true,
    configured: true,
    quotaExceeded: false,
    models: [{ modelId: "hardcoded-demo", label: "Demo Fallback", online: true, quotaExceeded: false }]
  }
];

function createDraftWorkflowFetchMock(options?: {
  planFails?: boolean;
  draftFails?: boolean;
  extractFails?: boolean;
  profiles?: Array<typeof savedCandidateProfile>;
}) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/documents") && init?.method === "POST") {
      const body = JSON.parse(String(init.body ?? "{}"));
      return apiResponse({
        data: {
          id: `saved-${body.documentType ?? "document"}`,
          candidateKey: "candidate-1",
          title: body.title,
          documentType: body.documentType,
          profileId: body.profileId ?? null,
          profileTitle: null,
          jobId: body.jobId ?? null,
          jobTitle: null,
          company: null,
          content: body.content,
          contentJson: body.contentJson ?? null,
          source: "user",
          profileSnapshotText: null,
          profileSnapshotJson: null,
          jobSnapshotJson: null,
          isArchived: false,
          createdAt: "2026-06-08T00:00:00.000Z",
          updatedAt: "2026-06-08T00:00:00.000Z",
          deletedAt: null,
          createdBy: "user-1",
          updatedBy: null,
          deletedBy: null
        }
      });
    }

    if (url.includes("/api/documents")) {
      return apiResponse({ data: [savedCoverLetterReference], count: 1 });
    }

    if (url.includes("/api/profiles")) {
      const profiles = options?.profiles ?? [savedCandidateProfile];
      return apiResponse({ data: profiles, count: profiles.length });
    }

    if (url.includes("/api/draft-workflow/providers")) {
      return apiResponse({ data: providerStatuses });
    }

    if (url.includes("/api/jobs/careercross-1591647")) {
      return apiResponse({ data: apiJob });
    }

    if (url.includes("/api/resume/extract") && init?.method === "POST") {
      if (options?.extractFails) return errorResponse();
      return apiResponse({
        data: {
          fileName: "resume.pdf",
          text: "PDF에서 추출한 포트폴리오 본문입니다.",
          previewHtml: "<p>DOCX에서 변환한 포트폴리오 본문입니다.</p>",
          mode: "mock"
        }
      });
    }

    if (url.includes("/api/career-workflow/session") && init?.method === "POST") {
      return apiResponse({ data: careerSessionResult });
    }

    if (url.includes("/api/career-workflow/document-session/answer") && init?.method === "POST") {
      return apiResponse({ data: careerDocumentAnsweredSessionResult });
    }

    if (url.includes("/api/career-workflow/document-session") && init?.method === "POST") {
      return apiResponse({ data: careerDocumentSessionResult });
    }

    if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
      if (options?.planFails) return errorResponse();
      return apiResponse({ data: workflowPlanResult });
    }

    if (url.includes("/api/draft-workflow/draft") && init?.method === "POST") {
      if (options?.draftFails) return errorResponse();
      return apiResponse({ data: workflowDraftResult });
    }

    if (url.includes("/api/draft-workflow/revise") && init?.method === "POST") {
      return apiResponse({
        data: {
          ...workflowDraftResult,
          draftText: `${workflowDraftResult.draftText}\n\n[수정 요청 반영: 더 간결하게]`
        }
      });
    }

    return errorResponse();
  });
}

function apiResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => body
  } as Response);
}

function deferredApiResponse(body: unknown) {
  let resolveResponse!: () => void;
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = () =>
      resolve({
        ok: true,
        json: async () => body
      } as Response);
  });

  return {
    promise,
    resolve: resolveResponse
  };
}

function errorResponse() {
  return Promise.resolve({
    ok: false,
    json: async () => ({ message: "failed" })
  } as Response);
}

function setStoredAuthSession() {
  localStorage.setItem("neet2work.auth.accessToken", "test-access-token");
  localStorage.setItem("neet2work.auth.refreshToken", "test-refresh-token");
  localStorage.setItem("neet2work.auth.expiresAt", String(Date.now() + 10 * 60_000));
  localStorage.setItem("neet2work.auth.refreshExpiresAt", String(Date.now() + 60 * 60_000));
}

afterEach(() => {
  localStorage.clear();
});

function getPlanCallBody(fetchMock: ReturnType<typeof vi.fn>) {
  const planCall = fetchMock.mock.calls.find(
    ([input, init]) => String(input).includes("/api/draft-workflow/plan") && init?.method === "POST"
  );
  expect(planCall).toBeTruthy();
  return JSON.parse(String(planCall?.[1]?.body));
}

function parseAtsMetricValueByLabel(atsCard: HTMLElement, metricLabel: string) {
  const row = Array.from(atsCard.querySelectorAll(".aiDraftScoreBars > div")).find((item) =>
    item.textContent?.includes(metricLabel)
  );
  const text = row?.querySelector("em")?.textContent;
  return text ? Number(text) : null;
}

function parseAtsRingScore(atsCard: HTMLElement) {
  const text = atsCard.querySelector(".aiDraftScoreRing strong")?.textContent;
  if (!text) {
    return null;
  }
  const digits = text.replace(/\D/g, "");
  if (!digits) {
    return null;
  }
  const parsed = Number(digits);
  return Number.isNaN(parsed) ? null : parsed;
}

async function submitUserResume(text = USER_RESUME) {
  const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
  await screen.findByText(/자료를 받았어/);
}

async function sendUserMessage(text: string) {
  const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
  await waitFor(() => {
    expect(textarea).toHaveValue("");
  });
}

async function runDraftWorkflowGeneration(fetchMock: ReturnType<typeof vi.fn>) {
  const startButton = await screen.findByRole("button", { name: /문항 분석 시작/i });
  await waitFor(() => expect(startButton).toBeEnabled());
  fireEvent.click(startButton);
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/draft-workflow/plan"),
      expect.objectContaining({ method: "POST" })
    );
  });
  const draftButton = await screen.findByRole("button", { name: /개요 확인 및 초안 생성/i });
  await waitFor(() => expect(draftButton).toBeEnabled());
  fireEvent.click(draftButton);
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/draft-workflow/draft"),
      expect.objectContaining({ method: "POST" })
    );
  });
}

async function confirmNewChat() {
  fireEvent.click(screen.getByRole("button", { name: /^\+?새 대화$/i }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "새 대화 시작" }));
}

function getUserMessage() {
  return within(screen.getByLabelText("내 메시지")).getByText(USER_RESUME);
}

function getHiddenFileInput() {
  return document.querySelector(".aiDraftHiddenFileInput") as HTMLInputElement;
}

async function attachTextFile(name: string, content: string) {
  const fileInput = getHiddenFileInput();
  const file = new File([content], name, { type: "text/plain" });

  await act(async () => {
    fireEvent.change(fileInput, { target: { files: [file] } });
  });

  await waitFor(() => {
    const attachments = screen.getByLabelText("첨부 파일");
    expect(within(attachments).getByText(new RegExp(name.replace(".", "\\.")))).toBeInTheDocument();
    expect(screen.queryByText(/읽기 실패/)).not.toBeInTheDocument();
    expect(screen.queryByText(/읽는 중…/)).not.toBeInTheDocument();
  });
}

async function attachDocumentFile(name: string, content: string, mimeType: string) {
  const fileInput = getHiddenFileInput();
  const file = new File([content], name, { type: mimeType });

  await act(async () => {
    fireEvent.change(fileInput, { target: { files: [file] } });
  });

  await waitFor(() => {
    expect(screen.getByLabelText("첨부 파일")).toBeInTheDocument();
    expect(screen.queryByText(/읽는 중…/)).not.toBeInTheDocument();
  });
}

async function dropTextFile(name: string, content: string) {
  const composerBar = document.querySelector(".aiDraftComposerBar") as HTMLElement;
  const file = new File([content], name, { type: "text/plain" });

  await act(async () => {
    fireEvent.drop(composerBar, {
      dataTransfer: {
        files: [file],
        items: [],
        types: ["Files"]
      }
    });
  });

  await waitFor(() => {
    const attachments = screen.getByLabelText("첨부 파일");
    expect(within(attachments).getByText(new RegExp(name.replace(".", "\\.")))).toBeInTheDocument();
    expect(screen.queryByText(/읽기 실패/)).not.toBeInTheDocument();
    expect(screen.queryByText(/읽는 중…/)).not.toBeInTheDocument();
  });
}

async function pasteTextFile(name: string, content: string) {
  const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
  const file = new File([content], name, { type: "text/plain" });

  await act(async () => {
    fireEvent.paste(textarea, {
      clipboardData: {
        files: [file],
        items: [],
        types: ["Files"]
      }
    });
  });

  await waitFor(() => {
    const attachments = screen.getByLabelText("첨부 파일");
    expect(within(attachments).getByText(new RegExp(name.replace(".", "\\.")))).toBeInTheDocument();
    expect(screen.queryByText(/읽기 실패/)).not.toBeInTheDocument();
    expect(screen.queryByText(/읽는 중…/)).not.toBeInTheDocument();
  });
}

describe("AIDraftChatBuilder job context", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let elementScrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.pushState({}, "", "/ai-analysis");
    elementScrollToMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: elementScrollToMock
    });

    fetchMock = createDraftWorkflowFetchMock();

    vi.stubGlobal("fetch", fetchMock);
    setStoredAuthSession();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads the selected job from the jobId query", async () => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");

    render(<AIDraftChatBuilder />);

    expect(await screen.findByText("실전 백엔드 엔지니어")).toBeInTheDocument();
    expect(screen.getByText("Backend Bridge")).toBeInTheDocument();
    expect(screen.getByText("선택된 공고")).toBeInTheDocument();
    expect(screen.queryByText("선택된 공고 없음")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "수정" })).toHaveAttribute("href", "/jobs");
    const skillCard = screen.getByText("직무 핵심 스킬").closest("section");
    expect(skillCard).toBeTruthy();
    expect(within(skillCard as HTMLElement).getByText(/Node\.js/)).toBeInTheDocument();
    expect(within(skillCard as HTMLElement).getByText(/REST API/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/jobs/careercross-1591647")
    );
  });

  it("does not render unsafe selected job source URLs as links", async () => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({
          data: {
            ...apiJob,
            sourceUrl: "javascript:alert(1)"
          }
        });
      }

      return createDraftWorkflowFetchMock()(input, init);
    });

    render(<AIDraftChatBuilder />);

    expect(await screen.findByText("실전 백엔드 엔지니어")).toBeInTheDocument();
    expect(screen.getByText("공고 링크 없음")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "javascript:alert(1)" })).not.toBeInTheDocument();
  });

  it("starts without a hardcoded selected job when no jobId query is provided", async () => {
    render(<AIDraftChatBuilder />);

    await waitFor(() => {
      expect(screen.getByText("선택된 공고 없음")).toBeInTheDocument();
    });
    expect(screen.getByText("채용공고에서 공고를 선택하면 여기에 표시됩니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "공고 선택" })).toHaveAttribute("href", "/jobs");
    expect(screen.queryByText("네이트워크 테크")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/draft-workflow/providers"));
  });

  it("shows the career workflow session summary after analysis starts", async () => {
    render(<AIDraftChatBuilder />);

    await submitUserResume();
    fireEvent.click(await screen.findByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/career-workflow/session"),
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("문서 유형: 지정 문항 자소서")).toBeInTheDocument();
    expect(screen.getByText("그 프로젝트에서 네가 직접 맡은 범위는 어디까지였어?")).toBeInTheDocument();
    expect(screen.getByText("본인 역할에 사용")).toBeInTheDocument();
  });

  it("does not show default job skills until the user selects a real job or mentions skills", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("선택된 공고 없음");
    const skillCard = screen.getByText("직무 핵심 스킬").closest("section");
    expect(skillCard).toBeTruthy();
    expect(within(skillCard as HTMLElement).getByText("아직 감지된 스킬 없음")).toBeInTheDocument();
    expect(within(skillCard as HTMLElement).queryByText(/JavaScript/)).not.toBeInTheDocument();

    await submitUserResume("Node.js와 PostgreSQL로 REST API 서버를 구축하고 운영한 경험이 있습니다.");

    expect(within(skillCard as HTMLElement).getByText(/Node\.js/)).toBeInTheDocument();
    expect(within(skillCard as HTMLElement).getByText(/PostgreSQL/)).toBeInTheDocument();
    expect(within(skillCard as HTMLElement).getByText(/REST API/)).toBeInTheDocument();
  });

  it("calculates ATS fit from selected job keywords and chat input", async () => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const atsCard = screen.getByText("ATS 적합도").closest("section");
    expect(atsCard).toBeTruthy();
    expect(within(atsCard as HTMLElement).getByText("대화 후 계산")).toBeInTheDocument();
    expect(within(atsCard as HTMLElement).getByText("대기")).toBeInTheDocument();
    expect(within(atsCard as HTMLElement).getByText("입력 후 계산")).toBeInTheDocument();
    expect(within(atsCard as HTMLElement).getByText("대화를 시작하면 적합도를 계산합니다.")).toBeInTheDocument();
    expect(within(atsCard as HTMLElement).queryByText("52")).not.toBeInTheDocument();
    expect(within(atsCard as HTMLElement).queryByText("경험 구체성 (추정)")).not.toBeInTheDocument();
    expect(within(atsCard as HTMLElement).queryByText("구조화 STAR (추정)")).not.toBeInTheDocument();

    await submitUserResume(
      "Node.js와 PostgreSQL로 REST API 서버를 구축하고 운영했습니다. 장애 원인을 분석해 배포 자동화를 개선했고 API 응답 시간을 30% 줄였습니다."
    );

    await waitFor(() => {
      expect(within(atsCard as HTMLElement).getByText("입력 기반 계산")).toBeInTheDocument();
    });
    expect(within(atsCard as HTMLElement).queryByText("대기")).not.toBeInTheDocument();
    expect(within(atsCard as HTMLElement).getByText("/100")).toBeInTheDocument();
    expect(within(atsCard as HTMLElement).getByText("공고 키워드 일치")).toBeInTheDocument();
    expect(within(atsCard as HTMLElement).getByText("경험 구체성")).toBeInTheDocument();
    expect(within(atsCard as HTMLElement).getByText("STAR 구조")).toBeInTheDocument();
    expect(within(atsCard as HTMLElement).getByText("문장 명료성")).toBeInTheDocument();
    expect(within(atsCard as HTMLElement).getByText("공고 적합도")).toBeInTheDocument();
    expect(within(atsCard as HTMLElement).queryByText("경험 구체성 (추정)")).not.toBeInTheDocument();
    expect(within(atsCard as HTMLElement).queryByText("기업/직무 적합도 (추정)")).not.toBeInTheDocument();
  });

  it("uses job description keywords for ATS when the selected job has no skill tags", async () => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");
    const defaultFetchMock = createDraftWorkflowFetchMock();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({
          data: {
            ...apiJob,
            title: "SaaS Account Executive",
            skills: [],
            description: "SaaS account executive sales pipeline customer success revenue"
          }
        });
      }

      return defaultFetchMock(input, init);
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("SaaS Account Executive");
    const atsCard = screen.getByText("ATS 적합도").closest("section");
    expect(atsCard).toBeTruthy();

    await submitUserResume(
      "SaaS account executive로 sales pipeline을 관리하고 customer success 팀과 협업했습니다. 신규 revenue 기회를 분석해 전환율을 20% 개선했습니다."
    );

    await waitFor(() => {
      expect(within(atsCard as HTMLElement).getByText("입력 기반 계산")).toBeInTheDocument();
    });
    const keywordMetric = Array.from((atsCard as HTMLElement).querySelectorAll(".aiDraftScoreBars > div")).find((row) =>
      row.textContent?.includes("공고 키워드 일치")
    );
    expect(keywordMetric).toBeTruthy();
    expect(keywordMetric?.textContent).not.toMatch(/공고 키워드 일치\s*0$/);
  });

  it("lowers ATS clarity and score for repetitive jamo gibberish input", async () => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");

    render(<AIDraftChatBuilder />);

    await screen.findByText("Backend Bridge");
    const atsCard = document.querySelector(".aiDraftInfoCard.ats") as HTMLElement;
    expect(atsCard).toBeTruthy();

    await sendUserMessage("ㅁㄴㅇㅁㄹ ㅁㄴㅇㅁㄹㅁㄴㅇㅁㄴㅇㅁㄴㅇ");

    await waitFor(() => {
      expect(parseAtsMetricValueByLabel(atsCard, "문장 명료성")).not.toBeNull();
    });

    const clarity = parseAtsMetricValueByLabel(atsCard, "문장 명료성");
    const atsScore = parseAtsRingScore(atsCard);

    expect(clarity).not.toBeNull();
    expect(atsScore).not.toBeNull();
    expect(clarity as number).toBeLessThanOrEqual(30);
    expect(atsScore as number).toBeLessThanOrEqual(30);
  });

  it("lowers ATS clarity and score for random key-like latin input", async () => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");

    render(<AIDraftChatBuilder />);

    await screen.findByText("Backend Bridge");
    const atsCard = document.querySelector(".aiDraftInfoCard.ats") as HTMLElement;
    expect(atsCard).toBeTruthy();

    await sendUserMessage("qwertyuiop asdfghjkl zxcvbnm qwerty");

    await waitFor(() => {
      expect(parseAtsMetricValueByLabel(atsCard, "문장 명료성")).not.toBeNull();
    });

    const clarity = parseAtsMetricValueByLabel(atsCard, "문장 명료성");
    const atsScore = parseAtsRingScore(atsCard);

    expect(clarity).not.toBeNull();
    expect(atsScore).not.toBeNull();
    expect(clarity as number).toBeLessThanOrEqual(30);
    expect(atsScore as number).toBeLessThanOrEqual(35);
  });

  it("keeps ATS clarity from being overly penalized for normal experience sentences", async () => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");

    render(<AIDraftChatBuilder />);

    await screen.findByText("Backend Bridge");
    const atsCard = document.querySelector(".aiDraftInfoCard.ats") as HTMLElement;
    expect(atsCard).toBeTruthy();

    await sendUserMessage(
      "I built a customer support REST API using Node.js and PostgreSQL. It reduced complaint response time by 35% through better issue triage and incident monitoring."
    );

    await waitFor(() => {
      expect(parseAtsMetricValueByLabel(atsCard, "문장 명료성")).not.toBeNull();
    });

    const clarity = parseAtsMetricValueByLabel(atsCard, "문장 명료성");
    const atsScore = parseAtsRingScore(atsCard);

    expect(clarity).not.toBeNull();
    expect(atsScore).not.toBeNull();
    expect(clarity as number).toBeGreaterThan(40);
    expect(atsScore as number).toBeGreaterThan(45);
  });

  it("adds detected skills to the selected job skill panel without calling the AI workflow", async () => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");
    const defaultFetchMock = createDraftWorkflowFetchMock();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({
          data: {
            ...apiJob,
            title: "SaaS Account Executive",
            skills: [],
            description: "SaaS account executive sales pipeline customer success revenue"
          }
        });
      }

      return defaultFetchMock(input, init);
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("SaaS Account Executive");
    const skillCard = screen.getByText("직무 핵심 스킬").closest("section");
    expect(skillCard).toBeTruthy();
    expect(within(skillCard as HTMLElement).getByText("아직 감지된 스킬 없음")).toBeInTheDocument();

    await submitUserResume(
      "SaaS account executive로 sales pipeline을 관리하고 customer success 팀과 협업했습니다."
    );

    expect(within(skillCard as HTMLElement).getByText(/saas/i)).toBeInTheDocument();
    expect(within(skillCard as HTMLElement).queryAllByText(/sales/i).length).toBeGreaterThan(0);
    expect(within(skillCard as HTMLElement).queryAllByText(/pipeline/i).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/api/draft-workflow/plan"))).toBe(false);
  });

  it("detects role skill aliases locally without requiring the AI workflow", async () => {
    window.history.pushState({}, "", "/ai-analysis?jobId=daijob-1522029");
    const defaultFetchMock = createDraftWorkflowFetchMock();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/daijob-1522029")) {
        return apiResponse({
          data: {
            ...apiJob,
            id: "daijob-1522029",
            title: "外資系企業内アカウントマネジャー",
            skills: [],
            description: "運営統括マネジャーとしてステークホルダーと予算を管理します"
          }
        });
      }

      return defaultFetchMock(input, init);
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("外資系企業内アカウントマネジャー");
    const skillCard = screen.getByText("직무 핵심 스킬").closest("section");
    expect(skillCard).toBeTruthy();
    expect(within(skillCard as HTMLElement).getByText("아직 감지된 스킬 없음")).toBeInTheDocument();

    await submitUserResume("고객사 관리와 운영 총괄을 맡고 이해관계자 조율, 예산 관리를 진행했습니다.");

    expect(within(skillCard as HTMLElement).getByText(/Account Management/i)).toBeInTheDocument();
    expect(within(skillCard as HTMLElement).getByText(/Operations Management/i)).toBeInTheDocument();
    expect(within(skillCard as HTMLElement).getByText(/Stakeholder Management/i)).toBeInTheDocument();
    expect(within(skillCard as HTMLElement).getByText(/Budget\/Cost Management/i)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes("/api/draft-workflow/plan"))).toBe(false);
  });
});

describe("AIDraftChatBuilder draft workflow flow", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let elementScrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");
    elementScrollToMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: elementScrollToMock
    });

    fetchMock = createDraftWorkflowFetchMock();

    vi.stubGlobal("fetch", fetchMock);
    setStoredAuthSession();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not call draft workflow before the user sends input", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    expect(screen.queryByRole("button", { name: /문항 분석 시작/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/draft-workflow/plan"),
      expect.anything()
    );
  });

  it("sends the selected self-introduction format to document analysis", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("option", { name: "지원동기" }));
    await sendUserMessage("Node.js API와 PostgreSQL 이력 테이블을 만든 경험으로 초안 작성해줘.");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/career-workflow/document-session"),
        expect.objectContaining({ method: "POST" })
      );
    });
    const documentSessionCall = fetchMock.mock.calls.find(
      ([input, init]) => String(input).includes("/api/career-workflow/document-session") && init?.method === "POST"
    );
    const body = JSON.parse(String(documentSessionCall?.[1]?.body));

    expect(body.target).toMatchObject({
      formatLabel: "지원동기",
      questionText: "지원 동기와 입사 후 기여 계획을 작성해 주세요.",
      charLimit: 700,
      charCountRule: "with_spaces"
    });
    expect(body.aiSelection).toEqual({ mode: "manual", providerId: "codex_bridge" });
  });

  it("keeps writing conditions out of the side panel", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    expect(screen.queryByLabelText("대화 기반 작성 기준")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("자소서 조건 입력")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("작성 규칙")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("직무 요구사항")).not.toBeInTheDocument();
  });

  it("sends chat-derived writing conditions in the plan payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume(`${USER_RESUME}\n\n800자로 두괄식으로 작성하고 학교명은 쓰지 마세요.`);
    expect(screen.getByText(/자료를 받았어/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.target.questionText).toContain("지원 직무");
    expect(body.target.charLimit).toBe(800);
    expect(body.target.blindRecruitment).toBe(true);
    expect(body.target.requirementSourceText).toContain("두괄식");
    expect(body.target.writingStyle).toBe("담백한 실무형");
    expect(body.experienceInput.manualExperienceText).toContain("Node.js와 PostgreSQL");
    expect(body.experienceInput.manualExperienceText).not.toContain(SAMPLE_DEMO_RESUME_SNIPPET);
    expect(body.experienceInput.referenceSelfIntroText).toContain("Neet2Work self-introduction reference library");
    expect(body.experienceInput.referenceSelfIntroText).toContain("UMass SBS Cover Letter Guide");
    expect(body.experienceInput.referenceSelfIntroText).toContain("Do not copy examples");
  });

  it("auto-starts the document session for an attached template and GitHub URL, then saves one interview answer", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await attachTextFile(
      "template.txt",
      "문항: 지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내."
    );
    await sendUserMessage("이 GitHub 보고 첨부한 양식에 맞춰 초안 작성해줘. https://github.com/example/applicant-tracker");

    expect(await screen.findByText("첨부 자료와 요청 내용을 읽고 근거 분석을 시작할게.")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/career-workflow/document-session"),
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(screen.getByLabelText("보낸 첨부 파일")).toBeInTheDocument();
    expect(screen.getByLabelText("자기소개서 작성 진행")).toBeInTheDocument();
    expect(screen.getByLabelText("첨부 파일 열기")).toBeInTheDocument();
    expect(screen.getByLabelText("첨부 원본 미리보기")).toBeInTheDocument();
    expect(screen.getAllByText("자소서 양식").length).toBeGreaterThan(0);
    expect(screen.queryByText("GitHub 분석")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence Vault")).not.toBeInTheDocument();
    expect(screen.getAllByText("그 프로젝트에서 네가 직접 맡은 역할과 범위는 어디까지였어?").length).toBeGreaterThan(0);
    expect(screen.queryByText("본인 역할")).not.toBeInTheDocument();

    expect(screen.queryByPlaceholderText("답변을 입력한 뒤 저장하세요")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "답변 저장" })).not.toBeInTheDocument();

    expect(screen.getAllByText("그 프로젝트에서 네가 직접 맡은 역할과 범위는 어디까지였어?").length).toBeGreaterThan(0);
    expect(screen.getAllByText("가초안").length).toBeGreaterThan(0);
    expect(screen.getByText("보완 필요")).toBeInTheDocument();
    expect(screen.getByText("제출 준비도")).toBeInTheDocument();
    expect(screen.getByText(/실전 백엔드 엔지니어 직무에 맞춰/)).toBeInTheDocument();

    const chatInput = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(chatInput, {
      target: { value: "백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다." }
    });
    fireEvent.keyDown(chatInput, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/career-workflow/document-session/answer"),
        expect.objectContaining({ method: "POST" })
      );
    });
    const answerCall = fetchMock.mock.calls.find(
      ([input, init]) => String(input).includes("/api/career-workflow/document-session/answer") && init?.method === "POST"
    );
    const answerBody = JSON.parse(String(answerCall?.[1]?.body));
    expect(answerBody.answer).toBe("백엔드 API 명세와 상태 변경 로직 구현을 직접 맡았습니다.");
    expect(answerBody.aiSelection).toEqual({ mode: "manual", providerId: "codex_bridge" });
    expect(await screen.findByText(/실전 백엔드 엔지니어 직무에 맞춰/)).toBeInTheDocument();
    expect(screen.getByText("답변을 반영해서 제출 준비 기준을 통과한 초안을 준비했어.")).toBeInTheDocument();
    expect(screen.queryByText(/GitHub 근거는 README 기반/)).not.toBeInTheDocument();
  });

  it("saves generated cover-letter and resume packages with content JSON", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await attachTextFile(
      "template.txt",
      "문항: 지원 직무와 관련된 프로젝트 경험을 작성해 주세요. 700자 이내."
    );
    await sendUserMessage("이 GitHub 보고 첨부한 양식에 맞춰 초안 작성해줘. https://github.com/example/applicant-tracker");

    const coverLetterSaveButton = await screen.findByRole("button", { name: "자기소개서 문서함에 저장" });
    fireEvent.click(coverLetterSaveButton);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(
          ([input, init]) => String(input).includes("/api/documents") && init?.method === "POST"
        )
      ).toHaveLength(1);
    });
    const coverLetterSaveCall = fetchMock.mock.calls.find(
      ([input, init]) => String(input).includes("/api/documents") && init?.method === "POST"
    );
    const coverLetterBody = JSON.parse(String(coverLetterSaveCall?.[1]?.body));
    expect(coverLetterBody).toMatchObject({
      documentType: "cover_letter",
      title: "실전 백엔드 엔지니어 자기소개서 가초안",
      contentJson: {
        source: {
          workflow: "career-document-workflow",
          sessionId: "career-document-session-1",
          completionStatus: "provisional"
        }
      }
    });
    expect(coverLetterBody.content).toContain("문항 1.");
    expect(await screen.findByText("실전 백엔드 엔지니어 자기소개서 가초안 문서함 저장 완료")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이력서 문서함에 저장" }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(
          ([input, init]) => String(input).includes("/api/documents") && init?.method === "POST"
        )
      ).toHaveLength(2);
    });
    const saveCalls = fetchMock.mock.calls.filter(
      ([input, init]) => String(input).includes("/api/documents") && init?.method === "POST"
    );
    const resumeBody = JSON.parse(String(saveCalls[1]?.[1]?.body));
    expect(resumeBody).toMatchObject({
      documentType: "resume",
      title: "실전 백엔드 엔지니어 이력서 가초안",
      contentJson: {
        source: {
          workflow: "career-document-workflow",
          sessionId: "career-document-session-1",
          completionStatus: "provisional"
        }
      }
    });
    expect(resumeBody.content).toContain("희망 직무: 실전 백엔드 엔지니어");
    expect(await screen.findByText("실전 백엔드 엔지니어 이력서 가초안 문서함 저장 완료")).toBeInTheDocument();
  });

  it("injects a selected saved cover letter only as style reference", async () => {
    setStoredAuthSession();
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const referenceCard = await screen.findByLabelText("자소서 레퍼런스");
    expect(within(referenceCard).getByText("백엔드 지원 자소서")).toBeInTheDocument();

    fireEvent.click(within(referenceCard).getByRole("button", { name: "선택" }));
    expect(within(referenceCard).getByRole("button", { name: "해제" })).toBeInTheDocument();

    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const documentCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/documents?"));
    expect(documentCall).toBeTruthy();
    expect((documentCall?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer test-access-token");

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.manualExperienceText).toContain(USER_RESUME);
    expect(body.experienceInput.manualExperienceText).not.toContain(savedCoverLetterReference.content);
    expect(body.experienceInput.referenceSelfIntroText).toContain("Selected user-saved cover letter reference");
    expect(body.experienceInput.referenceSelfIntroText).toContain(savedCoverLetterReference.title);
    expect(body.experienceInput.referenceSelfIntroText).toContain(savedCoverLetterReference.content);
    expect(body.experienceInput.referenceSelfIntroText).toContain("Never treat names, companies, schools, metrics");
    expect(body.experienceInput.referenceSelfIntroText).toContain("Never copy or lightly paraphrase sentences");
  });

  it("ignores stale saved cover letter reference loads after auth changes", async () => {
    setStoredAuthSession();

    const staleReference = {
      ...savedCoverLetterReference,
      id: "stale-cover-letter-reference",
      title: "오래된 자소서"
    };
    const currentReference = {
      ...savedCoverLetterReference,
      id: "current-cover-letter-reference",
      title: "최신 자소서"
    };
    const firstDocumentResponse = deferredApiResponse({ data: [staleReference], count: 1 });
    const secondDocumentResponse = deferredApiResponse({ data: [currentReference], count: 1 });
    const defaultFetchMock = createDraftWorkflowFetchMock();
    let documentRequestCount = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/documents")) {
        documentRequestCount += 1;
        return documentRequestCount === 1 ? firstDocumentResponse.promise : secondDocumentResponse.promise;
      }

      return defaultFetchMock(input, init);
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText(apiJob.title);
    await waitFor(() => expect(documentRequestCount).toBe(1));

    act(() => {
      window.dispatchEvent(new Event("neet2work.auth.changed"));
    });
    await waitFor(() => expect(documentRequestCount).toBe(2));

    await act(async () => {
      secondDocumentResponse.resolve();
    });
    expect(await screen.findByText(currentReference.title)).toBeInTheDocument();

    await act(async () => {
      firstDocumentResponse.resolve();
    });
    await waitFor(() => {
      expect(screen.queryByText(staleReference.title)).not.toBeInTheDocument();
    });
    expect(screen.getByText(currentReference.title)).toBeInTheDocument();
  });

  it("includes attached text file content in the plan payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.txt", "첨부 파일 본문 텍스트입니다.");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.portfolioText).toContain("첨부 파일 본문 텍스트입니다.");
    expect(body.experienceInput.manualExperienceText).toContain("Node.js와 PostgreSQL");
  });

  it("routes requirement-like attachments to target requirements instead of experience evidence", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile(
      "requirements.txt",
      "자기소개 작성요령\n소 제 목을 작성하세요.\n요구사항: 두괄식으로 쓰고 구체 경험을 포함하세요."
    );
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes("/api/draft-workflow/plan"))
      ).toBe(true);
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.target.requirementSourceText).toContain("두괄식");
    expect(body.experienceInput.portfolioText ?? "").not.toContain("두괄식");
    expect(body.experienceInput.manualExperienceText).toContain("Node.js와 PostgreSQL");
  });

  it("allows draft workflow with only an attached text file", async () => {
    const attachOnlyResume =
      "첨부 파일만으로도 분석 가능한 충분히 긴 자기소개 본문 텍스트입니다.";

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.txt", attachOnlyResume);

    const generateButton = await screen.findByRole("button", { name: /문항 분석 시작/i });
    expect(generateButton).toBeEnabled();

    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.portfolioText).toContain(attachOnlyResume);
    expect(body.experienceInput.manualExperienceText ?? "").not.toContain(USER_RESUME);
  });

  it("includes extracted pdf attachments in the plan payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachDocumentFile("resume.pdf", "%PDF-1.4", "application/pdf");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/resume/extract"),
      expect.objectContaining({ method: "POST" })
    );

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.manualExperienceText).toContain("Node.js와 PostgreSQL");
    expect(body.experienceInput.portfolioText).toContain("PDF에서 추출한 포트폴리오 본문입니다.");
  });

  it("clears previous draft results when a new attachment is added", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);
    expect((await screen.findAllByText(/Fallback \(사용 가능한 AI 없음\)/)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("extra.txt", "새로 첨부한 추가 자기소개 본문 텍스트입니다.");

    expect(screen.queryByText(/Fallback \(사용 가능한 AI 없음\)/)).not.toBeInTheDocument();
  });

  it("excludes removed attachment content from the plan payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.txt", "제거될 첨부 파일 본문 텍스트입니다.");
    fireEvent.click(screen.getByRole("button", { name: "resume.txt 제거" }));
    await waitFor(() => {
      expect(screen.queryByLabelText("첨부 파일")).not.toBeInTheDocument();
    });
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.portfolioText ?? "").not.toContain("제거될 첨부 파일 본문 텍스트입니다.");
  });

  it("disables draft generation when resume text is shorter than 10 characters", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await confirmNewChat();

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: "a" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await screen.findByText(/자료를 받았어/);

    fireEvent.change(textarea, { target: { value: "b" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    const generateButton = await screen.findByRole("button", { name: /문항 분석 시작/i });
    expect(generateButton).toBeDisabled();
    expect(screen.getByText("자기소개 내용을 10자 이상 입력해야 분석할 수 있습니다.")).toBeInTheDocument();
  });

  it("renders draft workflow fields after a successful request", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);

    expect((await screen.findAllByText(/Fallback \(사용 가능한 AI 없음\)/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText("결과 수치가 확인되면 설득력이 더 높아집니다.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("API 장애 대응 경험을 설명해 주세요.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요.").length).toBeGreaterThan(0);
    expect(await screen.findByText(/문제 상황에서 API 안정성을 확보하기 위해/)).toBeInTheDocument();
    expect(screen.getAllByText("74").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "다음 질문 이어가기" }).querySelector("img")?.getAttribute("src")
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "다음 질문 이어가기" }).querySelector("img")
    ).toHaveAttribute("data-icon-name", "followUp");
  });

  it("shows an error message when draft workflow request fails", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({ data: providerStatuses });
      }

      if (url.includes("/api/draft-workflow/plan")) {
        return errorResponse();
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("문항 분석 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    expect(screen.queryByText(/Fallback \(사용 가능한 AI 없음\)/)).not.toBeInTheDocument();
  });

  it("clears stale draft results when a retry fails after a successful run", async () => {
    let draftAttempt = 0;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({ data: providerStatuses });
      }

      if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
        return apiResponse({ data: workflowPlanResult });
      }

      if (url.includes("/api/draft-workflow/draft") && init?.method === "POST") {
        draftAttempt += 1;
        if (draftAttempt === 1) {
          return apiResponse({ data: workflowDraftResult });
        }
        return errorResponse();
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);
    expect(await screen.findByText(/문제 상황에서 API 안정성을 확보하기 위해/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/draft-workflow/draft")).length).toBe(1);

    const retryButton = await screen.findByRole("button", { name: /개요 확인 및 초안 생성/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/draft-workflow/draft")).length).toBe(2);
    });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("초안 생성 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    });
    await waitFor(() => {
      expect(screen.queryByText(/문제 상황에서 API 안정성을 확보하기 위해/)).not.toBeInTheDocument();
    });
  });

  it("clears draft results when the user sends a new message after success", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);
    expect((await screen.findAllByText(/Fallback \(사용 가능한 AI 없음\)/)).length).toBeGreaterThan(0);

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: "추가로 캐시 최적화 경험도 있습니다." } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(screen.queryByText(/Fallback \(사용 가능한 AI 없음\)/)).not.toBeInTheDocument();
    });
  });

  it("drops ready state immediately when the user sends another message", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    expect(screen.getByRole("button", { name: /문항 분석 시작/i })).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, {
      target: { value: "추가로 Docker 기반 배포 파이프라인을 운영한 경험도 있습니다." },
    });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(screen.queryByRole("button", { name: /문항 분석 시작/i })).not.toBeInTheDocument();
  });

  it("ignores stale AI reply timers when the user sends another message quickly", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: USER_RESUME } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await new Promise((resolve) => window.setTimeout(resolve, 300));

    fireEvent.change(textarea, {
      target: { value: "추가로 Docker 기반 배포 파이프라인을 운영한 경험도 있습니다." },
    });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await screen.findByText(/자료를 받았어/);
    expect(screen.getAllByText(/자료를 받았어/).length).toBe(1);
  });
});

describe("AIDraftChatBuilder chat UX", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn()
    });

    fetchMock = createDraftWorkflowFetchMock();

    vi.stubGlobal("fetch", fetchMock);
    setStoredAuthSession();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows material-received message for normal send and keeps workflow call deferred", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("Backend Bridge");
    await submitUserResume("800자로 두괄식으로 작성해 주세요.");

    const aiMessages = screen.getAllByLabelText("AI 답변");
    const latestAiMessage = aiMessages[aiMessages.length - 1];
    expect(latestAiMessage).toHaveTextContent(/입력한 작성 조건을 반영해 둘게요/);
    expect(latestAiMessage).toHaveTextContent(/초안 작성이 필요하면 문항과 근거를 기준으로 바로 분석할게/);
    expect(latestAiMessage).not.toHaveTextContent("800자로");
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/draft-workflow/plan"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("starts analysis automatically when the user asks for analysis or a draft", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("Backend Bridge");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, {
      target: {
        value: "https://github.com/r2gul4r 첨부한 자소서 양식에 맞춰서 초안을 작성해줘. 부족한 정보는 보완 질문으로 남겨줘."
      }
    });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(await screen.findByText("첨부 자료와 요청 내용을 읽고 근거 분석을 시작할게.")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/career-workflow/document-session"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const documentSessionCall = fetchMock.mock.calls.find(
      ([input, init]) => String(input).includes("/api/career-workflow/document-session") && init?.method === "POST"
    );
    expect(documentSessionCall).toBeTruthy();
    const body = JSON.parse(String(documentSessionCall?.[1]?.body));
    expect(body.message).toContain("https://github.com/r2gul4r");
    expect(body.message).toContain("첨부한 자소서 양식에 맞춰서 초안을 작성해줘");
    expect(body.target.questionText).toBe("지원 직무와 관련된 프로젝트 경험을 구체적으로 작성해 주세요.");
    expect(body.target.questionText).not.toContain("보완 질문");
    expect(body.aiSelection).toEqual({ mode: "manual", providerId: "codex_bridge" });
  });

  it("sends selected profile contexts to the document analysis session", async () => {
    setStoredAuthSession();
    render(<AIDraftChatBuilder />);

    await screen.findByText("Backend Bridge");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "프로필 추가" }));
    fireEvent.click(await screen.findByRole("option", { name: /백엔드 지원 프로필/ }));

    await sendUserMessage("https://github.com/r2gul4r 기준으로 자기소개서 초안 작성해줘.");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/career-workflow/document-session"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const documentSessionCall = fetchMock.mock.calls.find(
      ([input, init]) => String(input).includes("/api/career-workflow/document-session") && init?.method === "POST"
    );
    const body = JSON.parse(String(documentSessionCall?.[1]?.body));
    expect(body.profileContexts).toHaveLength(1);
    expect(body.profileContexts[0]).toMatchObject({
      profileId: savedCandidateProfile.id,
      title: savedCandidateProfile.title,
      skills: savedCandidateProfile.skills
    });
    expect(body.profileContexts[0].profileJson).toEqual(savedCandidateProfileJson);
  });

  it("opens a confirmation dialog instead of resetting immediately on new chat", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /^\+?새 대화$/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("새 대화를 시작할까요?")).toBeInTheDocument();
    expect(screen.getByText("현재 대화와 분석 결과가 초기화됩니다.")).toBeInTheDocument();
    expect(getUserMessage()).toBeInTheDocument();
  });

  it("preserves the conversation when new chat confirmation is cancelled", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /^\+?새 대화$/i }));
    fireEvent.click(await screen.findByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getUserMessage()).toBeInTheDocument();
  });

  it("preserves the conversation when Escape closes the new chat dialog", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /^\+?새 대화$/i }));
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(getUserMessage()).toBeInTheDocument();
  });

  it("resets the conversation only after confirming new chat start", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await confirmNewChat();

    expect(screen.queryByText(USER_RESUME)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("AI 답변")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("메시지를 입력하세요...")).toBeInTheDocument();
  });

  it("does not render the header AI settings button", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    expect(screen.queryByRole("button", { name: "AI 설정" })).not.toBeInTheDocument();
  });

  it("keeps composer controls inside a single pill bar", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");

    const composerBar = screen.getByPlaceholderText("메시지를 입력하세요...").closest(".aiDraftComposerBar");
    expect(composerBar).toBeTruthy();

    const scoped = within(composerBar as HTMLElement);
    expect(scoped.getByRole("button", { name: "작성 옵션" })).toBeInTheDocument();
    expect(scoped.getByPlaceholderText("메시지를 입력하세요...")).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: /AI provider 선택/i })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "메시지 보내기" })).toBeInTheDocument();
    expect(scoped.getByRole("button", { name: "메시지 보내기" }).querySelector('[data-icon-name="arrowUp"]')).toBeTruthy();
  });

  it("opens composer options from the plus button", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));

    const optionsDialog = screen.getByRole("dialog", { name: "작성 옵션" });
    expect(optionsDialog).toHaveClass("aiDraftComposerOptionsMenuCompact");
    expect(screen.getByRole("button", { name: "사진 및 파일 추가" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "프로필 추가" })).toBeInTheDocument();
    expect(screen.queryByText("준비 중")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "문체 설정" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "단답 보완 질문" })).toBeInTheDocument();
    expect(optionsDialog.querySelectorAll(".aiDraftComposerMenuDivider").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("option", { name: "성과 강조형" })).not.toBeInTheDocument();
  });

  it("adds a selected profile from the plus menu to the plan payload", async () => {
    setStoredAuthSession();
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "프로필 추가" }));

    const profileOption = await screen.findByRole("option", { name: /백엔드 지원 프로필/ });
    fireEvent.click(profileOption);

    expect(screen.getByText("프로필 근거")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /문항 분석 시작/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const profileCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/profiles"));
    expect(profileCall).toBeTruthy();
    expect((profileCall?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer test-access-token");

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.profileContexts).toHaveLength(1);
    expect(body.experienceInput.profileContexts[0].profileId).toBe(savedCandidateProfile.id);
    expect(body.experienceInput.profileContexts[0].title).toBe(savedCandidateProfile.title);
    expect(body.experienceInput.profileContexts[0].profileJson).toEqual(savedCandidateProfileJson);
    expect(body.experienceInput.manualExperienceText ?? "").not.toContain(savedCandidateProfile.profileText);
  });

  it("opens profile add from slash input and removes the slash after selection", async () => {
    setStoredAuthSession();
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: "/" } });

    expect(screen.getByRole("dialog", { name: "작성 옵션" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "프로필 추가" }));
    fireEvent.click(await screen.findByRole("option", { name: /백엔드 지원 프로필/ }));

    expect(textarea).toHaveValue("");
    expect(screen.getByText("백엔드 지원 프로필")).toBeInTheDocument();
    await waitFor(() => expect(textarea).toHaveFocus());
  });

  it("supports arrow-key navigation in slash-opened composer options", async () => {
    setStoredAuthSession();
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: "/" } });

    const optionsDialog = screen.getByRole("dialog", { name: "작성 옵션" });
    const attachButton = screen.getByRole("button", { name: "사진 및 파일 추가" });
    const profileButton = screen.getByRole("button", { name: "프로필 추가" });

    await waitFor(() => expect(attachButton).toHaveFocus());

    fireEvent.keyDown(optionsDialog, { key: "ArrowDown" });
    expect(profileButton).toHaveFocus();

    fireEvent.keyDown(profileButton, { key: "ArrowRight" });
    expect(await screen.findByRole("listbox", { name: "프로필 추가" })).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole("option", { name: /백엔드 지원 프로필/ })).toHaveFocus()
    );

    fireEvent.keyDown(screen.getByRole("option", { name: /백엔드 지원 프로필/ }), { key: "ArrowLeft" });
    await waitFor(() => expect(profileButton).toHaveFocus());
    expect(screen.queryByRole("listbox", { name: "프로필 추가" })).not.toBeInTheDocument();
  });

  it("uses Tab as selection for composer menu items", async () => {
    setStoredAuthSession();
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: "/" } });

    const profileButton = screen.getByRole("button", { name: "프로필 추가" });
    profileButton.focus();
    fireEvent.keyDown(profileButton, { key: "Tab" });

    const profileOption = await screen.findByRole("option", { name: /백엔드 지원 프로필/ });
    await waitFor(() => expect(profileOption).toHaveFocus());

    fireEvent.keyDown(profileOption, { key: "Tab" });

    expect(screen.getByText("프로필 근거")).toBeInTheDocument();
    expect(screen.getByText("백엔드 지원 프로필")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "작성 옵션" })).not.toBeInTheDocument();
    await waitFor(() => expect(textarea).toHaveFocus());
  });

  it("uses Tab as selection in the tone submenu", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));

    const toneButton = screen.getByRole("button", { name: "문체 설정" });
    toneButton.focus();
    fireEvent.keyDown(toneButton, { key: "Tab" });

    const toneOption = await screen.findByRole("option", { name: "성과 강조형" });
    toneOption.focus();
    fireEvent.keyDown(toneOption, { key: "Tab" });

    expect(screen.queryByRole("dialog", { name: "작성 옵션" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByPlaceholderText("메시지를 입력하세요...")).toHaveFocus());
  });

  it("removes the most recently added profile chip after two Backspace presses on an empty input", async () => {
    fetchMock = createDraftWorkflowFetchMock({
      profiles: [savedCandidateProfile, savedSecondaryCandidateProfile]
    });
    vi.stubGlobal("fetch", fetchMock);
    setStoredAuthSession();
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "프로필 추가" }));
    fireEvent.click(await screen.findByRole("option", { name: /백엔드 지원 프로필/ }));
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "프로필 추가" }));
    fireEvent.click(await screen.findByRole("option", { name: /프론트엔드 지원 프로필/ }));

    expect(screen.getByText("백엔드 지원 프로필")).toBeInTheDocument();
    expect(screen.getByText("프론트엔드 지원 프로필")).toBeInTheDocument();
    await waitFor(() => expect(textarea).toHaveFocus());

    fireEvent.keyDown(textarea, { key: "Backspace" });
    expect(screen.getByText("프론트엔드 지원 프로필")).toBeInTheDocument();

    fireEvent.keyDown(textarea, { key: "Backspace" });

    await waitFor(() => expect(screen.queryByText("프론트엔드 지원 프로필")).not.toBeInTheDocument());
    expect(screen.getByText("백엔드 지원 프로필")).toBeInTheDocument();
    expect(textarea).toHaveValue("");
  });

  it("removes the most recently added attachment chip after two Backspace presses on an empty input", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    await attachTextFile("first-resume.txt", "첫 번째 첨부 파일 본문입니다.");
    await attachTextFile("second-resume.txt", "두 번째 첨부 파일 본문입니다.");

    expect(screen.getByText(/first-resume\.txt/)).toBeInTheDocument();
    expect(screen.getByText(/second-resume\.txt/)).toBeInTheDocument();

    textarea.focus();
    fireEvent.keyDown(textarea, { key: "Backspace" });
    expect(screen.getByText(/second-resume\.txt/)).toBeInTheDocument();

    fireEvent.keyDown(textarea, { key: "Backspace" });

    await waitFor(() => expect(screen.queryByText(/second-resume\.txt/)).not.toBeInTheDocument());
    expect(screen.getByText(/first-resume\.txt/)).toBeInTheDocument();
    expect(textarea).toHaveValue("");
  });

  it("excludes removed profile contexts from the plan payload", async () => {
    setStoredAuthSession();
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "프로필 추가" }));
    fireEvent.click(await screen.findByRole("option", { name: /백엔드 지원 프로필/ }));
    fireEvent.click(screen.getByRole("button", { name: "백엔드 지원 프로필 제거" }));

    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.profileContexts).toBeUndefined();
  });

  it("keeps the composer input empty and aligned after removing a selected profile", async () => {
    setStoredAuthSession();
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "프로필 추가" }));
    fireEvent.click(await screen.findByRole("option", { name: /백엔드 지원 프로필/ }));

    const composerBar = textarea.closest(".aiDraftComposerBar");
    expect(composerBar).toHaveClass("withAttachments");

    fireEvent.click(screen.getByRole("button", { name: "백엔드 지원 프로필 제거" }));

    await waitFor(() => expect(composerBar).not.toHaveClass("withAttachments"));
    expect(textarea).toHaveValue("");
    expect(textarea).not.toHaveTextContent("null");
    expect(document.body).not.toHaveTextContent(/^null$/);
  });

  it("closes composer options when the chat input is clicked", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    expect(screen.getByRole("dialog", { name: "작성 옵션" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByPlaceholderText("메시지를 입력하세요..."));

    expect(screen.queryByRole("dialog", { name: "작성 옵션" })).not.toBeInTheDocument();
  });

  it("opens the tone submenu from the composer options dialog", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "문체 설정" }));

    const toneSubmenu = document.querySelector(".aiDraftComposerToneSubmenu");
    expect(toneSubmenu).toBeTruthy();
    expect(toneSubmenu).toHaveClass("aiDraftComposerToneSubmenuAligned");
    expect(screen.getByRole("listbox", { name: "문체 설정" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "담백한 실무형" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "성과 강조형" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "성장 서사형" })).toBeInTheDocument();
    expect(
      document.querySelector(".aiDraftComposerSubmenuTrigger[aria-expanded='true'] .aiDraftComposerSubmenuChevron")
    ).toBeTruthy();
  });

  it("opens the hidden file input from the attach menu item", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "사진 및 파일 추가" }));
    window.dispatchEvent(new Event("focus"));

    expect(clickSpy).toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "작성 옵션" })).not.toBeInTheDocument();
    await waitFor(() => expect(textarea).toHaveFocus());
    clickSpy.mockRestore();
  });

  it("keeps profile and attachment chips in one insertion order", async () => {
    setStoredAuthSession();
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    await attachTextFile("resume.md", "마크다운 첨부 본문입니다.");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "프로필 추가" }));
    fireEvent.click(await screen.findByRole("option", { name: /백엔드 지원 프로필/ }));

    const chipNames = Array.from(document.querySelectorAll(".aiDraftAttachedFileName")).map((node) =>
      node.textContent?.trim()
    );
    expect(chipNames).toEqual(["resume.md", "백엔드 지원 프로필"]);

    fireEvent.keyDown(textarea, { key: "Backspace" });
    expect(screen.getByText("백엔드 지원 프로필")).toBeInTheDocument();

    fireEvent.keyDown(textarea, { key: "Backspace" });

    await waitFor(() => expect(screen.queryByText("백엔드 지원 프로필")).not.toBeInTheDocument());
    expect(screen.getByText(/resume\.md/)).toBeInTheDocument();
  });

  it("shows attached text files as chips above the composer bar", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    await attachTextFile("resume.md", "마크다운 첨부 본문입니다.");

    expect(screen.getByText(/resume\.md/)).toBeInTheDocument();
    await waitFor(() => expect(textarea).toHaveFocus());
    expect(screen.getByText("MD")).toBeInTheDocument();
    const composerBar = document.querySelector(".aiDraftComposerBar.withAttachments") as HTMLElement;
    const attachmentChip = document.querySelector(".aiDraftAttachedFileChip") as HTMLElement;
    expect(composerBar).toContainElement(attachmentChip);
    expect(attachmentChip).toHaveClass("type-markdown");
    expect(document.querySelector(".aiDraftAttachedFileIcon.markdown")).toBeInTheDocument();

    const sendButton = document.querySelector(".aiDraftComposerSendButton") as HTMLButtonElement;
    expect(sendButton).not.toBeDisabled();
    fireEvent.click(sendButton);
    await waitFor(() => {
      expect(document.querySelector(".aiDraftComposerSendButton")).toBeDisabled();
    });
    expect(getHiddenFileInput()).toHaveAttribute("accept", ".txt,.md,.pdf,.docx");
  });

  it("attaches dropped files to the composer", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const composerBar = document.querySelector(".aiDraftComposerBar") as HTMLElement;
    const file = new File(["드롭 첨부 본문입니다."], "drop-resume.txt", { type: "text/plain" });

    fireEvent.dragEnter(composerBar, {
      dataTransfer: {
        files: [file],
        items: [],
        types: ["Files"]
      }
    });
    expect(composerBar).toHaveClass("isDraggingFile");

    await dropTextFile("drop-resume.txt", "드롭 첨부 본문입니다.");

    expect(composerBar).not.toHaveClass("isDraggingFile");
    expect(screen.getByText(/drop-resume\.txt/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "메시지 보내기" })).toBeEnabled();
  });

  it("attaches pasted files without changing plain text paste behavior", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");

    fireEvent.paste(textarea, {
      clipboardData: {
        files: [],
        items: [],
        types: ["text/plain"]
      }
    });
    expect(screen.queryByLabelText("첨부 파일")).not.toBeInTheDocument();

    await pasteTextFile("paste-resume.txt", "붙여넣기 첨부 본문입니다.");

    expect(screen.getByText(/paste-resume\.txt/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "메시지 보내기" })).toBeEnabled();
  });

  it("sends typed text with an attachment and keeps submitted file text for analysis", async () => {
    const typedText = "지원자 관리 웹서비스 프로젝트에서 React 화면과 Node.js API를 연결했습니다.";
    const fileBody = "첨부 파일 본문 텍스트입니다.";

    render(<AIDraftChatBuilder />);

    await waitFor(() => {
      expect(document.querySelector(".aiDraftComposerBar")).toBeInTheDocument();
    });
    await attachTextFile("resume.txt", fileBody);

    const textarea = document.querySelector(".aiDraftComposer textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: typedText } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(document.querySelector(".aiDraftAttachedFileChip")).not.toBeInTheDocument();
    });
    expect(
      screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === "p" && content.includes(typedText) && !content.includes("resume.txt");
      })
    ).toBeInTheDocument();
    const sentAttachmentCard = document.querySelector(".aiDraftSentAttachmentCard") as HTMLElement;
    expect(sentAttachmentCard).toBeInTheDocument();
    expect(sentAttachmentCard).toHaveClass("type-text");
    expect(sentAttachmentCard).toHaveTextContent("resume.txt");
    expect(sentAttachmentCard).toHaveTextContent("문서");
    expect(document.querySelector(".aiDraftBubble.withSentAttachments")).toBeInTheDocument();

    const startButton = await screen.findByRole("button", { name: /문항 분석 시작/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.experienceInput.portfolioText).toContain(fileBody);
    expect(body.experienceInput.manualExperienceText).toContain(typedText);
  });

  it("uses file-specific attachment visuals for pdf files", async () => {
    render(<AIDraftChatBuilder />);

    await waitFor(() => {
      expect(document.querySelector(".aiDraftComposerBar")).toBeInTheDocument();
    });
    await attachDocumentFile("resume.pdf", "%PDF-1.4", "application/pdf");

    expect(screen.getByText(/resume\.pdf/)).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(document.querySelector(".aiDraftAttachedFileChip.type-pdf")).toBeInTheDocument();
    const icon = document.querySelector(".aiDraftAttachedFileIcon.pdf") as HTMLElement;
    expect(icon).toBeInTheDocument();
    expect(icon.querySelector(".aiDraftAttachedFileIconBadge")).toBeNull();
  });

  it("renders converted docx files inside the original document viewer", async () => {
    render(<AIDraftChatBuilder />);

    await waitFor(() => {
      expect(document.querySelector(".aiDraftComposerBar")).toBeInTheDocument();
    });
    await attachDocumentFile(
      "resume.docx",
      "docx bytes",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    await sendUserMessage("첨부한 파일을 보고 자소서 초안 작성해줘.");

    expect(await screen.findByLabelText("첨부 원본 미리보기")).toBeInTheDocument();
    expect(screen.getByTitle("resume.docx DOCX 미리보기")).toBeInTheDocument();
    expect(screen.queryByLabelText("실시간 문서 미리보기")).not.toBeInTheDocument();
  });

  it("allows sending a docx attachment even when text extraction fails", async () => {
    const extractFailFetch = createDraftWorkflowFetchMock({ extractFails: true });
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => extractFailFetch(input, init));
    render(<AIDraftChatBuilder />);

    await waitFor(() => {
      expect(document.querySelector(".aiDraftComposerBar")).toBeInTheDocument();
    });
    await attachDocumentFile(
      "resume.docx",
      "docx bytes that fail extraction",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    expect(screen.getByText(/resume\.docx/)).toBeInTheDocument();
    expect(screen.getByText(/읽기 실패/)).toBeInTheDocument();
    const sendButton = screen.getByRole("button", { name: "메시지 보내기" });
    await waitFor(() => expect(sendButton).toBeEnabled());
    fireEvent.click(sendButton);

    await waitFor(() => {
      const sentAttachmentCard = document.querySelector(".aiDraftSentAttachmentCard") as HTMLElement;
      expect(sentAttachmentCard).toBeInTheDocument();
      expect(sentAttachmentCard).toHaveClass("type-docx");
      expect(sentAttachmentCard).toHaveClass("error");
      expect(sentAttachmentCard).toHaveTextContent("resume.docx");
      expect(sentAttachmentCard).toHaveTextContent("본문 추출 실패");
    });
    expect(document.querySelector(".aiDraftAttachedFileChip")).not.toBeInTheDocument();
  });

  it("toggles followUp from the composer options menu", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));

    const followUpToggle = screen.getByRole("switch", { name: "단답 보완 질문" });
    expect(followUpToggle).toHaveAttribute("aria-checked", "true");

    fireEvent.click(followUpToggle);
    expect(screen.queryByRole("dialog", { name: "작성 옵션" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByPlaceholderText("메시지를 입력하세요...")).toHaveFocus());
  });

  it("selects tone from the tone submenu and closes both popups", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: "작성 옵션" }));
    fireEvent.click(screen.getByRole("button", { name: "문체 설정" }));

    fireEvent.click(screen.getByRole("option", { name: "성과 강조형" }));

    expect(document.querySelector(".aiDraftComposerToneSubmenu")).toBeNull();
    expect(screen.queryByRole("dialog", { name: "작성 옵션" })).not.toBeInTheDocument();
    expect(document.querySelector(".aiDraftSideHeader strong")?.textContent).toBe("성과 강조형");
    await waitFor(() => expect(screen.getByPlaceholderText("메시지를 입력하세요...")).toHaveFocus());
  });

  it("opens provider selection in the composer", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    fireEvent.click(screen.getByRole("button", { name: /AI provider 선택, 현재 Codex/i }));

    const menu = screen.getByRole("menu", { name: "AI provider 선택" });
    expect(within(menu).queryByRole("menuitemradio", { name: "AI 자동선택" })).not.toBeInTheDocument();
    expect(within(menu).getByRole("menuitemradio", { name: /Codex · 오프라인/i })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitemradio", { name: /Fallback · 온라인/i })).toBeInTheDocument();
  });

  it("sends a message from the composer send button", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");

    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    fireEvent.change(textarea, { target: { value: USER_RESUME } });
    fireEvent.click(screen.getByRole("button", { name: "메시지 보내기" }));

    await waitFor(() => {
      expect(getUserMessage()).toBeInTheDocument();
    });
  });

  it("focuses the input when the composer surface is clicked", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...");
    const composerBar = textarea.closest(".aiDraftComposerBar");
    expect(composerBar).toBeTruthy();

    fireEvent.click(composerBar as HTMLElement);

    expect(document.activeElement).toBe(textarea);
  });

  it("expands the composer textarea without vertical scrolling as input grows", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...") as HTMLTextAreaElement;

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      get: () => 120,
    });

    fireEvent.change(textarea, { target: { value: "첫 줄\n둘째 줄\n셋째 줄\n넷째 줄" } });

    await waitFor(() => {
      expect(textarea.style.height).toBe("120px");
    });
    expect(textarea.style.overflowY).toBe("hidden");
  });

  it("enables textarea scrolling when pasted content exceeds the composer max height", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    const textarea = screen.getByPlaceholderText("메시지를 입력하세요...") as HTMLTextAreaElement;

    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      get: () => 320,
    });

    fireEvent.change(textarea, {
      target: { value: Array.from({ length: 20 }, (_, index) => `경험 줄 ${index + 1}`).join("\n") },
    });

    await waitFor(() => {
      expect(textarea.style.height).toBe("240px");
    });
    expect(textarea.style.overflowY).toBe("auto");
  });

  it("shows an empty conversation summary before the user sends messages", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    expect(screen.getByText("대화를 시작하면 요약이 표시됩니다.")).toBeInTheDocument();
    expect(screen.queryByText("팀 리더로서 프로젝트 일정 재정비 및 소통 체계 구축")).not.toBeInTheDocument();
  });

  it("builds the conversation summary from user messages", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    const summaryCard = screen.getByText("대화 요약").closest(".aiDraftInfoCard");
    expect(summaryCard).toBeTruthy();
    expect(within(summaryCard as HTMLElement).getByText(USER_RESUME)).toBeInTheDocument();
    expect(screen.queryByText("대화를 시작하면 요약이 표시됩니다.")).not.toBeInTheDocument();
    expect(screen.queryByText("팀 리더로서 프로젝트 일정 재정비 및 소통 체계 구축")).not.toBeInTheDocument();
  });

  it("renders only user messages as bubbles", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");

    expect(screen.queryByLabelText("AI 답변")).not.toBeInTheDocument();

    await submitUserResume();
    const userMessage = document.querySelector(".aiDraftMessage.user") as HTMLElement;
    expect(userMessage.querySelector(".aiDraftBubble")).toBeInTheDocument();
    expect(userMessage.querySelector(".aiDraftBubble time")).toBeNull();
    expect(userMessage.querySelector(".aiDraftAssistantResponse")).toBeNull();
  });

  it("collapses long user bubbles and expands them with 더 보기", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume(
      "저는 학교에서 팀 프로젝트로 지원자 관리 웹서비스 비슷한 걸 만든 적이 있습니다. 처음에는 React로 화면 만들고 Node.js로 API 붙이는 정도라고 생각했는데, 하다 보니까 지원 상태가 잘못 바뀌거나 버그가 어디서 난 건지 서로 헷갈리는 일이 많았습니다. 그래서 제가 먼저 이슈를 그냥 적는 게 아니라 급한 오류, 사용자가 불편한 부분, 나중에 고쳐도 되는 부분으로 나눠보자고 했습니다."
    );

    const userBubble = document.querySelector(".aiDraftMessage.user .aiDraftBubble") as HTMLElement;
    expect(userBubble).toHaveClass("expandable");
    expect(userBubble).toHaveClass("collapsed");
    expect(userBubble.querySelector("time")).toBeNull();

    const moreButton = within(userBubble).getByRole("button", { name: /더 보기/ });
    expect(moreButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(moreButton);

    expect(userBubble).toHaveClass("expanded");
    expect(userBubble).not.toHaveClass("collapsed");
    expect(within(userBubble).getByRole("button", { name: /접기/ })).toHaveAttribute("aria-expanded", "true");
  });
});

describe("AIDraftChatBuilder plan test plan coverage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.pushState({}, "", "/ai-analysis?jobId=careercross-1591647");
    fetchMock = createDraftWorkflowFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    setStoredAuthSession();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows provider online/offline status in the sidebar", async () => {
    render(<AIDraftChatBuilder />);

    expect(await screen.findByText(/Codex · 오프라인/)).toBeInTheDocument();
    expect(screen.getByText(/Gemini · 오프라인/)).toBeInTheDocument();
    expect(screen.getByText(/Local · 오프라인/)).toBeInTheDocument();
    expect(screen.getByText(/Agy CLI · 오프라인/)).toBeInTheDocument();
    expect(screen.getByText(/Fallback · 온라인/)).toBeInTheDocument();
  });

  it("does not mark the header online when only fallback is available", async () => {
    render(<AIDraftChatBuilder />);

    expect(await screen.findByText("연결 안됨")).toBeInTheDocument();
    expect(screen.queryByText("AI ONLINE")).not.toBeInTheDocument();
  });

  it("shows connection status separately from actual provider before planning", async () => {
    const defaultFetchMock = createDraftWorkflowFetchMock();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({
          data: providerStatuses.map((provider) => ({
            ...provider,
            online: provider.providerId !== "fallback",
            configured: provider.providerId !== "fallback"
          }))
        });
      }

      return defaultFetchMock(input, init);
    });

    render(<AIDraftChatBuilder />);

    expect(await screen.findByText("연결됨")).toBeInTheDocument();
    expect(screen.getByText(/실제 생성 provider:/)).toHaveTextContent("실제 생성 provider: 분석 전");
  });

  it("starts Codex OAuth login from the provider status card", async () => {
    const defaultFetchMock = createDraftWorkflowFetchMock();
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/draft-workflow/providers/codex/login") && init?.method === "POST") {
        return apiResponse({
          data: {
            loginId: "login_test",
            status: "pending",
            error: null,
            account: null,
            login: {
              type: "chatgpt",
              loginId: "login_test",
              authUrl: "https://auth.openai.com/oauth/test",
              verificationUrl: null,
              userCode: null
            },
            expiresAt: "2026-06-02T00:00:00.000Z"
          }
        });
      }

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({
          data: providerStatuses.map((provider) =>
            provider.providerId === "codex_bridge"
              ? { ...provider, configured: true, reason: "codex_not_logged_in" }
              : provider
          )
        });
      }

      return defaultFetchMock(input, init);
    });

    render(<AIDraftChatBuilder />);

    await screen.findByRole("button", { name: "Codex 연결" });
    fireEvent.click(screen.getByRole("button", { name: "Codex 연결" }));

    await waitFor(() => {
      expect(openMock).toHaveBeenCalledWith("https://auth.openai.com/oauth/test", "_blank", "noopener,noreferrer");
    });
    expect(screen.getByText("브라우저에서 Codex 로그인을 완료해 주세요.")).toBeInTheDocument();
  });

  it("uses Codex routing by default in the plan payload", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.aiSelection).toEqual({ mode: "manual", providerId: "codex_bridge" });
  });

  it("switches to manual mode when a provider is selected", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /AI provider 선택, 현재 Codex/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Gemini · 오프라인/i }));

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.aiSelection.mode).toBe("manual");
    expect(body.aiSelection.providerId).toBe("gemini");
  });

  it("shows Agy CLI in the provider menu", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");

    fireEvent.click(screen.getByRole("button", { name: /AI provider 선택, 현재 Codex/i }));

    expect(screen.getByRole("menuitemradio", { name: /Agy CLI · 오프라인/i })).toBeInTheDocument();
  });

  it("sends agy_cli as the manual provider when Agy CLI is selected", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /AI provider 선택, 현재 Codex/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Agy CLI · 오프라인/i }));

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.aiSelection.mode).toBe("manual");
    expect(body.aiSelection.providerId).toBe("agy_cli");
  });

  it("does not send the Codex app-server display model as a manual model override", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({
          data: providerStatuses.map((provider) =>
            provider.providerId === "codex_bridge"
              ? {
                  ...provider,
                  online: true,
                  configured: true,
                  models: [
                    {
                      modelId: "codex-app-server",
                      label: "codex-app-server",
                      online: true,
                      quotaExceeded: false,
                      recommended: true
                    }
                  ]
                }
              : provider
          )
        });
      }

      return createDraftWorkflowFetchMock()(input, init);
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("연결됨");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /AI provider 선택/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Codex/i }));
    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/draft-workflow/plan"),
        expect.objectContaining({ method: "POST" })
      );
    });

    const body = getPlanCallBody(fetchMock);
    expect(body.aiSelection).toEqual({ mode: "manual", providerId: "codex_bridge" });
  });

  it("marks fallback mode distinctly from real AI output", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({ data: providerStatuses });
      }

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
        return apiResponse({
          data: {
            ...workflowPlanResult,
            aiMeta: {
              ...aiMeta,
              fallbackReason: "quota_exceeded" as const
            }
          }
        });
      }

      if (url.includes("/api/draft-workflow/draft") && init?.method === "POST") {
        return apiResponse({
          data: {
            ...workflowDraftResult,
            aiMeta: {
              ...aiMeta,
              fallbackReason: "quota_exceeded" as const
            }
          }
        });
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);

    expect((await screen.findAllByText(/Fallback \(할당량 초과\)/)).length).toBeGreaterThan(0);
    expect(document.querySelector(".aiDraftModeBadge.fallback")).toBeTruthy();
    expect(screen.getByText(/실제 생성 provider:/)).toHaveTextContent("Fallback (할당량 초과)");
  });

  it("renders experience cards, outline, draft, and review report in order", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({ data: providerStatuses });
      }

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
        return apiResponse({
          data: {
            ...workflowPlanResult,
            answerStrategy: {
              ...workflowPlanResult.answerStrategy,
              neededQuestions: [
                {
                  questionId: "gap-1",
                  slot: "result_metric",
                  priority: 1,
                  question: "정량 결과를 입력해 주세요.",
                  choices: ["사용자 1000명 증가", "매출 20% 상승"]
                }
              ]
            }
          }
        });
      }

      if (url.includes("/api/draft-workflow/draft") && init?.method === "POST") {
        return apiResponse({ data: workflowDraftResult });
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();

    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    expect(await screen.findByLabelText("경험 카드")).toBeInTheDocument();
    expect(screen.getByLabelText("개요")).toBeInTheDocument();
    expect(screen.getByText("정량 결과를 입력해 주세요.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "사용자 1000명 증가" }));
    fireEvent.click(screen.getByRole("button", { name: "답변 저장" }));

    const draftButton = screen.getByRole("button", { name: /개요 확인 및 초안 생성/i });
    await waitFor(() => expect(draftButton).toBeEnabled());
    fireEvent.click(draftButton);

    expect(await screen.findByText(/문제 상황에서 API 안정성을 확보하기 위해/)).toBeInTheDocument();
    const reviewSummary = screen.getByLabelText("초안 검토 요약");
    expect(within(reviewSummary).getByRole("heading", { name: "수정 우선순위" })).toBeInTheDocument();
    expect(within(reviewSummary).getByRole("heading", { name: "주의해서 쓴 부분" })).toBeInTheDocument();
    expect(within(reviewSummary).getByRole("heading", { name: "추가 확인 질문" })).toBeInTheDocument();
    expect(within(reviewSummary).getByRole("heading", { name: "문단별 근거" })).toBeInTheDocument();
    expect(within(reviewSummary).getByText("결과 수치가 확인되면 설득력이 더 높아집니다.")).toBeInTheDocument();
  });

  it("shows animated loading graphics while AI analysis is pending", async () => {
    const scrollIntoViewMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock
    });
    const planResponse = deferredApiResponse({ data: workflowPlanResult });
    const defaultFetchMock = createDraftWorkflowFetchMock();

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
        return planResponse.promise;
      }

      return defaultFetchMock(input, init);
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    const progressCard = await screen.findByLabelText("AI 초안 생성 진행");
    expect(progressCard).toHaveClass("isLoading");
    expect(document.querySelector(".aiDraftTimeline.hasActiveProgress")).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith(
        expect.objectContaining({
          block: "end"
        })
      );
    });
    expect(progressCard.querySelector(".aiDraftMotionGraph")).toBeInTheDocument();
    expect(progressCard.querySelector(".aiDraftProgressStep.active")).toBeInTheDocument();
    expect(within(progressCard).getByText("문항과 경험을 분석하고 있습니다...")).toBeInTheDocument();

    await act(async () => {
      planResponse.resolve();
    });
    expect(await screen.findByLabelText("경험 카드")).toBeInTheDocument();
  });

  it("opens draft download format menu from one download button", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);

    fireEvent.click(await screen.findByRole("button", { name: "다운로드" }));

    const menu = screen.getByRole("menu", { name: "다운로드 형식 선택" });
    expect(within(menu).getByRole("menuitem", { name: /TXT/ })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Markdown 다운로드/ })).toHaveTextContent("MD");
    expect(within(menu).getByRole("menuitem", { name: /Word 문서 \.doc 다운로드/ })).toHaveTextContent("DOCS");
    expect(within(menu).getByRole("menuitem", { name: /PDF/ })).toBeInTheDocument();
    expect(within(menu).queryByText("마크다운 문서")).not.toBeInTheDocument();
    expect(within(menu).queryByText("Word 호환 .doc")).not.toBeInTheDocument();
    expect(within(menu).queryByText("인쇄 화면에서 저장")).not.toBeInTheDocument();
  });

  it("shows Socratic follow-up questions one at a time", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/draft-workflow/providers")) {
        return apiResponse({ data: providerStatuses });
      }

      if (url.includes("/api/jobs/careercross-1591647")) {
        return apiResponse({ data: apiJob });
      }

      if (url.includes("/api/draft-workflow/plan") && init?.method === "POST") {
        return apiResponse({
          data: {
            ...workflowPlanResult,
            answerStrategy: {
              ...workflowPlanResult.answerStrategy,
              neededQuestions: [
                {
                  questionId: "gap-1",
                  slot: "result_metric",
                  priority: 1,
                  question: "첫 번째 보완 질문입니다.",
                  choices: ["첫 답변"]
                },
                {
                  questionId: "gap-2",
                  slot: "personal_role",
                  priority: 2,
                  question: "두 번째 보완 질문입니다.",
                  choices: ["두 번째 답변"]
                }
              ]
            }
          }
        });
      }

      return errorResponse();
    });

    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    fireEvent.click(screen.getByRole("button", { name: /문항 분석 시작/i }));

    expect(await screen.findByText("첫 번째 보완 질문입니다.")).toBeInTheDocument();
    expect(screen.queryByText("두 번째 보완 질문입니다.")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("직접 입력"), { target: { value: "직접 입력한 첫 답변" } });

    expect(screen.getByDisplayValue("직접 입력한 첫 답변")).toBeInTheDocument();
    expect(screen.getByText("첫 번째 보완 질문입니다.")).toBeInTheDocument();
    expect(screen.queryByText("두 번째 보완 질문입니다.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /개요 확인 및 초안 생성/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "답변 저장" }));

    expect(await screen.findByText("두 번째 보완 질문입니다.")).toBeInTheDocument();
  });

  it("shows fallback provider details after generation", async () => {
    render(<AIDraftChatBuilder />);

    await screen.findByText("실전 백엔드 엔지니어");
    await submitUserResume();
    await runDraftWorkflowGeneration(fetchMock);

    expect((await screen.findAllByText(/Fallback \(사용 가능한 AI 없음\)/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/실제 생성 provider:/)).toHaveTextContent("Fallback (사용 가능한 AI 없음)");
  });
});
