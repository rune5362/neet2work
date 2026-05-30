import type { AiWorkflowOperation } from "../../types/ai-routing.js";

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
  "outline": [{"paragraphId":"string","purpose":"string","plannedClaims":["claimId"],"targetChars":250}]
}`;

const DRAFT_SCHEMA = `{
  "state": "REVIEW_COMPLETED | REVISION_REQUESTED | COMPLIANCE_FLAGGED",
  "draftText": "string",
  "charCount": {"withSpaces":0,"withoutSpaces":0,"limit":800},
  "evidenceMap": [{"textRangeLabel":"string","claimIds":["allowed claimId"],"experienceIds":["experienceId"]}],
  "reviewReport": {
    "scores": {"promptFit":0,"jobFit":0,"specificity":0,"evidenceSafety":0,"koreanReadability":0,"aiLikenessRisk":0,"blindRisk":0,"interviewDefensibility":0},
    "issues": [{"type":"string","severity":"low | medium | high","message":"string","suggestedQuestion":"string optional"}],
    "likelyInterviewQuestions": ["string"],
    "sensitiveWarnings": ["string"]
  },
  "revisionOptions": ["string"]
}`;

function operationInstruction(operation: AiWorkflowOperation) {
  switch (operation) {
    case "plan":
      return [
        "Analyze the target question and user experience input.",
        "Extract only experiences supported by user-provided portfolio/manual/conversation text.",
        "Build a claimLedger. Set allowedInDraft=false for weak, unsupported, private, blind-risk, or demo claims.",
        "Ask Socratic follow-up questions in answerStrategy.neededQuestions when role/result/context/method is missing.",
        "Do not write the final essay body in this step.",
        "Return JSON matching this schema:",
        PLAN_SCHEMA
      ].join("\n");
    case "draft":
      return [
        "Write a Korean self-introduction draft from the approved plan, confirmed outline, and gap answers.",
        "Use only claimLedger items where allowedInDraft=true.",
        "Do not invent metrics, company facts, school, age, gender, region, awards, or tools.",
        "Respect target.charLimit and target.charCountRule. If the limit is tight, prioritize specificity over filler.",
        "Apply target.writingStyle when present.",
        "Return JSON matching this schema:",
        DRAFT_SCHEMA
      ].join("\n");
    case "revise":
      return [
        "Revise the existing draft according to revisionRequest.",
        "Keep the same evidence lock: use only claimLedger items where allowedInDraft=true from the provided plan.",
        "Do not introduce new facts, metrics, companies, schools, awards, tools, or identity details.",
        "Respect target.charLimit and target.charCountRule.",
        "Return JSON matching this schema:",
        DRAFT_SCHEMA
      ].join("\n");
  }
}

export function buildDraftWorkflowPrompt(operation: AiWorkflowOperation, payload: unknown) {
  return [
    "You are Neet2Work's evidence-locked Korean self-introduction drafting engine.",
    "Output valid JSON only. Do not wrap it in markdown. Do not include commentary outside JSON.",
    "The backend will inject aiMeta and mode; do not include aiMeta or mode.",
    "All score fields must be integers from 0 to 100.",
    "Every evidenceMap claimId must reference an allowed claim from the plan or generated claimLedger.",
    "If evidence is insufficient, ask concise Socratic follow-up questions instead of fabricating.",
    operationInstruction(operation),
    "Input JSON:",
    JSON.stringify({ operation, payload }, null, 2)
  ].join("\n\n");
}
