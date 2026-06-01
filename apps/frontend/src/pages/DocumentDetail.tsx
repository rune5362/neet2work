import { useEffect, useState, type FormEvent } from "react";
import { copyDocument, getDocument, updateDocumentMeta } from "../api/documentClient";
import { getProfiles } from "../api/profileClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { DocumentDetail as DocumentDetailData } from "../types/document";
import type { ProfileListItem } from "../types/profile";

function getDocumentIdFromPath() {
  return window.location.pathname.split("/").filter(Boolean)[1] ?? "";
}

function getDocumentTypeLabel(type: DocumentDetailData["documentType"]) {
  return type === "resume" ? "이력서" : "자기소개서";
}

export function DocumentDetail() {
  const documentId = getDocumentIdFromPath();
  const [document, setDocument] = useState<DocumentDetailData | null>(null);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [content, setContent] = useState("");
  const [profileId, setProfileId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadDocument() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [result, profileResult] = await Promise.all([getDocument(documentId), getProfiles().catch(() => [])]);
      setDocument(result);
      setProfiles(profileResult);
      setContent(result.content);
      setProfileId(result.profileId ?? "");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문서를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocument();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!content.trim()) {
      setErrorMessage("문서 본문을 입력하세요.");
      return;
    }

    setSaving(true);

    try {
      await updateDocumentMeta(documentId, {
        content: content.trim(),
        profileId: profileId || null
      });
      await loadDocument();
      setSuccessMessage("문서를 저장했습니다.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문서 버전 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    setCopying(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const copiedDocument = await copyDocument(documentId);
      window.location.href = `/documents/${copiedDocument.id}`;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문서 복사에 실패했습니다.");
    } finally {
      setCopying(false);
    }
  };

  const selectedProfile = profiles.find((profile) => profile.id === profileId) ?? null;
  const profileReferenceText = profileId
    ? document?.profileSnapshotText ?? selectedProfile?.profileText ?? "연결된 프로필의 본문을 불러오지 못했습니다."
    : "연결된 프로필이 없습니다.";

  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>문서 상세</span>
          <div>
            <h1>{document?.title ?? "문서 상세/편집"}</h1>
            <p>문서 본문을 확인하고 수정 내용을 저장합니다.</p>
          </div>
          <button disabled={copying || !document} type="button" onClick={() => { void handleCopy(); }}>
            {copying ? "복사 중" : "복사"}
          </button>
        </header>

        {errorMessage && <div className="documentsNotice error">{errorMessage}</div>}
        {successMessage && <div className="documentsNotice success">{successMessage}</div>}

        {loading ? (
          <div className="documentsNotice">문서를 불러오는 중입니다.</div>
        ) : !document ? (
          <div className="documentsEmpty">
            <strong>문서를 찾을 수 없습니다.</strong>
            <p>문서 보관함에서 다시 선택합니다.</p>
          </div>
        ) : (
          <form className="profileForm" onSubmit={handleSubmit}>
            <div className="documentsNotice info profileFormWide">
              {getDocumentTypeLabel(document.documentType)}
              {document.profileTitle ? ` / ${document.profileTitle}` : ""}
              {document.jobTitle ? ` / ${document.jobTitle}` : ""}
            </div>
            <label className="profileFormWide">
              연결 프로필
              <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
                <option value="">연결 안 함</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="documentsNotice info profileFormWide">
              <strong>참조 프로필</strong>
              <p>{profileReferenceText}</p>
            </div>
            <label className="profileFormWide">
              문서 본문
              <textarea value={content} onChange={(event) => setContent(event.target.value)} />
            </label>
            <div className="documentsAnalysisPending profileFormWide">
              <div>
                <strong>AI 분석 기능은 현재 연동 준비 중입니다.</strong>
                <p>분석 페이지 구현이 완료된 후 연결될 예정입니다.</p>
              </div>
              <button disabled type="button">
                AI 분석하기
              </button>
            </div>
            <div className="profileFormActions">
              <button className="documentsSecondaryButton" type="button" onClick={() => { window.location.href = "/documents"; }}>
                목록
              </button>
              <button disabled={saving} type="submit">
                {saving ? "저장 중" : "저장"}
              </button>
            </div>
          </form>
        )}
      </section>
      <HomeFooter />
    </main>
  );
}
