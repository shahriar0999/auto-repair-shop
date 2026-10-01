import { allShops, byCity } from '@/lib/shops';
import { networks } from '@/lib/networks';

export function GET() {
  const shops = allShops();
  const n = Object.fromEntries(Object.entries(networks).map(([k, v]) => [k, v.short]));
  const c = [...byCity(shops.map((s) => s)).values()].flatMap((l) => {
    // byCity groups across networks, so split per network
    const per = new Map<string, typeof l>();
    for (const s of l) (per.get(s.network) ?? per.set(s.network, []).get(s.network)!).push(s);
    return [...per.entries()].map(([net, arr]) => [`${arr[0].city}, ${arr[0].state}`, `/${net}/${arr[0].stateSlug}/${arr[0].citySlug}/`, arr.length, net]);
  }).sort((a, b) => (b[2] as number) - (a[2] as number));
  const s = shops.map((x) => [x.name, `${x.city}, ${x.state}`, `/${x.network}/${x.stateSlug}/${x.citySlug}/${x.slug}/`, x.network]);
  return new Response(JSON.stringify({ n, c, s }), { headers: { 'Content-Type': 'application/json' } });
}
