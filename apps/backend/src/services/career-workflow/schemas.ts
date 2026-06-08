import { z } from "zod";

export const careerDocumentTypeSchema = z.enum([
  "resume",
  "specified_cover_letter",
  "freeform_cover_letter",
  "career_description",
  "portfolio_intro",
  "unknown"
]);

export const careerSourceTypeSchema = z.enum([
  "empty",
  "experience_text",
  "blank_cover_letter_template",
  "existing_cover_letter",
  "resume",
  "career_description",
  "portfolio",
  "github_url",
  "job_posting",
  "project_text",
  "reference_pattern"
]);

export const careerWorkflowTargetSchema = z.object({
  company: z.string().optional(),
  role: z.string().optional(),
  questionText: z.string().optional(),
  jobPostingText: z.string().optional(),
  charLimit: z.number().int().positive().optional()
});

export const careerWorkflowSourceInputSchema = z.object({
  sourceId: z.string().optional(),
  sourceType: careerSourceTypeSchema.optional(),
  label: z.string().optional(),
  text: z.string().optional(),
  url: z.string().url().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional()
});

export const careerWorkflowSourceSummarySchema = z.object({
  sourceId: z.string(),
  sourceType: careerSourceTypeSchema,
  label: z.string(),
  extractedSignals: z.array(z.string()),
  requiresUserConfirmation: z.boolean()
});

export const careerEvidenceVaultItemSchema = z.object({
  evidenceId: z.string(),
  sourceType: careerSourceTypeSchema,
  sourceId: z.string(),
  claim: z.string(),
  evidenceText: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  status: z.enum(["extracted", "inferred", "user_confirmed", "user_provided", "unsupported"]),
  confirmedByUser: z.boolean(),
  usableForResume: z.boolean(),
  usableForCoverLetter: z.boolean(),
  usableForCareerDescription: z.boolean(),
  blindRisk: z.boolean(),
  privacyRisk: z.boolean(),
  targetSlots: z.array(z.string())
});

export const careerTemplateQuestionSchema = z.object({
  questionId: z.string(),
  text: z.string(),
  charLimit: z.number().int().positive().optional(),
  intent: z.string(),
  requiredSlots: z.array(z.string()),
  missingSlots: z.array(z.string())
});

export const careerTemplateAnalysisSchema = z.object({
  detected: z.boolean(),
  questions: z.array(careerTemplateQuestionSchema)
});

export const careerCompletionMapSchema = z.object({
  requiredSlots: z.array(z.string()),
  filledSlots: z.array(z.string()),
  missingSlots: z.array(z.string()),
  progress: z.number().min(0).max(100)
});

export const careerNextQuestionSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  whyAsking: z.string(),
  targetDocument: careerDocumentTypeSchema,
  targetSection: z.string(),
  expectedAnswerType: z.enum(["short_text", "long_text", "choice", "number", "date_range"]),
  priority: z.number().int().positive(),
  canSkip: z.boolean(),
  targetSlot: z.string()
});

export const careerAnsweredQuestionSchema = z.object({
  questionId: z.string(),
  targetSlot: z.string(),
  answer: z.string()
});

export const careerWorkflowSessionSchema = z.object({
  sessionId: z.string(),
  state: z.enum([
    "SESSION_CREATED",
    "SOURCE_ROUTED",
    "EVIDENCE_READY",
    "QUESTION_READY",
    "ANSWER_RECORDED",
    "READY_TO_GENERATE"
  ]),
  documentType: careerDocumentTypeSchema,
  documentTypeReason: z.string(),
  target: careerWorkflowTargetSchema,
  sources: z.array(careerWorkflowSourceSummarySchema),
  templateAnalysis: careerTemplateAnalysisSchema,
  evidenceVault: z.array(careerEvidenceVaultItemSchema),
  completion: careerCompletionMapSchema,
  answeredQuestions: z.array(careerAnsweredQuestionSchema),
  nextQuestion: careerNextQuestionSchema.optional()
});

export const careerWorkflowSessionRequestSchema = z.object({
  documentType: careerDocumentTypeSchema.optional(),
  target: careerWorkflowTargetSchema.optional(),
  sources: z.array(careerWorkflowSourceInputSchema).optional()
});

export const careerWorkflowNextQuestionRequestSchema = z.object({
  session: careerWorkflowSessionSchema
});

export const careerWorkflowAnswerQuestionRequestSchema = z.object({
  session: careerWorkflowSessionSchema,
  questionId: z.string().min(1),
  answer: z.string().min(1)
});
