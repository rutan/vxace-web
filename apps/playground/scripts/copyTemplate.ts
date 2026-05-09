import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAYER_TEMPLATE_DIR } from '@rutan/rpgmaker-vxace-web-player-template';

// PLAYER_TEMPLATE_DIR の中身を ./public/template にコピーするスクリプト
async function copyTemplate() {
  const templateOutDir = fileURLToPath(new URL('../public/template/', import.meta.url));

  await rm(templateOutDir, { recursive: true, force: true });
  await mkdir(templateOutDir, { recursive: true });
  await cp(PLAYER_TEMPLATE_DIR, templateOutDir, { recursive: true });
  await injectPlaygroundBootstrap(templateOutDir);

  console.log(`Copied player template: ${PLAYER_TEMPLATE_DIR} -> ${templateOutDir}`);
}

await copyTemplate();

async function injectPlaygroundBootstrap(templateOutDir: string) {
  const indexPath = join(templateOutDir, 'index.html');
  const html = await readFile(indexPath, 'utf8');
  const injectedHtml = html.replace(
    '<!-- USER-SCRIPT -->',
    '<script src="../playground-bootstrap.js"></script>\n    <!-- USER-SCRIPT -->',
  );

  await writeFile(indexPath, injectedHtml, 'utf8');
}
