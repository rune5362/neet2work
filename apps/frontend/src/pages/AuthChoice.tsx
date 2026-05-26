import { FormEvent, useMemo, useState } from "react";
import { login } from "../api/client";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

type LoginForm = {
  email: string;
  password: string;
};

const initialLoginForm: LoginForm = {
  email: "",
  password: ""
};

function validateLoginForm(form: LoginForm) {
  const errors: Partial<Record<keyof LoginForm, string>> = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "이메일 형식이 올바르지 않습니다.";
  }

  if (!form.password) {
    errors.password = "비밀번호를 입력해 주세요.";
  }

  return errors;
}

function saveLoginSession(result: Awaited<ReturnType<typeof login>>) {
  window.localStorage.setItem("neet2work.auth.user", JSON.stringify(result.user));
  window.localStorage.setItem("neet2work.auth.accessToken", result.accessToken);
  window.localStorage.setItem("neet2work.auth.tokenType", result.tokenType);
  window.localStorage.setItem("neet2work.auth.expiresAt", String(Date.now() + result.expiresIn * 1000));
}

export function AuthChoice() {
  const [loginForm, setLoginForm] = useState<LoginForm>(initialLoginForm);
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof LoginForm, boolean>>>({});

  const errors = useMemo(() => validateLoginForm(loginForm), [loginForm]);
  const isValid = Object.keys(errors).length === 0;

  const updateField = (field: keyof LoginForm, value: string) => {
    setLoginForm((current) => ({
      ...current,
      [field]: value
    }));
    setServerMessage(null);
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({
      email: true,
      password: true
    });

    if (!isValid) {
      return;
    }

    setSubmitting(true);
    setServerMessage(null);

    try {
      const result = await login({
        email: loginForm.email.trim().toLowerCase(),
        password: loginForm.password
      });

      saveLoginSession(result);
      window.location.href = "/jobs";
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="authPage">
      <HomeTopNav />

      <section className="authChoiceSection" aria-labelledby="auth-choice-title">
        <div className="authHeader">
          <span>계정</span>
          <h1 id="auth-choice-title">서비스 이용을 시작할 방법을 선택하세요</h1>
          <p>새 계정을 만들거나 기존 계정으로 로그인할 수 있습니다.</p>
        </div>

        <div className="authChoiceGrid">
          <article className="authChoiceCard primary">
            <h2>회원가입</h2>
            <p>이메일과 비밀번호로 Neet2Work 계정을 생성합니다.</p>
            <a className="authPrimaryButton" href="/signup">
              회원가입
            </a>
          </article>

          <article className="authChoiceCard">
            <h2>로그인</h2>
            <p>가입한 이메일과 비밀번호로 접속합니다.</p>
            <form className="authChoiceLoginForm" onSubmit={handleLoginSubmit} noValidate>
              {serverMessage && (
                <div className="authError" role="alert">
                  {serverMessage}
                </div>
              )}

              <label>
                <span>이메일</span>
                <input
                  autoComplete="email"
                  inputMode="email"
                  onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  value={loginForm.email}
                />
                {touched.email && errors.email && <em>{errors.email}</em>}
              </label>

              <label>
                <span>비밀번호</span>
                <input
                  autoComplete="current-password"
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="비밀번호"
                  type="password"
                  value={loginForm.password}
                />
                {touched.password && errors.password && <em>{errors.password}</em>}
              </label>

              <button disabled={submitting} type="submit">
                {submitting ? "처리 중" : "로그인"}
              </button>
            </form>
          </article>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
