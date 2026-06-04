type SelfIntroReferenceSource = {
  title: string;
  url: string;
  notes: string[];
};

export type UserSelfIntroReference = {
  title: string;
  content: string;
  company?: string | null;
  jobTitle?: string | null;
};

const REFERENCE_SOURCES: SelfIntroReferenceSource[] = [
  {
    title: "UMass SBS Cover Letter Guide",
    url: "https://sbspathways.umass.edu/sbs-cover-letter-guide/",
    notes: [
      "Cover letters should not repeat the resume; they should connect the most relevant experience to the employer's needs.",
      "Prepare by reading the job posting, researching the organization, listing relevant experiences, and selecting one or two strong stories.",
      "Use STAR to make experience concrete: situation, task, action, result."
    ]
  },
  {
    title: "UMass SPHHS Cover Letters",
    url: "https://www.umass.edu/public-health-sciences/career-planning/student-resources/resumes-and-cover-letters/cover-letters",
    notes: [
      "Translate skills and experience into the employer's language.",
      "Use exact role keywords when they match the user's real experience.",
      "Start with the strongest, most relevant evidence rather than saving it for later."
    ]
  },
  {
    title: "JobKorea - IT/SW self-introduction writing",
    url: "https://www.jobkorea.co.kr/goodjob/tip/view?News_No=5431",
    notes: [
      "For IT/SW roles, analyze the company and job closely before writing.",
      "Avoid repeating the same strength across multiple sections.",
      "Emphasize verified job knowledge and strengths, not only credentials."
    ]
  },
  {
    title: "JobKorea - motivation statement guide",
    url: "https://www.jobkorea.co.kr/goodjob/tip/view?News_No=18911",
    notes: [
      "A motivation paragraph should explain why this company or role, not a generic industry preference.",
      "Use company-fit evidence only when the user or job posting supplies it.",
      "Keep motivation tied to role contribution instead of personal benefit alone."
    ]
  }
];

const STYLE_RULES = [
  "Reference material is style and structure guidance only. Never treat it as user facts, metrics, awards, companies, schools, or achievements.",
  "Use a direct Korean business tone: clear topic sentence, specific evidence, and concise result.",
  "Prefer one focused story over many shallow claims. If evidence is missing, ask a follow-up question.",
  "For backend or IT roles, connect tools to decisions and outcomes, not just a stack list.",
  "Avoid generic virtue-only claims such as sincerity, passion, or responsibility unless backed by a concrete action.",
  "Avoid copying reference wording. Generate new wording from the user's own evidence."
];

const SYNTHESIZED_PATTERNS = [
  {
    label: "직무역량형",
    pattern:
      "문제 상황을 먼저 짚고, 내가 맡은 역할과 판단 기준을 설명한 뒤, 사용한 기술과 결과를 한 문단 안에서 연결한다."
  },
  {
    label: "지원동기형",
    pattern:
      "회사/직무 요구를 한 문장으로 해석하고, 내 경험 중 그 요구와 맞닿은 근거를 제시한 뒤, 입사 후 기여 방향으로 마무리한다."
  },
  {
    label: "성장/협업형",
    pattern:
      "개인의 성향을 먼저 주장하지 말고, 협업 중 마찰이나 제한 조건에서 어떤 행동을 선택했는지 보여준 뒤 배운 점을 정리한다."
  }
];

function buildUserReferenceText(userReference?: UserSelfIntroReference | null) {
  const content = userReference?.content.trim();
  if (!userReference || !content) {
    return null;
  }

  const context = [userReference.company, userReference.jobTitle].filter(Boolean).join(" / ");

  return [
    "Selected user-saved cover letter reference.",
    `Title: ${userReference.title}`,
    context ? `Context: ${context}` : null,
    "Use this selected document only for style, paragraph structure, transition rhythm, and level of specificity.",
    "Never treat names, companies, schools, metrics, awards, tools, dates, or achievements in this reference as facts for the new draft.",
    "Never copy or lightly paraphrase sentences from this reference. Generate new wording from the current user's evidence only.",
    "Reference content:",
    content
  ].filter((line): line is string => Boolean(line)).join("\n");
}

export function buildSelfIntroReferenceText(options: { userReference?: UserSelfIntroReference | null } = {}) {
  const sourceText = REFERENCE_SOURCES.map((source, index) => {
    const notes = source.notes.map((note) => `- ${note}`).join("\n");
    return `[Source ${index + 1}] ${source.title}\nURL: ${source.url}\nExtracted rules:\n${notes}`;
  }).join("\n\n");

  const styleText = STYLE_RULES.map((rule) => `- ${rule}`).join("\n");
  const patternText = SYNTHESIZED_PATTERNS.map((item) => `- ${item.label}: ${item.pattern}`).join("\n");
  const userReferenceText = buildUserReferenceText(options.userReference);

  return [
    "Neet2Work self-introduction reference library.",
    "Use this library only for structure, tone, and quality checks. Do not copy examples and do not add facts.",
    "",
    "Source-backed writing rules:",
    sourceText,
    "",
    "Global style rules:",
    styleText,
    "",
    "Synthesized Korean self-introduction patterns:",
    patternText,
    ...(userReferenceText
      ? [
          "",
          "User-selected saved cover letter reference:",
          userReferenceText
        ]
      : [])
  ].join("\n");
}
