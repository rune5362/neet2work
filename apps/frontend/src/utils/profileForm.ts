import type { CandidateProfileJson, ProfileProject } from "../types/profile";

export type ProfileFormState = {
  title: string;
  targetRole: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  desiredRoles: string;
  skills: string;
  summary: string;
  projectName: string;
  projectRole: string;
  projectResult: string;
};

export const initialProfileForm: ProfileFormState = {
  title: "",
  targetRole: "",
  name: "",
  email: "",
  phone: "",
  location: "",
  desiredRoles: "",
  skills: "",
  summary: "",
  projectName: "",
  projectRole: "",
  projectResult: ""
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(values: string[]) {
  return values.join(", ");
}

function firstProject(projects: ProfileProject[] | undefined) {
  return projects?.[0] ?? {};
}

export function createProfileJson(form: ProfileFormState): CandidateProfileJson {
  const project =
    form.projectName.trim() || form.projectRole.trim() || form.projectResult.trim()
      ? [
          {
            name: form.projectName.trim(),
            role: form.projectRole.trim(),
            result: form.projectResult.trim()
          }
        ]
      : [];

  return {
    basics: {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      links: {
        github: "",
        portfolio: "",
        blog: ""
      }
    },
    desired: {
      roles: splitList(form.desiredRoles),
      industries: [],
      locations: [],
      employmentTypes: []
    },
    summary: {
      headline: "",
      description: form.summary.trim()
    },
    skills: splitList(form.skills),
    projects: project,
    experiences: [],
    certifications: [],
    education: [],
    activities: [],
    metadata: {
      lastUpdatedBy: "user",
      lastAiUpdatedAt: null
    }
  };
}

export function profileJsonToForm(input: {
  title: string;
  targetRole: string | null;
  profileJson: CandidateProfileJson;
}): ProfileFormState {
  const project = firstProject(input.profileJson.projects);

  return {
    title: input.title,
    targetRole: input.targetRole ?? "",
    name: input.profileJson.basics.name,
    email: input.profileJson.basics.email,
    phone: input.profileJson.basics.phone,
    location: input.profileJson.basics.location,
    desiredRoles: joinList(input.profileJson.desired.roles),
    skills: joinList(input.profileJson.skills),
    summary: input.profileJson.summary.description,
    projectName: project.name ?? project.title ?? "",
    projectRole: project.role ?? "",
    projectResult: project.result ?? project.impact ?? project.achievements?.join(", ") ?? ""
  };
}
