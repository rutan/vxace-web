import { describe, expect, test } from 'vitest';
import { convertGameInBrowser, createBrowserFileSource } from '../../src/browser';

describe('browser converter', () => {
  test('excludes generated converter output from browser input files', async () => {
    const source = createBrowserFileSource([
      inputFile('Game.ini', '[Game]\nTitle=Fixture\n'),
      inputFile('Graphics/Characters/Hero.png', 'hero image'),
      inputFile('manifest.json', '{}'),
      inputFile('__vxace-assets/image/generated.png', 'generated safe asset'),
      inputFile('__vxace-packs/pack-000.bin', 'generated pack'),
    ]);

    await expect(source.listFiles()).resolves.toEqual({
      files: ['Game.ini', 'Graphics/Characters/Hero.png'],
      ignoredFiles: ['__vxace-assets/', '__vxace-packs/', 'manifest.json'],
    });
  });

  test('excludes generated manifest regardless of browser input casing', async () => {
    const source = createBrowserFileSource([
      inputFile('Game.ini', '[Game]\nTitle=Fixture\n'),
      inputFile('Graphics/Characters/Hero.png', 'hero image'),
      inputFile('Manifest.json', '{}'),
    ]);

    await expect(source.listFiles()).resolves.toEqual({
      files: ['Game.ini', 'Graphics/Characters/Hero.png'],
      ignoredFiles: ['Manifest.json'],
    });
  });

  test('does not materialize generated converter output into the browser conversion result', async () => {
    const result = await convertGameInBrowser({
      files: [
        inputFile('Game.ini', '[Game]\nTitle=Fixture\n'),
        inputFile('Graphics/Characters/Hero.png', 'hero image'),
        inputFile('manifest.json', '{}'),
        inputFile('__vxace-assets/image/generated.png', 'generated safe asset'),
        inputFile('__vxace-packs/pack-000.bin', 'generated pack'),
      ],
      gameId: 'com.example.fixture',
      metadata: {
        title: 'Fixture',
        screen: {
          width: 544,
          height: 416,
        },
        input: {
          virtualGamepad: 'none',
        },
      },
    });

    expect(result.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: '__vxace-assets/',
          action: 'ignored',
        }),
        expect.objectContaining({
          sourcePath: '__vxace-packs/',
          action: 'ignored',
        }),
        expect.objectContaining({
          sourcePath: 'manifest.json',
          action: 'ignored',
        }),
      ]),
    );
    expect(result.files).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: '__vxace-assets/image/generated.png',
          action: 'copied',
        }),
        expect.objectContaining({
          sourcePath: '__vxace-packs/pack-000.bin',
          action: 'copied',
        }),
        expect.objectContaining({
          sourcePath: 'manifest.json',
          action: 'copied',
        }),
      ]),
    );
  });
});

const inputFile = (path: string, content: string) => {
  return {
    path,
    file: new Blob([content]),
  };
};
