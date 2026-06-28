import { defineConfig, UserConfig } from 'vite';
import { exampleGamePlugin } from './scripts/vite/example-game-plugin';

export default defineConfig(() => {
  return {
    base: './',
    build: {
      outDir: 'dist/template',
      license: {
        fileName: 'license.md',
      },
      rolldownOptions: {
        output: {
          postBanner: `
/*
 * VX Ace Web Runtime
 * ------------------------------
 * See licenses of bundled dependencies at ../license.md
 */
`.trim(),
        },
      },
    },
    plugins: [exampleGamePlugin()],
  } satisfies UserConfig;
});
