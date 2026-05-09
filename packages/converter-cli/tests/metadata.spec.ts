import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import type { CliOptions } from '../src/args';
import { readGameIniTitle, resolveMetadata } from '../src/metadata';

const temporaryRoots: string[] = [];

describe('metadata', () => {
  afterEach(async () => {
    await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  test('reads the title from Game.ini', async () => {
    const root = await createTemporaryRoot();
    await fs.writeFile(path.join(root, 'Game.ini'), '; comment\n[Game]\nTitle = Fixture Game\n');

    await expect(readGameIniTitle(root)).resolves.toBe('Fixture Game');
  });

  test('reads Shift_JIS Game.ini titles', async () => {
    const root = await createTemporaryRoot();
    const content = Buffer.from([
      0x5b, 0x47, 0x61, 0x6d, 0x65, 0x5d, 0x0a, 0x54, 0x69, 0x74, 0x6c, 0x65, 0x3d, 0x83, 0x65, 0x83, 0x58, 0x83, 0x67,
      0x0a,
    ]);
    await fs.writeFile(path.join(root, 'Game.ini'), content);

    await expect(readGameIniTitle(root)).resolves.toBe('テスト');
  });

  test('resolves metadata defaults', async () => {
    const root = await createTemporaryRoot();
    await fs.writeFile(path.join(root, 'Game.ini'), '[Game]\nTitle=Fixture Game\n');

    const result = await resolveMetadata({
      ...baseOptions,
      srcDir: root,
      gameId: 'com.example.fixture',
    });

    expect(result.gameId).toBe('com.example.fixture');
    expect(result.metadata).toEqual({
      title: 'Fixture Game',
      screen: {
        width: 544,
        height: 416,
      },
      input: {
        virtualGamepad: 'normal',
      },
    });
    expect(result.warnings).toHaveLength(0);
  });

  test('rejects missing game id', async () => {
    const root = await createTemporaryRoot();

    await expect(
      resolveMetadata({
        ...baseOptions,
        srcDir: root,
      }),
    ).rejects.toThrow('--game-id is required');
  });
});

const baseOptions: CliOptions = {
  srcDir: '',
  outDir: '',
  virtualGamepad: 'normal',
  packAssets: false,
  gameDirName: 'game',
  includeTemplate: true,
  injectHtmlFiles: [],
  dryRun: false,
  json: false,
  clean: false,
  failOnWarning: false,
};

const createTemporaryRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vxace-cli-metadata-'));
  temporaryRoots.push(root);
  return root;
};
