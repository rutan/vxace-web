import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  build: {
    license: {
      fileName: 'license.md',
    },
  },
  plugins: [tailwindcss()],
});
