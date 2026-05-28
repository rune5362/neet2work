import { useEffect, useState, type FormEvent } from "react";
import { createDocumentVersion, getDocument } from "../api/documentClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { DocumentDetail as DocumentDetailData } from "../types/document";

function getDocumentIdFromPath() {
  return window.location.pathname.split("/").filter(Boolean)[1] ?? "";
}

function getDocumentTypeLabel(type: DocumentDetailData["documentType"]) {
  return type === "resume" ? "이력서" : "자기소개서";
}

export function DocumentDetail() {
  const documentId = getDocumentIdFromPath();
  const [document, setDocument] = useState<DocumentDetailData | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadDocument() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await getDocument(documentId);
      setDocument(result);
      setContent(result.currentVersion?.content ?? "");
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
      const version = await createDocumentVersion(documentId, {
        content: content.trim(),
        title: "사용자 수정",
        makeCurrent: true
      });
      await loadDocument();
      setSuccessMessage(`v${version.versionNo} 새 버전을 저장했습니다.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문서 버전 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>문서 상세</span>
          <div>
            <h1>{document?.title ?? "문서 상세/편집"}</h1>
            <p>현재 문서 버전의 본문을 확인하고 수정 내용을 새 버전으로 저장합니다.</p>
          </div>
          <button type="button" onClick={() => { window.location.href = `/documents/${documentId}/versions`; }}>
            버전 관리
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
              {getDocumentTypeLabel(document.documentType)} / 현재 v{document.currentVersionNo ?? "-"}
              {document.profileTitle ? ` / ${document.profileTitle}` : ""}
              {document.jobTitle ? ` / ${document.jobTitle}` : ""}
            </div>
            <label className="profileFormWide">
              문서 본문
              <textarea value={content} onChange={(event) => setContent(event.target.value)} />
            </label>
            <div className="profileFormActions">
              <button className="documentsSecondaryButton" type="button" onClick={() => { window.location.href = "/documents"; }}>
                목록
              </button>
              <button disabled={saving} type="submit">
                {saving ? "저장 중" : "새 버전으로 저장"}
              </button>
            </div>
          </form>
        )}
      </section>
      <HomeFooter />
    </main>
  );
}
