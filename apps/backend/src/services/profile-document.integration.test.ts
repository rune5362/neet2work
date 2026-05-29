import { beforeEach, describe, expect, it } from "vitest";
import { HttpError } from "../errors/httpError.js";
import type { CandidateProfileJson } from "../types/profile.js";
import {
  applyProfileVersion,
  archiveProfileVersion,
  createProfile,
  createProfileVersion,
  getProfile,
  getProfiles,
  restoreProfileVersion
} from "./profile.service.js";
import {
  applyDocumentVersion,
  archiveDocumentVersion,
  createDocument,
  createDocumentVersion,
  getDocument,
  getDocuments,
  restoreDocumentVersion
} from "./document.service.js";

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

  it("DB 없이 프로필과 문서 생성/버전/복원/스코프 검증 플로우가 동작한다", async () => {
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

    const profileVersion2 = await createProfileVersion(firstProfile.id, {
      candidateKey,
      profileJson: createProfileJson("민준-v2"),
      title: "프로필 v2",
      makeCurrent: true
    });
    const profileVersion3 = await createProfileVersion(firstProfile.id, {
      candidateKey,
      profileJson: createProfileJson("민준-v3"),
      title: "프로필 v3",
      makeCurrent: false
    });

    await applyProfileVersion(candidateKey, firstProfile.id, profileVersion2.id);
    expect((await getProfile(candidateKey, firstProfile.id)).currentVersionId).toBe(profileVersion2.id);

    const restoredProfileVersion = await restoreProfileVersion(candidateKey, firstProfile.id, firstProfile.currentVersionId ?? "");
    expect(restoredProfileVersion.versionNo).toBe(4);
    expect((await getProfile(candidateKey, firstProfile.id)).currentVersionId).toBe(restoredProfileVersion.id);

    await archiveProfileVersion(candidateKey, firstProfile.id, profileVersion3.id);
    await expectHttpError(applyProfileVersion(candidateKey, firstProfile.id, profileVersion3.id), 400);
    await expectHttpError(archiveProfileVersion(candidateKey, firstProfile.id, restoredProfileVersion.id), 400);
    await expectHttpError(getProfile("other-candidate", firstProfile.id), 404);
    await expectHttpError(getProfile(candidateKey, "missing-profile"), 404);
    await expectHttpError(applyProfileVersion(candidateKey, secondProfile.id, profileVersion2.id), 404);
    await expectHttpError(restoreProfileVersion(candidateKey, secondProfile.id, profileVersion2.id), 404);
    await expectHttpError(archiveProfileVersion(candidateKey, secondProfile.id, profileVersion2.id), 404);

    const document = await createDocument({
      candidateKey,
      title: "프론트엔드 이력서",
      documentType: "resume",
      profileId: firstProfile.id,
      profileVersionId: restoredProfileVersion.id,
      jobId: "job-001",
      content: "초기 이력서 본문"
    });

    expect(document.currentVersion?.profileSnapshotText).toContain("민준");
    expect(document.currentVersion?.jobSnapshotJson).toMatchObject({
      id: "job-001",
      title: "프론트엔드 개발자"
    });

    const documentVersion2 = await createDocumentVersion(document.id, {
      candidateKey,
      content: "두 번째 문서 본문",
      title: "문서 v2",
      makeCurrent: true
    });
    const documentVersion3 = await createDocumentVersion(document.id, {
      candidateKey,
      content: "세 번째 문서 본문",
      title: "문서 v3",
      makeCurrent: false
    });

    await applyDocumentVersion(candidateKey, document.id, documentVersion2.id);
    expect((await getDocument(candidateKey, document.id)).currentVersionId).toBe(documentVersion2.id);

    const restoredDocumentVersion = await restoreDocumentVersion(candidateKey, document.id, document.currentVersionId ?? "");
    expect(restoredDocumentVersion.versionNo).toBe(4);
    expect((await getDocument(candidateKey, document.id)).currentVersionId).toBe(restoredDocumentVersion.id);

    await archiveDocumentVersion(candidateKey, document.id, documentVersion3.id);
    await expectHttpError(applyDocumentVersion(candidateKey, document.id, documentVersion3.id), 400);
    await expectHttpError(archiveDocumentVersion(candidateKey, document.id, restoredDocumentVersion.id), 400);
    await expectHttpError(getDocument("other-candidate", document.id), 404);

    const otherDocument = await createDocument({
      candidateKey,
      title: "다른 문서",
      documentType: "cover_letter",
      content: "자기소개서 본문"
    });

    await expectHttpError(applyDocumentVersion(candidateKey, otherDocument.id, documentVersion2.id), 404);
    await expectHttpError(restoreDocumentVersion(candidateKey, otherDocument.id, documentVersion2.id), 404);
    await expectHttpError(archiveDocumentVersion(candidateKey, otherDocument.id, documentVersion2.id), 404);

    const documents = await getDocuments(candidateKey);
    expect(documents.map((item) => item.id)).toEqual(expect.arrayContaining([document.id, otherDocument.id]));

    const sampleProfiles = await getProfiles("demo-candidate");
    const sampleDocuments = await getDocuments("demo-candidate");
    expect(sampleProfiles.length).toBeGreaterThan(0);
    expect(sampleDocuments.length).toBeGreaterThan(0);
  });
});
