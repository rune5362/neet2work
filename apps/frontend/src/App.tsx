import { Home } from "./pages/Home";
import { AIAnalysisDetails } from "./pages/AIAnalysisDetails";
import { AIDraftChatBuilder } from "./pages/AIDraftChatBuilder";
import { AuthChoice } from "./pages/AuthChoice";
import { DocumentDetail } from "./pages/DocumentDetail";
import { DocumentNew } from "./pages/DocumentNew";
import { DocumentSetDetail } from "./pages/DocumentSetDetail";
import { DocumentVersions } from "./pages/DocumentVersions";
import { Documents } from "./pages/Documents";
import { Jobs } from "./pages/Jobs";
import { Login } from "./pages/Login";
import { MyAccount } from "./pages/MyAccount";
import { Notifications } from "./pages/Notifications";
import { ProfileDetail } from "./pages/ProfileDetail";
import { ProfileNew } from "./pages/ProfileNew";
import { ProfileVersions } from "./pages/ProfileVersions";
import { SignUp } from "./pages/SignUp";

function Redirect({ to }: { to: string }) {
  window.location.replace(to);
  return null;
}

export default function App() {
  const pathname = window.location.pathname;
  const segments = pathname.split("/").filter(Boolean);

  if (pathname === "/login") {
    return <Login />;
  }

  if (pathname === "/signup") {
    return <SignUp />;
  }

  if (pathname === "/auth") {
    return <AuthChoice />;
  }

  if (pathname === "/ai-analysis/details") {
    return <AIAnalysisDetails />;
  }

  if (pathname === "/ai-analysis") {
    return <AIDraftChatBuilder />;
  }

  if (pathname === "/jobs") {
    return <Jobs />;
  }

  if (segments[0] === "documents" && segments[1] === "profiles" && segments[2] === "new" && segments.length === 3) {
    return <ProfileNew />;
  }

  if (segments[0] === "documents" && segments[1] === "profiles" && segments[2] && segments.length === 3) {
    return <ProfileDetail />;
  }

  if (segments[0] === "profiles" && segments[1] === "new" && segments.length === 2) {
    return <Redirect to="/documents/profiles/new" />;
  }

  if (segments[0] === "profiles" && segments[1] && segments[2] === "versions" && segments.length === 3) {
    return <ProfileVersions />;
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
    return <DocumentNew />;
  }

  if (segments[0] === "documents" && segments[1] === "sets" && segments[2] && segments.length === 3) {
    return <DocumentSetDetail />;
  }

  if (segments[0] === "documents" && segments[1] && segments[2] === "versions" && segments.length === 3) {
    return <DocumentVersions />;
  }

  if (segments[0] === "documents" && segments[1] && segments.length === 2) {
    return <DocumentDetail />;
  }

  if (pathname === "/documents") {
    return <Documents />;
  }

  if (segments[0] === "documents") {
    return <Documents />;
  }

  if (pathname === "/notifications") {
    return <Notifications />;
  }

  if (pathname === "/myaccount") {
    return <MyAccount />;
  }

  return <Home />;
}
