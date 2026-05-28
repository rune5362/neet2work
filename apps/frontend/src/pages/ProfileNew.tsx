import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

export function ProfileNew() {
  return (
    <main className="documentsPage">
      <HomeTopNav />
      <section className="documentsContent">
        <header className="documentsHeader">
          <span>지원 프로필</span>
          <div>
            <h1>새 프로필 만들기</h1>
            <p>프로필 생성 화면은 다음 단계에서 입력 폼과 저장 흐름을 연결합니다.</p>
          </div>
        </header>
      </section>
      <HomeFooter />
    </main>
  );
}
