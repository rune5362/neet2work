import { useEffect, useMemo, useState } from "react";
import {
  archiveDocument as protectDocument,
  copyDocument,
  deleteDocument,
  getDocuments,
  restoreDocument as unprotectDocument
} from "../api/documentClient";
import {
  archiveProfile as protectProfile,
  copyProfile,
  deleteProfile,
  getProfiles,
  restoreProfile as unprotectProfile
} from "../api/profileClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { ApplicationDocumentType, DocumentListItem } from "../types/document";
import type { ProfileListItem } from "../types/profile";

type DocumentsFilter = "all" | "profile" | "cover_letter";
type DocumentsSort = "updated" | "type" | "company";
type LibraryItem =
  | { kind: "profile"; updatedAt: string; profile: ProfileListItem }
  | { kind: "document"; updatedAt: string; document: DocumentListItem };

const documentFilters: Array<{ label: string; value: DocumentsFilter }> = [
  { label: "전체", value: "all" },
  { label: "프로필", value: "profile" },
  { label: "자기소개서", value: "cover_letter" }
];

const documentSorts: Array<{ label: string; value: DocumentsSort }> = [
  { label: "최신순", value: "updated" },
  { label: "유형순", value: "type" },
  { label: "회사순", value: "company" }
];

const documentTypeOrder: Record<DocumentsFilter, number> = {
  all: 0,
  profile: 1,
  cover_letter: 2
};

function getInitialFilter(): DocumentsFilter {
  const value = new URLSearchParams(window.location.search).get("type");

  if (value === "profile" || value === "cover_letter") {
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

function isLoginRequiredError(error: unknown) {
  return error instanceof Error && error.message.includes("로그인이 필요합니다");
}

function getItemId(item: LibraryItem) {
  if (item.kind === "profile") {
    return item.profile.id;
  }

  return item.document.id;
}

function getItemProtected(item: LibraryItem) {
  if (item.kind === "profile") {
    return item.profile.isArchived;
  }

  return item.document.isArchived;
}

function getItemTypeOrder(item: LibraryItem) {
  if (item.kind === "profile") {
    return documentTypeOrder.profile;
  }

  return documentTypeOrder.cover_letter;
}

function getItemCompanySortValue(item: LibraryItem) {
  if (item.kind === "document") {
    return item.document.company ?? item.document.jobTitle ?? item.document.profileTitle ?? item.document.title;
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

export function Documents() {
  const [filter, setFilter] = useState<DocumentsFilter>(() => getInitialFilter());
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<DocumentsSort>("updated");
  const [showProtectedItems, setShowProtectedItems] = useState(false);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadLibrary() {
    setLoading(true);
    setErrorMessage(null);
    setAuthRequired(false);

    try {
      const [profileResult, documentResult] = await Promise.all([
        getProfiles({ includeArchived: true }),
        getDocuments({ documentType: "cover_letter", includeArchived: true })
      ]);

      setProfiles(profileResult);
      setDocuments(documentResult.filter((document) => document.documentType === "cover_letter"));
    } catch (error) {
      if (isLoginRequiredError(error)) {
        setAuthRequired(true);
        setErrorMessage(null);
      } else {
        setErrorMessage(error instanceof Error ? error.message : "문서함을 불러오지 못했습니다.");
      }
      setProfiles([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLibrary();
  }, []);

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
      ...documents.map((document) => ({ kind: "document" as const, updatedAt: document.updatedAt, document }))
    ];
    const normalizedSearchText = searchText.trim().toLowerCase();

    return merged
      .filter((item) => {
        if (!showProtectedItems) {
          return true;
        }

        return getItemProtected(item);
      })
      .filter((item) => {
        if (filter === "all") {
          return true;
        }

        if (filter === "profile") {
          return item.kind === "profile";
        }

        return item.kind === "document" && item.document.documentType === "cover_letter";
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
  }, [documents, filter, profiles, searchText, showProtectedItems, sort]);

  const totalLibraryCount = profiles.length + documents.length;

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
      const copiedProfile = await copyProfile(profileId);
      setProfiles((currentProfiles) => [copiedProfile, ...currentProfiles]);
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
      const copiedDocument = await copyDocument(documentId);
      if (copiedDocument.documentType === "cover_letter") {
        setDocuments((currentDocuments) => [copiedDocument, ...currentDocuments]);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "문서 복사에 실패했습니다.");
    } finally {
      setCopyingId(null);
    }
  };

  const handleDeleteItem = async (item: LibraryItem) => {
    const itemId = getItemId(item);
    const actionId = `${item.kind}-${itemId}`;
    setDeletingId(actionId);
    setErrorMessage(null);

    try {
      if (item.kind === "profile") {
        await deleteProfile(itemId);
        setProfiles((currentProfiles) => currentProfiles.filter((profile) => profile.id !== itemId));
      } else {
        await deleteDocument(itemId);
        setDocuments((currentDocuments) => currentDocuments.filter((document) => document.id !== itemId));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "항목 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const getProtectionErrorMessage = (error: unknown, isProtected: boolean) => {
    if (error instanceof Error && error.message) {
      return error.message.replaceAll("보관", "보호").replaceAll("복원", "보호 해제");
    }

    return isProtected ? "보호 해제에 실패했습니다." : "보호에 실패했습니다.";
  };

  const handleProtectionToggle = async (item: LibraryItem) => {
    const itemId = getItemId(item);
    const actionId = `${item.kind}-${itemId}`;
    const isProtected = getItemProtected(item);
    setWorkingId(actionId);
    setErrorMessage(null);

    try {
      if (item.kind === "profile") {
        const updatedProfile = await (isProtected ? unprotectProfile(itemId) : protectProfile(itemId));
        setProfiles((currentProfiles) =>
          currentProfiles.map((profile) => (profile.id === itemId ? updatedProfile : profile))
        );
      } else {
        const updatedDocument = await (isProtected ? unprotectDocument(itemId) : protectDocument(itemId));
        setDocuments((currentDocuments) =>
          currentDocuments.map((document) => (document.id === itemId ? updatedDocument : document))
        );
      }
    } catch (error) {
      setErrorMessage(getProtectionErrorMessage(error, isProtected));
    } finally {
      setWorkingId(null);
    }
  };

  const handleFilterChange = (nextFilter: DocumentsFilter) => {
    setFilter(nextFilter);
    window.history.pushState({}, "", getDocumentsFilterPath(nextFilter));
  };

  const renderProtectionButton = (item: LibraryItem, actionId: string, isProtected: boolean) => {
    const isWorking = workingId === actionId;

    return (
      <button
        aria-label={isWorking ? "처리 중" : isProtected ? "보호해제하기" : "보호하기"}
        className={`documentsProtectionAction${isProtected ? " protected" : ""}`}
        disabled={isWorking}
        type="button"
        onClick={() => { void handleProtectionToggle(item); }}
      >
        {isWorking ? (
          "처리 중"
        ) : isProtected ? (
          <>
            <span className="documentsProtectionDefault">보호중</span>
            <span className="documentsProtectionHover">보호해제하기</span>
          </>
        ) : (
          "보호하기"
        )}
      </button>
    );
  };

  const renderDeleteButton = (item: LibraryItem, actionId: string) => {
    if (getItemProtected(item)) {
      return null;
    }

    return (
      <button
        className="documentsDangerButton"
        disabled={deletingId === actionId}
        type="button"
        onClick={() => { void handleDeleteItem(item); }}
      >
        {deletingId === actionId ? "삭제 중" : "삭제하기"}
      </button>
    );
  };

  return (
    <main className="documentsPage">
      <HomeTopNav />

      <section className="documentsContent">
        <header className="documentsHeader">
          <span>문서함</span>
          <div>
            <h1>문서함</h1>
            <p>프로필과 자기소개서를 한 곳에서 확인합니다.</p>
          </div>
          <div className="documentsHeaderActions">
            <button type="button" onClick={() => { window.location.href = "/documents/profiles/new"; }}>
              프로필 만들기
            </button>
            <button type="button" onClick={() => { window.location.href = "/documents/new?type=cover_letter"; }}>
              자기소개서 만들기
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
            <label className="documentsProtectionToggle">
              <input
                checked={showProtectedItems}
                type="checkbox"
                onChange={(event) => setShowProtectedItems(event.target.checked)}
              />
              보호 항목 만
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
            <p>프로필과 자기소개서를 만들어 지원 자료를 정리합니다.</p>
            <div className="documentsEmptyActions">
              <button type="button" onClick={() => { window.location.href = "/documents/profiles/new"; }}>
                프로필 만들기
              </button>
              <button type="button" onClick={() => { window.location.href = "/documents/new?type=cover_letter"; }}>
                자기소개서 만들기
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="documentsEmpty">
            <strong>조건에 맞는 항목이 없습니다.</strong>
            <p>필터, 검색어, 보호 항목 보기 설정을 조정하세요.</p>
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
                        {profile.isArchived && <span>보호됨</span>}
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
                      {renderProtectionButton(item, `profile-${profile.id}`, profile.isArchived)}
                      {renderDeleteButton(item, `profile-${profile.id}`)}
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
                      {document.isArchived && <span>보호됨</span>}
                    </div>
                  </div>
                  <div className="documentsCardMeta">
                    <span>{document.isArchived ? "보호됨" : "작성 중"}</span>
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
                    {renderProtectionButton(item, `document-${document.id}`, document.isArchived)}
                    {renderDeleteButton(item, `document-${document.id}`)}
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
