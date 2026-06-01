import { useEffect, useMemo, useState } from "react";
import { copyDocument, getDocuments } from "../api/documentClient";
import { getDocumentSets } from "../api/documentSetClient";
import { copyProfile, getProfiles } from "../api/profileClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { ApplicationSetItem } from "../types/applicationSet";
import type { ApplicationDocumentType, DocumentListItem } from "../types/document";
import type { ProfileListItem } from "../types/profile";

type DocumentsFilter = "all" | "profile" | "resume" | "cover_letter" | "set";
type LibraryItem =
  | { kind: "profile"; updatedAt: string; profile: ProfileListItem }
  | { kind: "document"; updatedAt: string; document: DocumentListItem }
  | { kind: "set"; updatedAt: string; set: ApplicationSetItem };

const documentFilters: Array<{ label: string; value: DocumentsFilter }> = [
  { label: "전체", value: "all" },
  { label: "프로필", value: "profile" },
  { label: "이력서", value: "resume" },
  { label: "자기소개서", value: "cover_letter" },
  { label: "묶음", value: "set" }
];

function getInitialFilter(): DocumentsFilter {
  const value = new URLSearchParams(window.location.search).get("type");

  if (value === "profile" || value === "resume" || value === "cover_letter" || value === "set") {
    return value;
  }

  return "all";
}

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

function getProfileTarget(profile: ProfileListItem) {
  return profile.targetRole || profile.desiredRoles[0] || "목표 직무 미지정";
}

function getSetSummary(set: ApplicationSetItem) {
  const labels = [set.profileTitle, set.resumeTitle, set.coverLetterTitle].filter(Boolean);
  return labels.length > 0 ? labels.join(" / ") : "연결된 항목 없음";
}

export function Documents() {
  const [filter, setFilter] = useState<DocumentsFilter>(() => getInitialFilter());
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [sets, setSets] = useState<ApplicationSetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadLibrary() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [profileResult, documentResult, setResult] = await Promise.all([
        getProfiles(),
        getDocuments(),
        getDocumentSets()
      ]);

      setProfiles(profileResult);
      setDocuments(documentResult);
      setSets(setResult);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문서 보관함을 불러오지 못했습니다.");
      setProfiles([]);
      setDocuments([]);
      setSets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLibrary();
  }, []);

  const items = useMemo<LibraryItem[]>(() => {
    const merged: LibraryItem[] = [
      ...profiles.map((profile) => ({ kind: "profile" as const, updatedAt: profile.updatedAt, profile })),
      ...documents.map((document) => ({ kind: "document" as const, updatedAt: document.updatedAt, document })),
      ...sets.map((set) => ({ kind: "set" as const, updatedAt: set.updatedAt, set }))
    ];

    return merged
      .filter((item) => {
        if (filter === "all") {
          return true;
        }

        if (filter === "profile") {
          return item.kind === "profile";
        }

        if (filter === "set") {
          return item.kind === "set";
        }

        return item.kind === "document" && item.document.documentType === filter;
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [documents, filter, profiles, sets]);

  const visibleCountText = useMemo(() => {
    if (loading) {
      return "불러오는 중";
    }

    return `${items.length}개 항목`;
  }, [items.length, loading]);

  const handleCopyProfile = async (profileId: string) => {
    setCopyingId(profileId);
    setErrorMessage(null);

    try {
      await copyProfile(profileId);
      await loadLibrary();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "프로필 복사에 실패했습니다.");
    } finally {
      setCopyingId(null);
    }
  };

  const handleCopyDocument = async (documentId: string) => {
    setCopyingId(documentId);
    setErrorMessage(null);

    try {
      await copyDocument(documentId);
      await loadLibrary();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문서 복사에 실패했습니다.");
    } finally {
      setCopyingId(null);
    }
  };

  return (
    <main className="documentsPage">
      <HomeTopNav />

      <section className="documentsContent">
        <header className="documentsHeader">
          <span>보관함</span>
          <div>
            <h1>문서 보관함</h1>
            <p>프로필, 이력서, 자기소개서, 지원 묶음을 한 곳에서 확인합니다.</p>
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
          <div className="documentsNotice">문서 보관함을 불러오는 중입니다.</div>
        ) : items.length === 0 ? (
          <div className="documentsEmpty">
            <strong>저장된 항목이 없습니다.</strong>
            <p>프로필이나 문서를 먼저 저장합니다.</p>
          </div>
        ) : (
          <section className="documentsList" aria-label="통합 문서 목록">
            {items.map((item) => {
              if (item.kind === "profile") {
                const profile = item.profile;

                return (
                  <article className="documentsCard" key={`profile-${profile.id}`}>
                    <div className="documentsCardType">{profile.isDefault ? "기본 프로필" : "프로필"}</div>
                    <div className="documentsCardBody">
                      <div>
                        <h2>{profile.title}</h2>
                        <span>{formatDate(profile.updatedAt)} 업데이트</span>
                      </div>
                      <p>{getProfileTarget(profile)}</p>
                      <div className="documentsTags">
                        {profile.skills.slice(0, 4).map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                        {profile.skills.length === 0 && <span>기술 스택 미입력</span>}
                        {profile.isArchived && <span>보관됨</span>}
                      </div>
                    </div>
                    <div className="documentsCardMeta">
                      <span>{profile.isDefault ? "기본 프로필" : "일반 프로필"}</span>
                      <strong>{profile.name ?? profile.email ?? profile.candidateKey}</strong>
                      <button type="button" onClick={() => { window.location.href = `/documents/profiles/${profile.id}`; }}>
                        보기/수정
                      </button>
                      <button
                        className="documentsSecondaryButton"
                        disabled={copyingId === profile.id}
                        type="button"
                        onClick={() => { void handleCopyProfile(profile.id); }}
                      >
                        {copyingId === profile.id ? "복사 중" : "복사"}
                      </button>
                    </div>
                  </article>
                );
              }

              if (item.kind === "set") {
                const set = item.set;

                return (
                  <article className="documentsCard" key={`set-${set.id}`}>
                    <div className="documentsCardType">묶음</div>
                    <div className="documentsCardBody">
                      <div>
                        <h2>{set.title}</h2>
                        <span>{formatDate(set.updatedAt)} 업데이트</span>
                      </div>
                      <p>{getSetSummary(set)}</p>
                      <div className="documentsTags">
                        {set.profileTitle && <span>프로필</span>}
                        {set.resumeTitle && <span>이력서</span>}
                        {set.coverLetterTitle && <span>자기소개서</span>}
                        {set.isArchived && <span>보관됨</span>}
                      </div>
                    </div>
                    <div className="documentsCardMeta">
                      <span>{set.isArchived ? "보관됨" : "지원 묶음"}</span>
                      <strong>{set.resumeTitle ?? set.coverLetterTitle ?? set.profileTitle ?? "미연결"}</strong>
                      <button type="button" onClick={() => { window.location.href = `/documents/sets/${set.id}`; }}>
                        묶음 편집
                      </button>
                    </div>
                  </article>
                );
              }

              const document = item.document;

              return (
                <article className="documentsCard" key={`document-${document.id}`}>
                  <div className="documentsCardType">{getDocumentTypeLabel(document.documentType)}</div>
                  <div className="documentsCardBody">
                    <div>
                      <h2>{document.title}</h2>
                      <span>{formatDate(document.updatedAt)} 업데이트</span>
                    </div>
                    <p>{getDocumentTarget(document)}</p>
                    <div className="documentsTags">
                      {document.profileTitle && <span>{document.profileTitle}</span>}
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
                      disabled={copyingId === document.id}
                      type="button"
                      onClick={() => { void handleCopyDocument(document.id); }}
                    >
                      {copyingId === document.id ? "복사 중" : "복사"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>

      <HomeFooter />
    </main>
  );
}
