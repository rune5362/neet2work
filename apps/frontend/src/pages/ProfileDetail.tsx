import { useEffect, useState, type FormEvent } from "react";
import { createProfileVersion, getProfile } from "../api/profileClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import type { ProfileDetail as ProfileDetailData } from "../types/profile";
import {
  createProfileJson,
  initialProfileForm,
  profileJsonToForm,
  type ProfileFormState
} from "../utils/profileForm";

function getProfileIdFromPath() {
  return window.location.pathname.split("/").filter(Boolean)[1] ?? "";
}

export function ProfileDetail() {
  const profileId = getProfileIdFromPath();
  const [profile, setProfile] = useState<ProfileDetailData | null>(null);
  const [form, setForm] = useState<ProfileFormState>(initialProfileForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const result = await getProfile(profileId);

        if (!cancelled) {
          setProfile(result);
          setForm(
            result.currentVersion
              ? profileJsonToForm({
                  title: result.title,
                  targetRole: result.targetRole,
                  profileJson: result.currentVersion.profileJson
                })
              : {
                  ...initialProfileForm,
                  title: result.title,
                  targetRole: result.targetRole ?? ""
                }
          );
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "프로필 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const updateField = (field: keyof ProfileFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!form.title.trim()) {
      setErrorMessage("프로필 제목을 입력하세요.");
      return;
    }

    setSaving(true);

    try {
      const version = await createProfileVersion(profileId, {
        title: "사용자 수정",
        changeSummary: "프로필 상세 화면에서 새 버전 저장",
        makeCurrent: true,
        profileJson: createProfileJson(form)
      });
      const reloaded = await getProfile(profileId);

      setProfile(reloaded);
      setSuccessMessage(`v${version.versionNo} 새 버전을 저장했습니다.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "프로필 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>지원 프로필</span>
          <div>
            <h1>{profile?.title ?? "프로필 상세"}</h1>
            <p>현재 적용 중인 프로필 버전을 확인하고 수정 내용을 새 버전으로 저장합니다.</p>
          </div>
          <button type="button" onClick={() => { window.location.href = `/profiles/${profileId}/versions`; }}>
            버전 관리
          </button>
        </header>

        {errorMessage && <div className="documentsNotice error">{errorMessage}</div>}
        {successMessage && <div className="documentsNotice success">{successMessage}</div>}

        {loading ? (
          <div className="documentsNotice">프로필 정보를 불러오는 중입니다.</div>
        ) : !profile ? (
          <div className="documentsEmpty">
            <strong>프로필을 찾을 수 없습니다.</strong>
            <p>프로필 목록에서 다시 선택합니다.</p>
          </div>
        ) : (
          <form className="profileForm" onSubmit={handleSubmit}>
            <label>
              프로필 제목
              <input value={form.title} onChange={(event) => updateField("title", event.target.value)} />
            </label>
            <label>
              목표 직무
              <input value={form.targetRole} onChange={(event) => updateField("targetRole", event.target.value)} />
            </label>
            <label>
              이름
              <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
            </label>
            <label>
              이메일
              <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
            </label>
            <label>
              전화번호
              <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </label>
            <label>
              거주지
              <input value={form.location} onChange={(event) => updateField("location", event.target.value)} />
            </label>
            <label>
              희망 직무
              <input
                value={form.desiredRoles}
                onChange={(event) => updateField("desiredRoles", event.target.value)}
              />
            </label>
            <label>
              기술 스택
              <input value={form.skills} onChange={(event) => updateField("skills", event.target.value)} />
            </label>
            <label className="profileFormWide">
              간단 자기소개
              <textarea value={form.summary} onChange={(event) => updateField("summary", event.target.value)} />
            </label>
            <label>
              프로젝트명
              <input value={form.projectName} onChange={(event) => updateField("projectName", event.target.value)} />
            </label>
            <label>
              프로젝트 역할
              <input value={form.projectRole} onChange={(event) => updateField("projectRole", event.target.value)} />
            </label>
            <label className="profileFormWide">
              프로젝트 성과
              <textarea
                value={form.projectResult}
                onChange={(event) => updateField("projectResult", event.target.value)}
              />
            </label>
            <div className="profileFormActions">
              <button className="documentsSecondaryButton" type="button" onClick={() => { window.location.href = "/profiles"; }}>
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
