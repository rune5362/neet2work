import { useEffect, useMemo, useState } from "react";
import {
  getAccountSecuritySummary,
  refreshSession,
  updateProfile,
  type AccountSecuritySummary,
  type AuthUser,
  type LoginResult
} from "../api/client";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

type EditableField = "name" | "nickname" | "profileImageUrl";

type ProfileForm = Pick<AuthUser, EditableField>;

function getStoredAuthUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = window.localStorage.getItem("neet2work.auth.user");
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
}

function getAccessToken() {
  return window.localStorage.getItem("neet2work.auth.accessToken");
}

function saveLoginSession(result: LoginResult) {
  window.localStorage.setItem("neet2work.auth.user", JSON.stringify(result.user));
  window.localStorage.setItem("neet2work.auth.accessToken", result.accessToken);
  window.localStorage.setItem("neet2work.auth.refreshToken", result.refreshToken);
  window.localStorage.setItem("neet2work.auth.tokenType", result.tokenType);
  window.localStorage.setItem("neet2work.auth.expiresAt", String(Date.now() + result.expiresIn * 1000));
  window.localStorage.setItem(
    "neet2work.auth.refreshExpiresAt",
    String(Date.now() + result.refreshTokenExpiresIn * 1000)
  );
}

async function getUsableAccessToken() {
  const accessToken = getAccessToken();
  const expiresAt = Number(window.localStorage.getItem("neet2work.auth.expiresAt"));

  if (accessToken && Number.isFinite(expiresAt) && expiresAt > Date.now() + 30_000) {
    return accessToken;
  }

  const refreshToken = window.localStorage.getItem("neet2work.auth.refreshToken");
  if (!refreshToken) {
    throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  }

  const refreshedSession = await refreshSession(refreshToken);
  saveLoginSession(refreshedSession);
  window.dispatchEvent(new Event("neet2work.auth.changed"));

  return refreshedSession.accessToken;
}

function saveStoredAuthUser(user: AuthUser) {
  window.localStorage.setItem("neet2work.auth.user", JSON.stringify(user));
  window.dispatchEvent(new Event("neet2work.auth.changed"));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "기록 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "기록 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getCurrentUserAgent() {
  if (typeof window === "undefined") {
    return "확인 불가";
  }

  return window.navigator.userAgent || "확인 불가";
}

function normalizeProfileValue(field: EditableField, value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (field === "profileImageUrl") {
    return trimmedValue;
  }

  return trimmedValue;
}

function validateProfileField(field: EditableField, value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (field === "name") {
    const length = Array.from(trimmedValue).length;
    return length >= 2 && length <= 30 ? null : "이름은 2자 이상 30자 이하여야 합니다.";
  }

  if (field === "nickname") {
    return Array.from(trimmedValue).length <= 30 ? null : "닉네임은 30자 이하여야 합니다.";
  }

  try {
    new URL(trimmedValue);
    return null;
  } catch {
    return "프로필 이미지 URL 형식이 올바르지 않습니다.";
  }
}

function DefaultUserIcon() {
  return (
    <span className="myAccountDefaultIcon" aria-hidden="true">
      <svg height="36" viewBox="0 -960 960 960" width="36">
        <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" />
      </svg>
    </span>
  );
}

export function MyAccount() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [form, setForm] = useState<ProfileForm>(() => ({
    name: user?.name ?? null,
    nickname: user?.nickname ?? null,
    profileImageUrl: user?.profileImageUrl ?? null
  }));
  const [imageFailed, setImageFailed] = useState(false);
  const [savingField, setSavingField] = useState<EditableField | null>(null);
  const [securitySummary, setSecuritySummary] = useState<AccountSecuritySummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayName = useMemo(() => user?.nickname || user?.name || user?.email || "사용자", [user]);
  const shouldShowProfileImage = Boolean(user?.profileImageUrl && !imageFailed);

  useEffect(() => {
    if (!user) {
      setSecuritySummary(null);
      return;
    }

    let isMounted = true;

    async function loadSecuritySummary() {
      try {
        const accessToken = await getUsableAccessToken();
        const summary = await getAccountSecuritySummary(accessToken);

        if (isMounted) {
          setSecuritySummary(summary);
        }
      } catch {
        if (isMounted) {
          setSecuritySummary(null);
        }
      }
    }

    void loadSecuritySummary();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const startEditing = (field: EditableField) => {
    setEditingField(field);
    setForm({
      name: user?.name ?? null,
      nickname: user?.nickname ?? null,
      profileImageUrl: user?.profileImageUrl ?? null
    });
    setMessage(null);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setForm({
      name: user?.name ?? null,
      nickname: user?.nickname ?? null,
      profileImageUrl: user?.profileImageUrl ?? null
    });
    setError(null);
  };

  const saveField = async (field: EditableField) => {
    const value = form[field] ?? "";
    const validationError = validateProfileField(field, value);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingField(field);
    setError(null);
    setMessage(null);

    try {
      const accessToken = await getUsableAccessToken();
      const updatedUser = await updateProfile(accessToken, {
        [field]: normalizeProfileValue(field, value)
      });
      setUser(updatedUser);
      saveStoredAuthUser(updatedUser);
      setForm({
        name: updatedUser.name,
        nickname: updatedUser.nickname,
        profileImageUrl: updatedUser.profileImageUrl
      });
      setImageFailed(false);
      setEditingField(null);
      setMessage("프로필이 수정되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "프로필 수정에 실패했습니다.");
    } finally {
      setSavingField(null);
    }
  };

  const renderEditableValue = (field: EditableField, label: string, value: string | null) => {
    const isEditing = editingField === field;

    return (
      <div className="myAccountEditableRow">
        <dt>{label}</dt>
        <dd>
          {isEditing ? (
            <div className="myAccountEditControl">
              <input
                autoFocus
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [field]: event.target.value
                  }))
                }
                placeholder={field === "profileImageUrl" ? "https://example.com/profile.png" : "미입력"}
                type={field === "profileImageUrl" ? "url" : "text"}
                value={form[field] ?? ""}
              />
              <div>
                <button disabled={savingField === field} type="button" onClick={() => saveField(field)}>
                  {savingField === field ? "저장 중" : "저장"}
                </button>
                <button type="button" onClick={cancelEditing}>
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <span>{value || "미입력"}</span>
              <button type="button" onClick={() => startEditing(field)}>
                수정
              </button>
            </>
          )}
        </dd>
      </div>
    );
  };

  return (
    <main className="myAccountPage">
      <HomeTopNav />

      <section className="myAccountContent">
        <header className="myAccountHeader">
          <span>계정 정보</span>
            <div>
              <p>계정 정보 및 접속정보를 확인 할 수 있습니다.</p>
            </div>
        </header>

        {user ? (
          <section className="myAccountPanel" aria-label="계정 정보">
            <div className="myAccountProfile">
              {shouldShowProfileImage ? (
                <img src={user.profileImageUrl ?? ""} alt="" onError={() => setImageFailed(true)} />
              ) : (
                <DefaultUserIcon />
              )}
              <div>
                <h2>{displayName}</h2>
                <p>{user.email}</p>
              </div>
              <time className="myAccountUpdatedAt" dateTime={user.updatedAt}>
                마지막 수정일 {formatDateTime(user.updatedAt)}
              </time>
            </div>

            {message && (
              <div className="myAccountMessage" role="status">
                {message}
              </div>
            )}
            {error && (
              <div className="myAccountError" role="alert">
                {error}
              </div>
            )}

            <dl className="myAccountDetails">
              {renderEditableValue("name", "이름", user.name)}
              {renderEditableValue("nickname", "닉네임", user.nickname)}
              {renderEditableValue("profileImageUrl", "프로필 이미지 URL", user.profileImageUrl)}
              <div>
                <dt>이메일</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>가입일</dt>
                <dd>{formatDateTime(user.createdAt)}</dd>
              </div>
              <div>
                <dt>이전 로그인</dt>
                <dd>{formatDateTime(user.lastLoginAt)}</dd>
              </div>
              <div>
                <dt>이전 로그인 위치</dt>
                <dd>{securitySummary?.previousLoginIpAddress || "기록 없음"}</dd>
              </div>
              <div>
                <dt>현재 환경</dt>
                <dd>{getCurrentUserAgent()}</dd>
              </div>
              <div>
                <dt>계정 ID</dt>
                <dd>{user.id}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <section className="myAccountPanel" aria-label="로그인 필요">
            <div className="myAccountEmpty">
              <h2>로그인이 필요합니다</h2>
              <p>계정 정보를 확인하려면 먼저 로그인해 주세요.</p>
              <a href="/auth">로그인 또는 회원가입</a>
            </div>
          </section>
        )}
      </section>

      <HomeFooter />
    </main>
  );
}
