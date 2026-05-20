import logoUrl from "../assets/logo/neet2work_logo_lockup_reference_curve 1.png";

export function HomeFooter() {
  return (
    <footer className="homeFooter">
      <div>
        <img src={logoUrl} alt="Neet2Work Logo" />
        <p>© 2024 Neet2Work. All rights reserved.</p>
      </div>
      <nav aria-label="푸터 링크">
        <a href="#support">이용약관</a>
        <a href="#support">개인정보처리방침</a>
        <a href="#support">고객지원</a>
        <a href="#support">문의하기</a>
      </nav>
    </footer>
  );
}
