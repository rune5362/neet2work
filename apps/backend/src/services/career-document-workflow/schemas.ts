import { z } from "zod";
import { aiExecutionMetaSchema, aiSelectionSchema, draftProfileContextSchema } from "../draft-workflow/schemas.js";

export const careerDocumentClassificationSchema = z.enum([
  "self_intro_template",
  "existing_self_intro",
  "job_posting",
  "reference_material"
]);

export const careerDocumentSessionStateSchema = z.enum([
  "COLLECTING_MATERIALS",
  "EVIDENCE_ANALYZED",
  "INTERVIEW_REQUIRED",
  "DRAFT_READY"
]);

export const careerWorkflowStageIdSchema = z.enum([
  "material_collection",
  "evidence_analysis",
  "gap_interview",
  "section_drafts"
]);

export const careerWorkflowStageStatusSchema = z.enum(["pending", "active", "complete", "blocked"]);
export const privacyRiskLevelSchema = z.enum(["none", "low", "medium", "high"]);
export const evidenceConfidenceSchema = z.enum(["high", "medium", "low"]);
export const careerDocumentCompletionStatusSchema = z.enum(["provisional", "submission_ready"]);
export const careerDocumentCompletionGateIdSchema = z.enum([
  "draft_available",
  "required_questions_answered",
  "missing_evidence_resolved",
  "evidence_locked"
]);

export const careerEvidenceSourceTypeSchema = z.enum([
  "attached_document",
  "self_intro_template",
  "existing_self_intro",
  "job_posting",
  "reference_material",
  "user_input",
  "profile_context",
  "github_profile",
  "github_repo_metadata",
  "github_readme",
  "portfolio_page",
  "interview_answer"
]);

export const careerDocumentQuestionSchema = z.object({
  questionId: z.string(),
  text: z.string(),
  charLimit: z.number().int().positive().optional(),
  charCountRule: z.enum(["with_spaces", "without_spaces", "unknown"]),
  intent: z.string(),
  requiredSlots: z.array(z.string()),
  writingRules: z.array(z.string())
});

export const careerDocumentAnalysisSchema = z.object({
  sourceId: z.string(),
  fileName: z.string(),
  mimeType: z.string().optional(),
  classification: careerDocumentClassificationSchema,
  classificationReason: z.string(),
  extractedText: z.string(),
  template: z
    .object({
      questions: z.array(careerDocumentQuestionSchema),
      writingRules: z.array(z.string()),
      submissionFormat: z.string().optional()
    })
    .optional(),
  summary: z.string()
});

export const careerGithubFactSchema = z.object({
  sourceId: z.string(),
  sourceType: z.enum(["github_profile", "github_repo_metadata", "github_readme"]),
  fact: z.string()
});

export const careerGithubRepositorySummarySchema = z.object({
  fullName: z.string(),
  description: z.string().optional(),
  primaryLanguage: z.string().optional(),
  languages: z.array(z.string()),
  updatedAt: z.string().optional(),
  readmeExcerpt: z.string().optional()
});

export const careerGithubAnalysisSchema = z.object({
  sourceId: z.string(),
  url: z.string().url(),
  status: z.enum(["fetched", "unavailable"]),
  owner: z.string().optional(),
  repo: z.string().optional(),
  repositories: z.array(careerGithubRepositorySummarySchema),
  facts: z.array(careerGithubFactSchema),
  fallbackMessage: z.string().optional()
});

export const careerPortfolioFactSchema = z.object({
  sourceId: z.string(),
  sourceType: z.literal("portfolio_page"),
  fact: z.string()
});

export const careerPortfolioAnalysisSchema = z.object({
  sourceId: z.string(),
  url: z.string().url(),
  status: z.enum(["fetched", "unavailable"]),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  detectedSkills: z.array(z.string()),
  facts: z.array(careerPortfolioFactSchema),
  fallbackMessage: z.string().optional()
});

export const careerEvidenceVaultItemSchema = z.object({
  evidenceId: z.string(),
  sourceId: z.string(),
  sourceType: careerEvidenceSourceTypeSchema,
  fact: z.string(),
  confidence: evidenceConfidenceSchema,
  allowedInDraft: z.boolean(),
  privacyRisk: privacyRiskLevelSchema,
  needsUserConfirmation: z.boolean(),
  targetSlots: z.array(z.string())
});

export const careerGapQuestionSchema = z.object({
  questionId: z.string(),
  slot: z.string(),
  question: z.string(),
  whyAsking: z.string(),
  priority: z.number().int().positive(),
  targetQuestionIds: z.array(z.string()),
  answer: z.string().optional()
});

export const careerDocumentDraftSchema = z.object({
  questionId: z.string(),
  questionText: z.string(),
  charLimit: z.number().int().positive().optional(),
  charCountRule: z.enum(["with_spaces", "without_spaces", "unknown"]),
  status: z.enum(["drafted", "needs_more_evidence"]),
  draftText: z.string().optional(),
  charCount: z
    .object({
      withSpaces: z.number().int().nonnegative(),
      withoutSpaces: z.number().int().nonnegative(),
      limit: z.number().int().positive().optional()
    })
    .optional(),
  usedEvidenceSourceIds: z.array(z.string()),
  usedEvidenceFacts: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  risks: z.array(z.string())
});

export const careerDocumentCompletionSchema = z.object({
  status: careerDocumentCompletionStatusSchema,
  score: z.number().int().min(0).max(100),
  summary: z.string(),
  gates: z.array(
    z.object({
      id: careerDocumentCompletionGateIdSchema,
      label: z.string(),
      passed: z.boolean(),
      detail: z.string()
    })
  )
});

export const careerDocumentWorkflowTargetSchema = z.object({
  company: z.string().optional(),
  role: z.string().optional(),
  jobPostingText: z.string().optional(),
  jobId: z.string().optional(),
  writingStyle: z.string().optional(),
  formatLabel: z.string().optional(),
  questionText: z.string().optional(),
  charLimit: z.number().int().positive().optional(),
  charCountRule: z.enum(["with_spaces", "without_spaces", "unknown"]).optional()
});

export const careerDocumentPackageSchema = z.object({
  documentType: z.enum(["cover_letter", "resume"]),
  title: z.string().min(1),
  content: z.string().min(1),
  profileId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  contentJson: z.object({
    schemaVersion: z.literal(1),
    source: z.object({
      workflow: z.literal("career-document-workflow"),
      sessionId: z.string(),
      state: careerDocumentSessionStateSchema,
      generatedAt: z.string(),
      completionStatus: careerDocumentCompletionStatusSchema
    }),
    target: careerDocumentWorkflowTargetSchema,
    profileSnapshot: z
      .object({
        profileId: z.string(),
        title: z.string(),
        targetRole: z.string().nullable().optional(),
        desiredRoles: z.array(z.string()),
        skills: z.array(z.string()),
        profileText: z.string().optional()
      })
      .optional(),
    sections: z.array(
      z.object({
        sectionId: z.string(),
        title: z.string(),
        body: z.string(),
        usedEvidenceFacts: z.array(z.string()),
        missingEvidence: z.array(z.string()),
        risks: z.array(z.string())
      })
    ),
    evidence: z.object({
      usedFacts: z.array(z.string()),
      missingEvidence: z.array(z.string()),
      risks: z.array(z.string())
    }),
    formatting: z.object({
      charCountRule: z.enum(["with_spaces", "without_spaces", "unknown"]),
      withSpaces: z.number().int().nonnegative(),
      withoutSpaces: z.number().int().nonnegative(),
      limit: z.number().int().positive().optional()
    })
  })
});

export const careerDocumentAttachmentInputSchema = z.object({
  sourceId: z.string().optional(),
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
  text: z.string().min(1)
});

export const careerDocumentWorkflowSessionSchema = z.object({
  sessionId: z.string(),
  state: careerDocumentSessionStateSchema,
  target: careerDocumentWorkflowTargetSchema,
  stages: z.array(
    z.object({
      id: careerWorkflowStageIdSchema,
      label: z.string(),
      status: careerWorkflowStageStatusSchema
    })
  ),
  documentAnalyses: z.array(careerDocumentAnalysisSchema),
  githubAnalyses: z.array(careerGithubAnalysisSchema),
  portfolioAnalyses: z.array(careerPortfolioAnalysisSchema),
  evidenceVault: z.array(careerEvidenceVaultItemSchema),
  profileContexts: z.array(draftProfileContextSchema),
  interview: z.object({
    questions: z.array(careerGapQuestionSchema),
    answers: z.array(
      z.object({
        questionId: z.string(),
        slot: z.string().optional(),
        answer: z.string()
      })
    )
  }),
  drafts: z.array(careerDocumentDraftSchema),
  completion: careerDocumentCompletionSchema,
  documentPackages: z.array(careerDocumentPackageSchema),
  aiMeta: aiExecutionMetaSchema.optional(),
  missingEvidence: z.array(z.string()),
  risks: z.array(z.string())
});

export const careerDocumentWorkflowSessionRequestSchema = z.object({
  message: z.string().min(1),
  attachments: z.array(careerDocumentAttachmentInputSchema).optional(),
  target: careerDocumentWorkflowTargetSchema.optional(),
  profileContexts: z.array(draftProfileContextSchema).optional(),
  aiSelection: aiSelectionSchema.optional()
});

export const careerDocumentWorkflowAnswerRequestSchema = z.object({
  session: careerDocumentWorkflowSessionSchema,
  questionId: z.string().min(1),
  answer: z.string().min(1),
  aiSelection: aiSelectionSchema.optional()
});
