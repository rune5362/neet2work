import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

export function ProfileDetail() {
  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>지원 프로필</span>
          <div>
            <h1>프로필 상세</h1>
            <p>프로필 상세/편집 화면은 다음 단계에서 현재 버전 폼과 새 버전 저장 흐름을 연결합니다.</p>
          </div>
        </header>
      </section>
      <HomeFooter />
    </main>
  );
}
