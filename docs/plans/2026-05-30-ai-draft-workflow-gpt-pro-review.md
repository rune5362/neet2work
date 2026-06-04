# GPT Pro Review Reconciliation: AI Draft Workflow

Date: 2026-05-30
Review target: Neet2Work AI self-introduction drafting workflow
Review channel: ChatGPT via Chrome extension backend

## Browser And Model Evidence

- selected browser: Chrome
- backend type: extension
- trusted browser-client path:
  `C:\Users\Administrator\.codex\plugins\cache\openai-bundled\chrome\26.527.31326\scripts\browser-client.mjs`
- ChatGPT menu evidence:
  - model showed `5.5`
  - `Pro` was checked
  - `Pro 생각 강도` showed `확장`
  - input control showed `Pro 확장 모드`

## Prompt Source

The prompt summarized the current Neet2Work drafting concept from the Codex
planning conversation:

- optional reference self-introduction samples for style and structure only
- personal profile input
- portfolio analysis
- manual intake for experiences without portfolio artifacts
- normalized experience cards
- automatic self-introduction type recommendation
- Socratic gap questioning
- outline, draft, self-review, and revision loop

## GPT Review Themes

The useful review themes were:

- Move the center of the product away from "self-introduction type selection"
  and toward question-specific experience matching plus evidence locking.
- Add a requirement-to-evidence matrix early, before drafting starts.
- Split claims from evidence. The draft writer should only use claims that are
  explicitly supported and allowed in the current draft.
- Treat NCS, blind recruitment, and sensitive personal information constraints
  as early writing constraints, not only as final review checks.
- Add an `Experience-Question Matcher` and `Answer Strategist` between
  experience intake and Socratic questioning.
- Keep Socratic questioning cost-aware. Ask only questions that are likely to
  improve the current answer, not every possible STAR slot question.
- Split review from rewrite. Reviewers find issues; a separate rewriter applies
  approved changes.
- MVP should prove one question well before expanding to multi-question
  applications, OCR, PDF/DOCX parsing, links, or reference sample analysis.

## Accepted Into The Plan

- The main product object should be an evidence-locked drafting session, not a
  generic chat transcript.
- The first stable workflow should be:
  1. target capture,
  2. question and rubric analysis,
  3. text-based experience intake,
  4. experience card normalization,
  5. claim ledger generation,
  6. compliance and blind-risk flagging,
  7. experience-question matching,
  8. answer strategy,
  9. gap interview,
  10. outline confirmation,
  11. evidence-locked draft generation,
  12. multi-pass review,
  13. revision.
- `Experience Card v2` should include more than the first draft shape:
  - `problem`
  - `actions` with method and rationale
  - `outputs`
  - `results`
  - `evidenceItems`
  - `claimLedger`
  - `blindRiskFlags`
  - `interviewDefensibility`
- `FitAssessment` should exist separately from the experience card. It should
  score how well one experience fits one question and whether the experience
  should be used as main, secondary, or not used.
- `AnswerStrategy` should exist before draft generation. It should define the
  main claim, narrative pattern, primary experience, question budget, and
  remaining questions.
- Final output should include:
  - the draft,
  - used experience cards,
  - sentence or paragraph evidence mapping,
  - weak points,
  - likely interview questions,
  - blind or sensitive information warnings,
  - character count.

## Adjusted For Repo Reality

- Neet2Work is mock-first, so the first implementation should keep deterministic
  fallback behavior. Real GPT/Gemini integration can sit behind the existing AI
  service boundary later.
- Current `/api/analyze` is a fit-analysis style endpoint. The draft workflow
  should not be forced into that contract. A later implementation should add a
  drafting-oriented session contract or keep the design as a frontend-local mock
  until the backend contract is ready.
- Current `/ai-analysis` already has a chat-builder UI direction. The next
  product slice should refine its workflow states, not jump straight to OCR,
  sample databases, or file intelligence.
- Reference self-introduction samples remain useful, but they are not first-MVP
  critical. If included later, they should produce pattern metadata only and
  never feed wording directly into the draft.

## Rejected Or Deferred

- Defer image OCR.
- Defer PDF/DOCX automatic parsing.
- Defer portfolio link crawling.
- Defer automatic company research unless source and citation handling are
  explicit.
- Defer reference self-introduction sample analysis from MVP 1.
- Defer multi-question application package generation.
- Defer advanced plagiarism or AI-detector integration. Start with rule-based
  checks for template-like wording and unsupported claims.
- Do not ask for birth date by default. It increases privacy risk and is rarely
  useful for drafting.

## Revised MVP 1 Scope

MVP 1 should be:

> One question, one target role, one or two user experiences, gap questions,
> evidence-locked draft, and Korean self-introduction review report.

Required inputs:

- company or organization
- target role
- question text
- character limit and count rule if known
- job posting text pasted by the user
- portfolio or experience text pasted by the user
- optional manual experience entry
- blind recruitment flag

Required outputs:

- question rubric summary
- experience cards
- best experience match
- answer strategy preview
- gap questions
- outline
- draft
- review report
- revision options

## Recommended State Machine

```txt
SESSION_CREATED
TARGET_CAPTURED
QUESTION_ANALYZED
EXPERIENCE_INTAKE_STARTED
EXPERIENCE_CARDS_READY
EXPERIENCE_MATCHED
STRATEGY_READY
GAP_INTERVIEWING
OUTLINE_READY
OUTLINE_CONFIRMED
DRAFT_GENERATED
REVIEW_COMPLETED
REVISION_REQUESTED
FINALIZED
```

Exception states:

```txt
INSUFFICIENT_EVIDENCE
COMPLIANCE_FLAGGED
USER_CONFIRMATION_REQUIRED
REFERENCE_RISK_FLAGGED
```

## Final Reconciliation Decision

Use the GPT review to change the planning emphasis:

- Previous center: reference patterns, portfolio analysis, self-introduction type
  recommendation, Socratic questions, draft generation.
- Revised center: question rubric, evidence cards, claim ledger, experience
  matching, evidence-locked drafting, Korean hiring-context review.

The six core implementation concepts should be:

1. `Question & Rubric Analyzer`
2. `Experience Card v2`
3. `Experience-Question Matcher`
4. `Socratic Gap Filler`
5. `Evidence-Locked Draft Writer`
6. `Korean Self-Review Rubric`

