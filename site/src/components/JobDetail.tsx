import { useEffect, useMemo, useRef } from "react";
import type { Job } from "../types/job";
import { postedAge, sourceLabel, roleFamilyLabel } from "../lib/format";
import { sanitizeHtml } from "../lib/sanitize";

interface JobDetailProps {
  job: Job;
  onClose: () => void;
}

export function JobDetail({ job, onClose }: JobDetailProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const html = useMemo(() => sanitizeHtml(job.description ?? ""), [job.description]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={job.title}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="sheet__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h2>{job.title}</h2>

        <div className="sheet__meta">
          <span className="avatar" aria-hidden="true">
            {job.company.charAt(0).toUpperCase()}
          </span>
          <span>{job.company}</span>
          {job.location && (
            <>
              <span className="sep">·</span>
              <span>{job.location}</span>
            </>
          )}
          <span className="sep">·</span>
          <span title={new Date(job.postedAt).toLocaleString()}>{postedAge(job.postedAt)}</span>
          <span className="tag">{roleFamilyLabel(job.roleFamily)}</span>
          <span className="tag">{sourceLabel(job.atsProvider)}</span>
        </div>

        <div className="sheet__actions">
          <a
            className="btn-apply btn-apply--lg"
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            Apply on {sourceLabel(job.atsProvider)} →
          </a>
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {html ? (
          <div className="jd" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="jd jd--empty">
            No description was included in this listing — open the posting to read the full details.
          </p>
        )}
      </div>
    </div>
  );
}
