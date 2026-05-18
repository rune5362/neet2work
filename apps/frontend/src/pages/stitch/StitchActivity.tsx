import { StitchShell } from "./StitchShell";

const activities = [
  ["자소서 분석", "Frontend Developer", "87%"],
  ["공고 저장", "Tech Bridge", "92%"],
  ["지원 준비", "이력서 제출", "진행 중"]
];

export function StitchActivity() {
  return (
    <StitchShell active="/stitch_export/activity">
      <section className="stitchOnlyJobHeader">
        <p className="stitchOnlyEyebrow">My activity</p>
        <h1>내 활동</h1>
        <p>분석, 저장, 지원 준비 상태를 한 곳에서 이어서 확인하는 활동 화면입니다.</p>
      </section>
      <section className="stitchOnlyReport">
        {activities.map(([label, target, value]) => (
          <div key={`${label}-${target}`}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{target}</p>
          </div>
        ))}
      </section>
      <section className="stitchOnlyCtaPanel">
        <h2>저장한 공고의 자소서 적합도를 다시 확인하세요</h2>
        <a className="stitchOnlyPrimary" href="/stitch_export/ai">
          자소서 분석으로 이동
        </a>
      </section>
    </StitchShell>
  );
}

