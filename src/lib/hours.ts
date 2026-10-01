export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const toMin = (h: string, m: string, ap: string) => ((+h % 12) + (ap.toUpperCase() === 'PM' ? 12 : 0)) * 60 + +m;

/** "7:30 AM - 5:30 PM" -> minutes since midnight. Returns null for "Closed" or unknown formats. */
export function parseRange(s?: string | null): { open: number; close: number } | null {
  if (!s) return null;
  if (/24\s*hours?/i.test(s)) return { open: 0, close: 1440 };
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  return m ? { open: toMin(m[1], m[2], m[3]), close: toMin(m[4], m[5], m[6]) } : null;
}
const pad = (n: number) => String(n).padStart(2, '0');
export const hhmm = (m: number) => (m >= 1440 ? '23:59' : `${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
export const fmt12 = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  return `${h % 12 || 12}:${pad(m % 60)} ${h >= 12 ? 'PM' : 'AM'}`;
};

/** Open/closed right now, in the SHOP's timezone (not the visitor's). */
export function openStatus(hours: Record<string, string>, tz?: string, now = new Date()) {
  if (!tz) return null;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now);
  } catch { return null; }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const today = get('weekday');
  const idx = DAYS.indexOf(today);
  if (idx < 0) return null;
  const mins = +get('hour') * 60 + +get('minute');
  const r = parseRange(hours[today]);
  if (r) {
    const close = r.close <= r.open ? r.close + 1440 : r.close;
    if (mins >= r.open && mins < close)
      return { open: true, today, label: r.open === 0 && r.close === 1440 ? 'Open 24 hours' : `Open now, closes ${fmt12(r.close)}` };
    if (mins < r.open) return { open: false, today, label: `Closed, opens today at ${fmt12(r.open)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const d = DAYS[(idx + i) % 7], n = parseRange(hours[d]);
    if (n) return { open: false, today, label: `Closed, opens ${i === 1 ? 'tomorrow' : d} at ${fmt12(n.open)}` };
  }
  return null;
}
