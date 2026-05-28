import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

export function DocumentDetail() {
  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>문서 상세</span>
          <div>
            <h1>문서 상세/편집</h1>
            <p>문서 본문 편집과 새 버전 저장 흐름은 다음 단계에서 연결합니다.</p>
          </div>
        </header>
      </section>
      <HomeFooter />
    </main>
  );
}
