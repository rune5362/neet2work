import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

export function AuthChoice() {
  return (
    <main className="authPage">
      <HomeTopNav />

      <section className="authChoiceSection" aria-labelledby="auth-choice-title">
        <div className="authHeader">
          <span>계정</span>
          <h1 id="auth-choice-title">서비스 이용을 시작할 방법을 선택하세요</h1>
          <p>회원가입을 먼저 완료한 뒤 로그인 기능을 이어서 연결합니다.</p>
        </div>

        <div className="authChoiceGrid">
          <article className="authChoiceCard primary">
            <div className="authChoiceIcon" aria-hidden="true">
              +
            </div>
            <h2>회원가입</h2>
            <p>이메일과 비밀번호로 Neet2Work 계정을 생성합니다.</p>
            <a className="authPrimaryButton" href="/signup">
              회원가입
            </a>
          </article>

          <article className="authChoiceCard muted" aria-disabled="true">
            <div className="authChoiceIcon" aria-hidden="true">
              →
            </div>
            <h2>로그인</h2>
            <p>로그인 화면과 인증 토큰 처리는 회원가입 검증 후 진행합니다.</p>
            <button className="authSecondaryButton" type="button" disabled>
              준비 중
            </button>
          </article>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
