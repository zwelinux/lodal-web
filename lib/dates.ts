const pad = (n: number) => String(n).padStart(2, "0");

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s: string) => new Date(s + "T00:00:00");
export const today = () => toISO(new Date());

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Monday of the week that contains `iso`. */
export function weekStart(iso: string): string {
  const d = fromISO(iso);
  const back = (d.getDay() + 6) % 7;
  return addDays(iso, -back);
}

export const weekDays = (iso: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(iso), i));

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const weekdayShort = (iso: string) => WD[fromISO(iso).getDay()];
export const dayNum = (iso: string) => fromISO(iso).getDate();
export const monthShort = (iso: string) => MONTH[fromISO(iso).getMonth()];

export function rangeLabel(days: string[]): string {
  const a = fromISO(days[0]);
  const b = fromISO(days[days.length - 1]);
  const sameMonth = a.getMonth() === b.getMonth();
  return sameMonth
    ? `${MONTH[a.getMonth()]} ${a.getDate()} – ${b.getDate()}, ${b.getFullYear()}`
    : `${MONTH[a.getMonth()]} ${a.getDate()} – ${MONTH[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`;
}

export function longDay(iso: string): string {
  const t = today();
  const base = `${WD[fromISO(iso).getDay()]} ${dayNum(iso)} ${monthShort(iso)}`;
  if (iso === t) return `Today, ${base}`;
  if (iso === addDays(t, 1)) return `Tomorrow, ${base}`;
  if (iso === addDays(t, -1)) return `Yesterday, ${base}`;
  return base;
}
