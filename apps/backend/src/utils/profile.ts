import type { CandidateProfileJson, ProfileProject, ProfileSummaryFields } from "../types/profile.js";

export const defaultProfileJson: CandidateProfileJson = {
  basics: {
    name: "",
    email: "",
    phone: "",
    location: "",
    links: {
      github: "",
      portfolio: "",
      blog: ""
    }
  },
  desired: {
    roles: [],
    industries: [],
    locations: [],
    employmentTypes: []
  },
  summary: {
    headline: "",
    description: ""
  },
  skills: [],
  projects: [],
  experiences: [],
  certifications: [],
  education: [],
  activities: [],
  metadata: {
    lastUpdatedBy: "user",
    lastAiUpdatedAt: null
  }
};

function compactStrings(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

function joinList(values: string[]) {
  return values.length > 0 ? values.join(", ") : null;
}

function getProjectName(project: ProfileProject) {
  return project.name?.trim() || project.title?.trim() || null;
}

function getProjectResult(project: ProfileProject) {
  const result = project.result?.trim() || project.impact?.trim();

  if (result) {
    return result;
  }

  return compactStrings(project.achievements ?? []).join(", ") || null;
}

export function buildProfileText(profileJson: CandidateProfileJson) {
  const lines: string[] = [];
  const name = profileJson.basics.name.trim();
  const desiredRoles = joinList(compactStrings(profileJson.desired.roles));
  const skills = joinList(compactStrings(profileJson.skills));
  const summary = profileJson.summary.description.trim() || profileJson.summary.headline.trim();

  if (name) {
    lines.push(`이름: ${name}`);
  }

  if (desiredRoles) {
    lines.push(`희망 직무: ${desiredRoles}`);
  }

  if (skills) {
    lines.push(`기술 스택: ${skills}`);
  }

  if (summary) {
    lines.push(`요약 설명: ${summary}`);
  }

  for (const project of profileJson.projects) {
    const projectLines = compactStrings([
      getProjectName(project) ? `프로젝트명: ${getProjectName(project)}` : null,
      project.role?.trim() ? `프로젝트 역할: ${project.role.trim()}` : null,
      getProjectResult(project) ? `프로젝트 성과: ${getProjectResult(project)}` : null
    ]);

    if (projectLines.length > 0) {
      lines.push(projectLines.join(" / "));
    }
  }

  return lines.join("\n");
}

export function extractProfileSummaryFields(profileJson: CandidateProfileJson): ProfileSummaryFields {
  return {
    name: profileJson.basics.name.trim() || null,
    email: profileJson.basics.email.trim() || null,
    desiredRoles: compactStrings(profileJson.desired.roles),
    skills: compactStrings(profileJson.skills)
  };
}
