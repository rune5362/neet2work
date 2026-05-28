import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

export function DocumentVersions() {
  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>버전 관리</span>
          <div>
            <h1>문서 버전 관리</h1>
            <p>문서 버전 목록, 적용, 복원, 보관 기능은 다음 단계에서 연결합니다.</p>
          </div>
        </header>
      </section>
      <HomeFooter />
    </main>
  );
}
