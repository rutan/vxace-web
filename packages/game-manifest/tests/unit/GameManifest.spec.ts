import { describe, expect, test } from 'vitest';
import { GameManifest } from '../../src';

const manifestJson = {
  version: 1,
  id: 'com.example.demo-game',
  metadata: {
    title: 'Demo Game',
    screen: {
      width: 640,
      height: 480,
    },
    input: {
      virtualGamepad: 'normal',
    },
  },
  resources: {
    'graphics/characters/hero': [
      {
        type: 'image',
        extension: 'png',
        logicalPath: 'Graphics/Characters/Hero',
        data: {
          kind: 'file',
          path: 'Graphics/Characters/Hero.png',
        },
      },
      {
        type: 'image',
        extension: 'jpg',
        logicalPath: 'Graphics/Characters/Hero',
        data: {
          kind: 'file',
          path: 'Graphics/Characters/Hero.jpg',
        },
      },
    ],
    'data/actors': [
      {
        type: 'data',
        extension: 'rvdata2',
        logicalPath: 'Data/Actors',
        data: {
          kind: 'file',
          path: 'Data/Actors.rvdata2',
        },
      },
    ],
    'data/classes': [
      {
        type: 'data',
        extension: 'rvdata2',
        logicalPath: 'Data/Classes',
        data: {
          kind: 'pack',
          packId: 'pack-000',
          offset: 8,
          length: 16,
          byteLength: 16,
          sha256: 'resource-hash',
        },
      },
    ],
    'graphics/characters/が': [
      {
        type: 'image',
        extension: 'png',
        logicalPath: 'Graphics/Characters/が',
        data: {
          kind: 'file',
          path: '__vxace-assets/image/1234567890abcdef.png',
        },
      },
    ],
  },
  packs: {
    'pack-000': {
      path: '__vxace-packs/pack-000.bin',
      byteLength: 24,
      sha256: 'pack-hash',
    },
  },
  fonts: [
    {
      data: {
        kind: 'file',
        path: 'Fonts/VL Gothic.ttf',
      },
      extension: 'ttf',
      families: ['VL Gothic', 'VLGothic'],
      style: 'normal',
      weight: '400',
    },
    {
      data: {
        kind: 'file',
        path: 'Fonts/Unused.ttf',
      },
      extension: 'ttf',
      families: ['Unused Font'],
      style: 'normal',
      weight: '400',
    },
  ],
};

describe('GameManifest', () => {
  test('creates a manifest from JSON and resolves resources', () => {
    const manifest = GameManifest.fromJson('/demo/', manifestJson);

    expect(manifest.gameDir).toBe('demo');
    expect(manifest.id).toBe('com.example.demo-game');
    expect(manifest.metadata.title).toBe('Demo Game');
    expect(manifest.screen).toEqual({ width: 640, height: 480 });
    expect(manifest.resolveAsset('demo/Graphics/Characters/Hero.jpg', 'image')?.data).toMatchObject({
      kind: 'file',
      path: 'Graphics/Characters/Hero.jpg',
    });
    expect(manifest.resolveAsset('Graphics/Characters/Hero.bmp', 'image')?.data).toMatchObject({
      kind: 'file',
      path: 'Graphics/Characters/Hero.png',
    });
    expect(manifest.resolveResource('Graphics/Characters/Hero.bmp')).toBeNull();
    expect(manifest.resolveResource('Data/Actors.rvdata2')?.data).toMatchObject({
      kind: 'file',
      path: 'Data/Actors.rvdata2',
    });
    expect(manifest.resolveResource('Data/Classes.rvdata2')?.data).toMatchObject({
      kind: 'pack',
      packId: 'pack-000',
      offset: 8,
      length: 16,
    });
    expect(manifest.getPack('pack-000')).toMatchObject({
      path: '__vxace-packs/pack-000.bin',
      byteLength: 24,
    });
  });

  test('resolves Japanese logical paths to safe asset paths with NFC lookup normalization', () => {
    const manifest = GameManifest.fromJson('demo', manifestJson);

    expect(manifest.resolveAsset('Graphics/Characters/が', 'image')?.data).toMatchObject({
      kind: 'file',
      path: '__vxace-assets/image/1234567890abcdef.png',
    });
  });

  test('creates an empty manifest', () => {
    const manifest = GameManifest.empty('missing');

    expect(manifest.gameDir).toBe('missing');
    expect(manifest.id).toBe('local:missing');
    expect(manifest.screen).toEqual({ width: 544, height: 416 });
    expect(manifest.resolveAsset('Graphics/Characters/Hero', 'image')).toBeNull();
    expect(manifest.resolveFontFamilies(['VL Gothic'])).toEqual([]);
  });

  test('normalizes font lookup and preserves manifest font order', () => {
    const manifest = GameManifest.fromJson('demo', manifestJson);

    expect(manifest.fontExists('  vl   gothic ')).toBe(true);
    expect(manifest.fontExists('missing')).toBe(false);
    expect(manifest.resolveFontFamilies(['vl gothic', 'VLGothic', 'Unused Font'])).toEqual([
      'VL Gothic',
      'VLGothic',
      'Unused Font',
    ]);
    expect(manifest.resolveFontFamilies(['missing'])).toEqual(['VL Gothic']);
  });

  test('rejects missing or invalid manifest id values', () => {
    expect(() => GameManifest.fromJson('demo', { ...manifestJson, id: undefined })).toThrow();
    expect(() => GameManifest.fromJson('demo', { ...manifestJson, id: 'invalid/id' })).toThrow();
    expect(() => GameManifest.fromJson('demo', { ...manifestJson, id: '' })).toThrow();
    expect(() => GameManifest.fromJson('demo', { ...manifestJson, id: `a${'b'.repeat(128)}` })).toThrow();
  });
});
