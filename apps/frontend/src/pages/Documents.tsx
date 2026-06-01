import { useEffect, useMemo, useState } from "react";
import { archiveDocument, copyDocument, getDocuments, restoreDocument } from "../api/documentClient";
import { archiveDocumentSet, createDocumentSet, getDocumentSets, restoreDocumentSet } from "../api/documentSetClient";
import { archiveProfile, copyProfile, getProfiles, restoreProfile } from "../api/profileClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { ApplicationSetItem } from "../types/applicationSet";
import type { ApplicationDocumentType, DocumentListItem } from "../types/document";
import type { ProfileListItem } from "../types/profile";

type DocumentsFilter = "all" | "profile" | "resume" | "cover_letter" | "set";
type DocumentsSort = "updated" | "type" | "company";
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

const documentSorts: Array<{ label: string; value: DocumentsSort }> = [
  { label: "최신순", value: "updated" },
  { label: "유형순", value: "type" },
  { label: "회사순", value: "company" }
];

const documentTypeOrder: Record<DocumentsFilter, number> = {
  all: 0,
  profile: 1,
  resume: 2,
  cover_letter: 3,
  set: 4
};

function getInitialFilter(): DocumentsFilter {
  const value = new URLSearchParams(window.location.search).get("type");

  if (value === "profile" || value === "resume" || value === "cover_letter" || value === "set") {
    return value;
  }

  return "all";
}

function getDocumentsFilterPath(nextFilter: DocumentsFilter) {
  if (nextFilter === "all") {
    return "/documents";
  }

  return `/documents?type=${nextFilter}`;
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

function isLoginRequiredError(error: unknown) {
  return error instanceof Error && error.message.includes("로그인이 필요합니다");
}

function getItemId(item: LibraryItem) {
  if (item.kind === "profile") {
    return item.profile.id;
  }

  if (item.kind === "document") {
    return item.document.id;
  }

  return item.set.id;
}

function getItemArchived(item: LibraryItem) {
  if (item.kind === "profile") {
    return item.profile.isArchived;
  }

  if (item.kind === "document") {
    return item.document.isArchived;
  }

  return item.set.isArchived;
}

function getItemTypeOrder(item: LibraryItem) {
  if (item.kind === "profile") {
    return documentTypeOrder.profile;
  }

  if (item.kind === "set") {
    return documentTypeOrder.set;
  }

  return documentTypeOrder[item.document.documentType];
}

function getItemCompanySortValue(item: LibraryItem) {
  if (item.kind === "document") {
    return item.document.company ?? item.document.jobTitle ?? item.document.profileTitle ?? item.document.title;
  }

  if (item.kind === "set") {
    return item.set.profileTitle ?? item.set.resumeTitle ?? item.set.coverLetterTitle ?? item.set.title;
  }

  return item.profile.targetCompany ?? item.profile.targetRole ?? item.profile.title;
}

function getItemSearchText(item: LibraryItem) {
  if (item.kind === "profile") {
    const profile = item.profile;
    return [
      profile.title,
      profile.targetCompany,
      profile.targetRole,
      profile.name,
      profile.email,
      ...profile.desiredRoles,
      ...profile.skills
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (item.kind === "document") {
    const document = item.document;
    return [
      document.title,
      document.company,
      document.jobTitle,
      document.profileTitle,
      getDocumentTypeLabel(document.documentType)
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    item.set.title,
    item.set.profileTitle,
    item.set.resumeTitle,
    item.set.coverLetterTitle
  ]
    .filter(Boolean)
    .join(" ");
}

export function Documents() {
  const [filter, setFilter] = useState<DocumentsFilter>(() => getInitialFilter());
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<DocumentsSort>("updated");
  const [showArchived, setShowArchived] = useState(false);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [sets, setSets] = useState<ApplicationSetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [creatingSet, setCreatingSet] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadLibrary() {
    setLoading(true);
    setErrorMessage(null);
    setAuthRequired(false);

    try {
      const [profileResult, documentResult, setResult] = await Promise.all([
        getProfiles({ includeArchived: showArchived }),
        getDocuments({ includeArchived: showArchived }),
        getDocumentSets({ includeArchived: showArchived })
      ]);

      setProfiles(profileResult);
      setDocuments(documentResult);
      setSets(setResult);
    } catch (error) {
      if (isLoginRequiredError(error)) {
        setAuthRequired(true);
        setErrorMessage(null);
      } else {
        setErrorMessage(error instanceof Error ? error.message : "문서함을 불러오지 못했습니다.");
      }
      setProfiles([]);
      setDocuments([]);
      setSets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLibrary();
  }, [showArchived]);

  useEffect(() => {
    const syncFilterFromUrl = () => {
      setFilter(getInitialFilter());
    };

    window.addEventListener("popstate", syncFilterFromUrl);
    return () => window.removeEventListener("popstate", syncFilterFromUrl);
  }, []);

  const items = useMemo<LibraryItem[]>(() => {
    const merged: LibraryItem[] = [
      ...profiles.map((profile) => ({ kind: "profile" as const, updatedAt: profile.updatedAt, profile })),
      ...documents.map((document) => ({ kind: "document" as const, updatedAt: document.updatedAt, document })),
      ...sets.map((set) => ({ kind: "set" as const, updatedAt: set.updatedAt, set }))
    ];
    const normalizedSearchText = searchText.trim().toLowerCase();

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
      .filter((item) => {
        if (!normalizedSearchText) {
          return true;
        }

        return getItemSearchText(item).toLowerCase().includes(normalizedSearchText);
      })
      .sort((left, right) => {
        if (sort === "type") {
          const typeDifference = getItemTypeOrder(left) - getItemTypeOrder(right);
          return typeDifference || right.updatedAt.localeCompare(left.updatedAt);
        }

        if (sort === "company") {
          return (
            getItemCompanySortValue(left).localeCompare(getItemCompanySortValue(right), "ko-KR") ||
            right.updatedAt.localeCompare(left.updatedAt)
          );
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [documents, filter, profiles, searchText, sets, sort]);

  const totalLibraryCount = profiles.length + documents.length + sets.length;

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

  const handleCreateSet = async () => {
    setCreatingSet(true);
    setErrorMessage(null);

    try {
      const set = await createDocumentSet({ title: "새 지원 묶음" });
      window.location.href = `/documents/sets/${set.id}`;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "지원 묶음 생성에 실패했습니다.");
    } finally {
      setCreatingSet(false);
    }
  };

  const handleArchiveToggle = async (item: LibraryItem) => {
    const itemId = getItemId(item);
    const actionId = `${item.kind}-${itemId}`;
    const isArchived = getItemArchived(item);
    setWorkingId(actionId);
    setErrorMessage(null);

    try {
      if (item.kind === "profile") {
        await (isArchived ? restoreProfile(itemId) : archiveProfile(itemId));
      } else if (item.kind === "document") {
        await (isArchived ? restoreDocument(itemId) : archiveDocument(itemId));
      } else {
        await (isArchived ? restoreDocumentSet(itemId) : archiveDocumentSet(itemId));
      }

      await loadLibrary();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : isArchived ? "복원에 실패했습니다." : "보관에 실패했습니다.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleFilterChange = (nextFilter: DocumentsFilter) => {
    setFilter(nextFilter);
    window.history.pushState({}, "", getDocumentsFilterPath(nextFilter));
  };

  return (
    <main className="documentsPage">
      <HomeTopNav />

      <section className="documentsContent">
        <header className="documentsHeader">
          <span>문서함</span>
          <div>
            <h1>문서함</h1>
            <p>프로필, 이력서, 자기소개서, 지원 묶음을 한 곳에서 확인합니다.</p>
          </div>
          <div className="documentsHeaderActions">
            <button type="button" onClick={() => { window.location.href = "/documents/profiles/new"; }}>
              프로필 만들기
            </button>
            <button type="button" onClick={() => { window.location.href = "/documents/new"; }}>
              새 문서 만들기
            </button>
            <button disabled={creatingSet} type="button" onClick={() => { void handleCreateSet(); }}>
              {creatingSet ? "묶음 생성 중" : "지원 묶음 만들기"}
            </button>
          </div>
        </header>

        <div className="documentsToolbar" aria-label="문서 필터">
          {documentFilters.map((item) => (
            <button
              className={filter === item.value ? "active" : ""}
              key={item.value}
              type="button"
              onClick={() => handleFilterChange(item.value)}
            >
              {item.label}
            </button>
          ))}
          <span className="documentsToolbarMeta">{visibleCountText}</span>
        </div>

        {!authRequired && (
          <div className="documentsControls">
            <label>
              검색
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="제목, 회사, 직무, 기술스택 검색"
              />
            </label>
            <label>
              정렬
              <select value={sort} onChange={(event) => setSort(event.target.value as DocumentsSort)}>
                {documentSorts.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="documentsArchiveToggle">
              <input
                checked={showArchived}
                type="checkbox"
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              보관 항목 보기
            </label>
          </div>
        )}

        {errorMessage && <div className="documentsNotice error">{errorMessage}</div>}

        {authRequired ? (
          <div className="documentsEmpty">
            <strong>로그인이 필요합니다.</strong>
            <p>문서함을 보려면 먼저 로그인하세요.</p>
            <div className="documentsEmptyActions">
              <button type="button" onClick={() => { window.location.href = "/login"; }}>
                로그인
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="documentsNotice">문서함을 불러오는 중입니다.</div>
        ) : totalLibraryCount === 0 ? (
          <div className="documentsEmpty">
            <strong>저장된 항목이 없습니다.</strong>
            <p>프로필, 문서, 지원 묶음을 만들어 지원 자료를 정리합니다.</p>
            <div className="documentsEmptyActions">
              <button type="button" onClick={() => { window.location.href = "/documents/profiles/new"; }}>
                프로필 만들기
              </button>
              <button type="button" onClick={() => { window.location.href = "/documents/new"; }}>
                새 문서 만들기
              </button>
              <button disabled={creatingSet} type="button" onClick={() => { void handleCreateSet(); }}>
                {creatingSet ? "묶음 생성 중" : "지원 묶음 만들기"}
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="documentsEmpty">
            <strong>조건에 맞는 항목이 없습니다.</strong>
            <p>필터, 검색어, 보관 항목 보기 설정을 조정하세요.</p>
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
                      <button
                        className={profile.isArchived ? "documentsSecondaryButton" : "documentsDangerButton"}
                        disabled={workingId === `profile-${profile.id}`}
                        type="button"
                        onClick={() => { void handleArchiveToggle(item); }}
                      >
                        {workingId === `profile-${profile.id}` ? "처리 중" : profile.isArchived ? "복원" : "보관"}
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
                      <button
                        className={set.isArchived ? "documentsSecondaryButton" : "documentsDangerButton"}
                        disabled={workingId === `set-${set.id}`}
                        type="button"
                        onClick={() => { void handleArchiveToggle(item); }}
                      >
                        {workingId === `set-${set.id}` ? "처리 중" : set.isArchived ? "복원" : "보관"}
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
                    <button
                      className={document.isArchived ? "documentsSecondaryButton" : "documentsDangerButton"}
                      disabled={workingId === `document-${document.id}`}
                      type="button"
                      onClick={() => { void handleArchiveToggle(item); }}
                    >
                      {workingId === `document-${document.id}` ? "처리 중" : document.isArchived ? "복원" : "보관"}
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
