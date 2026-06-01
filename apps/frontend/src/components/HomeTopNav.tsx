import { useEffect, useRef, useState } from "react";
import logoUrl from "../assets/logo/neet2work_logo_lockup_reference_curve 1.png";
import { logout, type AuthUser } from "../api/client";
import { UNREAD_NOTIFICATIONS } from "../data/notifications";

type HomeTopNavProps = {
  active?: "home" | "jobs" | "analysis" | "community" | "account" | "notifications";
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

function isPathInSection(currentPath: string, sectionPath: string) {
  return currentPath === sectionPath || currentPath.startsWith(`${sectionPath}/`);
}

export function HomeTopNav({ active = "home" }: HomeTopNavProps) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const displayName = authUser?.nickname || authUser?.name || authUser?.email;
  const shouldShowProfileImage = Boolean(authUser?.profileImageUrl && !profileImageFailed);
  const currentPath = typeof window === "undefined" ? "" : window.location.pathname;
  const isDocumentsSection = isPathInSection(currentPath, "/documents");
  const isMyAccountSection = isPathInSection(currentPath, "/myaccount");
  const isAccountSection = isMyAccountSection || isDocumentsSection;
  const isNotificationSection = currentPath === "/notifications";
  const effectiveActive = isAccountSection ? "account" : isNotificationSection ? "notifications" : active;

  useEffect(() => {
    const syncStoredAuthUser = () => {
      setAuthUser(getStoredAuthUser());
      setProfileImageFailed(false);
    };

    window.addEventListener("storage", syncStoredAuthUser);
    window.addEventListener("neet2work.auth.changed", syncStoredAuthUser);

    return () => {
      window.removeEventListener("storage", syncStoredAuthUser);
      window.removeEventListener("neet2work.auth.changed", syncStoredAuthUser);
    };
  }, []);

  useEffect(() => {
    if (!isAccountMenuOpen && !isNotificationMenuOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && accountMenuRef.current?.contains(target)) {
        return;
      }

      if (target instanceof Node && notificationMenuRef.current?.contains(target)) {
        return;
      }

      setIsAccountMenuOpen(false);
      setIsNotificationMenuOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
        setIsNotificationMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isAccountMenuOpen, isNotificationMenuOpen]);

  const handleLogout = async () => {
    const refreshToken = window.localStorage.getItem("neet2work.auth.refreshToken");
    if (refreshToken) {
      await logout(refreshToken).catch(() => null);
    }

    window.localStorage.removeItem("neet2work.auth.user");
    window.localStorage.removeItem("neet2work.auth.accessToken");
    window.localStorage.removeItem("neet2work.auth.refreshToken");
    window.localStorage.removeItem("neet2work.auth.tokenType");
    window.localStorage.removeItem("neet2work.auth.expiresAt");
    window.localStorage.removeItem("neet2work.auth.refreshExpiresAt");
    setAuthUser(null);
    setIsAccountMenuOpen(false);
    setIsNavMenuOpen(false);
    window.location.href = "/auth";
  };

  return (
    <nav className="homeTopNav" aria-label="주요 메뉴">
      <div className="homeNavInner">
        <div className="homeNavLeft">
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
              <>
                <button
                  className="homeNavDrawerBackdrop"
                  type="button"
                  aria-label="메뉴 닫기"
                  onClick={() => setIsNavMenuOpen(false)}
                />
                <div className="homeNavDropdown" role="menu" aria-label="Navigation drawer">
                  <button
                    className="homeNavDrawerHeader"
                    type="button"
                    aria-label="메뉴 닫기"
                    onClick={() => setIsNavMenuOpen(false)}
                  >
                    <span className="homeNavDrawerMenuIcon" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <strong>메뉴</strong>
                  </button>
                  <a
                    className={effectiveActive === "home" ? "active" : ""}
                    href="/#home"
                    role="menuitem"
                    onClick={() => setIsNavMenuOpen(false)}
                  >
                    홈
                  </a>
                  <a
                    className={effectiveActive === "jobs" ? "active" : ""}
                    href="/jobs"
                    role="menuitem"
                    onClick={() => setIsNavMenuOpen(false)}
                  >
                    채용공고
                  </a>
                  <a
                    className={effectiveActive === "analysis" ? "active" : ""}
                    href="/ai-analysis"
                    role="menuitem"
                    onClick={() => setIsNavMenuOpen(false)}
                  >
                    AI 분석
                  </a>
                  <div className="homeNavDropdownMobileOnly" role="none">
                    <a
                      className={effectiveActive === "notifications" ? "active" : ""}
                      href="/notifications"
                      role="menuitem"
                      onClick={() => setIsNavMenuOpen(false)}
                    >
                      <svg aria-hidden="true" height="20" viewBox="0 -960 960 960" width="20">
                        <path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320 120q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80Z" />
                      </svg>
                      알림
                    </a>
                    {authUser ? (
                      <>
                        <a
                          className={isDocumentsSection ? "active" : ""}
                          href="/documents"
                          role="menuitem"
                          onClick={() => setIsNavMenuOpen(false)}
                        >
                          <svg aria-hidden="true" height="20" viewBox="0 -960 960 960" width="20">
                            <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h240l80 80h240q33 0 56.5 23.5T840-680v480q0 33-23.5 56.5T760-120H200Zm0-80h560v-480H487l-80-80H200v560Zm0 0v-560 560Z" />
                          </svg>
                          보관함
                        </a>
                        <a
                          className={isMyAccountSection ? "active" : ""}
                          href="/myaccount"
                          role="menuitem"
                          onClick={() => setIsNavMenuOpen(false)}
                        >
                          <svg aria-hidden="true" height="20" viewBox="0 -960 960 960" width="20">
                            <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" />
                          </svg>
                          계정 정보
                        </a>
                      </>
                    ) : (
                      <a href="/auth" role="menuitem" onClick={() => setIsNavMenuOpen(false)}>
                        <svg aria-hidden="true" height="20" viewBox="0 -960 960 960" width="20">
                          <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z" />
                        </svg>
                        계정
                      </a>
                    )}
                  </div>
                  {authUser && (
                    <div className="homeNavDrawerFooter" role="none">
                      <button type="button" role="menuitem" onClick={handleLogout}>
                        로그아웃
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <a href="/" aria-label="Neet2Work 홈">
            <img src={logoUrl} alt="Neet2Work Logo" />
          </a>
          <div className="homeNavLinks">
            <a className={effectiveActive === "home" ? "active" : ""} href="/#home">
              홈
            </a>
            <a className={effectiveActive === "jobs" ? "active" : ""} href="/jobs">
              채용공고
            </a>
            <a className={effectiveActive === "analysis" ? "active" : ""} href="/ai-analysis">
              AI 분석
            </a>
            {/* <a className={active === "community" ? "active" : ""} href="/#home">
              커뮤니티
            </a> */}
          </div>
        </div>
        <div className="homeNavActions">
          <div className="homeNotificationMenu" ref={notificationMenuRef}>
            <button
              className={`homeIconButton${effectiveActive === "notifications" ? " active" : ""}`}
              type="button"
              aria-expanded={isNotificationMenuOpen}
              aria-haspopup="menu"
              aria-label="알림"
              onClick={() => {
                setIsNotificationMenuOpen((current) => !current);
                setIsAccountMenuOpen(false);
              }}
            >
              <svg aria-hidden="true" height="24" viewBox="0 -960 960 960" width="24">
                <path d="M160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z" />
              </svg>
              {UNREAD_NOTIFICATIONS.length > 0 && (
                <span className="homeNotificationBadge">{UNREAD_NOTIFICATIONS.length}</span>
              )}
            </button>

            {isNotificationMenuOpen && (
              <div className="homeNotificationDropdown" role="menu" aria-label="알림 목록">
                <div className="homeNotificationHeader">
                  <strong>알림</strong>
                  <span>미확인 {UNREAD_NOTIFICATIONS.length}</span>
                </div>
                <div className="homeNotificationList">
                  {UNREAD_NOTIFICATIONS.map((notification) => (
                    <a
                      href="/notifications"
                      key={notification.id}
                      role="menuitem"
                      onClick={() => setIsNotificationMenuOpen(false)}
                    >
                      <span>{notification.category}</span>
                      <strong>{notification.title}</strong>
                      <small>{notification.createdAt}</small>
                    </a>
                  ))}
                </div>
                <a
                  className="homeNotificationAllLink"
                  href="/notifications"
                  role="menuitem"
                  onClick={() => setIsNotificationMenuOpen(false)}
                >
                  알림 전체보기
                </a>
              </div>
            )}
          </div>
          {authUser ? (
            <div className="homeAccountMenu" ref={accountMenuRef}>
              <button
                className={`homeAccountButton${effectiveActive === "account" ? " active" : ""}`}
                type="button"
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setIsAccountMenuOpen((current) => !current);
                  setIsNotificationMenuOpen(false);
                }}
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
                  <a
                    className={isDocumentsSection ? "active" : ""}
                    href="/documents"
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    보관함
                  </a>
                  <a
                    className={isMyAccountSection ? "active" : ""}
                    href="/myaccount"
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    계정 정보
                  </a>
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
