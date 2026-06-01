import { useState } from "react";
import { createProfile } from "../api/profileClient";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";
import { createProfileJson, initialProfileForm, type ProfileFormState } from "../utils/profileForm";

export function ProfileNew() {
  const [form, setForm] = useState<ProfileFormState>(initialProfileForm);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateField = (field: keyof ProfileFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!form.title.trim()) {
      setErrorMessage("프로필 제목을 입력하세요.");
      return;
    }

    setSaving(true);

    try {
      const profile = await createProfile({
        title: form.title.trim(),
        targetRole: form.targetRole.trim() || null,
        isDefault,
        profileJson: createProfileJson(form)
      });

      window.location.href = `/documents/profiles/${profile.id}`;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "프로필 생성에 실패했습니다.");
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
            <h1>새 프로필 만들기</h1>
            <p>문서 작성에 반복해서 사용할 기본 정보와 프로젝트 요약을 저장합니다.</p>
          </div>
        </header>

        {errorMessage && <div className="documentsNotice error">{errorMessage}</div>}

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
          <label className="profileFormCheck">
            <input checked={isDefault} type="checkbox" onChange={(event) => setIsDefault(event.target.checked)} />
            기본 프로필로 설정
          </label>
          <div className="profileFormActions">
            <button className="documentsSecondaryButton" type="button" onClick={() => { window.location.href = "/documents?type=profile"; }}>
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
