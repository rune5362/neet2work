# B2B AI Cover Letter Coaching GPT Pro Review

Date: 2026-05-31

## Chrome / Model Evidence

- Chrome backend: `Chrome`
- Chrome backend type: `extension`
- ChatGPT model menu evidence: `최신 • 5.5`
- Selected mode evidence: `Pro 확장 모드`, menu item `Pro • 확장`
- Prompt source: current Neet2Work repo context, `docs/API_CONTRACT.md`, `docs/AGENT_PROJECT_BRIEF.md`, and draft workflow implementation shape.

## Prompt Scope

Asked GPT 5.5 Pro extended mode to review whether Neet2Work's self-introduction logic is commercially sellable, with emphasis on:

- Selling the logic/API/white-label widget instead of launching another job site.
- Positioning as a job-posting-based Socratic self-introduction coaching engine.
- Current workflow: posting/question analysis, experience cards, claim ledger, follow-up questions, evidence-locked draft, evidence map, review report, and revision options.
- Practical B2B GTM: first customer segments, pricing, MVP sales artifacts, 2-week outbound plan, cold email, and risks.

## External Review Summary

GPT's verdict was `Conditional Yes`.

It argued that Neet2Work should not be sold as an "AI self-introduction generator" because that market is already crowded and cheap. The sellable angle is:

> Neet2Work is a B2B evidence-locked self-introduction coaching engine that fills the gap between job requirements and applicant experience through follow-up questions, then writes only claims that have supporting evidence.

Strong differentiators:

- `claimLedger`: blocks unsupported or inflated claims.
- Socratic follow-up questions: automates the counselor-like experience discovery step.
- `evidenceMap`: lets counselors or partners inspect why a sentence is allowed.
- `reviewReport`: turns generated text into a risk/check report, not just copy.
- White-label/API direction: avoids direct traffic competition with large job platforms.

Weak differentiators:

- Job posting keyword matching is not enough.
- `fit score` is common and weak as a headline metric.
- "AI-like sentence fixing" is easy to copy.
- Large job platforms can copy or partner quickly.
- "Interview defensibility score" should be framed as risk flags and follow-up questions, not a definitive score.

Recommended first customer priority:

1. Bootcamps, KDT, national-funded education, and employment-linked training providers.
2. University career centers and LINC/career-support organizations.
3. Small job platforms, job communities, and vertical junior hiring services.

Recommended sales artifacts:

- Before/after sample reports for at least three roles.
- Three-minute demo video.
- Partner-facing API/widget docs.
- Admin dashboard mockup with institution metrics.
- One-page paid pilot proposal and ROI math.

Suggested pilot pricing:

- Bootcamp starter pilot: KRW 3,000,000 for four weeks, 50-100 users, 300 workflows.
- Larger cohort pilot: KRW 5,000,000 for six weeks.
- Monthly cohort plan: KRW 1,500,000-3,000,000 plus workflow overage.
- Small platform widget/API: setup KRW 3,000,000+, monthly minimum KRW 1,000,000+, completed workflow KRW 800-2,000.

## Repo Reconciliation

This advice fits the current implementation direction.

Matches existing repo facts:

- The draft workflow already separates `/plan`, `/draft`, and `/revise`.
- The backend contract already exposes `experienceCards`, `fitAssessments`, `answerStrategy.neededQuestions`, `outline`, `evidenceMap`, `reviewReport`, and `revisionOptions`.
- The project contract is mock-first, so it can support sales demos before full production readiness.
- The current analyzer/fit-score path should not be the main commercial message.

Needed adjustments before real sales:

- Product copy should move away from "AI 자기소개서 생성" and toward "공고 기반 근거 검증 코칭 엔진".
- Sales demo should highlight evidence coverage, unsupported claim count, blind-risk flags, and counselor review workflow over match score.
- A partner-facing sample report and short demo video should be built before outbound.
- Paid pilot requires production basics: provider reliability, data deletion policy, partner data separation, usage tracking, and clear privacy language.
- Blind recruitment checks must be described as risk detection for review, not legal determination.

## Decision

Proceed with a sales-demo track, not a broad product rebuild.

Immediate next work should be:

1. Create three sample B2B reports using real-looking but synthetic applicant data.
2. Add a partner-facing "evidence-locked coaching engine" pitch page or PDF.
3. Prepare a four-week paid pilot package for bootcamps/KDT providers.
4. Build a compact admin dashboard mockup focused on usage, completion, evidence coverage, and counselor review-needed counts.
