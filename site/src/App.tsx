import { useEffect, useMemo, useState } from "react";
import type { JobsFile, RoleFamily } from "./types/job";
import { JobCard } from "./components/JobCard";
import { MultiSelectDropdown } from "./components/MultiSelectDropdown";
import { getLastVisit, setLastVisit } from "./lib/status";

const ROLE_FAMILIES: RoleFamily[] = ["senior-pd", "lead-pd", "uiux", "product-owner"];

const ROLE_FAMILY_LABELS: Record<RoleFamily, string> = {
  "senior-pd": "Senior Product Designer",
  "lead-pd": "Lead Product Designer",
  uiux: "UI/UX Designer",
  "product-owner": "Product Owner",
};

type SortOption = "newest" | "oldest" | "company" | "title";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  company: "Company A–Z",
  title: "Title A–Z",
};

function useJobsFile() {
  const [data, setData] = useState<JobsFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/jobs.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<JobsFile>;
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  return { data, error };
}

export default function App() {
  const { data, error } = useJobsFile();
  const [lastVisit, setLastVisitState] = useState<number | null>(null);
  const [roleFilters, setRoleFilters] = useState<RoleFamily[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  useEffect(() => {
    setLastVisitState(getLastVisit());
    setLastVisit();
  }, []);

  const visibleJobs = useMemo(() => {
    if (!data) return [];
    let jobs = data.jobs;
    if (roleFilters.length > 0) {
      jobs = jobs.filter((j) => roleFilters.includes(j.roleFamily));
    }

    const sorted = [...jobs];
    switch (sortOption) {
      case "newest":
        sorted.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
        break;
      case "oldest":
        sorted.sort((a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime());
        break;
      case "company":
        sorted.sort((a, b) => a.company.localeCompare(b.company));
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return sorted;
  }, [data, roleFilters, sortOption]);

  if (error) return <div className="state state--error">Failed to load jobs.json: {error}</div>;
  if (!data) return <div className="state">Loading…</div>;

  return (
    <div className="page">
      <header className="header">
        <h1>Job Radar</h1>
        <div className="header__stats mono">
          <span>{data.jobs.length} jobs</span>
          <span className="dot">·</span>
          <span>
            {data.funnel.deduped ?? data.funnel.raw} deduped → {data.funnel.titleMatched ?? "—"} title-matched →{" "}
            {data.funnel.geoPassed ?? data.jobs.length} final
          </span>
          <span className="dot">·</span>
          <span>updated {new Date(data.filteredAt ?? data.generatedAt).toLocaleString()}</span>
        </div>
      </header>

      <div className="toolbar">
        <MultiSelectDropdown
          label="Role"
          allLabel="All roles"
          options={ROLE_FAMILIES.map((f) => ROLE_FAMILY_LABELS[f])}
          selected={roleFilters.map((f) => ROLE_FAMILY_LABELS[f])}
          onChange={(next) =>
            setRoleFilters(ROLE_FAMILIES.filter((f) => next.includes(ROLE_FAMILY_LABELS[f])))
          }
        />
        <label className="sort-control">
          <span>Sort</span>
          <select
            className="mono"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="result-count mono">{visibleJobs.length} shown</div>

      <main className="list">
        {visibleJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isNew={lastVisit !== null && new Date(job.postedAt).getTime() > lastVisit}
          />
        ))}
      </main>
    </div>
  );
}
