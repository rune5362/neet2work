import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getJobs } from "../api/client";
import { createDocument } from "../api/documentClient";
import { getProfiles } from "../api/profileClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { ApplicationDocumentType } from "../types/document";
import type { JobPosting } from "../types/job";
import type { ProfileListItem } from "../types/profile";

function getInitialDocumentType(): ApplicationDocumentType {
  const value = new URLSearchParams(window.location.search).get("documentType");
  return value === "cover_letter" ? "cover_letter" : "resume";
}

function getInitialProfileId() {
  return new URLSearchParams(window.location.search).get("profileId") ?? "";
}

function getDocumentTypeLabel(type: ApplicationDocumentType) {
  return type === "resume" ? "이력서" : "자기소개서";
}

export function DocumentNew() {
  const [documentType, setDocumentType] = useState<ApplicationDocumentType>(() => getInitialDocumentType());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [profileId, setProfileId] = useState(() => getInitialProfileId());
  const [jobId, setJobId] = useState("");
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [profileResult, jobResult] = await Promise.all([
          getProfiles(),
          getJobs()
            .then((result) => result.data)
            .catch(() => [])
        ]);

        if (!cancelled) {
          setProfiles(profileResult);
          setJobs(jobResult);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "문서 생성 옵션을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === profileId) ?? null,
    [profileId, profiles]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("문서 제목을 입력하세요.");
      return;
    }

    if (!content.trim()) {
      setErrorMessage("문서 본문을 입력하세요.");
      return;
    }

    setSaving(true);

    try {
      const document = await createDocument({
        title: title.trim(),
        documentType,
        profileId: profileId || null,
        jobId: jobId || null,
        content: content.trim()
      });

      window.location.href = `/documents/${document.id}`;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문서 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>새 문서</span>
          <div>
            <h1>새 문서 만들기</h1>
            <p>지원 프로필과 채용공고를 선택하고 직접 작성한 본문을 저장합니다.</p>
          </div>
        </header>

        {errorMessage && <div className="documentsNotice error">{errorMessage}</div>}
        {loading && <div className="documentsNotice">문서 생성 옵션을 불러오는 중입니다.</div>}

        <form className="profileForm" onSubmit={handleSubmit}>
          <label>
            문서 유형
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value as ApplicationDocumentType)}>
              <option value="resume">이력서</option>
              <option value="cover_letter">자기소개서</option>
            </select>
          </label>
          <label>
            문서 제목
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={`${getDocumentTypeLabel(documentType)} 제목`}
            />
          </label>
          <label>
            사용할 지원 프로필
            <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
              <option value="">선택 안 함</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.title}
                </option>
              ))}
            </select>
          </label>
          <label className="profileFormWide">
            연결할 채용공고
            <select value={jobId} onChange={(event) => setJobId(event.target.value)}>
              <option value="">선택 안 함</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.company} / {job.title}
                </option>
              ))}
            </select>
          </label>
          {selectedProfile && (
            <div className="documentsNotice info profileFormWide">
              {selectedProfile.title} 프로필을 기준으로 문서를 저장합니다.
            </div>
          )}
          <label className="profileFormWide">
            문서 본문
            <textarea value={content} onChange={(event) => setContent(event.target.value)} />
          </label>
          <div className="profileFormActions">
            <button className="documentsSecondaryButton" type="button" onClick={() => { window.location.href = "/documents"; }}>
              취소
            </button>
            <button disabled={saving} type="submit">
              {saving ? "저장 중" : "저장"}
            </button>
          </div>
        </form>
      </section>
      <HomeFooter />
    </main>
  );
}
