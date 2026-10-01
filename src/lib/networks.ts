// One entry per brand. Adding Nissan = a CSV in /data + one entry here + one line in shops.ts.
export const networks = {
  aaa: {
    name: 'AAA Approved Auto Repair',
    short: 'AAA Approved',
    listing: 'AAA Approved Auto Repair',
    noun: 'shop',
    brand: 'AAA',
    officialUrl: 'https://www.aaa.com/autorepair',
  },
  toyota: {
    name: 'Toyota Dealerships',
    short: 'Toyota',
    listing: 'Toyota Dealership Service & Repair',
    noun: 'dealership',
    brand: 'Toyota',
    officialUrl: 'https://www.toyota.com/dealers/',
  },
} as const;
export type NetworkKey = keyof typeof networks;
