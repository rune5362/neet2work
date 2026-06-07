const FALLBACK_DRAFT_TEXT =
  "저는 대학 시절 교내 앱 개발 공모전에서 팀 리더로 참여하여 프로젝트를 성공적으로 이끈 경험이 있습니다. 초기에는 역할 분담과 일정 관리가 체계적이지 않아 진행 방향이 불명확해지는 문제가 있었습니다.\n\n이에 전체 일정을 재정리하고 매일 15분 스탠드업 미팅을 도입해 진행 상황을 공유하며 소통을 강화했습니다. 또한 사용자 인터뷰를 직접 수행해 핵심 니즈를 도출하고, MVP 기능을 우선순위에 따라 재구성했습니다.\n\n그 결과 최종 발표에서 최우수상을 수상했으며, 실제 사용자 200명 이상이 앱을 사용했습니다.";

export const fallbackSeedContent = {
  draftText: FALLBACK_DRAFT_TEXT,
  rewriteGuides: [
    "프로젝트 경험을 문제 상황, 해결 방법, 결과 중심으로 작성하세요.",
    "채용공고의 기술 키워드를 자기소개서에 자연스럽게 반영하세요.",
    "수치화 가능한 성과가 있다면 함께 작성하세요."
  ],
  suggestedSentences: [
    "React 기반 프로젝트에서 사용자 입력 데이터를 API와 연동하여 분석 결과를 시각화한 경험이 있습니다.",
    "문제 해결 과정에서 기능 구현뿐 아니라 예외 상황과 사용자 경험을 함께 고려했습니다."
  ]
};

export const defaultDocumentFormatting = {
  encoding: "UTF-8",
  fontFamily: "Malgun Gothic",
  fontDisplayName: "맑은 고딕",
  lineSpacing: "normal",
  normalizeWhitespace: true,
  forbidMojibake: true
} as const;

export function countChars(text: string) {
  return {
    withSpaces: text.length,
    withoutSpaces: text.replace(/\s/g, "").length
  };
}

export function extractExperienceText(input: {
  portfolioText?: string;
  manualExperienceText?: string;
  additionalContext?: string;
  profileContexts?: Array<{
    title: string;
    profileText?: string;
    targetRole?: string | null;
    targetCompany?: string | null;
    desiredRoles: string[];
    skills: string[];
    profileJson: {
      summary?: {
        headline?: string;
        description?: string;
      };
      skills?: string[];
      projects?: Array<{
        name?: string;
        title?: string;
        role?: string;
        result?: string;
        impact?: string;
        achievements?: string[];
      }>;
    };
  }>;
}) {
  const profileText = (input.profileContexts ?? [])
    .map((profile) => {
      const summary = [
        profile.profileJson.summary?.headline,
        profile.profileJson.summary?.description
      ].filter(Boolean).join(" ");
      const projects = (profile.profileJson.projects ?? [])
        .map((project) =>
          [
            project.title ?? project.name,
            project.role,
            project.result,
            project.impact,
            ...(project.achievements ?? [])
          ].filter(Boolean).join(" / ")
        )
        .filter(Boolean)
        .join("\n");

      return [
        `[선택 프로필] ${profile.title}`,
        profile.targetRole ? `목표 직무: ${profile.targetRole}` : "",
        profile.targetCompany ? `목표 회사: ${profile.targetCompany}` : "",
        profile.desiredRoles.length ? `희망 직무: ${profile.desiredRoles.join(", ")}` : "",
        profile.skills.length || profile.profileJson.skills?.length
          ? `스킬: ${[...profile.skills, ...(profile.profileJson.skills ?? [])].join(", ")}`
          : "",
        summary,
        projects,
        profile.profileText
      ].map((part) => part?.trim() ?? "").filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  return [input.portfolioText, input.manualExperienceText, input.additionalContext, profileText]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n");
}

export function inferSkills(text: string) {
  const normalized = text.toLowerCase();
  const candidates = [
    "React",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "PostgreSQL",
    "REST API",
    "Git",
    "Python",
    "SQL"
  ];

  return candidates.filter(
    (skill) =>
      normalized.includes(skill.toLowerCase()) ||
      (skill === "REST API" && normalized.includes("api"))
  );
}

export function inferBlindRiskFlags(text: string, blindRecruitment: boolean) {
  if (!blindRecruitment) {
    return [] as string[];
  }

  const flags: string[] = [];
  if (/대학|학교|고등학교|출신/.test(text)) flags.push("school_reference");
  if (/\d{4}년\s*생|\d{2}세|나이/.test(text)) flags.push("age_reference");
  if (/남성|여성|성별/.test(text)) flags.push("gender_reference");
  if (/출신|고향|지역/.test(text)) flags.push("region_reference");
  return flags;
}
