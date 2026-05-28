import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

export function Profiles() {
  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>지원 프로필</span>
          <div>
            <h1>지원 프로필</h1>
            <p>지원 프로필 목록 화면은 다음 단계에서 API 목록과 생성 흐름을 연결합니다.</p>
          </div>
          <button type="button" onClick={() => { window.location.href = "/profiles/new"; }}>
            새 프로필 만들기
          </button>
        </header>
      </section>
      <HomeFooter />
    </main>
  );
}
