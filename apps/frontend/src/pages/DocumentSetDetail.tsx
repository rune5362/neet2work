import { useEffect, useMemo, useState } from "react";
import { createDocument, getDocuments, updateDocumentMeta } from "../api/documentClient";
import { getDocumentSet, updateDocumentSet } from "../api/documentSetClient";
import { createProfile, getProfiles, updateProfileMeta } from "../api/profileClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { ApplicationSetItem } from "../types/applicationSet";
import type { DocumentListItem } from "../types/document";
import type { ProfileListItem } from "../types/profile";
import {
  createProfileJson,
  initialProfileForm,
  profileJsonToForm,
  type ProfileFormState
} from "../utils/profileForm";

function getSetIdFromPath() {
  return window.location.pathname.split("/").filter(Boolean)[2] ?? "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function getDocumentLabel(document: DocumentListItem) {
  const typeLabel = document.documentType === "resume" ? "이력서" : "자기소개서";
  return `${typeLabel} / ${document.title}`;
}

export function DocumentSetDetail() {
  const setId = getSetIdFromPath();
  const [set, setSet] = useState<ApplicationSetItem | null>(null);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [title, setTitle] = useState("");
  const [profileId, setProfileId] = useState("");
  const [resumeDocumentId, setResumeDocumentId] = useState("");
  const [coverLetterDocumentId, setCoverLetterDocumentId] = useState("");
  const [profileForm, setProfileForm] = useState<ProfileFormState>(initialProfileForm);
  const [profileTouched, setProfileTouched] = useState(false);
  const [resumeContent, setResumeContent] = useState("");
  const [coverLetterContent, setCoverLetterContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSet() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [setResult, profileResult, documentResult] = await Promise.all([
          getDocumentSet(setId),
          getProfiles(),
          getDocuments()
        ]);

        if (!cancelled) {
          setSet(setResult);
          setProfiles(profileResult);
          setDocuments(documentResult);
          setTitle(setResult.title);
          setProfileId(setResult.profileId ?? "");
          setResumeDocumentId(setResult.resumeDocumentId ?? "");
          setCoverLetterDocumentId(setResult.coverLetterDocumentId ?? "");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "문서 묶음을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSet();

    return () => {
      cancelled = true;
    };
  }, [setId]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === profileId) ?? null,
    [profileId, profiles]
  );
  const resumes = useMemo(
    () => documents.filter((document) => document.documentType === "resume"),
    [documents]
  );
  const coverLetters = useMemo(
    () => documents.filter((document) => document.documentType === "cover_letter"),
    [documents]
  );
  const selectedResume = useMemo(
    () => resumes.find((document) => document.id === resumeDocumentId) ?? null,
    [resumeDocumentId, resumes]
  );
  const selectedCoverLetter = useMemo(
    () => coverLetters.find((document) => document.id === coverLetterDocumentId) ?? null,
    [coverLetterDocumentId, coverLetters]
  );

  useEffect(() => {
    if (!selectedProfile) {
      setProfileForm(initialProfileForm);
      setProfileTouched(false);
      return;
    }

    setProfileForm(
      selectedProfile.profileJson
        ? profileJsonToForm({
            title: selectedProfile.title,
            targetRole: selectedProfile.targetRole,
            profileJson: selectedProfile.profileJson
          })
        : {
            ...initialProfileForm,
            title: selectedProfile.title,
            targetRole: selectedProfile.targetRole ?? "",
            name: selectedProfile.name ?? "",
            email: selectedProfile.email ?? "",
            desiredRoles: selectedProfile.desiredRoles.join(", "),
            skills: selectedProfile.skills.join(", "),
            summary: selectedProfile.profileText
          }
    );
    setProfileTouched(false);
  }, [selectedProfile]);

  useEffect(() => {
    setResumeContent(selectedResume?.content ?? "");
  }, [selectedResume]);

  useEffect(() => {
    setCoverLetterContent(selectedCoverLetter?.content ?? "");
  }, [selectedCoverLetter]);

  const updateProfileField = (field: keyof ProfileFormState, value: string) => {
    setProfileTouched(true);
    setProfileForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  async function reloadSet(nextSetId = setId) {
    const [setResult, profileResult, documentResult] = await Promise.all([
      getDocumentSet(nextSetId),
      getProfiles(),
      getDocuments()
    ]);

    setSet(setResult);
    setProfiles(profileResult);
    setDocuments(documentResult);
    setTitle(setResult.title);
    setProfileId(setResult.profileId ?? "");
    setResumeDocumentId(setResult.resumeDocumentId ?? "");
    setCoverLetterDocumentId(setResult.coverLetterDocumentId ?? "");
  }

  const saveProfileSection = async (required = true) => {
    if (profileId && !profileTouched) {
      return profileId;
    }

    const hasProfileDraft =
      profileForm.title.trim() ||
      profileForm.name.trim() ||
      profileForm.email.trim() ||
      profileForm.targetRole.trim() ||
      profileForm.skills.trim() ||
      profileForm.summary.trim();

    if (!profileId && !hasProfileDraft && !required) {
      return null;
    }

    if (!profileForm.title.trim()) {
      throw new Error("프로필 제목을 입력하세요.");
    }

    if (profileId) {
      const profile = await updateProfileMeta(profileId, {
        title: profileForm.title.trim(),
        targetRole: profileForm.targetRole.trim() || null,
        profileJson: createProfileJson(profileForm)
      });
      return profile.id;
    }

    const profile = await createProfile({
      title: profileForm.title.trim(),
      targetRole: profileForm.targetRole.trim() || null,
      profileJson: createProfileJson(profileForm)
    });
    return profile.id;
  };

  const saveResumeSection = async () => {
    if (!resumeContent.trim()) {
      return resumeDocumentId || null;
    }

    if (resumeDocumentId) {
      const document = await updateDocumentMeta(resumeDocumentId, {
        content: resumeContent.trim(),
        profileId: profileId || null
      });
      return document.id;
    }

    const document = await createDocument({
      title: `${title.trim() || "지원 묶음"} 이력서`,
      documentType: "resume",
      profileId: profileId || null,
      content: resumeContent.trim()
    });
    return document.id;
  };

  const saveCoverLetterSection = async () => {
    if (!coverLetterContent.trim()) {
      return coverLetterDocumentId || null;
    }

    if (coverLetterDocumentId) {
      const document = await updateDocumentMeta(coverLetterDocumentId, {
        content: coverLetterContent.trim(),
        profileId: profileId || null
      });
      return document.id;
    }

    const document = await createDocument({
      title: `${title.trim() || "지원 묶음"} 자기소개서`,
      documentType: "cover_letter",
      profileId: profileId || null,
      content: coverLetterContent.trim()
    });
    return document.id;
  };

  const saveSetLinks = async (next: {
    profileId?: string | null;
    resumeDocumentId?: string | null;
    coverLetterDocumentId?: string | null;
  }) => {
    if (!title.trim()) {
      throw new Error("묶음 제목을 입력하세요.");
    }

    const savedSet = await updateDocumentSet(setId, {
      title: title.trim(),
      profileId: next.profileId === undefined ? profileId || null : next.profileId,
      resumeDocumentId: next.resumeDocumentId === undefined ? resumeDocumentId || null : next.resumeDocumentId,
      coverLetterDocumentId:
        next.coverLetterDocumentId === undefined ? coverLetterDocumentId || null : next.coverLetterDocumentId
    });
    await reloadSet(savedSet.id);
  };

  const runSaveAction = async (action: () => Promise<void>, message: string) => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await action();
      setSuccessMessage(message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "묶음 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>지원 묶음</span>
          <div>
            <h1>{set?.title ?? "묶음 편집"}</h1>
            <p>프로필, 이력서, 자기소개서를 한 화면에서 확인하고 연결을 조정합니다.</p>
          </div>
          <button type="button" onClick={() => { window.location.href = "/documents"; }}>
            문서함
          </button>
        </header>

        {errorMessage && <div className="documentsNotice error">{errorMessage}</div>}
        {successMessage && <div className="documentsNotice success">{successMessage}</div>}

        {loading ? (
          <div className="documentsNotice">문서 묶음을 불러오는 중입니다.</div>
        ) : !set ? (
          <div className="documentsEmpty">
            <strong>문서 묶음을 찾을 수 없습니다.</strong>
            <p>문서함에서 다시 선택합니다.</p>
          </div>
        ) : (
          <form
            className="profileForm"
            onSubmit={(event) => {
              event.preventDefault();
              void runSaveAction(async () => {
                const nextProfileId = await saveProfileSection(false);
                const nextResumeDocumentId = await saveResumeSection();
                const nextCoverLetterDocumentId = await saveCoverLetterSection();
                await saveSetLinks({
                  profileId: nextProfileId,
                  resumeDocumentId: nextResumeDocumentId,
                  coverLetterDocumentId: nextCoverLetterDocumentId
                });
              }, "묶음을 저장했습니다.");
            }}
          >
            <label className="profileFormWide">
              묶음 제목
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <section className="profileFormWide documentsCard">
              <div className="documentsCardType profile">프로필</div>
              <div className="documentsCardBody">
                <label>
                  기존 프로필 연결
                  <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
                    <option value="">선택 안 함</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.title}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedProfile ? (
                  <>
                    <label>
                      프로필 제목
                      <input
                        value={profileForm.title}
                        onChange={(event) => updateProfileField("title", event.target.value)}
                      />
                    </label>
                    <label>
                      목표 직무
                      <input
                        value={profileForm.targetRole}
                        onChange={(event) => updateProfileField("targetRole", event.target.value)}
                      />
                    </label>
                    <label>
                      이름
                      <input value={profileForm.name} onChange={(event) => updateProfileField("name", event.target.value)} />
                    </label>
                    <label>
                      기술 스택
                      <input
                        value={profileForm.skills}
                        onChange={(event) => updateProfileField("skills", event.target.value)}
                      />
                    </label>
                    <label className="profileFormWide">
                      프로필 내용
                      <textarea
                        value={profileForm.summary}
                        onChange={(event) => updateProfileField("summary", event.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <div className="documentsNotice info">
                      <strong>연결된 프로필이 없습니다.</strong>
                      <p>새 프로필을 만들거나 기존 프로필을 선택합니다.</p>
                    </div>
                    <label>
                      새 프로필 제목
                      <input
                        value={profileForm.title}
                        onChange={(event) => updateProfileField("title", event.target.value)}
                      />
                    </label>
                    <label className="profileFormWide">
                      새 프로필 내용
                      <textarea
                        value={profileForm.summary}
                        onChange={(event) => updateProfileField("summary", event.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>
              <div className="documentsCardMeta">
                <span>{selectedProfile ? formatDate(selectedProfile.updatedAt) : "미연결"}</span>
                <button
                  disabled={saving}
                  type="button"
                  onClick={() => {
                    void runSaveAction(async () => {
                      const nextProfileId = await saveProfileSection();
                      await saveSetLinks({ profileId: nextProfileId });
                    }, "프로필 섹션을 저장했습니다.");
                  }}
                >
                  저장
                </button>
                <button className="documentsSecondaryButton" type="button" onClick={() => { setProfileId(""); }}>
                  연결 해제
                </button>
              </div>
            </section>

            <section className="profileFormWide documentsCard">
              <div className="documentsCardType resume">이력서</div>
              <div className="documentsCardBody">
                <label>
                  기존 이력서 연결
                  <select value={resumeDocumentId} onChange={(event) => setResumeDocumentId(event.target.value)}>
                    <option value="">선택 안 함</option>
                    {resumes.map((document) => (
                      <option key={document.id} value={document.id}>
                        {getDocumentLabel(document)}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedResume ? (
                  <label className="profileFormWide">
                    이력서 본문
                    <textarea value={resumeContent} onChange={(event) => setResumeContent(event.target.value)} />
                  </label>
                ) : (
                  <>
                    <div className="documentsNotice info">
                      <strong>연결된 이력서가 없습니다.</strong>
                      <p>새 이력서를 만들거나 기존 이력서를 선택합니다.</p>
                    </div>
                    <label className="profileFormWide">
                      새 이력서 본문
                      <textarea value={resumeContent} onChange={(event) => setResumeContent(event.target.value)} />
                    </label>
                  </>
                )}
              </div>
              <div className="documentsCardMeta">
                <span>{selectedResume ? formatDate(selectedResume.updatedAt) : "미연결"}</span>
                <button
                  disabled={saving}
                  type="button"
                  onClick={() => {
                    void runSaveAction(async () => {
                      const nextResumeDocumentId = await saveResumeSection();
                      await saveSetLinks({ resumeDocumentId: nextResumeDocumentId });
                    }, "이력서 섹션을 저장했습니다.");
                  }}
                >
                  저장
                </button>
                <button className="documentsSecondaryButton" type="button" onClick={() => setResumeDocumentId("")}>
                  연결 해제
                </button>
              </div>
            </section>

            <section className="profileFormWide documentsCard">
              <div className="documentsCardType cover-letter">자기소개서</div>
              <div className="documentsCardBody">
                <label>
                  기존 자기소개서 연결
                  <select
                    value={coverLetterDocumentId}
                    onChange={(event) => setCoverLetterDocumentId(event.target.value)}
                  >
                    <option value="">선택 안 함</option>
                    {coverLetters.map((document) => (
                      <option key={document.id} value={document.id}>
                        {getDocumentLabel(document)}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedCoverLetter ? (
                  <label className="profileFormWide">
                    자기소개서 본문
                    <textarea value={coverLetterContent} onChange={(event) => setCoverLetterContent(event.target.value)} />
                  </label>
                ) : (
                  <>
                    <div className="documentsNotice info">
                      <strong>연결된 자기소개서가 없습니다.</strong>
                      <p>새 자기소개서를 만들거나 기존 자기소개서를 선택합니다.</p>
                    </div>
                    <label className="profileFormWide">
                      새 자기소개서 본문
                      <textarea value={coverLetterContent} onChange={(event) => setCoverLetterContent(event.target.value)} />
                    </label>
                  </>
                )}
              </div>
              <div className="documentsCardMeta">
                <span>{selectedCoverLetter ? formatDate(selectedCoverLetter.updatedAt) : "미연결"}</span>
                <button
                  disabled={saving}
                  type="button"
                  onClick={() => {
                    void runSaveAction(async () => {
                      const nextCoverLetterDocumentId = await saveCoverLetterSection();
                      await saveSetLinks({ coverLetterDocumentId: nextCoverLetterDocumentId });
                    }, "자기소개서 섹션을 저장했습니다.");
                  }}
                >
                  저장
                </button>
                <button className="documentsSecondaryButton" type="button" onClick={() => setCoverLetterDocumentId("")}>
                  연결 해제
                </button>
              </div>
            </section>
            <div className="profileFormActions">
              <button className="documentsSecondaryButton" type="button" onClick={() => { window.location.href = "/documents"; }}>
                취소
              </button>
              <button disabled={saving} type="submit">
                {saving ? "저장 중" : "전체 저장"}
              </button>
            </div>
          </form>
        )}
      </section>
      <HomeFooter />
    </main>
  );
}
