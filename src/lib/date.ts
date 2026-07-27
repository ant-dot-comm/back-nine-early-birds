const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Parse a YYYY-MM-DD date string as a *local* date (no UTC shift). */
export function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayYMD(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "Sat, Jul 27" — with a "Today · " prefix when it is today. */
export function formatRoundDate(ymd: string, withToday = false): string {
  const d = parseYMD(ymd);
  const base = `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
  if (withToday && ymd === todayYMD()) return `Today · ${base}`;
  return base;
}

/** "Sat · Jul 27, 2026" for summary headers. */
export function formatLongDate(ymd: string): string {
  const d = parseYMD(ymd);
  return `${DOW[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
