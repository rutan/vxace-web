import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createNodeSource } from '../../src/internal/nodeEnvironment';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

describe('createNodeSource', () => {
  test('checks file existence with metadata instead of reading the file body', async () => {
    const root = await createTemporaryRoot();
    await fs.mkdir(path.join(root, 'Data'), { recursive: true });
    await fs.writeFile(path.join(root, 'Data', 'Map001.rvdata2'), 'map');

    const source = createNodeSource(root);

    await expect(source.fileExists('Data/Map001.rvdata2')).resolves.toBe(true);
    await expect(source.fileExists('Data/Missing.rvdata2')).resolves.toBe(false);
    await expect(source.fileExists('Data')).resolves.toBe(false);
  });
});

const createTemporaryRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vxace-node-source-'));
  temporaryRoots.push(root);
  return root;
};
