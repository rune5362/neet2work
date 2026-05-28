import { useEffect, useMemo, useState } from "react";
import { getDocuments } from "../api/documentClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { ApplicationDocumentType, DocumentListItem } from "../types/document";

type DocumentFilter = "all" | ApplicationDocumentType;

const documentFilters: Array<{ label: string; value: DocumentFilter }> = [
  { label: "전체", value: "all" },
  { label: "이력서", value: "resume" },
  { label: "자기소개서", value: "cover_letter" }
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function getDocumentTypeLabel(type: ApplicationDocumentType) {
  return type === "resume" ? "이력서" : "자기소개서";
}

function getDocumentTarget(document: DocumentListItem) {
  if (document.jobTitle && document.company) {
    return `${document.company} / ${document.jobTitle}`;
  }

  return document.jobTitle ?? document.profileTitle ?? "연결된 대상 없음";
}

export function Documents() {
  const [filter, setFilter] = useState<DocumentFilter>("all");
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const documentType = filter === "all" ? undefined : filter;

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const result = await getDocuments(undefined, { documentType });

        if (!cancelled) {
          setDocuments(result);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "문서 목록을 불러오지 못했습니다.");
          setDocuments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [documentType]);

  const visibleCountText = useMemo(() => {
    if (loading) {
      return "불러오는 중";
    }

    return `${documents.length}개 문서`;
  }, [documents.length, loading]);

  return (
    <main className="documentsPage">
      <HomeTopNav />

      <section className="documentsContent">
        <header className="documentsHeader">
          <span>보관함</span>
          <div>
            <h1>문서 보관함</h1>
            <p>이력서와 자기소개서를 실제 저장 데이터 기준으로 확인하고 버전 관리 화면으로 이동합니다.</p>
          </div>
          <button type="button" onClick={() => { window.location.href = "/documents/new"; }}>
            새 문서 만들기
          </button>
        </header>

        <div className="documentsToolbar" aria-label="문서 필터">
          {documentFilters.map((item) => (
            <button
              className={filter === item.value ? "active" : ""}
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
          <span className="documentsToolbarMeta">{visibleCountText}</span>
        </div>

        {errorMessage && <div className="documentsNotice error">{errorMessage}</div>}

        {loading ? (
          <div className="documentsNotice">문서 목록을 불러오는 중입니다.</div>
        ) : documents.length === 0 ? (
          <div className="documentsEmpty">
            <strong>저장된 문서가 없습니다.</strong>
            <p>새 문서 만들기에서 이력서나 자기소개서를 먼저 저장합니다.</p>
          </div>
        ) : (
          <section className="documentsList" aria-label="보관 문서 목록">
            {documents.map((document) => (
              <article className="documentsCard" key={document.id}>
                <div className="documentsCardType">{getDocumentTypeLabel(document.documentType)}</div>
                <div className="documentsCardBody">
                  <div>
                    <h2>{document.title}</h2>
                    <span>{formatDate(document.updatedAt)} 업데이트</span>
                  </div>
                  <p>{getDocumentTarget(document)}</p>
                  <div className="documentsTags">
                    {document.profileTitle && <span>{document.profileTitle}</span>}
                    <span>v{document.currentVersionNo ?? "-"}</span>
                    {document.isArchived && <span>보관됨</span>}
                  </div>
                </div>
                <div className="documentsCardMeta">
                  <span>{document.isArchived ? "보관됨" : "작성 중"}</span>
                  <strong>{document.company ?? document.jobTitle ?? getDocumentTypeLabel(document.documentType)}</strong>
                  <button type="button" onClick={() => { window.location.href = `/documents/${document.id}`; }}>
                    열기
                  </button>
                  <button
                    className="documentsSecondaryButton"
                    type="button"
                    onClick={() => { window.location.href = `/documents/${document.id}/versions`; }}
                  >
                    버전 관리
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>

      <HomeFooter />
    </main>
  );
}
