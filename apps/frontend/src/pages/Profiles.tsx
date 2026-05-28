import { useEffect, useState } from "react";
import { archiveProfile, getProfiles } from "../api/profileClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { ProfileListItem } from "../types/profile";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function getTargetRole(profile: ProfileListItem) {
  return profile.targetRole || profile.desiredRoles[0] || "목표 직무 미지정";
}

export function Profiles() {
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadProfiles() {
    setLoading(true);
    setErrorMessage(null);

    try {
      setProfiles(await getProfiles());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "프로필 목록을 불러오지 못했습니다.");
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, []);

  const handleArchive = async (profileId: string) => {
    setArchivingId(profileId);
    setErrorMessage(null);

    try {
      await archiveProfile(profileId);
      await loadProfiles();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "프로필 보관에 실패했습니다.");
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>지원 프로필</span>
          <div>
            <h1>지원 프로필</h1>
            <p>지원할 직무와 문서 작성에 사용할 기본 정보를 프로필 단위로 관리합니다.</p>
          </div>
          <button type="button" onClick={() => { window.location.href = "/profiles/new"; }}>
            새 프로필 만들기
          </button>
        </header>

        {errorMessage && <div className="documentsNotice error">{errorMessage}</div>}

        {loading ? (
          <div className="documentsNotice">프로필 목록을 불러오는 중입니다.</div>
        ) : profiles.length === 0 ? (
          <div className="documentsEmpty">
            <strong>저장된 지원 프로필이 없습니다.</strong>
            <p>새 프로필 만들기에서 기본 정보와 기술 스택을 먼저 저장합니다.</p>
          </div>
        ) : (
          <section className="documentsList" aria-label="지원 프로필 목록">
            {profiles.map((profile) => (
              <article className="documentsCard" key={profile.id}>
                <div className="documentsCardType">{profile.isDefault ? "기본" : "프로필"}</div>
                <div className="documentsCardBody">
                  <div>
                    <h2>{profile.title}</h2>
                    <span>{formatDate(profile.updatedAt)} 업데이트</span>
                  </div>
                  <p>{getTargetRole(profile)}</p>
                  <div className="documentsTags">
                    {profile.skills.slice(0, 4).map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                    {profile.skills.length === 0 && <span>기술 스택 미입력</span>}
                    <span>v{profile.currentVersionNo ?? "-"}</span>
                  </div>
                </div>
                <div className="documentsCardMeta">
                  <span>{profile.isDefault ? "기본 프로필" : "일반 프로필"}</span>
                  <strong>{profile.name ?? profile.email ?? profile.candidateKey}</strong>
                  <button type="button" onClick={() => { window.location.href = `/profiles/${profile.id}`; }}>
                    보기/수정
                  </button>
                  <button
                    className="documentsSecondaryButton"
                    type="button"
                    onClick={() => { window.location.href = `/profiles/${profile.id}/versions`; }}
                  >
                    버전 관리
                  </button>
                  <button
                    className="documentsSecondaryButton"
                    type="button"
                    onClick={() => { window.location.href = `/documents/new?profileId=${profile.id}&documentType=resume`; }}
                  >
                    이력서 작성
                  </button>
                  <button
                    className="documentsSecondaryButton"
                    type="button"
                    onClick={() => {
                      window.location.href = `/documents/new?profileId=${profile.id}&documentType=cover_letter`;
                    }}
                  >
                    자기소개서 작성
                  </button>
                  <button
                    className="documentsDangerButton"
                    disabled={archivingId === profile.id}
                    type="button"
                    onClick={() => { void handleArchive(profile.id); }}
                  >
                    {archivingId === profile.id ? "보관 중" : "보관"}
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
