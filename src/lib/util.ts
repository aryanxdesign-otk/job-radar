export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

const MS_PER_UNIT: Record<string, number> = {
  h: 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  mo: 30 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

/** Parses "2 days ago", "3h", "1 month ago", etc. into an ISO timestamp. Falls back to now. */
export function parseRelativeTime(text: string): string {
  const now = new Date();
  const match = text.trim().match(/(\d+)\s*(hour|h|day|d|month|mo)/i);
  if (!match) return now.toISOString();

  const amount = Number(match[1]);
  const unit = (match[2] ?? "").toLowerCase();
  return new Date(now.getTime() - amount * (MS_PER_UNIT[unit] ?? 0)).toISOString();
}
