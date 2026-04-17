// Helpers for formatting forecast times.
// Open-Meteo returns local-naive ISO strings (e.g. "2026-04-17T00:00")
// representing the wall-clock time of the requested location.
// We must NOT pass these through `new Date()` directly because that interprets
// them in the browser's timezone, shifting the displayed time.

export interface ParsedNaive {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

export function parseLocalNaiveISO(iso: string): ParsedNaive {
  // Accepts "YYYY-MM-DDTHH:mm" or with seconds; strips any trailing Z/offset.
  const clean = iso.replace(/[zZ]$/, "").split(/[+-]\d\d:\d\d$/)[0];
  const [datePart, timePart = "00:00"] = clean.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  return { year: y, month: mo, day: d, hour: h, minute: mi || 0 };
}

// Add `hours` to a parsed naive time and return a new ParsedNaive.
export function addHoursNaive(base: ParsedNaive, hours: number): ParsedNaive {
  // Use UTC math to avoid DST shifts in the browser's local TZ — we treat
  // values as wall-clock numbers, not real instants.
  const ms = Date.UTC(base.year, base.month - 1, base.day, base.hour, base.minute) + hours * 3600000;
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatTimeHHMM(t: ParsedNaive): string {
  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}

export function formatDateShort(t: ParsedNaive): string {
  // Get weekday using UTC math to stay consistent with addHoursNaive.
  const wd = new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay();
  return `${WEEKDAYS_EN[wd]} ${String(t.day).padStart(2, "0")} ${MONTHS_EN[t.month - 1]}`;
}

// Format an X-axis tick: show "HH" for normal hours and "Day HH" at midnight.
export function formatAxisTick(t: ParsedNaive): string {
  if (t.hour === 0) return formatDateShort(t).slice(0, 6); // e.g. "Mon 18"
  return `${String(t.hour).padStart(2, "0")}h`;
}
