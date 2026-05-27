import { Home } from "./pages/Home";
import { AIAnalysisDetails } from "./pages/AIAnalysisDetails";
import { AIDraftChatBuilder } from "./pages/AIDraftChatBuilder";
import { Jobs } from "./pages/Jobs";

export default function App() {
  if (window.location.pathname === "/ai-analysis/details") {
    return <AIAnalysisDetails />;
  }

  if (window.location.pathname === "/ai-analysis") {
    return <AIDraftChatBuilder />;
  }

  if (window.location.pathname === "/jobs") {
    return <Jobs />;
  }

  return <Home />;
}
