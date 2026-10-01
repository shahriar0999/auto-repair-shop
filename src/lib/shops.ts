import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
// @ts-ignore (no type definitions)
import tzlookup from 'tz-lookup';
import type { Shop } from './types';
import { stateName, isUS } from './states';
import { networks, type NetworkKey } from './networks';

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ').replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function parseAddress2(a: string) {
  const m = a.replace(/\s+/g, ' ').trim().match(/^(.*?),\s*([A-Za-z]{2}),?\s*(\d{5})?/);
  return { city: m?.[1] ?? '', state: (m?.[2] ?? '').toUpperCase(), zip: m?.[3] ?? '' };
}
function cleanUrl(u?: string | null) {
  if (!u) return undefined;
  let x = u.trim().replace(/\\/g, '/');
  if (!/^https?:\/\//i.test(x)) x = 'http://' + x.replace(/^\/+/, '');
  try { new URL(x); return x; } catch { return undefined; }
}
function cleanHours(h: unknown): Record<string, string> | undefined {
  if (!h || typeof h !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [d, t] of Object.entries(h as Record<string, unknown>)) {
    const v = String(t ?? '').replace(/[\s-]+$/, '').trim();
    if (v) out[d] = v;
  }
  return Object.keys(out).length ? out : undefined;
}
const list = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
function tzFor(lat?: number, lng?: number) {
  if (lat === undefined || lng === undefined) return undefined;
  try { return tzlookup(lat, lng) as string; } catch { return undefined; }
}
function fmtPhone(v: unknown) {
  const d = String(v ?? '').replace(/\.0+$/, '').replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d || undefined;
}

// ---------- AAA: data/shops_raw.jsonl ----------
function loadAaa(): Shop[] {
  const file = path.join(process.cwd(), 'data/shops_raw.jsonl');
  if (!fs.existsSync(file)) return [];
  const byId = new Map<string, Shop>();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let r: any;
    try { r = JSON.parse(line); } catch { continue; }
    if (r.status !== 'ok' || !r.shopId || !r.shopName) continue;
    const sourceId = String(r.shopId);
    if (byId.has(sourceId)) continue;
    const { city, state, zip } = parseAddress2(r.address2 ?? '');
    if (!city || !state) continue;
    if (!isUS(state)) { skip(state); continue; }
    const lat = typeof r.latitude === 'number' ? r.latitude : undefined;
    const lng = typeof r.longitude === 'number' ? r.longitude : undefined;
    const sName = stateName(state);
    byId.set(sourceId, {
      id: `aaa-${sourceId}`, network: 'aaa', sourceId, slug: slugify(r.shopName),
      name: r.shopName, address1: r.address1 ?? '', city, state, zip,
      stateName: sName, citySlug: slugify(city), stateSlug: slugify(sName),
      sourceUrl: r.url, mapUrl: str(r.mapUrl), lat, lng, tz: tzFor(lat, lng),
      phone: str(r.phone), website: cleanUrl(r.website), hours: cleanHours(r.hours),
      services: list(r.services), vehicles: list(r.vehicles),
      discount: str(r.discount), discountExclusions: str(r.discountExclusions),
      lastVerified: (r.scrapedAt ?? new Date().toISOString()).slice(0, 10),
    });
  }
  return [...byId.values()];
}

// ---------- Dealer CSVs (Toyota now, Nissan later) ----------
// Columns: Name, Street, City, State / Territory, Zip Code, Phone, Latitude, Longitude, Dealer ID, Last Updated Date
function loadDealers(network: NetworkKey, file: string): Shop[] {
  const p = path.join(process.cwd(), 'data', file);
  if (!fs.existsSync(p)) return [];
  const text = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
  const delimiter = text.split('\n', 1)[0].includes('\t') ? '\t' : ',';
  const rows: string[][] = parse(text, { delimiter, relax_column_count: true, relax_quotes: true, skip_empty_lines: true, trim: true });
  const header = rows.shift() ?? [];
  const seen = new Set<string>();
  const out: Shop[] = [];
  for (let row of rows) {
    if (row.length === header.length + 1) row = row.slice(1); // pandas index column
    const r: Record<string, string> = {};
    header.forEach((h, i) => (r[h] = row[i] ?? ''));
    const dealerId = r['Dealer ID'], name = r['Name'];
    const city = r['City'], state = (r['State / Territory'] ?? '').toUpperCase();
    if (!dealerId || !name || !city || !state || seen.has(dealerId)) continue;
    if (!isUS(state)) { skip(state); continue; }
    seen.add(dealerId);
    const lat = parseFloat(r['Latitude']), lng = parseFloat(r['Longitude']);
    const la = Number.isFinite(lat) ? lat : undefined, ln = Number.isFinite(lng) ? lng : undefined;
    const zip = /^\d{1,5}$/.test(r['Zip Code'] ?? '') ? r['Zip Code'].padStart(5, '0') : (r['Zip Code'] ?? '');
    const sName = stateName(state);
    out.push({
      id: `${network}-${dealerId}`, network, sourceId: dealerId, slug: slugify(name),
      name, address1: r['Street'] ?? '', city, state, zip,
      stateName: sName, citySlug: slugify(city), stateSlug: slugify(sName),
      sourceUrl: networks[network].officialUrl, lat: la, lng: ln, tz: tzFor(la, ln),
      phone: fmtPhone(r['Phone']), services: [], vehicles: [],
      lastVerified: (r['Last Updated Date'] || new Date().toISOString()).slice(0, 10),
    });
  }
  return out;
}

const skipped = new Map<string, number>();
const skip = (code: string) => skipped.set(code, (skipped.get(code) ?? 0) + 1);

let cache: Shop[] | null = null;

export function allShops(): Shop[] {
  if (cache) return cache;
  const shops = [...loadAaa(), ...loadDealers('toyota', 'toyota.csv')];
  if (!shops.length) throw new Error('No data found. Add data/shops_raw.jsonl and/or data/toyota.csv');

  if (skipped.size) console.warn('[data] skipped non-US rows: ' + [...skipped].map(([c, n]) => `${c} x${n}`).join(', '));
  const seen = new Map<string, number>();
  const key = (s: Shop) => `${s.network}/${s.stateSlug}/${s.citySlug}/${s.slug}`;
  for (const s of shops) seen.set(key(s), (seen.get(key(s)) ?? 0) + 1);
  for (const s of shops) if ((seen.get(key(s)) ?? 0) > 1) s.slug = `${s.slug}-${s.sourceId}`;
  return (cache = shops);
}

export function groupBy<T>(items: T[], keyFn: (t: T) => string) {
  const m = new Map<string, T[]>();
  for (const i of items) {
    const k = keyFn(i);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(i);
  }
  return m;
}
export const byState = (shops: Shop[]) => groupBy(shops, (s) => s.stateSlug);
export const byCity = (shops: Shop[]) => groupBy(shops, (s) => `${s.stateSlug}/${s.citySlug}`);
