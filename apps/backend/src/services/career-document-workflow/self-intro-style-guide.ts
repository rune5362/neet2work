type ReferenceRuleSource = {
  title: string;
  url: string;
  rules: string[];
};

const REFERENCE_RULE_SOURCES: ReferenceRuleSource[] = [
  {
    title: "Korean STAR self-introduction structure guide",
    url: "https://hidell.tistory.com/1990",
    rules: [
      "Use STAR as a structure pattern only: brief situation and task, detailed action and result.",
      "For project or competency questions, make the user's concrete action and result heavier than background setup.",
      "When a result is not verified, mark it as a gap instead of converting it into a polished metric."
    ]
  },
  {
    title: "Seoul Arts University resume and self-introduction writing guide",
    url: "https://sau.ac.kr/ele/information/information01.do?articleNo=23647&attachNo=23199&mode=download",
    rules: [
      "Write around concrete experience and explicit evidence for each claim.",
      "Prefer role-relevant strengths over generic virtues.",
      "Use a polite Korean business ending style and avoid negative or vague phrasing."
    ]
  },
  {
    title: "KOMIR self-introduction screening criteria attachment",
    url: "https://raspfiles2.incruit.com/komir/data/103/SuccessData/addFile/%EB%B3%84%EC%B2%A82.%EB%B0%B0%EC%A0%90%EA%B8%B0%EC%A4%80.pdf",
    rules: [
      "Reject plagiarism-like reuse, meaningless repetition, privacy-revealing identity clues, and under-filled answers.",
      "Keep source facts separate from reference patterns so examples never become user achievements.",
      "When blind-recruitment or privacy risk appears, prefer omission or user confirmation over fluent completion."
    ]
  },
  {
    title: "Pusan National University generative AI self-introduction program notice",
    url: "https://naoe.pusan.ac.kr/bbs/cdfs/3449/951649/download.do",
    rules: [
      "Turn partial situation-task-result notes into STAR only after asking for the missing user action.",
      "Separate company or job needs, user experience bank, and final wording pass.",
      "Treat KPI, behavior evidence, and competency evidence as distinct quality checks."
    ]
  }
];

export function buildReferenceRuleTexts() {
  return REFERENCE_RULE_SOURCES.flatMap((source) =>
    source.rules.map((rule) => `[${source.title}] ${rule} Source: ${source.url}`)
  );
}

export function buildSocraticDraftingRules() {
  return [
    "Start with a provisional draft only from available user/profile/GitHub/attachment facts.",
    "If project purpose, user role, action, technical reason, or result is missing, keep the draft provisional and ask the most useful follow-up.",
    "Never fill a missing skill, metric, award, company-fit claim, or personal detail from reference examples.",
    "A submission-ready draft needs a concrete role, project or experience anchor, user action, technical or decision evidence, and result or learning.",
    "If the profile has no skills, do not invent profile skills; use verified GitHub or attachment skills, otherwise ask."
  ];
}

export function buildFallbackStructureRules() {
  return [
    "Opening: answer the question with one role-linked claim.",
    "Situation/task: keep context short and name the project or problem.",
    "Action: explain what the user did, including technical choice or decision criteria when verified.",
    "Result: close with verified output, feedback, learning, or explicitly state that result evidence needs confirmation.",
    "Quality gate: no copied reference phrasing, no internal labels, no unverified numbers."
  ];
}
