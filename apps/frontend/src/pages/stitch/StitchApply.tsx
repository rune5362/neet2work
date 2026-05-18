import { StitchShell } from "./StitchShell";

export function StitchApply() {
  return (
    <StitchShell active="/stitch_export/apply">
      <section className="stitchOnlyJobHeader">
        <p className="stitchOnlyEyebrow">Application</p>
        <h1>Frontend Developer (React/Next.js)</h1>
        <p>테크브릿지 지원을 위한 기본 정보와 이력서를 제출하세요.</p>
      </section>

      <form className="stitchOnlyForm">
        <fieldset>
          <legend>개인 정보</legend>
          <label>
            이름
            <input placeholder="홍길동" />
          </label>
          <label>
            이메일
            <input placeholder="career@example.com" type="email" />
          </label>
          <label>
            연락처
            <input placeholder="010-0000-0000" />
          </label>
        </fieldset>
        <fieldset>
          <legend>이력서 제출</legend>
          <label>
            자기소개서 요약
            <textarea placeholder="지원 동기와 핵심 경험을 입력하세요." />
          </label>
          <label>
            포트폴리오 URL <span>(선택)</span>
            <input placeholder="https://portfolio.example.com" />
          </label>
        </fieldset>
        <div className="stitchOnlyFormActions">
          <a className="stitchOnlyPrimary" href="/stitch_export/activity">
            지원서 제출하기
          </a>
          <a className="stitchOnlyGhost" href="/stitch_export/job-detail">
            공고로 돌아가기
          </a>
        </div>
      </form>
    </StitchShell>
  );
}
