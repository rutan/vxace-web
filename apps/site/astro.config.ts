import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

export default defineConfig({
  outDir: './dist',
  site: 'https://rutan.github.io/vxace-web/',
  base: '/vxace-web/',
  i18n: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
  },
  integrations: [react()],
});
