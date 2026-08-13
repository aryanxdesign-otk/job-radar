import type { Job } from "../types/job";
import { postedAge, sourceLabel, roleFamilyLabel } from "../lib/format";
import { inferSeniority } from "../lib/classify";

interface JobCardProps {
  job: Job;
  isNew: boolean;
}

export function JobCard({ job, isNew }: JobCardProps) {
  const seniority = inferSeniority(job.title);

  return (
    <article className="card">
      <div className="card__main">
        <div className="card__heading">
          <h2 className="card__title">{job.title}</h2>
          {isNew && <span className="badge badge--new">new</span>}
        </div>
        <div className="card__meta">
          <span className="card__company">{job.company}</span>
          {job.location && <span className="card__location">{job.location}</span>}
          <span className="card__role">{roleFamilyLabel(job.roleFamily)}</span>
          {seniority && <span className="card__seniority">{seniority}</span>}
        </div>
      </div>

      <div className="card__side">
        <span className="mono card__age" title={new Date(job.postedAt).toLocaleString()}>
          Posted {postedAge(job.postedAt)}
        </span>
        <span className="badge badge--source">{sourceLabel(job.atsProvider)}</span>
      </div>

      <div className="card__actions">
        <a className="btn btn--primary" href={job.url} target="_blank" rel="noreferrer noopener">
          Apply →
        </a>
      </div>
    </article>
  );
}
