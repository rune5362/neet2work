import { useState } from "react";
import logoUrl from "../assets/logo/neet2work_logo_lockup_reference_curve 1.png";
import type { AuthUser } from "../api/client";

type HomeTopNavProps = {
  active?: "home" | "jobs" | "analysis" | "community";
};

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

export function HomeTopNav({ active = "home" }: HomeTopNavProps) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const displayName = authUser?.nickname || authUser?.name || authUser?.email;
  const shouldShowProfileImage = Boolean(authUser?.profileImageUrl && !profileImageFailed);

  const handleLogout = () => {
    window.localStorage.removeItem("neet2work.auth.user");
    window.localStorage.removeItem("neet2work.auth.accessToken");
    window.localStorage.removeItem("neet2work.auth.tokenType");
    window.localStorage.removeItem("neet2work.auth.expiresAt");
    setAuthUser(null);
    setIsAccountMenuOpen(false);
    window.location.href = "/auth";
  };

  return (
    <nav className="homeTopNav" aria-label="주요 메뉴">
      <div className="homeNavInner">
        <div className="homeNavLeft">
          <a href="/" aria-label="Neet2Work 홈">
            <img src={logoUrl} alt="Neet2Work Logo" />
          </a>
          <div className="homeNavMenu">
            <button
              className="homeMenuButton"
              type="button"
              aria-expanded={isNavMenuOpen}
              aria-haspopup="menu"
              aria-label="메뉴 열기"
              onClick={() => setIsNavMenuOpen((current) => !current)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>

            {isNavMenuOpen && (
              <div className="homeNavDropdown" role="menu">
                <a className={active === "home" ? "active" : ""} href="/#home" role="menuitem">
                  홈
                </a>
                <a className={active === "jobs" ? "active" : ""} href="/jobs" role="menuitem">
                  채용공고
                </a>
                <a className={active === "analysis" ? "active" : ""} href="/ai-analysis" role="menuitem">
                  AI 분석
                </a>
                <div className="homeNavDropdownMobileOnly" role="none">
                  <a href="/#support" role="menuitem">
                    <svg aria-hidden="true" height="20" viewBox="0 -960 960 960" width="20">
                      <path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320 120q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80Z" />
                    </svg>
                    알림
                  </a>
                  {authUser ? (
                    <>
                      <button type="button" role="menuitem" onClick={() => setIsNavMenuOpen(false)}>
                        <svg aria-hidden="true" height="20" viewBox="0 -960 960 960" width="20">
                          <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" />
                        </svg>
                        내 정보
                      </button>
                      <button type="button" role="menuitem" onClick={handleLogout}>
                        로그아웃
                      </button>
                    </>
                  ) : (
                    <a href="/auth" role="menuitem">
                      <svg aria-hidden="true" height="20" viewBox="0 -960 960 960" width="20">
                        <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" />
                      </svg>
                      계정
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="homeNavLinks">
            <a className={active === "home" ? "active" : ""} href="/#home">
              홈
            </a>
            <a className={active === "jobs" ? "active" : ""} href="/jobs">
              채용공고
            </a>
            <a className={active === "analysis" ? "active" : ""} href="/ai-analysis">
              AI 분석
            </a>
            {/* <a className={active === "community" ? "active" : ""} href="/#home">
              커뮤니티
            </a> */}
          </div>
        </div>
        <div className="homeNavActions">
          <a className="homeIconButton" href="/#support" aria-label="알림">
            <svg aria-hidden="true" height="24" viewBox="0 -960 960 960" width="24">
              <path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z" />
            </svg>
          </a>
          {authUser ? (
            <div className="homeAccountMenu">
              <button
                className="homeAccountButton"
                type="button"
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsAccountMenuOpen((current) => !current)}
              >
                {shouldShowProfileImage ? (
                  <img src={authUser.profileImageUrl ?? ""} alt="" onError={() => setProfileImageFailed(true)} />
                ) : (
                  <span className="homeAccountFallbackIcon" aria-hidden="true">
                    <svg height="24" viewBox="0 -960 960 960" width="24">
                      <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" />
                    </svg>
                  </span>
                )}
                <span>{displayName}</span>
              </button>

              {isAccountMenuOpen && (
                <div className="homeAccountDropdown" role="menu">
                  <button type="button" role="menuitem" onClick={() => setIsAccountMenuOpen(false)}>
                    내 정보
                  </button>
                  <button type="button" role="menuitem" onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a className="homeIconButton" href="/auth" aria-label="계정">
              <svg aria-hidden="true" height="24" viewBox="0 -960 960 960" width="24">
                <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z" />
              </svg>
            </a>
          )}
          <a className="homeStartButton" href="/ai-analysis">
            시작하기
          </a>
        </div>
      </div>
    </nav>
  );
}
