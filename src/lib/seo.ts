// Title / description / intro text for each page type, written around the target keywords.
export const trunc = (s: string, max = 158) => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\-\s]+$/, '') + '…';
};
const s = (n: number) => (n === 1 ? '' : 's');

export function stateSeo(net: string, st: string, n: number) {
  if (net === 'toyota') return {
    title: `Toyota Auto Repair in ${st}: ${n} Dealership Service Center${s(n)}`,
    description: trunc(`Find ${n} Toyota dealership service center${s(n)} in ${st}. Browse Toyota auto repair shops near me by city with phone numbers, maps and directions.`),
    intro: `Browse ${n} Toyota dealership${s(n)} with service departments in ${st}. Choose a city to see each address, phone number and map.`,
  };
  return {
    title: `AAA Auto Repair Shops in ${st}: ${n} Approved Location${s(n)}`,
    description: trunc(`Find ${n} AAA auto repair shop${s(n)} in ${st}. Browse AAA approved auto repair near me by city, with hours, services, member discounts and directions.`),
    intro: `Browse ${n} AAA approved auto repair shop${s(n)} across ${st}. Choose a city to see addresses, hours, repair services and the AAA member discount each shop lists.`,
  };
}

export function citySeo(net: string, city: string, st: string, n: number) {
  if (net === 'toyota') return {
    title: `Toyota Auto Repair Near Me in ${city}, ${st} (${n} Dealership${s(n)})`,
    description: trunc(`${n} Toyota dealership service center${s(n)} in ${city}, ${st}. Find Toyota auto repair services near you with phone numbers, maps and directions.`),
    intro: `Need Toyota auto repair in ${city}? This page lists ${n} Toyota dealership${s(n)} in ${city}, ${st}. Open a listing for the address, phone number and map, then call to confirm service hours and appointments.`,
  };
  return {
    title: `AAA Auto Repair Shop Near Me in ${city}, ${st} (${n} Shop${s(n)})`,
    description: trunc(`${n} AAA approved auto repair shop${s(n)} in ${city}, ${st}. Compare hours, services and AAA member discounts, then call or get directions.`),
    intro: `Looking for an auto repair shop near you in ${city}? This page lists ${n} AAA approved auto repair shop${s(n)} in ${city}, ${st}. Open a shop for hours, repair services, vehicles serviced and the member discount it lists, or tap Directions to head there.`,
  };
}

export function shopSeo(net: string, name: string, city: string, st: string, address: string) {
  if (net === 'toyota') return {
    title: `${name}: Toyota Auto Repair & Service in ${city}, ${st}`,
    description: trunc(`${name} in ${city}, ${st}: Toyota auto repair and service with phone number, map and directions. ${address}.`),
  };
  return {
    title: `${name}: AAA Approved Auto Repair in ${city}, ${st}`,
    description: trunc(`${name} in ${city}, ${st}: AAA approved auto repair shop near me with hours, services, member discount and directions.`),
  };
}
