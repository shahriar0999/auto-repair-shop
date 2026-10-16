// Text built only from fields that exist in the data. If a field is missing, that sentence is simply skipped.
import { DAYS } from './hours';
import type { Shop } from './types';

export interface Faq { q: string; a: string }

const list = (a: string[]) =>
  a.length <= 1 ? (a[0] ?? '') : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
const cleanTimes = (t: string) => t.replace(/\s*-\s*/g, ' to ').replace(/\s+/g, ' ').trim();
const dayLabel = (days: string[]) =>
  days.length === 1 ? days[0] : days.length === 2 ? `${days[0]} and ${days[1]}` : `${days[0]} to ${days[days.length - 1]}`;

/** "Monday to Friday from 7:30 AM to 5:30 PM and Saturday from 8:00 AM to 5:00 PM, and closed on Sunday" */
function hoursParts(hours?: Record<string, string>) {
  if (!hours) return null;
  const runs: { value: string; days: string[] }[] = [];
  for (const d of DAYS) {
    const v = hours[d];
    if (!v) { runs.push({ value: '', days: [] }); continue; } // unknown day breaks a run
    const last = runs[runs.length - 1];
    if (last && last.value === v) last.days.push(d);
    else runs.push({ value: v, days: [d] });
  }
  const known = runs.filter((r) => r.days.length);
  if (!known.length) return null;
  const open: string[] = [], closed: string[] = [];
  for (const r of known) {
    if (/^closed$/i.test(r.value.trim())) closed.push(...r.days);
    else if (/24\s*hours?/i.test(r.value)) open.push(`${dayLabel(r.days)} (open 24 hours)`);
    else open.push(`${dayLabel(r.days)} from ${cleanTimes(r.value)}`);
  }
  return { open, closed };
}

export function hoursSentence(hours: Record<string, string> | undefined, subject = 'It') {
  const p = hoursParts(hours);
  if (!p) return '';
  const closed = p.closed.length ? `closed on ${list(p.closed)}` : '';
  if (p.open.length) return `${subject} is open ${list(p.open)}${closed ? `, and ${closed}` : ''}.`;
  return closed ? `${subject} is ${closed}.` : '';
}

const POPULAR = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'Hyundai'];
function vehicleSentence(v: string[]) {
  if (!v.length) return '';
  const pick = [...POPULAR.filter((p) => v.includes(p)), ...v.filter((x) => !POPULAR.includes(x))].slice(0, 3);
  return v.length > 3
    ? `It services ${v.length} vehicle makes, including ${list(pick)}.`
    : `It services ${list(v)}.`;
}
function serviceSentence(sv: string[]) {
  if (!sv.length) return '';
  const top = sv.slice(0, 4), rest = sv.length - top.length;
  return `Listed services include ${rest > 0 ? `${top.join(', ')} and ${rest} more` : list(top)}.`;
}

export function shopSummary(s: Shop) {
  const kind = s.network === 'toyota' ? 'a Toyota dealership' : 'an AAA Approved auto repair shop';
  return [
    `${s.name} is ${kind} at ${s.address1} in ${s.city}, ${s.state}.`,
    hoursSentence(s.hours),
    vehicleSentence(s.vehicles),
    serviceSentence(s.services),
  ].filter(Boolean).join(' ');
}

/** Meta description: first sentence (name + address) plus a short note on what the page offers. */
export function shopDescription(s: Shop) {
  const kind = s.network === 'toyota' ? 'a Toyota dealership' : 'an AAA Approved auto repair shop';
  const base = `${s.name} is ${kind} at ${s.address1} in ${s.city}, ${s.state}.`;
  const tail = ' Hours, services and member discount.';
  return base.length + tail.length <= 158 ? base + tail : base;
}

export function shopFaqs(s: Shop): Faq[] {
  const out: Faq[] = [];
  const hs = hoursSentence(s.hours, s.name);
  if (hs) out.push({ q: `What are the hours at ${s.name}?`, a: `${hs} Hours were last checked on ${s.lastVerified}, so call to confirm before you go.` });

  const wk = (['Saturday', 'Sunday'] as const).filter((d) => s.hours?.[d]).map((d) => {
    const v = s.hours![d];
    return `${d}: ${/^closed$/i.test(v.trim()) ? 'closed' : cleanTimes(v)}.`;
  });
  if (wk.length) out.push({ q: `Is ${s.name} open on weekends?`, a: wk.join(' ') });

  if (s.vehicles.length) {
    const yes = s.vehicles.includes('Toyota');
    out.push({
      q: `Does ${s.name} service Toyotas?`,
      a: yes
        ? `Yes. Toyota is on the list of ${s.vehicles.length} vehicle makes this shop reports servicing. Ask about your model and year when you call.`
        : `Toyota is not on the list of ${s.vehicles.length} vehicle makes this shop reports, so call${s.phone ? ` ${s.phone}` : ''} to confirm before you book.`,
    });
  }
  if (s.discount) out.push({ q: `What is the AAA member discount at ${s.name}?`, a: `${s.discount}${s.discountExclusions ? ' See the exclusions on this page for the limits.' : ''}` });
  if (s.services.length) out.push({ q: `What repair services does ${s.name} offer?`, a: `${s.name} lists these services: ${list(s.services)}.` });
  if (s.network === 'aaa') out.push({ q: `Is ${s.name} AAA approved?`, a: `Yes. It is listed in AAA's Approved Auto Repair directory, which is the source of this listing, last checked on ${s.lastVerified}. Approval is shop by shop, so look for the AAA Approved Auto Repair sign when you arrive.` });
  return out;
}

// ---------- nearby cities (from the shops we already have) ----------
const rad = Math.PI / 180;
const miles = (a: number, b: number, c: number, d: number) => {
  const h = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2;
  return 2 * 3959 * Math.asin(Math.sqrt(h));
};
interface CityPoint { network: string; city: string; state: string; stateSlug: string; citySlug: string; lat: number; lng: number; n: number }
let points: CityPoint[] | null = null;
function cityPoints(all: Shop[]) {
  if (points) return points;
  const m = new Map<string, CityPoint & { sl: number; sg: number; c: number }>();
  for (const s of all) {
    const k = `${s.network}/${s.stateSlug}/${s.citySlug}`;
    let p = m.get(k);
    if (!p) m.set(k, (p = { network: s.network, city: s.city, state: s.state, stateSlug: s.stateSlug, citySlug: s.citySlug, lat: 0, lng: 0, n: 0, sl: 0, sg: 0, c: 0 }));
    p.n++;
    if (s.lat !== undefined && s.lng !== undefined) { p.sl += s.lat; p.sg += s.lng; p.c++; }
  }
  return (points = [...m.values()].filter((p) => p.c > 0).map((p) => ({ ...p, lat: p.sl / p.c, lng: p.sg / p.c })));
}

/** Nearest cities (same network) that have 2+ shops, i.e. cities whose listing page is indexable. */
export function nearbyCities(s: Shop, all: Shop[], max = 6, radius = 30) {
  if (s.lat === undefined || s.lng === undefined) return [];
  return cityPoints(all)
    .filter((p) => p.network === s.network && p.n >= 2 && !(p.stateSlug === s.stateSlug && p.citySlug === s.citySlug))
    .map((p) => ({ p, d: miles(s.lat!, s.lng!, p.lat, p.lng) }))
    .filter((x) => x.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map(({ p, d }) => ({ label: `${p.city}, ${p.state}`, href: `/${p.network}/${p.stateSlug}/${p.citySlug}/`, miles: Math.round(d) }));
}