import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const distDir = fileURLToPath(new URL('../dist', import.meta.url));
const outDir = fileURLToPath(new URL('../out', import.meta.url));

async function clean() {
  await Promise.all([rm(distDir, { recursive: true, force: true }), rm(outDir, { recursive: true, force: true })]);
}

clean().catch((error) => {
  console.error('Error while cleaning:', error);
});
