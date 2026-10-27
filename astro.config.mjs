// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://hsgpacalc.com',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'de'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      i18n: { defaultLocale: 'en', locales: { en: 'en-US', es: 'es', de: 'de-DE' } },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
