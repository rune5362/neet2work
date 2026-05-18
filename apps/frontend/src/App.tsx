import { Home } from "./pages/Home";
import { Jobs } from "./pages/Jobs";

export default function App() {
  if (window.location.pathname === "/jobs") {
    return <Jobs />;
  }

  return <Home />;
}
