import { useMemo, useState } from "react";
import { StitchShell } from "./StitchShell";
import { StitchJobCards, stitchJobs } from "./StitchJobs";

export function StitchJobsFilter() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("all");
  const [category, setCategory] = useState("all");
  const [experience, setExperience] = useState("all");

  const filteredJobs = useMemo(
    () =>
      stitchJobs.filter((job) => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery =
          !normalizedQuery ||
          `${job.title} ${job.company} ${job.location} ${job.category}`.toLowerCase().includes(normalizedQuery);
        const matchesLocation =
          location === "all" ||
          (location === "서울" && job.location.includes("서울")) ||
          (location === "경기" && job.location.includes("판교")) ||
          (location === "원격" && job.location.includes("원격"));
        const matchesCategory = category === "all" || job.category === category;
        const matchesExperience =
          experience === "all" ||
          (experience === "신입" && job.experience === "신입") ||
          (experience === "경력" && job.experience !== "신입");

        return matchesQuery && matchesLocation && matchesCategory && matchesExperience;
      }),
    [category, experience, location, query]
  );

  return (
    <StitchShell active="/stitch_export/jobs">
      <section className="stitchOnlyJobHeader">
        <p className="stitchOnlyEyebrow">Filtered roles</p>
        <h1>채용 공고 필터 시안</h1>
        <p>검색, 지역, 직무, 경력 조건을 한 줄에서 조합해 공고 목록을 좁히는 버전입니다.</p>
      </section>
      <section className="stitchOnlyToolbar sticky">
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="직무, 회사명, 키워드 검색"
          value={query}
        />
        <select onChange={(event) => setLocation(event.target.value)} value={location}>
          <option value="all">지역 전체</option>
          <option value="서울">서울</option>
          <option value="경기">경기/인천</option>
          <option value="원격">원격 근무</option>
        </select>
        <select onChange={(event) => setCategory(event.target.value)} value={category}>
          <option value="all">직무 전체</option>
          <option value="Frontend">개발(FE)</option>
          <option value="Backend">개발(BE)</option>
          <option value="Designer">디자인</option>
          <option value="Marketer">마케팅</option>
          <option value="Growth">Growth</option>
        </select>
        <select onChange={(event) => setExperience(event.target.value)} value={experience}>
          <option value="all">경력 전체</option>
          <option>신입</option>
          <option>경력</option>
        </select>
      </section>
      <section className="stitchOnlyListingMeta">
        <strong>총 {filteredJobs.length}개의 공고</strong>
        <div>
          <button type="button">인기순</button>
          <button type="button">최신순</button>
        </div>
      </section>
      <section className="stitchOnlyJobsGrid">
        {filteredJobs.length > 0 ? <StitchJobCards jobs={filteredJobs} /> : <p>조건에 맞는 공고가 없습니다.</p>}
      </section>
    </StitchShell>
  );
}
