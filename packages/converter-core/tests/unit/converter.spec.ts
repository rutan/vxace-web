import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { GameManifestJson, ManifestMetadata, ManifestResourceData } from '@rutan/rpgmaker-vxace-web-game-manifest';
import { afterEach, describe, expect, test } from 'vitest';
import { convertGame as convertGamePublic, convertToDistribution, type ConversionReport } from '../../src';
import type { SourceFileOmissionReport, UnusedAssetReport } from '../../src/internal/buildSourcePlan';
import { convertGameCore } from '../../src/internal/convertGameCore';

const temporaryRoots: string[] = [];

type InternalConversionReport = ConversionReport & {
  manifest: GameManifestJson;
  sourceFileOmissionReport?: SourceFileOmissionReport;
  unusedAssetReport?: UnusedAssetReport;
  game: ConversionReport['game'] & {
    manifest: GameManifestJson;
  };
};

const convertGame = async (options: Parameters<typeof convertGameCore>[0]): Promise<InternalConversionReport> => {
  const result = await convertGameCore(options);
  return {
    ...result.report,
    manifest: result.manifest,
    game: {
      ...result.report.game,
      manifest: result.manifest,
    },
    ...(result.sourceFileOmissionReport ? { sourceFileOmissionReport: result.sourceFileOmissionReport } : {}),
    ...(result.unusedAssetReport ? { unusedAssetReport: result.unusedAssetReport } : {}),
  };
};

const internalReport = (result: InternalConversionReport): InternalConversionReport => {
  return result;
};

const metadata: ManifestMetadata = {
  title: 'Fixture',
  screen: {
    width: 544,
    height: 416,
  },
  input: {
    virtualGamepad: 'none',
  },
};

describe('convertGame', () => {
  afterEach(async () => {
    await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  test('creates a manifest and materializes resources to hashed distribution paths', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    await writeFixtureFile(srcDir, 'Graphics/Characters/主人公.png', 'fake image data');
    await writeFixtureFile(srcDir, 'Graphics/Characters/Hero.png', 'safe image data');
    await writeFixtureFile(srcDir, 'Audio/BGM/Theme.wma', 'wma audio data');
    await writeFixtureFile(srcDir, 'Fonts/VL-Gothic-Regular.ttf', 'fake font data');
    await writeFixtureFile(srcDir, 'Fonts/VL-Gothic-Regular-License.txt', 'font license text');
    await writeFixtureFile(srcDir, 'Data/Actors.rvdata2', 'fake data');
    await writeFixtureFile(srcDir, 'Game.exe', 'ignored executable');
    await writeFixtureFile(srcDir, 'GAME.EXE', 'ignored uppercase executable');
    await writeFixtureFile(srcDir, 'Library.dll', 'ignored library');
    await writeFixtureFile(srcDir, 'Game.rvproj2', 'ignored project file');
    await writeFixtureFile(srcDir, 'Game.rgss3a', 'ignored archive');
    await writeFixtureFile(srcDir, 'Thumbs.db', 'ignored thumbnail cache');
    await writeFixtureFile(srcDir, '.DS_Store', 'ignored macos metadata');
    await writeFixtureFile(srcDir, 'desktop.ini', 'ignored windows metadata');
    await writeFixtureFile(srcDir, '.git/config', 'ignored vcs metadata');

    const result = await convertGame({
      srcDir,
      outDir,
      gameId: 'com.example.fixture',
      metadata,
    });

    const unsafeCandidate = internalReport(result).manifest.resources['graphics/characters/主人公']?.[0];
    expect(unsafeCandidate).toMatchObject({
      type: 'image',
      extension: 'png',
      logicalPath: 'Graphics/Characters/主人公',
    });
    expect(unsafeCandidate).not.toHaveProperty('sourcePath');
    expect(unsafeCandidate).not.toHaveProperty('path');
    const unsafePath = getFileDataPath(unsafeCandidate?.data);
    expect(unsafePath).toMatch(/^__vxace-assets\/image\/[a-f0-9]{16}\.png$/);
    await expect(fs.readFile(path.join(outDir, unsafePath ?? ''), 'utf8')).resolves.toBe('fake image data');
    await expect(fs.access(path.join(outDir, 'Graphics/Characters/主人公.png'))).rejects.toThrow();

    expect(result.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: 'Graphics/Characters/主人公.png',
          action: 'renamed',
          reason: 'browser-safe-path',
        }),
      ]),
    );
    expect(result.files).not.toEqual(
      expect.arrayContaining([
        {
          sourcePath: 'Graphics/Characters/主人公.png',
          outputPath: 'Graphics/Characters/主人公.png',
          action: 'copied',
        },
      ]),
    );

    const heroCandidate = internalReport(result).manifest.resources['graphics/characters/hero']?.[0];
    expect(heroCandidate).toMatchObject({
      type: 'image',
      extension: 'png',
      logicalPath: 'Graphics/Characters/Hero',
    });
    const heroPath = getFileDataPath(heroCandidate?.data);
    expect(heroPath).toMatch(/^__vxace-assets\/image\/[a-f0-9]{16}\.png$/);
    await expect(fs.readFile(path.join(outDir, heroPath ?? ''), 'utf8')).resolves.toBe('safe image data');
    await expect(fs.access(path.join(outDir, 'Graphics/Characters/Hero.png'))).rejects.toThrow();

    const dataCandidate = internalReport(result).manifest.resources['data/actors']?.[0];
    expect(dataCandidate).toMatchObject({
      type: 'data',
      extension: 'rvdata2',
      logicalPath: 'Data/Actors',
    });
    const dataPath = getFileDataPath(dataCandidate?.data);
    expect(dataPath).toMatch(/^__vxace-assets\/data\/[a-f0-9]{16}\.rvdata2$/);
    await expect(fs.readFile(path.join(outDir, dataPath ?? ''), 'utf8')).resolves.toBe('fake data');
    await expect(fs.access(path.join(outDir, 'Data/Actors.rvdata2'))).rejects.toThrow();

    const audioCandidate = internalReport(result).manifest.resources['audio/bgm/theme']?.[0];
    expect(audioCandidate).toMatchObject({
      type: 'audio',
      extension: 'wma',
      logicalPath: 'Audio/BGM/Theme',
    });
    const audioPath = getFileDataPath(audioCandidate?.data);
    expect(audioPath).toMatch(/^__vxace-assets\/audio\/[a-f0-9]{16}\.wma$/);
    await expect(fs.readFile(path.join(outDir, audioPath ?? ''), 'utf8')).resolves.toBe('wma audio data');
    await expect(fs.access(path.join(outDir, 'Audio/BGM/Theme.wma'))).rejects.toThrow();

    expect(internalReport(result).manifest.fonts[0]).toMatchObject({
      data: {
        kind: 'file',
        path: expect.stringMatching(/^__vxace-assets\/font\/[a-f0-9]{16}\.ttf$/),
      },
      extension: 'ttf',
      style: 'normal',
      weight: '400',
    });
    expect(internalReport(result).manifest.fonts[0]?.families).toContain('VL Gothic');
    await expect(
      fs.readFile(path.join(outDir, getFileDataPath(internalReport(result).manifest.fonts[0]?.data) ?? ''), 'utf8'),
    ).resolves.toBe('fake font data');
    await expect(fs.access(path.join(outDir, 'Fonts/VL-Gothic-Regular.ttf'))).rejects.toThrow();
    await expect(fs.readFile(path.join(outDir, 'Fonts/VL-Gothic-Regular-License.txt'), 'utf8')).resolves.toBe(
      'font license text',
    );
    expect(internalReport(result).manifest.resources['fonts/vl-gothic-regular-license']).toBeUndefined();
    expect(result.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: 'Fonts/VL-Gothic-Regular-License.txt',
          outputPath: 'Fonts/VL-Gothic-Regular-License.txt',
          action: 'copied',
          type: 'file',
        }),
      ]),
    );
    expect(result.files).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: 'Fonts/VL-Gothic-Regular-License.txt',
          action: 'renamed',
          reason: 'browser-safe-path',
        }),
      ]),
    );
    await expect(fs.access(path.join(outDir, 'Game.exe'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'GAME.EXE'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Library.dll'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Game.rvproj2'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Game.rgss3a'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Thumbs.db'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, '.DS_Store'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'desktop.ini'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, '.git/config'))).rejects.toThrow();
    expect(internalReport(result).manifest.resources.game?.map((candidate) => candidate.extension)).toEqual(['ini']);
    expect(internalReport(result).manifest.resources.game?.[0]?.data).toMatchObject({
      kind: 'file',
      path: 'Game.ini',
    });
    await expect(fs.readFile(path.join(outDir, 'Game.ini'), 'utf8')).resolves.toBe('[Game]\nTitle=Fixture\n');
    expect(internalReport(result).manifest.resources.library).toBeUndefined();
    expect(internalReport(result).manifest.resources.thumbs).toBeUndefined();
    expect(internalReport(result).manifest.resources['.ds_store']).toBeUndefined();
    expect(internalReport(result).manifest.resources['desktop']).toBeUndefined();

    const writtenManifest = JSON.parse(await fs.readFile(path.join(outDir, 'manifest.json'), 'utf8'));
    expect(writtenManifest).toEqual(internalReport(result).manifest);
    expect(result.files.some((file) => file.action === 'renamed' && file.reason === 'browser-safe-path')).toBe(true);
    expect(internalReport(result).unusedAssetReport).toBeUndefined();
    expect(result.warnings).toEqual([]);
  });

  test('does not write files on dry run', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    await writeFixtureFile(srcDir, 'Graphics/Characters/主人公.png', 'fake image data');

    const result = await convertGame({
      srcDir,
      outDir,
      gameId: 'com.example.fixture',
      metadata,
      dryRun: true,
    });

    expect(getFileDataPath(internalReport(result).manifest.resources['graphics/characters/主人公']?.[0]?.data)).toMatch(
      /^__vxace-assets\/image\/[a-f0-9]{16}\.png$/,
    );
    expect(result.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: 'Graphics/Characters/主人公.png',
          action: 'renamed',
          reason: 'browser-safe-path',
        }),
      ]),
    );
    expect(result.files).not.toEqual(
      expect.arrayContaining([
        {
          sourcePath: 'Graphics/Characters/主人公.png',
          outputPath: 'Graphics/Characters/主人公.png',
          action: 'copied',
        },
      ]),
    );
    expect(result.files.some((file) => file.action === 'copied')).toBe(true);
    expect(result.files.some((file) => file.action === 'renamed' && file.reason === 'browser-safe-path')).toBe(true);
    await expect(fs.access(outDir)).rejects.toThrow();
  });

  test('does not expose internal report fields from the public API', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();

    const result = await convertGamePublic({
      srcDir,
      outDir,
      gameId: 'com.example.fixture',
      metadata,
      dryRun: true,
    });

    expect(result).not.toHaveProperty('manifest');
    expect(result).not.toHaveProperty('sourceFileOmissionReport');
    expect(result).not.toHaveProperty('unusedAssetReport');
    expect(result.game).not.toHaveProperty('manifest');
  });

  test('excludes source files before manifest generation and unused asset omission', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    await copyFixtureDirectory(
      path.resolve(import.meta.dirname, '../../../../example/minimal/Data'),
      path.join(srcDir, 'Data'),
    );
    await writeFixtureFile(srcDir, 'Save01.rvdata2', 'save data');
    await writeFixtureFile(srcDir, 'Profile/slot.dat', 'custom save data');
    await writeFixtureFile(srcDir, 'Graphics/Pictures/Kept.png', 'excluded before unused keep');
    await writeFixtureFile(srcDir, 'notes.txt', 'kept source file');

    const result = await convertGame({
      srcDir,
      outDir,
      gameId: 'com.example.fixture',
      metadata,
      excludeSourceFiles: {
        patterns: ['Save*.rvdata2', 'Profile/**', 'Graphics/Pictures/**'],
      },
      omitUnusedAssets: {
        keepPatterns: ['Graphics/Pictures/**'],
      },
    });

    expect(internalReport(result).sourceFileOmissionReport).toEqual({
      omittedFiles: ['Graphics/Pictures/Kept.png', 'Profile/slot.dat', 'Save01.rvdata2'],
      omittedByPattern: ['Graphics/Pictures/Kept.png', 'Profile/slot.dat', 'Save01.rvdata2'],
      warnings: [],
    });
    expect(result.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: 'Save01.rvdata2',
          outputPath: null,
          action: 'omitted',
          reason: 'source-exclude-pattern',
          type: 'file',
        }),
        expect.objectContaining({
          sourcePath: 'Profile/slot.dat',
          outputPath: null,
          action: 'omitted',
          reason: 'source-exclude-pattern',
          type: 'file',
        }),
        expect.objectContaining({
          sourcePath: 'Graphics/Pictures/Kept.png',
          outputPath: null,
          action: 'omitted',
          reason: 'source-exclude-pattern',
          type: 'image',
        }),
      ]),
    );
    expect(internalReport(result).unusedAssetReport?.keptByPattern).not.toContain('Graphics/Pictures/Kept.png');
    expect(internalReport(result).manifest.resources.save01).toBeUndefined();
    expect(internalReport(result).manifest.resources['profile/slot']).toBeUndefined();
    expect(internalReport(result).manifest.resources['graphics/pictures/kept']).toBeUndefined();

    await expect(fs.access(path.join(outDir, 'Save01.rvdata2'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Profile/slot.dat'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Graphics/Pictures/Kept.png'))).rejects.toThrow();
    const notesPath = getFileDataPath(internalReport(result).manifest.resources.notes?.[0]?.data);
    await expect(fs.readFile(path.join(outDir, notesPath ?? ''), 'utf8')).resolves.toBe('kept source file');
  });

  test('keeps required source files even when excludeSourceFiles matches them', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();

    const result = await convertGame({
      srcDir,
      outDir,
      gameId: 'com.example.fixture',
      metadata,
      dryRun: true,
      excludeSourceFiles: {
        patterns: ['Game.ini'],
      },
    });

    expect(internalReport(result).sourceFileOmissionReport).toMatchObject({
      omittedFiles: [],
      warnings: [
        expect.objectContaining({
          code: 'required-source-file-exclude-ignored',
        }),
      ],
    });
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'required-source-file-exclude-ignored',
      }),
    ]);
    expect(internalReport(result).manifest.resources.game?.[0]?.data).toMatchObject({
      kind: 'file',
      path: 'Game.ini',
    });
  });

  test('packs image and data assets without packing audio when packAssets is enabled', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    await writeFixtureFile(srcDir, 'Graphics/Characters/Hero.png', 'safe image data');
    await writeFixtureFile(srcDir, 'Graphics/Characters/主人公.png', 'unsafe image data');
    await writeFixtureFile(srcDir, 'Data/Actors.rvdata2', 'actor data');
    await writeFixtureFile(srcDir, 'Audio/BGM/Theme.ogg', 'audio data');
    await writeFixtureFile(srcDir, 'Fonts/VL-Gothic-Regular.ttf', 'font data');
    await writeFixtureFile(srcDir, 'Movies/Opening.webm', 'movie data');

    const result = await convertGame({
      srcDir,
      outDir,
      gameId: 'com.example.fixture',
      metadata,
      packAssets: true,
    });

    const pack = internalReport(result).manifest.packs['pack-000'];
    expect(pack).toMatchObject({
      path: '__vxace-packs/pack-000.bin',
      byteLength: expect.any(Number),
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });

    const packedImage = internalReport(result).manifest.resources['graphics/characters/hero']?.[0];
    const packedUnsafeImage = internalReport(result).manifest.resources['graphics/characters/主人公']?.[0];
    const audio = internalReport(result).manifest.resources['audio/bgm/theme']?.[0];
    const packedData = internalReport(result).manifest.resources['data/actors']?.[0];
    expect(packedImage?.data).toMatchObject({
      kind: 'pack',
      packId: 'pack-000',
      length: 'safe image data'.length,
      contentType: 'image/png',
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(packedUnsafeImage?.data).toMatchObject({
      kind: 'pack',
      packId: 'pack-000',
      length: 'unsafe image data'.length,
      contentType: 'image/png',
    });
    expect(audio?.data).toMatchObject({
      kind: 'file',
      path: expect.stringMatching(/^__vxace-assets\/audio\/[a-f0-9]{16}\.ogg$/),
    });
    expect(packedData?.data).toMatchObject({
      kind: 'pack',
      packId: 'pack-000',
      length: 'actor data'.length,
      contentType: 'application/octet-stream',
    });

    const packBytes = await fs.readFile(path.join(outDir, pack.path));
    expect(readPackedText(packBytes, packedImage?.data)).toBe('safe image data');
    expect(readPackedText(packBytes, packedUnsafeImage?.data)).toBe('unsafe image data');
    expect(readPackedText(packBytes, packedData?.data)).toBe('actor data');
    await expect(fs.access(path.join(outDir, 'Graphics/Characters/Hero.png'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Graphics/Characters/主人公.png'))).rejects.toThrow();
    expect(internalReport(result).manifest.fonts[0]?.data).toMatchObject({
      kind: 'file',
      path: expect.stringMatching(/^__vxace-assets\/font\/[a-f0-9]{16}\.ttf$/),
    });
    const packedModeMoviePath = getFileDataPath(internalReport(result).manifest.resources['movies/opening']?.[0]?.data);
    const audioPath = getFileDataPath(audio?.data);
    expect(packedModeMoviePath).toMatch(/^__vxace-assets\/movie\/[a-f0-9]{16}\.webm$/);
    expect(audioPath).toMatch(/^__vxace-assets\/audio\/[a-f0-9]{16}\.ogg$/);
    await expect(
      fs.readFile(path.join(outDir, getFileDataPath(internalReport(result).manifest.fonts[0]?.data) ?? ''), 'utf8'),
    ).resolves.toBe('font data');
    await expect(fs.readFile(path.join(outDir, audioPath ?? ''), 'utf8')).resolves.toBe('audio data');
    await expect(fs.readFile(path.join(outDir, packedModeMoviePath ?? ''), 'utf8')).resolves.toBe('movie data');
    await expect(fs.access(path.join(outDir, 'Audio/BGM/Theme.ogg'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Fonts/VL-Gothic-Regular.ttf'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Movies/Opening.webm'))).rejects.toThrow();
    expect(result.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: null,
          outputPath: '__vxace-packs/pack-000.bin',
          action: 'generated',
          reason: 'generated',
        }),
      ]),
    );
    expect(result.packs).toEqual([
      expect.objectContaining({
        id: 'pack-000',
        path: '__vxace-packs/pack-000.bin',
        entries: expect.arrayContaining([
          expect.objectContaining({
            sourcePath: 'Graphics/Characters/Hero.png',
            logicalPath: 'Graphics/Characters/Hero',
            type: 'image',
          }),
          expect.objectContaining({
            sourcePath: 'Data/Actors.rvdata2',
            logicalPath: 'Data/Actors',
            type: 'data',
          }),
        ]),
      }),
    ]);
  });

  test('reports ambiguous candidates without writing to console', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    await writeFixtureFile(srcDir, 'Graphics/Characters/Hero.png', 'fake image data 1');
    await writeFixtureFile(srcDir, 'Graphics/Characters/hero.png', 'fake image data 2');

    const result = await convertGame({
      srcDir,
      outDir,
      gameId: 'com.example.fixture',
      metadata,
      dryRun: true,
    });

    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'normalized-source-path-collision',
      }),
      expect.objectContaining({
        code: 'ambiguous-resource-candidates',
      }),
    ]);
  });

  test('previews unused asset omission on dry run without writing output files', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    await copyFixtureDirectory(
      path.resolve(import.meta.dirname, '../../../../example/minimal/Data'),
      path.join(srcDir, 'Data'),
    );
    await writeFixtureFile(srcDir, 'Graphics/System/IconSet.png', 'referenced system image');
    await writeFixtureFile(srcDir, 'Graphics/Characters/Unused.png', 'unused image');
    await writeFixtureFile(srcDir, 'Graphics/Pictures/Kept.png', 'kept image');
    await writeFixtureFile(srcDir, 'Audio/SE/KeptSe.ogg', 'kept audio');
    await writeFixtureFile(srcDir, 'Fonts/UnusedFont.ttf', 'not a pruning target');

    const result = await convertGame({
      srcDir,
      outDir,
      gameId: 'com.example.fixture',
      metadata,
      dryRun: true,
      omitUnusedAssets: {
        keepPatterns: ['', 'Graphics/Pictures/**', 'Audio/SE/KeptSe'],
      },
    });

    expect(internalReport(result).unusedAssetReport).toMatchObject({
      referencedLogicalPaths: expect.arrayContaining(['Graphics/System/IconSet']),
      referencedAssets: expect.arrayContaining(['Graphics/System/IconSet.png']),
      unusedAssets: expect.arrayContaining(['Graphics/Characters/Unused.png']),
      keptByPattern: expect.arrayContaining(['Audio/SE/KeptSe.ogg', 'Graphics/Pictures/Kept.png']),
      warnings: expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid-unused-asset-keep-pattern',
        }),
      ]),
    });
    expect(internalReport(result).unusedAssetReport?.unusedAssets).not.toContain('Graphics/Pictures/Kept.png');
    expect(internalReport(result).unusedAssetReport?.unusedAssets).not.toContain('Audio/SE/KeptSe.ogg');
    expect(internalReport(result).unusedAssetReport?.unusedAssets).not.toContain('Fonts/UnusedFont.ttf');

    const keptPath = getFileDataPath(internalReport(result).manifest.resources['graphics/pictures/kept']?.[0]?.data);
    expect(internalReport(result).manifest.resources['graphics/characters/unused']).toBeUndefined();
    expect(keptPath).toMatch(/^__vxace-assets\/image\/[a-f0-9]{16}\.png$/);
    await expect(fs.access(outDir)).rejects.toThrow();
  });

  test('omits unused assets from output and manifest', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    await copyFixtureDirectory(
      path.resolve(import.meta.dirname, '../../../../example/minimal/Data'),
      path.join(srcDir, 'Data'),
    );
    await writeFixtureFile(srcDir, 'Graphics/System/IconSet.png', 'referenced system image');
    await writeFixtureFile(srcDir, 'Graphics/Characters/Unused.png', 'unused image');
    await writeFixtureFile(srcDir, 'Graphics/Characters/未使用.png', 'unused unsafe image');
    await writeFixtureFile(srcDir, 'Graphics/Pictures/Kept.png', 'kept image');
    await writeFixtureFile(srcDir, 'Fonts/UnusedFont.ttf', 'not a pruning target');
    await writeFixtureFile(srcDir, 'notes.txt', 'not a pruning target');

    const result = await convertGame({
      srcDir,
      outDir,
      gameId: 'com.example.fixture',
      metadata,
      omitUnusedAssets: {
        keepPatterns: ['Graphics/Pictures/**'],
      },
    });

    expect(internalReport(result).unusedAssetReport).toMatchObject({
      referencedAssets: expect.arrayContaining(['Graphics/System/IconSet.png']),
      unusedAssets: expect.arrayContaining(['Graphics/Characters/Unused.png', 'Graphics/Characters/未使用.png']),
      keptByPattern: ['Graphics/Pictures/Kept.png'],
      missingReferences: expect.arrayContaining(['Graphics/System/Balloon']),
    });

    expect(result.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: 'Graphics/Characters/Unused.png',
          outputPath: null,
          action: 'omitted',
          reason: 'unused-asset',
          type: 'image',
        }),
        expect.objectContaining({
          sourcePath: 'Graphics/Characters/未使用.png',
          outputPath: null,
          action: 'omitted',
          reason: 'unused-asset',
          type: 'image',
        }),
      ]),
    );
    expect(result.files).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: 'Graphics/Characters/未使用.png',
          action: 'renamed',
          reason: 'browser-safe-path',
        }),
      ]),
    );

    await expect(fs.access(path.join(outDir, 'Graphics/Characters/Unused.png'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Graphics/Characters/未使用.png'))).rejects.toThrow();
    const keptPath = getFileDataPath(internalReport(result).manifest.resources['graphics/pictures/kept']?.[0]?.data);
    const fontPath = getFileDataPath(internalReport(result).manifest.resources['fonts/unusedfont']?.[0]?.data);
    const notesPath = getFileDataPath(internalReport(result).manifest.resources.notes?.[0]?.data);
    const actorsPath = getFileDataPath(internalReport(result).manifest.resources['data/actors']?.[0]?.data);
    await expect(fs.readFile(path.join(outDir, keptPath ?? ''), 'utf8')).resolves.toBe('kept image');
    await expect(fs.readFile(path.join(outDir, fontPath ?? ''), 'utf8')).resolves.toBe('not a pruning target');
    await expect(fs.readFile(path.join(outDir, notesPath ?? ''), 'utf8')).resolves.toBe('not a pruning target');
    await expect(fs.readFile(path.join(outDir, actorsPath ?? ''))).resolves.toBeInstanceOf(Buffer);
    await expect(fs.access(path.join(outDir, 'Graphics/Pictures/Kept.png'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Fonts/UnusedFont.ttf'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'notes.txt'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'Data/Actors.rvdata2'))).rejects.toThrow();

    expect(internalReport(result).manifest.resources['graphics/characters/unused']).toBeUndefined();
    expect(internalReport(result).manifest.resources['graphics/characters/未使用']).toBeUndefined();
    expect(keptPath).toMatch(/^__vxace-assets\/image\/[a-f0-9]{16}\.png$/);
    expect(fontPath).toMatch(/^__vxace-assets\/font\/[a-f0-9]{16}\.ttf$/);
  });

  test('rejects output directories inside the source directory', async () => {
    const srcDir = await createTemporaryGameRoot();

    await expect(
      convertGame({
        srcDir,
        outDir: path.join(srcDir, 'dist'),
        gameId: 'com.example.fixture',
        metadata,
      }),
    ).rejects.toThrow('outDir must be outside srcDir');
  });
});

describe('convertToDistribution', () => {
  afterEach(async () => {
    await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  test('copies the player template and writes converted game files under game', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    const templateDir = await createTemporaryTemplateRoot();
    await writeFixtureFile(srcDir, 'Graphics/Characters/Hero.png', 'safe image data');

    const result = await convertToDistribution({
      srcDir,
      outDir,
      templateDir,
      gameId: 'com.example.fixture',
      metadata,
    });

    await expect(fs.readFile(path.join(outDir, 'index.html'), 'utf8')).resolves.toBe('<!doctype html>\n');
    await expect(fs.readFile(path.join(outDir, 'assets/runtime.js'), 'utf8')).resolves.toBe('runtime\n');
    await expect(fs.readFile(path.join(outDir, 'game/Game.ini'), 'utf8')).resolves.toBe('[Game]\nTitle=Fixture\n');
    const writtenManifest = JSON.parse(
      await fs.readFile(path.join(outDir, 'game/manifest.json'), 'utf8'),
    ) as GameManifestJson;
    const heroPath = getFileDataPath(writtenManifest.resources['graphics/characters/hero']?.[0]?.data);
    expect(heroPath).toMatch(/^__vxace-assets\/image\/[a-f0-9]{16}\.png$/);
    await expect(fs.readFile(path.join(outDir, 'game', heroPath ?? ''), 'utf8')).resolves.toBe('safe image data');
    await expect(fs.access(path.join(outDir, 'game/Graphics/Characters/Hero.png'))).rejects.toThrow();

    expect(result.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: 'index.html',
          outputPath: 'index.html',
          action: 'copied',
          type: 'template',
        }),
        expect.objectContaining({
          sourcePath: 'Graphics/Characters/Hero.png',
          outputPath: `game/${heroPath}`,
          action: 'renamed',
          type: 'image',
        }),
        expect.objectContaining({
          sourcePath: null,
          outputPath: 'game/manifest.json',
          action: 'generated',
          type: 'manifest',
        }),
      ]),
    );
    expect(result.warnings).toEqual([]);
  });

  test('injects HTML into the player template index marker', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    const templateDir = await createTemporaryTemplateRoot();
    await writeFixtureFile(templateDir, 'index.html', '<head>\n<!-- USER-SCRIPT -->\n</head>\n');

    await convertToDistribution({
      srcDir,
      outDir,
      templateDir,
      gameId: 'com.example.fixture',
      metadata,
      injectHtml: ['<script src="analytics.js"></script>', '<meta name="demo" content="fixture" />'],
    });

    await expect(fs.readFile(path.join(outDir, 'index.html'), 'utf8')).resolves.toBe(
      '<head>\n<script src="analytics.js"></script>\n<meta name="demo" content="fixture" />\n</head>\n',
    );
  });

  test('validates HTML injection marker on dry run', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    const templateDir = await createTemporaryTemplateRoot();

    await expect(
      convertToDistribution({
        srcDir,
        outDir,
        templateDir,
        gameId: 'com.example.fixture',
        metadata,
        dryRun: true,
        injectHtml: '<script src="analytics.js"></script>',
      }),
    ).rejects.toThrow('injectHtml marker was not found in player template index.html');
    await expect(fs.access(outDir)).rejects.toThrow();
  });

  test('does not copy template game directory into the distribution', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    const templateDir = await createTemporaryTemplateRoot();
    await writeFixtureFile(templateDir, 'game/placeholder.txt', 'template placeholder');

    await convertToDistribution({
      srcDir,
      outDir,
      templateDir,
      gameId: 'com.example.fixture',
      metadata,
    });

    await expect(fs.access(path.join(outDir, 'game/placeholder.txt'))).rejects.toThrow();
  });

  test('does not write files on dry run', async () => {
    const { srcDir, outDir } = await createTemporaryConversionRoots();
    const templateDir = await createTemporaryTemplateRoot();

    const result = await convertToDistribution({
      srcDir,
      outDir,
      templateDir,
      gameId: 'com.example.fixture',
      metadata,
      dryRun: true,
    });

    expect(result.files.map((file) => file.type)).toContain('template');
    expect(result.files.some((file) => file.type !== 'template')).toBe(true);
    await expect(fs.access(outDir)).rejects.toThrow();
  });
});

const createTemporaryConversionRoots = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vxace-converter-'));
  temporaryRoots.push(root);

  const srcDir = path.join(root, 'src');
  const outDir = path.join(root, 'out');

  await fs.mkdir(srcDir, { recursive: true });
  await fs.writeFile(path.join(srcDir, 'Game.ini'), '[Game]\nTitle=Fixture\n');

  return { srcDir, outDir };
};

const createTemporaryGameRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vxace-converter-game-'));
  temporaryRoots.push(root);
  await fs.writeFile(path.join(root, 'Game.ini'), '[Game]\nTitle=Fixture\n');
  return root;
};

const createTemporaryTemplateRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vxace-converter-template-'));
  temporaryRoots.push(root);

  await writeFixtureFile(root, 'index.html', '<!doctype html>\n');
  await writeFixtureFile(root, 'assets/runtime.js', 'runtime\n');
  await writeFixtureFile(root, 'license.md', 'license\n');

  return root;
};

const writeFixtureFile = async (root: string, relativePath: string, content: string) => {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
};

const readPackedText = (packBytes: Buffer, data: ManifestResourceData | undefined) => {
  if (!data || data.kind !== 'pack') return null;

  return packBytes.subarray(data.offset, data.offset + data.length).toString('utf8');
};

const getFileDataPath = (data: ManifestResourceData | undefined) => {
  if (!data || data.kind !== 'file') return null;

  return data.path;
};

const copyFixtureDirectory = async (source: string, target: string) => {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true });
};
