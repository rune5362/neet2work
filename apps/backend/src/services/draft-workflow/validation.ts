import type { DraftTarget, DraftWorkflowDraft, DraftWorkflowPlan } from "../../types/draft-workflow.js";
import { HttpError } from "../../utils/http-error.js";

export function findDisallowedClaimsInDraft(plan: DraftWorkflowPlan, draftText: string) {
  const violations: Array<{ claimId: string; text: string }> = [];

  for (const card of plan.experienceCards) {
    for (const claim of card.claimLedger) {
      if (claim.allowedInDraft) {
        continue;
      }

      if (draftText.includes(claim.text)) {
        violations.push({ claimId: claim.claimId, text: claim.text });
      }
    }
  }

  return violations;
}

export function assertDraftRespectsClaimLedger(plan: DraftWorkflowPlan, draftText: string) {
  const violations = findDisallowedClaimsInDraft(plan, draftText);
  if (violations.length === 0) {
    return;
  }

  throw new HttpError(
    `허용되지 않은 claim이 초안에 포함되었습니다: ${violations.map((item) => item.claimId).join(", ")}`,
    422
  );
}

export function assertDraftEvidenceMapUsesAllowedClaims(plan: DraftWorkflowPlan, draft: DraftWorkflowDraft) {
  const allowedClaimIds = new Set<string>();
  const knownExperienceIds = new Set<string>();

  for (const card of plan.experienceCards) {
    knownExperienceIds.add(card.experienceId);
    for (const claim of card.claimLedger) {
      if (claim.allowedInDraft) {
        allowedClaimIds.add(claim.claimId);
      }
    }
  }

  const invalidClaimIds = new Set<string>();
  const invalidExperienceIds = new Set<string>();

  for (const item of draft.evidenceMap) {
    for (const claimId of item.claimIds) {
      if (!allowedClaimIds.has(claimId)) {
        invalidClaimIds.add(claimId);
      }
    }
    for (const experienceId of item.experienceIds) {
      if (!knownExperienceIds.has(experienceId)) {
        invalidExperienceIds.add(experienceId);
      }
    }
  }

  if (invalidClaimIds.size > 0 || invalidExperienceIds.size > 0) {
    throw new HttpError(
      `초안 evidenceMap이 허용된 근거와 일치하지 않습니다: claims=${[...invalidClaimIds].join(",") || "-"}, experiences=${[...invalidExperienceIds].join(",") || "-"}`,
      422
    );
  }
}

export function assertDraftWithinCharLimit(target: DraftTarget, draftText: string) {
  if (!target.charLimit) {
    return;
  }

  const count =
    target.charCountRule === "without_spaces"
      ? draftText.replace(/\s/g, "").length
      : draftText.length;

  if (count > target.charLimit) {
    throw new HttpError(`초안이 글자 수 제한을 초과했습니다: ${count}/${target.charLimit}`, 422);
  }
}

export function assertDraftIsEvidenceLocked(
  plan: DraftWorkflowPlan,
  target: DraftTarget,
  draft: DraftWorkflowDraft
) {
  assertDraftRespectsClaimLedger(plan, draft.draftText);
  assertDraftEvidenceMapUsesAllowedClaims(plan, draft);
  assertDraftWithinCharLimit(target, draft.draftText);
}
