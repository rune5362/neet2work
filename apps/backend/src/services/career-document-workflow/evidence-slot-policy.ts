import type {
  CareerDocumentWorkflowTarget,
  CareerEvidenceSourceType,
  CareerEvidenceVaultItem
} from "../../types/career-document-workflow.js";

const USER_VERIFIED_SOURCE_TYPES = new Set<CareerEvidenceSourceType>([
  "interview_answer",
  "profile_context",
  "user_input"
]);

const USER_SPECIFIC_SLOTS = new Set([
  "user_role",
  "problem_context",
  "actions",
  "technical_choice",
  "result",
  "learning",
  "company_fit"
]);

const CONTEXT_ONLY_SOURCE_TYPES = new Set<CareerEvidenceSourceType>([
  "job_posting",
  "self_intro_template",
  "github_profile"
]);

export function collectFilledEvidenceSlots(
  evidenceVault: CareerEvidenceVaultItem[],
  target: CareerDocumentWorkflowTarget
) {
  const filledSlots = new Set<string>();

  for (const item of evidenceVault) {
    if (!item.allowedInDraft || item.needsUserConfirmation) {
      continue;
    }

    for (const slot of item.targetSlots) {
      if (evidenceCanFillSlot(item, slot)) {
        filledSlots.add(slot);
      }
    }
  }

  if (target.role?.trim()) {
    filledSlots.add("target_role");
  }

  return filledSlots;
}

export function evidenceCanFillSlot(item: CareerEvidenceVaultItem, slot: string) {
  if (USER_SPECIFIC_SLOTS.has(slot)) {
    return USER_VERIFIED_SOURCE_TYPES.has(item.sourceType);
  }

  if (CONTEXT_ONLY_SOURCE_TYPES.has(item.sourceType)) {
    return false;
  }

  return true;
}
