import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

export function DocumentNew() {
  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>새 문서</span>
          <div>
            <h1>새 문서 만들기</h1>
            <p>문서 생성 폼은 다음 단계에서 프로필 선택과 본문 저장 흐름을 연결합니다.</p>
          </div>
        </header>
      </section>
      <HomeFooter />
    </main>
  );
}
