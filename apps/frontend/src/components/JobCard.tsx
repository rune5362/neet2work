import type { JobPosting } from "../types/job";

type JobCardProps = {
  job: JobPosting;
  isSelected: boolean;
  onSelect: (jobId: string) => void;
};

export function JobCard({ job, isSelected, onSelect }: JobCardProps) {
  return (
    <button
      type="button"
      className={`jobCard ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(job.id)}
    >
      <span>{job.company}</span>
      <strong>{job.title}</strong>
      <p>
        {job.location} · {job.careerLevel}
      </p>
      <div className="chips">
        {job.skills.map((skill) => (
          <em key={skill}>{skill}</em>
        ))}
      </div>
    </button>
  );
}
