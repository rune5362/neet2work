import { Home } from "./pages/Home";
import { AIAnalysisDetails } from "./pages/AIAnalysisDetails";
import { AIAnalysisFront } from "./pages/AIAnalysisFront";
import { Jobs } from "./pages/Jobs";

export default function App() {
  if (window.location.pathname === "/ai-analysis/details") {
    return <AIAnalysisDetails />;
  }

  if (window.location.pathname === "/ai-analysis") {
    return <AIAnalysisFront />;
  }

  if (window.location.pathname === "/jobs") {
    return <Jobs />;
  }

  return <Home />;
}
