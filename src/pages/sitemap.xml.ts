import type { APIRoute } from 'astro';
import { allShops } from '@/lib/shops';

export const GET: APIRoute = ({ site }) => {
  const base = (site?.href ?? 'https://example.com/').replace(/\/$/, '');
  const shops = allShops();
  const pages = new Map<string, string>(); // path -> lastmod ('' = none)

  for (const p of ['/', '/about/', '/contact/', '/privacy-policy/', '/terms/']) pages.set(p, '');

  const cityCount = new Map<string, number>();
  for (const s of shops) {
    const k = `${s.network}/${s.stateSlug}/${s.citySlug}`;
    cityCount.set(k, (cityCount.get(k) ?? 0) + 1);
  }

  const newer = (a: string, b: string) => (a > b ? a : b);
  for (const s of shops) {
    // Toyota shop pages are noindex for now, and so are pages with no details
    const hasDetails = Boolean(s.phone || s.services.length || (s.hours && Object.keys(s.hours).length)) && s.network !== 'toyota';
    const state = `/${s.network}/${s.stateSlug}/`;
    const city = `${state}${s.citySlug}/`;
    const cityHasMany = (cityCount.get(`${s.network}/${s.stateSlug}/${s.citySlug}`) ?? 0) >= 2;
    pages.set(state, newer(pages.get(state) ?? '', s.lastVerified));
    // City pages with only one shop are noindex, so keep them out of the sitemap
    if (cityHasMany) pages.set(city, newer(pages.get(city) ?? '', s.lastVerified));
    if (hasDetails) pages.set(`${city}${s.slug}/`, s.lastVerified);
  }

  // One sitemap file can hold up to 50,000 URLs
  if (pages.size > 50000) console.warn(`[sitemap] ${pages.size} URLs, split into several sitemap files`);

  const urls = [...pages]
    .map(([path, last]) => `  <url><loc>${base}${path}</loc>${last ? `<lastmod>${last}</lastmod>` : ''}</url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
