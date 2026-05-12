import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JobCard } from "./JobCard";
import type { JobPosting } from "../types/job";

const sampleJob: JobPosting = {
  id: "job-001",
  title: "프론트엔드 개발자",
  company: "샘플테크",
  location: "서울",
  careerLevel: "신입",
  skills: ["React", "TypeScript"],
  description: "React 기반 웹 서비스 개발자를 채용합니다.",
  sourceUrl: "https://example.com/jobs/1"
};

describe("JobCard", () => {
  it("채용공고 정보를 표시하고 선택 이벤트를 전달한다", () => {
    const onSelect = vi.fn();

    render(<JobCard job={sampleJob} isSelected={false} onSelect={onSelect} />);

    expect(screen.getByText("샘플테크")).toBeInTheDocument();
    expect(screen.getByText("프론트엔드 개발자")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /프론트엔드 개발자/ }));

    expect(onSelect).toHaveBeenCalledWith("job-001");
  });
});
