import { z } from "zod";

const optionalStringResultSchema = z.preprocess((value) => (value === null ? undefined : value), z.string().optional());
const optionalNumberResultSchema = z.preprocess((value) => (value === null ? undefined : value), z.number().optional());

export const aiSelectionSchema = z.object({
  mode: z.enum(["auto", "manual"]),
  providerId: z.enum(["codex_bridge", "gemini", "local", "agy_cli", "fallback"]).optional(),
  modelId: z.string().optional()
}).superRefine((selection, ctx) => {
  if (selection.mode === "manual" && !selection.providerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["providerId"],
      message: "manual mode에서는 providerId가 필요합니다."
    });
  }
});

export const draftTargetSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  questionText: z.string().min(5),
  charLimit: z.number().int().positive().optional(),
  charCountRule: z.enum(["with_spaces", "without_spaces", "unknown"]),
  jobPostingText: z.string().min(10),
  blindRecruitment: z.boolean(),
  writingStyle: z.string().optional(),
  sectionName: z.string().optional(),
  requirementSourceText: z.string().optional(),
  previousDraftText: z.string().optional()
});

const profileProjectSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  role: z.string().optional(),
  result: z.string().optional(),
  impact: z.string().optional(),
  achievements: z.array(z.string()).optional()
});

const profileJsonSchema = z.object({
  basics: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    links: z.object({
      github: z.string().optional(),
      portfolio: z.string().optional(),
      blog: z.string().optional()
    })
  }),
  desired: z.object({
    roles: z.array(z.string()),
    industries: z.array(z.string()),
    locations: z.array(z.string()),
    employmentTypes: z.array(z.string())
  }),
  summary: z.object({
    headline: z.string(),
    description: z.string()
  }),
  skills: z.array(z.string()),
  projects: z.array(profileProjectSchema),
  experiences: z.array(z.unknown()),
  certifications: z.array(z.unknown()),
  education: z.array(z.unknown()),
  activities: z.array(z.unknown()),
  metadata: z.object({
    lastUpdatedBy: z.enum(["user", "ai", "system"]),
    lastAiUpdatedAt: z.string().nullable()
  })
});

const draftProfileContextSchema = z.object({
  profileId: z.string().min(1),
  title: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  profileJson: profileJsonSchema,
  profileText: z.string().optional(),
  targetRole: z.string().nullable().optional(),
  targetCompany: z.string().nullable().optional(),
  desiredRoles: z.array(z.string()),
  skills: z.array(z.string())
});

export const draftExperienceInputSchema = z.object({
  portfolioText: z.string().optional(),
  manualExperienceText: z.string().optional(),
  additionalContext: z.string().optional(),
  referenceSelfIntroText: z.string().optional(),
  profileContexts: z.array(draftProfileContextSchema).optional()
});

export const documentFormattingSchema = z.object({
  encoding: z.literal("UTF-8"),
  fontFamily: z.literal("Malgun Gothic"),
  fontDisplayName: z.literal("맑은 고딕"),
  lineSpacing: z.literal("normal"),
  normalizeWhitespace: z.literal(true),
  forbidMojibake: z.literal(true)
});

export const materialStoreSchema = z.object({
  requirements: z.array(
    z.object({
      requirementId: z.string(),
      source: z.enum(["attached_document", "job_posting", "user_input", "reference", "fallback"]),
      text: z.string(),
      priority: z.enum(["critical", "high", "medium", "low"]),
      appliesTo: z.array(z.string())
    })
  ),
  referenceRules: z.array(z.string()),
  profile: z.object({
    coreStrengths: z.array(z.string()),
    tone: z.string(),
    privateConstraints: z.array(z.string())
  }),
  experiences: z.array(
    z.object({
      experienceId: z.string(),
      facts: z.array(z.string()),
      skills: z.array(z.string()),
      usableSections: z.array(z.string()),
      privateConstraints: z.array(z.string()),
      sourceEvidenceIds: z.array(z.string())
    })
  ),
  sectionPlan: z.array(
    z.object({
      sectionName: z.string(),
      mainClaim: z.string(),
      evidenceIds: z.array(z.string()),
      avoidRepeating: z.array(z.string())
    })
  ),
  outputRules: documentFormattingSchema
});

export const evidenceItemSchema = z.object({
  evidenceId: z.string(),
  type: z.enum(["user_statement", "portfolio_text", "job_posting", "gap_answer", "fallback_seed"]),
  content: z.string(),
  confidence: z.enum(["high", "medium", "low"])
});

export const claimSchema = z.object({
  claimId: z.string(),
  text: z.string(),
  supportedBy: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  allowedInDraft: z.boolean()
});

export const experienceCardSchema = z.object({
  experienceId: z.string(),
  source: z.enum(["portfolio", "manual", "conversation", "fallback"]),
  title: z.string(),
  period: optionalStringResultSchema,
  context: optionalStringResultSchema,
  role: optionalStringResultSchema,
  problem: optionalStringResultSchema,
  actions: z.array(
    z.object({
      action: z.string(),
      method: optionalStringResultSchema,
      rationale: optionalStringResultSchema
    })
  ),
  tools: z.array(z.string()),
  outputs: z.array(z.string()),
  results: z.array(
    z.object({
      type: z.enum(["number", "output", "feedback", "learning"]),
      description: z.string(),
      verified: z.boolean()
    })
  ),
  skills: z.array(z.string()),
  evidenceItems: z.array(evidenceItemSchema),
  claimLedger: z.array(claimSchema),
  missingSlots: z.array(z.string()),
  blindRiskFlags: z.array(z.string()),
  interviewDefensibility: z.enum(["high", "medium", "low"])
});

export const fitAssessmentSchema = z.object({
  questionId: z.string(),
  experienceId: z.string(),
  fitScore: z.number().min(0).max(100),
  recommendedUsage: z.enum(["main", "supporting", "avoid"]),
  fitReasons: z.array(z.string()),
  risks: z.array(z.string())
});

export const answerStrategySchema = z.object({
  mainClaim: z.string(),
  narrativePattern: z.enum(["EvidenceSummary", "STAR", "Growth", "CompanyFit", "Collaboration"]),
  primaryExperienceId: z.string(),
  questionBudget: z.number().positive(),
  neededQuestions: z.array(
    z.object({
      questionId: z.string(),
      slot: z.string(),
      priority: z.number().positive(),
      question: z.string(),
      choices: z.array(z.string()).optional()
    })
  )
});

export const aiExecutionMetaSchema = z.object({
  providerId: z.enum(["codex_bridge", "gemini", "local", "agy_cli", "fallback"]),
  modelId: z.string(),
  routingMode: z.enum(["auto", "manual"]),
  usedFallback: z.boolean(),
  fallbackReason: z
    .enum([
      "offline",
      "quota_exceeded",
      "timeout",
      "invalid_output",
      "provider_error",
      "all_providers_unavailable"
    ])
    .optional()
});

export const draftWorkflowStateSchema = z.enum([
  "SESSION_CREATED",
  "TARGET_CAPTURED",
  "QUESTION_ANALYZED",
  "EXPERIENCE_INTAKE_STARTED",
  "EXPERIENCE_CARDS_READY",
  "EXPERIENCE_MATCHED",
  "STRATEGY_READY",
  "GAP_INTERVIEWING",
  "OUTLINE_READY",
  "OUTLINE_CONFIRMED",
  "DRAFT_GENERATED",
  "REVIEW_COMPLETED",
  "REVISION_REQUESTED",
  "FINALIZED",
  "INSUFFICIENT_EVIDENCE",
  "COMPLIANCE_FLAGGED",
  "USER_CONFIRMATION_REQUIRED",
  "REFERENCE_RISK_FLAGGED"
]);

export const draftWorkflowPlanSchema = z.object({
  mode: z.enum(["ai", "fallback"]),
  state: draftWorkflowStateSchema,
  aiMeta: aiExecutionMetaSchema,
  questionRubric: z.object({
    intent: z.string(),
    requiredEvidence: z.array(z.string()),
    mustAvoid: z.array(z.string()),
    blindRules: z.array(z.string())
  }),
  experienceCards: z.array(experienceCardSchema),
  fitAssessments: z.array(fitAssessmentSchema),
  answerStrategy: answerStrategySchema,
  materialStore: materialStoreSchema,
  outline: z.array(
    z.object({
      paragraphId: z.string(),
      purpose: z.string(),
      plannedClaims: z.array(z.string()),
      targetChars: optionalNumberResultSchema
    })
  )
});

export const draftWorkflowDraftSchema = z.object({
  mode: z.enum(["ai", "fallback"]),
  state: draftWorkflowStateSchema,
  aiMeta: aiExecutionMetaSchema,
  draftText: z.string(),
  charCount: z.object({
    withSpaces: z.number(),
    withoutSpaces: z.number(),
    limit: optionalNumberResultSchema
  }),
  evidenceMap: z.array(
    z.object({
      textRangeLabel: z.string(),
      claimIds: z.array(z.string()),
      experienceIds: z.array(z.string())
    })
  ),
  documentFormatting: documentFormattingSchema,
  reviewReport: z.object({
    scores: z.object({
      promptFit: z.number().min(0).max(100),
      jobFit: z.number().min(0).max(100),
      specificity: z.number().min(0).max(100),
      evidenceSafety: z.number().min(0).max(100),
      koreanReadability: z.number().min(0).max(100),
      aiLikenessRisk: z.number().min(0).max(100),
      blindRisk: z.number().min(0).max(100),
      interviewDefensibility: z.number().min(0).max(100)
    }),
    issues: z.array(
      z.object({
        type: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        message: z.string(),
        suggestedQuestion: optionalStringResultSchema
      })
    ),
    likelyInterviewQuestions: z.array(z.string()),
    sensitiveWarnings: z.array(z.string())
  }),
  revisionOptions: z.array(z.string())
});

export const draftWorkflowPlanRequestSchema = z.object({
  aiSelection: aiSelectionSchema,
  target: draftTargetSchema,
  experienceInput: draftExperienceInputSchema.refine(
    (input) =>
      Boolean(input.portfolioText?.trim()) ||
      Boolean(input.manualExperienceText?.trim()) ||
      Boolean(input.additionalContext?.trim()) ||
      Boolean(input.profileContexts?.length),
    { message: "경험 입력 텍스트가 필요합니다." }
  )
});

export const gapAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string().min(1)
});

export const draftWorkflowDraftRequestSchema = z.object({
  aiSelection: aiSelectionSchema,
  target: draftTargetSchema,
  experienceInput: draftExperienceInputSchema,
  plan: draftWorkflowPlanSchema,
  gapAnswers: z.array(gapAnswerSchema).optional(),
  confirmedOutline: draftWorkflowPlanSchema.shape.outline.optional()
});

export const draftWorkflowReviseRequestSchema = z.object({
  aiSelection: aiSelectionSchema,
  target: draftTargetSchema,
  plan: draftWorkflowPlanSchema,
  draft: draftWorkflowDraftSchema,
  revisionRequest: z.string().min(3),
  reviewIssueTypes: z.array(z.string()).optional()
});
