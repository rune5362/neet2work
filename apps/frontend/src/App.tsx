import { lazy, Suspense, type ReactNode } from "react";

const Home = lazy(() => import("./pages/Home").then((module) => ({ default: module.Home })));
const AIDraftChatBuilder = lazy(() =>
  import("./pages/AIDraftChatBuilder").then((module) => ({ default: module.AIDraftChatBuilder }))
);
const AuthChoice = lazy(() => import("./pages/AuthChoice").then((module) => ({ default: module.AuthChoice })));
const DocumentDetail = lazy(() =>
  import("./pages/DocumentDetail").then((module) => ({ default: module.DocumentDetail }))
);
const DocumentNew = lazy(() => import("./pages/DocumentNew").then((module) => ({ default: module.DocumentNew })));
const DocumentSetDetail = lazy(() =>
  import("./pages/DocumentSetDetail").then((module) => ({ default: module.DocumentSetDetail }))
);
const Documents = lazy(() => import("./pages/Documents").then((module) => ({ default: module.Documents })));
const Jobs = lazy(() => import("./pages/Jobs").then((module) => ({ default: module.Jobs })));
const Login = lazy(() => import("./pages/Login").then((module) => ({ default: module.Login })));
const MyAccount = lazy(() => import("./pages/MyAccount").then((module) => ({ default: module.MyAccount })));
const Notifications = lazy(() =>
  import("./pages/Notifications").then((module) => ({ default: module.Notifications }))
);
const ProfileDetail = lazy(() =>
  import("./pages/ProfileDetail").then((module) => ({ default: module.ProfileDetail }))
);
const ProfileNew = lazy(() => import("./pages/ProfileNew").then((module) => ({ default: module.ProfileNew })));
const SignUp = lazy(() => import("./pages/SignUp").then((module) => ({ default: module.SignUp })));

function DeferredPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

function Redirect({ to }: { to: string }) {
  window.location.replace(to);
  return null;
}

export default function App() {
  const pathname = window.location.pathname;
  const segments = pathname.split("/").filter(Boolean);

  if (pathname === "/login") {
    return (
      <DeferredPage>
        <Login />
      </DeferredPage>
    );
  }

  if (pathname === "/signup") {
    return (
      <DeferredPage>
        <SignUp />
      </DeferredPage>
    );
  }

  if (pathname === "/auth") {
    return (
      <DeferredPage>
        <AuthChoice />
      </DeferredPage>
    );
  }

  if (pathname === "/ai-analysis/details") {
    return <Redirect to="/ai-analysis" />;
  }

  if (pathname === "/ai-analysis") {
    return (
      <DeferredPage>
        <AIDraftChatBuilder />
      </DeferredPage>
    );
  }

  if (pathname === "/jobs") {
    return (
      <DeferredPage>
        <Jobs />
      </DeferredPage>
    );
  }

  if (segments[0] === "documents" && segments[1] === "profiles" && segments[2] === "new" && segments.length === 3) {
    return (
      <DeferredPage>
        <ProfileNew />
      </DeferredPage>
    );
  }

  if (segments[0] === "documents" && segments[1] === "profiles" && segments[2] && segments.length === 3) {
    return (
      <DeferredPage>
        <ProfileDetail />
      </DeferredPage>
    );
  }

  if (segments[0] === "profiles" && segments[1] === "new" && segments.length === 2) {
    return <Redirect to="/documents/profiles/new" />;
  }

  if (segments[0] === "profiles" && segments[1] && segments.length === 2) {
    return <Redirect to={`/documents/profiles/${segments[1]}`} />;
  }

  if (pathname === "/profiles") {
    return <Redirect to="/documents?type=profile" />;
  }

  if (segments[0] === "profiles") {
    return <Redirect to="/documents?type=profile" />;
  }

  if (segments[0] === "documents" && segments[1] === "new" && segments.length === 2) {
    return (
      <DeferredPage>
        <DocumentNew />
      </DeferredPage>
    );
  }

  if (segments[0] === "documents" && segments[1] === "sets" && segments[2] && segments.length === 3) {
    return (
      <DeferredPage>
        <DocumentSetDetail />
      </DeferredPage>
    );
  }

  if (segments[0] === "documents" && segments[1] && segments.length === 2) {
    return (
      <DeferredPage>
        <DocumentDetail />
      </DeferredPage>
    );
  }

  if (pathname === "/documents") {
    return (
      <DeferredPage>
        <Documents />
      </DeferredPage>
    );
  }

  if (segments[0] === "documents") {
    return (
      <DeferredPage>
        <Documents />
      </DeferredPage>
    );
  }

  if (pathname === "/notifications") {
    return (
      <DeferredPage>
        <Notifications />
      </DeferredPage>
    );
  }

  if (pathname === "/myaccount") {
    return (
      <DeferredPage>
        <MyAccount />
      </DeferredPage>
    );
  }

  return (
    <DeferredPage>
      <Home />
    </DeferredPage>
  );
}
