import { useEffect, useMemo, useState } from "react";
import type { Job, JobsFile, RoleFamily } from "./types/job";
import { JobRow } from "./components/JobRow";
import { JobDetail } from "./components/JobDetail";
import { getLastVisit, setLastVisit } from "./lib/status";

const ROLE_FAMILIES: RoleFamily[] = ["senior-pd", "lead-pd", "uiux", "product-owner"];

const ROLE_LABELS: Record<RoleFamily, string> = {
  "senior-pd": "Senior PD",
  "lead-pd": "Lead PD",
  uiux: "UI/UX",
  "product-owner": "Product Owner",
};

type SortKey = "company" | "title" | "location" | "postedAt";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "company", label: "Company" },
  { key: "title", label: "Role" },
  { key: "location", label: "Location", className: "cell-location" },
  { key: "postedAt", label: "Posted", className: "cell-posted" },
];

// Deterministic per-render texture; regenerating it on every keystroke would
// make the hero visibly shimmer.
const TEXTURE = (() => {
  const glyphs = "!<>-_\\/[]{}—=+*^?#$%&()~|;:,.01";
  let out = "";
  for (let i = 0; i < 3600; i++) {
    out += Math.random() < 0.28 ? " " : glyphs[Math.floor(Math.random() * glyphs.length)];
  }
  return out;
})();

function useJobsFile() {
  const [data, setData] = useState<JobsFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("jobs.json")
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
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("postedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Job | null>(null);

  useEffect(() => {
    setLastVisitState(getLastVisit());
    setLastVisit();
  }, []);

  function toggleRole(family: RoleFamily) {
    setRoleFilters((prev) =>
      prev.includes(family) ? prev.filter((f) => f !== family) : [...prev, family],
    );
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Recency reads newest-first by default; text columns read A–Z.
      setSortDir(key === "postedAt" ? "desc" : "asc");
    }
  }

  const visibleJobs = useMemo(() => {
    if (!data) return [];
    let jobs = data.jobs;

    if (roleFilters.length > 0) {
      jobs = jobs.filter((j) => roleFilters.includes(j.roleFamily));
    }

    const q = query.trim().toLowerCase();
    if (q) {
      jobs = jobs.filter((j) =>
        `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q),
      );
    }

    return [...jobs].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "postedAt") {
        return (new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime()) * dir;
      }
      return a[sortKey].localeCompare(b[sortKey]) * dir;
    });
  }, [data, roleFilters, query, sortKey, sortDir]);

  if (error) return <div className="state">Couldn’t load jobs.json — {error}</div>;
  if (!data) return <div className="state">Loading…</div>;

  const companyCount = new Set(visibleJobs.map((j) => j.company)).size;

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__texture" aria-hidden="true">
          {TEXTURE}
        </div>
        <div className="hero__inner">
          <h1>Design roles you can actually take</h1>
          <p className="hero__sub">
            Senior and lead product design, UI/UX, and product owner roles — filtered for remote work in
            the UTC+0 to UTC+9 band. Pulled straight from company boards and remote job feeds, refreshed
            daily.
          </p>
        </div>
      </header>

      <div className="chips">
        <button className="chip" data-active={roleFilters.length === 0} onClick={() => setRoleFilters([])}>
          All
        </button>
        {ROLE_FAMILIES.map((family) => (
          <button
            key={family}
            className="chip"
            data-active={roleFilters.includes(family)}
            onClick={() => toggleRole(family)}
          >
            {ROLE_LABELS[family]}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search">
          <span className="search__icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles, companies, locations…"
            aria-label="Search roles, companies, locations"
          />
        </div>
        <span className="count">
          {visibleJobs.length} {visibleJobs.length === 1 ? "position" : "positions"} at {companyCount}{" "}
          {companyCount === 1 ? "company" : "companies"}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className={col.className}>
                  <button onClick={() => toggleSort(col.key)}>
                    {col.label}
                    {sortKey === col.key && (
                      <span className="sort-arrow">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
              ))}
              <th className="cell-action" />
            </tr>
          </thead>
          <tbody>
            {visibleJobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                isNew={lastVisit !== null && new Date(job.postedAt).getTime() > lastVisit}
                onOpen={setSelected}
              />
            ))}
          </tbody>
        </table>

        {visibleJobs.length === 0 && (
          <div className="empty">No roles match those filters.</div>
        )}
      </div>

      {selected && <JobDetail job={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
