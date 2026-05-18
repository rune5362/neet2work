import { StitchShell } from "./StitchShell";

const responsibilities = [
  "React와 Next.js 기반의 사용자 인터페이스 개발",
  "TypeScript를 활용한 안정적인 프론트엔드 아키텍처 구축",
  "Core Web Vitals 개선과 접근성 품질 관리",
  "디자인 시스템 컴포넌트 구현 및 문서화"
];

export function StitchJobDetail() {
  return (
    <StitchShell active="/stitch_export/jobs">
      <section className="stitchOnlyJobHeader">
        <p className="stitchOnlyEyebrow">Tech Bridge</p>
        <h1>Frontend Developer (React/Next.js)</h1>
        <div className="stitchOnlyPills">
          <span>정규직</span>
          <span>서울 강남구</span>
          <span>4,500-6,500만원</span>
        </div>
        <div className="stitchOnlyActions">
          <a className="stitchOnlyGhost" href="/stitch_export/activity">
            공고 저장하기
          </a>
          <a className="stitchOnlyPrimary" href="/stitch_export/apply">
            지원하기
          </a>
        </div>
      </section>

      <section className="stitchOnlyTwoColumn">
        <article>
          <h2>주요 업무</h2>
          <ul>
            {responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <aside className="stitchOnlyInsight">
          <h3>AI 자소서 분석 팁</h3>
          <p>
            이 공고는 TypeScript와 Performance 역량을 중요하게 평가합니다. 이전 프로젝트에서 성능을
            개선한 경험을 강조해보세요.
          </p>
          <a href="/stitch_export/ai">내 자소서 분석하기</a>
        </aside>
      </section>
      <section className="stitchOnlyCtaPanel">
        <h2>이 공고에 지원할 준비가 되었다면 지원서를 작성하세요</h2>
        <a className="stitchOnlyPrimary" href="/stitch_export/apply">
          지원하기
        </a>
      </section>
    </StitchShell>
  );
}
