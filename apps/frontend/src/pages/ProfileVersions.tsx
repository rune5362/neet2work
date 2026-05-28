import { useEffect, useState } from "react";
import {
  applyProfileVersion,
  archiveProfileVersion,
  getProfile,
  getProfileVersions,
  restoreProfileVersion
} from "../api/profileClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { ProfileDetail, ProfileVersion } from "../types/profile";

function getProfileIdFromPath() {
  return window.location.pathname.split("/").filter(Boolean)[1] ?? "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getStatusLabel(status: ProfileVersion["status"]) {
  if (status === "archived") {
    return "보관됨";
  }

  if (status === "draft") {
    return "초안";
  }

  return "활성";
}

export function ProfileVersions() {
  const profileId = getProfileIdFromPath();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [versions, setVersions] = useState<ProfileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadVersions() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [profileResult, versionResult] = await Promise.all([
        getProfile(profileId),
        getProfileVersions(profileId, undefined, { includeArchived: true })
      ]);

      setProfile(profileResult);
      setVersions(versionResult);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "프로필 버전 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVersions();
  }, []);

  const runVersionAction = async (versionId: string, action: () => Promise<ProfileVersion>) => {
    setBusyVersionId(versionId);
    setErrorMessage(null);

    try {
      await action();
      await loadVersions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "프로필 버전 작업에 실패했습니다.");
    } finally {
      setBusyVersionId(null);
    }
  };

  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>버전 관리</span>
          <div>
            <h1>{profile?.title ?? "프로필 버전 관리"}</h1>
            <p>프로필 버전을 비교하고 현재 버전 적용, 복원, 보관 작업을 수행합니다.</p>
          </div>
          <button type="button" onClick={() => { window.location.href = `/profiles/${profileId}`; }}>
            상세로 이동
          </button>
        </header>

        {errorMessage && <div className="documentsNotice error">{errorMessage}</div>}

        {loading ? (
          <div className="documentsNotice">프로필 버전 목록을 불러오는 중입니다.</div>
        ) : versions.length === 0 ? (
          <div className="documentsEmpty">
            <strong>저장된 버전이 없습니다.</strong>
            <p>프로필 상세 화면에서 새 버전을 저장합니다.</p>
          </div>
        ) : (
          <section className="documentsList" aria-label="프로필 버전 목록">
            {versions.map((version) => {
              const isCurrent = profile?.currentVersionId === version.id;
              const isArchived = version.status === "archived";

              return (
                <article className="documentsCard" key={version.id}>
                  <div className="documentsCardType">v{version.versionNo}</div>
                  <div className="documentsCardBody">
                    <div>
                      <h2>{version.title ?? `버전 ${version.versionNo}`}</h2>
                      <span>{formatDate(version.updatedAt)} 업데이트</span>
                    </div>
                    <p>{version.changeSummary ?? version.memo ?? "변경 요약 없음"}</p>
                    <div className="documentsTags">
                      <span>{getStatusLabel(version.status)}</span>
                      <span>{version.source}</span>
                      {isCurrent && <span>현재 버전</span>}
                    </div>
                  </div>
                  <div className="documentsCardMeta">
                    <span>{isCurrent ? "현재 적용 중" : getStatusLabel(version.status)}</span>
                    <strong>{version.profileText.slice(0, 80) || "프로필 본문 없음"}</strong>
                    <button type="button" onClick={() => { window.location.href = `/profiles/${profileId}`; }}>
                      보기
                    </button>
                    <button
                      className="documentsSecondaryButton"
                      disabled={isCurrent || isArchived || busyVersionId === version.id}
                      type="button"
                      onClick={() => { void runVersionAction(version.id, () => applyProfileVersion(profileId, version.id)); }}
                    >
                      현재 버전으로 적용
                    </button>
                    <button
                      className="documentsSecondaryButton"
                      disabled={busyVersionId === version.id}
                      type="button"
                      onClick={() => { void runVersionAction(version.id, () => restoreProfileVersion(profileId, version.id)); }}
                    >
                      복원
                    </button>
                    <button
                      className="documentsDangerButton"
                      disabled={isCurrent || busyVersionId === version.id}
                      type="button"
                      onClick={() => { void runVersionAction(version.id, () => archiveProfileVersion(profileId, version.id)); }}
                    >
                      보관
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
