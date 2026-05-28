import { Home } from "./pages/Home";
import { AIAnalysisDetails } from "./pages/AIAnalysisDetails";
import { AIAnalysisFront } from "./pages/AIAnalysisFront";
import { AuthChoice } from "./pages/AuthChoice";
import { DocumentDetail } from "./pages/DocumentDetail";
import { DocumentNew } from "./pages/DocumentNew";
import { DocumentVersions } from "./pages/DocumentVersions";
import { Documents } from "./pages/Documents";
import { Jobs } from "./pages/Jobs";
import { Login } from "./pages/Login";
import { MyAccount } from "./pages/MyAccount";
import { Notifications } from "./pages/Notifications";
import { ProfileDetail } from "./pages/ProfileDetail";
import { ProfileNew } from "./pages/ProfileNew";
import { ProfileVersions } from "./pages/ProfileVersions";
import { Profiles } from "./pages/Profiles";
import { SignUp } from "./pages/SignUp";

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
    return <AIAnalysisFront />;
  }

  if (pathname === "/jobs") {
    return <Jobs />;
  }

  if (segments[0] === "profiles" && segments[1] === "new") {
    return <ProfileNew />;
  }

  if (segments[0] === "profiles" && segments[1] && segments[2] === "versions") {
    return <ProfileVersions />;
  }

  if (segments[0] === "profiles" && segments[1]) {
    return <ProfileDetail />;
  }

  if (pathname === "/profiles") {
    return <Profiles />;
  }

  if (segments[0] === "profiles") {
    return <Profiles />;
  }

  if (segments[0] === "documents" && segments[1] === "new") {
    return <DocumentNew />;
  }

  if (segments[0] === "documents" && segments[1] && segments[2] === "versions") {
    return <DocumentVersions />;
  }

  if (segments[0] === "documents" && segments[1]) {
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
