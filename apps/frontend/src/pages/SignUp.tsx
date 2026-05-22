import { FormEvent, useMemo, useState } from "react";
import { signUp } from "../api/client";
import { HomeFooter } from "../components/HomeFooter";
import { HomeTopNav } from "../components/HomeTopNav";

type SignUpForm = {
  email: string;
  password: string;
  name: string;
  nickname: string;
  profileImageUrl: string;
};

const initialForm: SignUpForm = {
  email: "",
  password: "",
  name: "",
  nickname: "",
  profileImageUrl: ""
};

function countCharacters(value: string) {
  return Array.from(value.trim()).length;
}

function validateForm(form: SignUpForm) {
  const errors: Partial<Record<keyof SignUpForm, string>> = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "이메일 형식이 올바르지 않습니다.";
  }

  if (form.password.length < 8) {
    errors.password = "비밀번호는 8자 이상이어야 합니다.";
  } else if (!/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
    errors.password = "비밀번호에는 대문자, 소문자, 숫자가 포함되어야 합니다.";
  }

  const nameLength = countCharacters(form.name);
  if (nameLength < 2 || nameLength > 30) {
    errors.name = "이름은 2자 이상 30자 이하여야 합니다.";
  }

  if (form.nickname.trim() && countCharacters(form.nickname) > 30) {
    errors.nickname = "닉네임은 30자 이하여야 합니다.";
  }

  if (form.profileImageUrl.trim()) {
    try {
      new URL(form.profileImageUrl.trim());
    } catch {
      errors.profileImageUrl = "프로필 이미지 URL 형식이 올바르지 않습니다.";
    }
  }

  return errors;
}

export function SignUp() {
  const [form, setForm] = useState<SignUpForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof SignUpForm, boolean>>>({});

  const errors = useMemo(() => validateForm(form), [form]);
  const isValid = Object.keys(errors).length === 0;

  const updateField = (field: keyof SignUpForm, value: string) => {
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
      password: true,
      name: true,
      nickname: true,
      profileImageUrl: true
    });

    if (!isValid) {
      return;
    }

    setSubmitting(true);
    setServerMessage(null);

    try {
      const user = await signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name.trim(),
        nickname: form.nickname.trim() || undefined,
        profileImageUrl: form.profileImageUrl.trim() || undefined
      });

      setSuccessEmail(user.email);
      setForm(initialForm);
      setTouched({});
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : "회원가입에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="authPage">
      <HomeTopNav />

      <section className="signupSection" aria-labelledby="signup-title">
        <div className="authHeader">
          <span>회원가입</span>
          <h1 id="signup-title">Neet2Work 계정을 만드세요</h1>
          <p>이메일 인증은 아직 요구하지 않으며, 로그인 기능은 다음 단계에서 연결합니다.</p>
        </div>

        <form className="signupForm" onSubmit={handleSubmit} noValidate>
          {successEmail && (
            <div className="authSuccess" role="status">
              <strong>회원가입이 완료되었습니다.</strong>
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
              autoComplete="new-password"
              onBlur={() => setTouched((current) => ({ ...current, password: true }))}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="대문자, 소문자, 숫자 포함 8자 이상"
              type="password"
              value={form.password}
            />
            {touched.password && errors.password && <em>{errors.password}</em>}
          </label>

          <div className="signupFormGrid">
            <label>
              <span>이름</span>
              <input
                autoComplete="name"
                onBlur={() => setTouched((current) => ({ ...current, name: true }))}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="홍길동"
                type="text"
                value={form.name}
              />
              {touched.name && errors.name && <em>{errors.name}</em>}
            </label>

            <label>
              <span>닉네임</span>
              <input
                autoComplete="nickname"
                onBlur={() => setTouched((current) => ({ ...current, nickname: true }))}
                onChange={(event) => updateField("nickname", event.target.value)}
                placeholder="선택 입력"
                type="text"
                value={form.nickname}
              />
              {touched.nickname && errors.nickname && <em>{errors.nickname}</em>}
            </label>
          </div>

          <label>
            <span>프로필 이미지 URL</span>
            <input
              onBlur={() => setTouched((current) => ({ ...current, profileImageUrl: true }))}
              onChange={(event) => updateField("profileImageUrl", event.target.value)}
              placeholder="https://example.com/profile.png"
              type="url"
              value={form.profileImageUrl}
            />
            {touched.profileImageUrl && errors.profileImageUrl && <em>{errors.profileImageUrl}</em>}
          </label>

          <button disabled={submitting} type="submit">
            {submitting ? "처리 중" : "회원가입"}
          </button>
        </form>
      </section>

      <HomeFooter />
    </main>
  );
}
