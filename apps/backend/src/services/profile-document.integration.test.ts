import { beforeEach, describe, expect, it } from "vitest";
import { HttpError } from "../errors/httpError.js";
import type { CandidateProfileJson } from "../types/profile.js";
import {
  archiveProfile,
  copyProfile,
  createProfile,
  getProfile,
  getProfiles,
  updateProfileMeta
} from "./profile.service.js";
import {
  archiveDocument,
  copyDocument,
  createDocument,
  getDocument,
  getDocuments,
  updateDocumentMeta
} from "./document.service.js";
import {
  archiveApplicationSet,
  createApplicationSet,
  getApplicationSet,
  getApplicationSets,
  updateApplicationSet
} from "./applicationSet.service.js";

function createProfileJson(name: string): CandidateProfileJson {
  return {
    basics: {
      name,
      email: `${name}@example.com`,
      phone: "010-0000-0000",
      location: "서울",
      links: {}
    },
    desired: {
      roles: ["프론트엔드 개발자"],
      industries: ["커리어"],
      locations: ["서울"],
      employmentTypes: ["정규직"]
    },
    summary: {
      headline: "React 개발자",
      description: "React와 TypeScript 기반 화면을 구현합니다."
    },
    skills: ["React", "TypeScript"],
    projects: [
      {
        name: "문서 관리",
        role: "프론트엔드",
        result: "버전 관리 화면 구현"
      }
    ],
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

async function expectHttpError(promise: Promise<unknown>, statusCode: number) {
  await expect(promise).rejects.toMatchObject<HttpError>({
    statusCode
  });
}

describe("profile/document mock-first integration", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "";
  });

  it("DB 없이 프로필, 문서, 지원 묶음 생성/수정/복사/스코프 검증 플로우가 동작한다", async () => {
    const candidateKey = `candidate-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const firstProfile = await createProfile({
      candidateKey,
      title: "프론트엔드 기본 프로필",
      isDefault: true,
      profileJson: createProfileJson("민준")
    });
    const secondProfile = await createProfile({
      candidateKey,
      title: "백엔드 보조 프로필",
      profileJson: createProfileJson("서연")
    });

    const profiles = await getProfiles(candidateKey);
    expect(profiles.map((profile) => profile.id)).toEqual(expect.arrayContaining([firstProfile.id, secondProfile.id]));

    const updatedProfile = await updateProfileMeta(firstProfile.id, {
      candidateKey,
      profileJson: createProfileJson("민준-수정")
    });
    expect(updatedProfile.profileText).toContain("민준-수정");

    const copiedProfile = await copyProfile(firstProfile.id, { candidateKey });
    expect(copiedProfile.id).not.toBe(firstProfile.id);
    expect(copiedProfile.title).toMatch(/^프론트엔드 기본 프로필 \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(copiedProfile.profileText).toBe(updatedProfile.profileText);
    expect((await getProfile(candidateKey, firstProfile.id)).title).toBe("프론트엔드 기본 프로필");
    expect((await archiveProfile(copiedProfile.candidateKey, copiedProfile.id)).isArchived).toBe(true);

    await expectHttpError(getProfile("other-candidate", firstProfile.id), 404);
    await expectHttpError(getProfile(candidateKey, "missing-profile"), 404);

    const document = await createDocument({
      candidateKey,
      title: "프론트엔드 이력서",
      documentType: "resume",
      profileId: firstProfile.id,
      jobId: "job-001",
      content: "초기 이력서 본문"
    });

    expect(document.profileSnapshotText).toContain("민준");
    expect(document.jobSnapshotJson).toMatchObject({
      id: "job-001",
      title: "프론트엔드 개발자"
    });

    const updatedDocument = await updateDocumentMeta(document.id, {
      candidateKey,
      content: "수정된 이력서 본문",
      contentJson: { sections: [] },
      profileId: null
    });
    expect(updatedDocument.content).toBe("수정된 이력서 본문");
    expect(updatedDocument.profileId).toBeNull();
    expect(updatedDocument.profileSnapshotText).toBeNull();

    const copiedDocument = await copyDocument(document.id, { candidateKey });
    expect(copiedDocument.id).not.toBe(document.id);
    expect(copiedDocument.title).toMatch(/^프론트엔드 이력서 \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(copiedDocument.content).toBe(updatedDocument.content);
    expect((await getDocument(candidateKey, document.id)).title).toBe("프론트엔드 이력서");
    expect((await archiveDocument(copiedDocument.candidateKey, copiedDocument.id)).isArchived).toBe(true);

    await expectHttpError(getDocument("other-candidate", document.id), 404);

    const otherDocument = await createDocument({
      candidateKey,
      title: "다른 문서",
      documentType: "cover_letter",
      content: "자기소개서 본문"
    });

    const emptySet = await createApplicationSet({
      candidateKey,
      title: "빈 지원 묶음"
    });
    expect(emptySet.profileId).toBeNull();
    expect(emptySet.resumeDocumentId).toBeNull();
    expect(emptySet.coverLetterDocumentId).toBeNull();

    const applicationSet = await createApplicationSet({
      candidateKey,
      title: "프론트엔드 지원 묶음",
      profileId: firstProfile.id,
      resumeDocumentId: document.id,
      coverLetterDocumentId: otherDocument.id
    });
    expect(applicationSet.profileTitle).toBe("프론트엔드 기본 프로필");
    expect(applicationSet.resumeTitle).toBe("프론트엔드 이력서");
    expect(applicationSet.coverLetterTitle).toBe("다른 문서");

    const unlinkedSet = await updateApplicationSet(applicationSet.id, {
      candidateKey,
      resumeDocumentId: null
    });
    expect(unlinkedSet.resumeDocumentId).toBeNull();
    expect((await getApplicationSet(candidateKey, applicationSet.id)).coverLetterDocumentId).toBe(otherDocument.id);
    expect((await getApplicationSets(candidateKey)).map((item) => item.id)).toEqual(
      expect.arrayContaining([emptySet.id, applicationSet.id])
    );
    expect((await archiveApplicationSet(candidateKey, emptySet.id)).isArchived).toBe(true);
    await expectHttpError(
      createApplicationSet({
        candidateKey: "other-candidate",
        title: "잘못된 지원 묶음",
        profileId: firstProfile.id
      }),
      400
    );

    const documents = await getDocuments(candidateKey);
    expect(documents.map((item) => item.id)).toEqual(expect.arrayContaining([document.id, otherDocument.id]));

    const sampleProfiles = await getProfiles("demo-candidate");
    const sampleDocuments = await getDocuments("demo-candidate");
    expect(sampleProfiles.length).toBeGreaterThan(0);
    expect(sampleDocuments.length).toBeGreaterThan(0);
  });
});
