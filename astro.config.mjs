import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://nearautorepairshop.com', // TODO: your real domain, e.g. https://yourdomain.com
  output: 'static',
  build: { inlineStylesheets: 'auto' },
});
