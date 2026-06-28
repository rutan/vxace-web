import { cp, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAYER_TEMPLATE_DIR } from '@rutan/rpgmaker-vxace-web-player-template';

async function copyTemplate() {
  const publicDir = fileURLToPath(new URL('../public/converter-assets/', import.meta.url));
  const templateOutDir = join(publicDir, 'template');
  const manifestPath = join(publicDir, 'template-manifest.json');

  await mkdir(publicDir, { recursive: true });
  await rm(templateOutDir, { recursive: true, force: true });
  await mkdir(templateOutDir, { recursive: true });
  await cp(PLAYER_TEMPLATE_DIR, templateOutDir, { recursive: true });

  const files = await listFiles(templateOutDir);
  await writeFile(`${manifestPath}.tmp`, `${JSON.stringify({ files }, null, 2)}\n`, 'utf8');
  await rename(`${manifestPath}.tmp`, manifestPath);

  console.log(`Copied player template: ${PLAYER_TEMPLATE_DIR} -> ${templateOutDir}`);
}

const listFiles = async (directory: string, root = directory): Promise<string[]> => {
  const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath, root)));
      continue;
    }

    if (entry.isFile()) files.push(relative(root, absolutePath).replaceAll('\\', '/'));
  }

  return files;
};

await copyTemplate();
