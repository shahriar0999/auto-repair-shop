export interface Shop {
  id: string;
  network: string;
  sourceId: string;
  slug: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  stateName: string;
  zip: string;
  citySlug: string;
  stateSlug: string;
  sourceUrl: string;
  mapUrl?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  hours?: Record<string, string>;
  tz?: string;
  services: string[];
  vehicles: string[];
  discount?: string;
  discountExclusions?: string;
  lastVerified: string;
}
