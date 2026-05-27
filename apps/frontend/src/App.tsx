import { Home } from "./pages/Home";
import { AIAnalysisDetails } from "./pages/AIAnalysisDetails";
import { AIAnalysisFront } from "./pages/AIAnalysisFront";
import { AuthChoice } from "./pages/AuthChoice";
import { Documents } from "./pages/Documents";
import { Jobs } from "./pages/Jobs";
import { Login } from "./pages/Login";
import { MyAccount } from "./pages/MyAccount";
import { Notifications } from "./pages/Notifications";
import { SignUp } from "./pages/SignUp";

export default function App() {
  if (window.location.pathname === "/login") {
    return <Login />;
  }

  if (window.location.pathname === "/signup") {
    return <SignUp />;
  }

  if (window.location.pathname === "/auth") {
    return <AuthChoice />;
  }

  if (window.location.pathname === "/ai-analysis/details") {
    return <AIAnalysisDetails />;
  }

  if (window.location.pathname === "/ai-analysis") {
    return <AIAnalysisFront />;
  }

  if (window.location.pathname === "/jobs") {
    return <Jobs />;
  }

  if (window.location.pathname === "/documents") {
    return <Documents />;
  }

  if (window.location.pathname === "/notifications") {
    return <Notifications />;
  }

  if (window.location.pathname === "/myaccount") {
    return <MyAccount />;
  }

  return <Home />;
}
