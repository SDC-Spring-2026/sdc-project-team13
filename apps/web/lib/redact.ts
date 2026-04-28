export function maskId(id: string, opts?: { start?: number; end?: number }) {
  const start = opts?.start ?? 4;
  const end = opts?.end ?? 4;
  const t = String(id ?? "");
  if (t.length <= start + end + 3) return "…";
  return `${t.slice(0, start)}…${t.slice(-end)}`;
}

