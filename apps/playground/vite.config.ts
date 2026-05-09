import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    license: {
      fileName: 'license.md',
    },
  },
  plugins: [tailwindcss()],
});
