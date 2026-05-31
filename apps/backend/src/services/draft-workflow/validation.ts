import type { DraftTarget, DraftWorkflowDraft, DraftWorkflowPlan } from "../../types/draft-workflow.js";
import { HttpError } from "../../utils/http-error.js";

const INTERNAL_DRAFT_TERMS = ["claimLedger", "evidenceMap", "materialStore", "provider routing", "fallback"];
const UNSAFE_TEXT_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00A0\u200B-\u200D\uFEFF�]/u;

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

export function assertPlanPrioritizesAttachedRequirements(target: DraftTarget, plan: DraftWorkflowPlan) {
  if (!target.requirementSourceText?.trim()) {
    return;
  }

  const hasCriticalAttachedRequirement = plan.materialStore.requirements.some(
    (requirement) =>
      requirement.source === "attached_document" &&
      requirement.priority === "critical" &&
      requirement.text.trim().length > 0
  );

  if (!hasCriticalAttachedRequirement) {
    throw new HttpError("첨부 문서 요구사항이 materialStore에 최우선으로 반영되지 않았습니다.", 422);
  }
}

export function assertDraftTextIsExportSafe(draftText: string) {
  if (UNSAFE_TEXT_PATTERN.test(draftText)) {
    throw new HttpError("초안에 문서 출력에 안전하지 않은 문자나 깨진 문자가 포함되었습니다.", 422);
  }

  const leakedTerms = INTERNAL_DRAFT_TERMS.filter((term) => draftText.includes(term));
  if (leakedTerms.length > 0) {
    throw new HttpError(`초안에 내부 용어가 포함되었습니다: ${leakedTerms.join(", ")}`, 422);
  }
}

export function assertDraftCharCountMatchesText(draft: DraftWorkflowDraft) {
  const withSpaces = draft.draftText.length;
  const withoutSpaces = draft.draftText.replace(/\s/g, "").length;

  if (draft.charCount.withSpaces !== withSpaces || draft.charCount.withoutSpaces !== withoutSpaces) {
    throw new HttpError(
      `초안 글자 수 메타데이터가 본문과 일치하지 않습니다: withSpaces=${draft.charCount.withSpaces}/${withSpaces}, withoutSpaces=${draft.charCount.withoutSpaces}/${withoutSpaces}`,
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
  assertDraftTextIsExportSafe(draft.draftText);
  assertDraftCharCountMatchesText(draft);
  assertDraftRespectsClaimLedger(plan, draft.draftText);
  assertDraftEvidenceMapUsesAllowedClaims(plan, draft);
  assertDraftWithinCharLimit(target, draft.draftText);
}
