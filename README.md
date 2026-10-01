# Repair Finder (Astro)

## 1. Copy your own files in
Icons go in `public/`:
  favicon.ico, favicon.svg, favicon-96x96.png, apple-touch-icon.png, site.webmanifest,
  web-app-manifest-192x192.png, web-app-manifest-512x512.png, icon.svg

Data goes in `data/` (replace the small sample files):
  shops_raw.jsonl   AAA shops (from the Colab scraper)
  toyota.csv        Toyota dealers

## 2. Two settings to change
- `astro.config.mjs`  -> `site:` your real domain
- `src/lib/site.ts`   -> `email:` your real email (and `formAction:` if you use a contact form)

## 3. Run
    npm install
    npm run dev       # http://localhost:4321
    npm run build     # output in /dist
