import { FormEvent, useMemo, useState } from "react";
import { login } from "../api/client";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

type LoginForm = {
  email: string;
  password: string;
};

const initialForm: LoginForm = {
  email: "",
  password: ""
};

function validateForm(form: LoginForm) {
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

export function Login() {
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof LoginForm, boolean>>>({});

  const errors = useMemo(() => validateForm(form), [form]);
  const isValid = Object.keys(errors).length === 0;

  const updateField = (field: keyof LoginForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
    setServerMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
    setSuccessEmail(null);

    try {
      const result = await login({
        email: form.email.trim().toLowerCase(),
        password: form.password
      });

      saveLoginSession(result);
      setSuccessEmail(result.user.email);
      setForm(initialForm);
      setTouched({});

      window.setTimeout(() => {
        window.location.href = "/jobs";
      }, 700);
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="authPage">
      <HomeTopNav />

      <section className="signupSection" aria-labelledby="login-title">
        <div className="authHeader">
          <span>로그인</span>
          <h1 id="login-title">Neet2Work 계정으로 로그인하세요</h1>
          <p>가입한 이메일과 비밀번호로 접속합니다.</p>
        </div>

        <form className="signupForm" onSubmit={handleSubmit} noValidate>
          {successEmail && (
            <div className="authSuccess" role="status">
              <strong>로그인되었습니다.</strong>
              <span>{successEmail}</span>
            </div>
          )}

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
              value={form.email}
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
              value={form.password}
            />
            {touched.password && errors.password && <em>{errors.password}</em>}
          </label>

          <button disabled={submitting} type="submit">
            {submitting ? "처리 중" : "로그인"}
          </button>

          <p className="authFormFooter">
            계정이 없나요? <a href="/signup">회원가입</a>
          </p>
        </form>
      </section>

      <HomeFooter />
    </main>
  );
}
