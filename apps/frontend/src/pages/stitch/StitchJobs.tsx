import { StitchShell } from "./StitchShell";

export type StitchJob = {
  title: string;
  company: string;
  location: string;
  category: string;
  experience: "신입" | "경력" | "Remote";
  match: string;
};

export const stitchJobs: StitchJob[] = [
  {
    title: "Frontend Engineer",
    company: "테크브릿지 (Tech Bridge)",
    location: "서울 강남구",
    category: "Frontend",
    experience: "경력",
    match: "92%"
  },
  {
    title: "Product Designer",
    company: "그린 솔루션즈",
    location: "원격 근무 가능",
    category: "Designer",
    experience: "Remote",
    match: "88%"
  },
  {
    title: "Backend Developer",
    company: "AI 인사이트",
    location: "판교 테크노밸리",
    category: "Backend",
    experience: "경력",
    match: "84%"
  },
  {
    title: "Performance Marketer",
    company: "넥스트 웨이브",
    location: "서울 성동구",
    category: "Marketer",
    experience: "경력",
    match: "79%"
  },
  {
    title: "QA Engineer",
    company: "블루 코어 핀테크",
    location: "서울 영등포구",
    category: "QA",
    experience: "신입",
    match: "76%"
  },
  {
    title: "Growth Specialist",
    company: "퓨처 유니버스",
    location: "서울 강남구",
    category: "Growth",
    experience: "경력",
    match: "92%"
  }
];

export function StitchJobs() {
  return (
    <StitchShell active="/stitch_export/jobs">
      <section className="stitchOnlyJobHeader">
        <p className="stitchOnlyEyebrow">Open roles</p>
        <h1>채용 공고</h1>
        <p>당신의 새로운 시작을 응원하는 맞춤형 공고를 확인하세요.</p>
      </section>

      <section className="stitchOnlyToolbar">
        <input placeholder="직무, 회사명, 키워드 검색" />
        <select defaultValue="all">
          <option value="all">지역 전체</option>
          <option>서울</option>
          <option>경기/인천</option>
          <option>원격 근무</option>
        </select>
        <a href="/stitch_export/jobs-filter">필터 시안 보기</a>
      </section>

      <section className="stitchOnlyJobsGrid">
        <StitchJobsGrid />
      </section>
    </StitchShell>
  );
}

export function StitchJobsGrid() {
  return <StitchJobCards jobs={stitchJobs} />;
}

export function StitchJobCards({ jobs }: { jobs: StitchJob[] }) {
  return (
    <>
      {jobs.map((job) => (
        <article className={job.match === "92%" ? "recommended" : ""} key={`${job.title}-${job.company}`}>
          {job.match === "92%" ? <span className="stitchOnlyRecommend">AI 맞춤 추천</span> : null}
          <div className="stitchOnlyJobLogo">{job.company.slice(0, 1)}</div>
          <h2>{job.title}</h2>
          <strong>{job.company}</strong>
          <p>{job.location}</p>
          <div className="stitchOnlyPills">
            <span>{job.category}</span>
            <span>{job.experience}</span>
            <span>적합도 {job.match}</span>
          </div>
          <a className="stitchOnlyCardAction" href="/stitch_export/job-detail">
            상세 보기
          </a>
        </article>
      ))}
    </>
  );
}
