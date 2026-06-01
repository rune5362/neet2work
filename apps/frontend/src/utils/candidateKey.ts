export function getCandidateKey() {
  const stored = window.localStorage.getItem("neet2work.candidateKey");

  if (stored) {
    return stored;
  }

  const fallback = "demo-candidate";
  window.localStorage.setItem("neet2work.candidateKey", fallback);
  return fallback;
}
