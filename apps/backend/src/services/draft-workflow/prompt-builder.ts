import type { AiWorkflowOperation } from "../../types/ai-routing.js";

const ANALYSIS_SCHEMA = `{
  "matchScore": 0,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingKeywords": ["string"],
  "rewriteGuides": ["string"],
  "suggestedSentences": ["string"]
}`;

const PLAN_SCHEMA = `{
  "state": "OUTLINE_READY | GAP_INTERVIEWING | INSUFFICIENT_EVIDENCE | COMPLIANCE_FLAGGED",
  "questionRubric": {
    "intent": "string",
    "requiredEvidence": ["string"],
    "mustAvoid": ["string"],
    "blindRules": ["string"]
  },
  "experienceCards": [{
    "experienceId": "string",
    "source": "portfolio | manual | conversation | fallback",
    "title": "string",
    "period": "string optional",
    "context": "string optional",
    "role": "string optional",
    "problem": "string optional",
    "actions": [{"action":"string","method":"string optional","rationale":"string optional"}],
    "tools": ["string"],
    "outputs": ["string"],
    "results": [{"type":"number | output | feedback | learning","description":"string","verified":true}],
    "skills": ["string"],
    "evidenceItems": [{"evidenceId":"string","type":"user_statement | portfolio_text | job_posting | gap_answer | fallback_seed","content":"string","confidence":"high | medium | low"}],
    "claimLedger": [{"claimId":"string","text":"string","supportedBy":["evidenceId"],"confidence":"high | medium | low","allowedInDraft":true}],
    "missingSlots": ["string"],
    "blindRiskFlags": ["string"],
    "interviewDefensibility": "high | medium | low"
  }],
  "fitAssessments": [{"questionId":"string","experienceId":"string","fitScore":0,"recommendedUsage":"main | supporting | avoid","fitReasons":["string"],"risks":["string"]}],
  "answerStrategy": {
    "mainClaim": "string",
    "narrativePattern": "EvidenceSummary | STAR | Growth | CompanyFit | Collaboration",
    "primaryExperienceId": "string",
    "questionBudget": 800,
    "neededQuestions": [{"questionId":"string","slot":"string","priority":1,"question":"string","choices":["string"]}]
  },
  "materialStore": {
    "requirements": [{"requirementId":"string","source":"attached_document | job_posting | user_input | reference | fallback","text":"string","priority":"critical | high | medium | low","appliesTo":["section name"]}],
    "referenceRules": ["string"],
    "profile": {"coreStrengths":["string"],"tone":"string","privateConstraints":["string"]},
    "experiences": [{"experienceId":"string","facts":["string"],"skills":["string"],"usableSections":["section name"],"privateConstraints":["string"],"sourceEvidenceIds":["evidenceId"]}],
    "sectionPlan": [{"sectionName":"string","mainClaim":"string","evidenceIds":["evidenceId"],"avoidRepeating":["string"]}],
    "outputRules": {"encoding":"UTF-8","fontFamily":"Malgun Gothic","fontDisplayName":"맑은 고딕","lineSpacing":"normal","normalizeWhitespace":true,"forbidMojibake":true}
  },
  "outline": [{"paragraphId":"string","purpose":"string","plannedClaims":["claimId"],"targetChars":250}]
}`;

const DRAFT_SCHEMA = `{
  "state": "REVIEW_COMPLETED | REVISION_REQUESTED | COMPLIANCE_FLAGGED",
  "draftText": "string",
  "charCount": {"withSpaces":0,"withoutSpaces":0,"limit":800},
  "evidenceMap": [{"textRangeLabel":"string","claimIds":["allowed claimId"],"experienceIds":["experienceId"]}],
  "documentFormatting": {"encoding":"UTF-8","fontFamily":"Malgun Gothic","fontDisplayName":"맑은 고딕","lineSpacing":"normal","normalizeWhitespace":true,"forbidMojibake":true},
  "reviewReport": {
    "scores": {"promptFit":0,"jobFit":0,"specificity":0,"evidenceSafety":0,"koreanReadability":0,"aiLikenessRisk":0,"blindRisk":0,"interviewDefensibility":0},
    "issues": [{"type":"string","severity":"low | medium | high","message":"string","suggestedQuestion":"string optional"}],
    "likelyInterviewQuestions": ["string"],
    "sensitiveWarnings": ["string"]
  },
  "revisionOptions": ["string"]
}`;

const STYLE_POLISH_RULES = [
  "Run a style polish pass after drafting, limited to readability and repetition control.",
  "Split overloaded technical sentences into shorter information units when one sentence contains multiple roles, architecture decisions, fallback paths, or data pipelines.",
  "Vary implementation verbs instead of repeating the same verb pattern. Prefer a mix such as structured, implemented, separated, managed, connected, maintained, normalized, verified, or reduced.",
  "Vary sentence and paragraph openings. Avoid starting adjacent paragraphs or multiple nearby sentences with the same opening such as '저는'; use topic, time, experience, or outcome openings when natural.",
  "Keep every claim, evidence item, chronology, and section purpose unchanged. Do not add facts, metrics, tools, companies, or achievements during style polish."
].join("\n");

function operationInstruction(operation: AiWorkflowOperation) {
  switch (operation) {
    case "analyze":
      return [
        "Analyze the resumeText against the selected job posting.",
        "Use job.title, job.company, job.description, and job.skills as the target evidence when present.",
        "Do not invent missing experience, metrics, school, age, awards, company facts, or personal identity details.",
        "The matchScore must reflect evidence in resumeText, not a generic optimism score.",
        "strengths must cite concrete resume evidence and connect it to job requirements.",
        "weaknesses and missingKeywords must focus on missing or weakly evidenced job requirements.",
        "rewriteGuides must be actionable instructions for improving the resume or self-introduction.",
        "suggestedSentences must be Korean sentences the user can adapt, but they must not add facts not present in resumeText.",
        "Return JSON matching this schema:",
        ANALYSIS_SCHEMA
      ].join("\n");
    case "plan":
      return [
        "Analyze the target question and user experience input.",
        "Build materialStore before answerStrategy. All later planning must use materialStore as the single source of truth.",
        "If target.requirementSourceText is present, extract its rules as materialStore.requirements with source=attached_document and priority=critical. These rules outrank job posting text and reference examples.",
        "If no attached-document requirements exist, use experienceInput.referenceSelfIntroText only as style/reference guidance and never as user factual evidence.",
        "Use experienceInput.profileContexts as user-owned factual evidence for profile, skills, projects, and experiences selected by the user.",
        "Keep referenceSelfIntroText separate from profileContexts: references guide style only, profileContexts can support factual claims.",
        "Extract only experiences supported by user-provided portfolio/manual/conversation text.",
        "Treat bare GitHub or repository URLs as pointers, not evidence. Do not claim to have inspected repository contents unless README, commit, issue, project, or code text is included in the input; ask follow-up questions for project purpose, user role, implementation, technologies, and results instead.",
        "Build a claimLedger. Set allowedInDraft=false for weak, unsupported, private, blind-risk, or demo claims.",
        "Ask adaptive Socratic follow-up questions in answerStrategy.neededQuestions when role/result/context/method/company-fit evidence is missing. Sort questions by priority so the UI can ask one at a time.",
        "For motivation/aspiration questions, require specific company-fit evidence; ask a follow-up instead of inventing company facts.",
        "Plan each section with a distinct role. Avoid repeating the same AI/automation strength unless the target question explicitly asks for it.",
        "Fill materialStore.sectionPlan.avoidRepeating with repeated topic phrases, sentence openings, and verb patterns that should be varied during draft/revise style polish.",
        "Do not write the final essay body in this step.",
        "Return JSON matching this schema:",
        PLAN_SCHEMA
      ].join("\n");
    case "draft":
      return [
        "Write a Korean self-introduction draft from the approved plan, confirmed outline, and gap answers.",
        "Use materialStore as the single source of truth. Do not use facts outside materialStore, approved claimLedger items, or user gapAnswers.",
        "Use only claimLedger items where allowedInDraft=true.",
        "Do not invent metrics, company facts, school, age, gender, region, awards, or tools.",
        "Do not expose internal terms such as claimLedger, evidenceMap, provider routing, fallback, or materialStore inside draftText.",
        "Apply materialStore.outputRules: UTF-8-safe Korean text, normal spaces only, Malgun Gothic document export metadata.",
        "Final polish is limited to reducing repeated expressions and improving sentence readability. Keep the same evidence and claims, but vary repeated wording, sentence openings, implementation verbs, and AI/automation phrasing when target.previousDraftText or materialStore.sectionPlan.avoidRepeating indicates overlap.",
        STYLE_POLISH_RULES,
        "Respect target.charLimit and target.charCountRule. If the limit is tight, prioritize specificity over filler.",
        "Apply target.writingStyle when present.",
        "Return JSON matching this schema:",
        DRAFT_SCHEMA
      ].join("\n");
    case "revise":
      return [
        "Revise the existing draft according to revisionRequest.",
        "Use materialStore as the single source of truth.",
        "Keep the same evidence lock: use only claimLedger items where allowedInDraft=true from the provided plan.",
        "Do not introduce new facts, metrics, companies, schools, awards, tools, or identity details.",
        "Do not expose internal terms such as claimLedger, evidenceMap, provider routing, fallback, or materialStore inside draftText.",
        "Keep UTF-8-safe Korean text and documentFormatting fixed to Malgun Gothic.",
        "When revisionRequest asks for polishing or repetition reduction, only reduce repeated expressions, split overloaded sentences, vary repeated sentence openings, and diversify repeated implementation verbs. Do not change the claim structure or add new evidence.",
        STYLE_POLISH_RULES,
        "Respect target.charLimit and target.charCountRule.",
        "Return JSON matching this schema:",
        DRAFT_SCHEMA
      ].join("\n");
  }
}

export function buildDraftWorkflowPrompt(operation: AiWorkflowOperation, payload: unknown) {
  const commonRules =
    operation === "analyze"
      ? [
          "You are Neet2Work's evidence-locked Korean resume and self-introduction analysis engine.",
          "Output valid JSON only. Do not wrap it in markdown. Do not include commentary outside JSON.",
          "The backend will inject aiMeta and mode; do not include aiMeta or mode.",
          "All score fields must be integers from 0 to 100."
        ]
      : [
          "You are Neet2Work's evidence-locked Korean self-introduction drafting engine.",
          "Output valid JSON only. Do not wrap it in markdown. Do not include commentary outside JSON.",
          "The backend will inject aiMeta and mode; do not include aiMeta or mode.",
          "All score fields must be integers from 0 to 100.",
          "Every evidenceMap claimId must reference an allowed claim from the plan or generated claimLedger.",
          "If evidence is insufficient, ask concise Socratic follow-up questions instead of fabricating."
        ];

  return [
    ...commonRules,
    operationInstruction(operation),
    "Input JSON:",
    JSON.stringify({ operation, payload }, null, 2)
  ].join("\n\n");
}

const AGY_CLI_FIXED_INSTRUCTIONS = [
  "AGY_CLI_FIXED_ROLE:",
  "You are a Korean AI reviewer for hiring self-introduction cover letters.",
  "Your only task is to review and draft Korean self-introduction content from the user's selected profile evidence, target company, target role, hiring question, existing draft, career/project/skill evidence, and approved plan material.",
  "Forbidden actions: do not request or perform file edits, shell commands, SSH/local environment exploration, provider configuration changes, credential access, secret exposure, or any task outside profile-based cover-letter review.",
  "Do not invent facts that are absent from profileContexts, materialStore, approved claimLedger, target/job text, or explicit user gap answers.",
  "Assess and improve prompt fit, role fit, specificity, blind-recruitment risk, Korean readability, and interview defensibility.",
  "Return strict JSON only. The entire stdout must be exactly one JSON object.",
  "Do not include markdown, explanations, logs, warnings, aiMeta, mode, provider ids, route names, local paths, SSH details, or execution details in the output.",
  "The backend injects aiMeta and mode after schema validation; never output those fields."
].join("\n");

export function buildAgyCliDraftWorkflowPrompt(operation: AiWorkflowOperation, payload: unknown) {
  return [AGY_CLI_FIXED_INSTRUCTIONS, buildDraftWorkflowPrompt(operation, payload)].join("\n\n");
}
