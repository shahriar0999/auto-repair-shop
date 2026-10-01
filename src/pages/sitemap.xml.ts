import type { APIRoute } from 'astro';
import { allShops } from '@/lib/shops';

export const GET: APIRoute = ({ site }) => {
  const base = (site?.href ?? 'https://example.com/').replace(/\/$/, '');
  const shops = allShops();
  const pages = new Map<string, string>(); // path -> lastmod ('' = none)

  for (const p of ['/', '/about/', '/contact/', '/privacy-policy/', '/terms/']) pages.set(p, '');

  const newer = (a: string, b: string) => (a > b ? a : b);
  for (const s of shops) {
    // Shop pages with no details are set to noindex, so keep them out of the sitemap
    const hasDetails = Boolean(s.phone || s.services.length || (s.hours && Object.keys(s.hours).length));
    const state = `/${s.network}/${s.stateSlug}/`;
    const city = `${state}${s.citySlug}/`;
    pages.set(state, newer(pages.get(state) ?? '', s.lastVerified));
    pages.set(city, newer(pages.get(city) ?? '', s.lastVerified));
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
