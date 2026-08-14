import type { Job } from "../types/job";
import { postedAge } from "../lib/format";
import { inferSeniority } from "../lib/classify";

interface JobRowProps {
  job: Job;
  isNew: boolean;
  onOpen: (job: Job) => void;
}

export function JobRow({ job, isNew, onOpen }: JobRowProps) {
  const seniority = inferSeniority(job.title);

  return (
    <tr onClick={() => onOpen(job)}>
      <td>
        <div className="cell-company">
          <span className="avatar" aria-hidden="true">
            {job.company.charAt(0).toUpperCase()}
          </span>
          <span className="truncate company-name" title={job.company}>
            {job.company}
          </span>
        </div>
      </td>
      <td className="cell-role">
        <div className="cell-role__inner">
          <span className="truncate" title={job.title}>
            {job.title}
          </span>
          {seniority && <span className="tag">{seniority}</span>}
          {isNew && <span className="tag tag--new">New</span>}
        </div>
      </td>
      <td className="cell-location">
        <div className="truncate" title={job.location}>
          {job.location || "—"}
        </div>
      </td>
      <td className="cell-posted" title={new Date(job.postedAt).toLocaleString()}>
        {postedAge(job.postedAt)}
      </td>
      <td className="cell-action">
        <a
          className="btn-apply"
          href={job.url}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Apply to ${job.title} at ${job.company}`}
        >
          Apply
        </a>
      </td>
    </tr>
  );
}
