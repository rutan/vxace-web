import { GameManifest } from '@rutan/rpgmaker-vxace-web-game-manifest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { GameAssetProvider } from '../../src/runtime/core/GameAssetProvider';
import { configureResourceFetchAdapter } from '../../src/runtime/utils/fetch';

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
    'data/actors': [
      {
        type: 'data',
        extension: 'rvdata2',
        logicalPath: 'Data/Actors',
        data: {
          kind: 'pack',
          packId: 'pack-000',
          offset: 3,
          length: 5,
          contentType: 'application/octet-stream',
        },
      },
    ],
  },
  packs: {
    'pack-000': {
      path: '__vxace-packs/pack-000.bin',
      byteLength: 10,
    },
  },
  fonts: [],
};

describe('GameAssetProvider', () => {
  afterEach(() => {
    configureResourceFetchAdapter(null);
    vi.restoreAllMocks();
  });

  test('loads slices from packed resources and caches the pack fetch', async () => {
    const manifest = GameManifest.fromJson('demo', manifestJson);
    const provider = new GameAssetProvider(manifest);
    const packBytes = new TextEncoder().encode('0123456789');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(packBytes.slice(0)));

    const resource = provider.resolveResource('Data/Actors.rvdata2');
    expect(resource).not.toBeNull();

    const bytes = await provider.loadBytes(resource!);
    expect(new TextDecoder().decode(bytes)).toBe('34567');
    await expect(provider.loadBase64(resource!)).resolves.toBe(btoa('34567'));
    await expect(provider.loadBlob(resource!)).resolves.toMatchObject({
      size: 5,
      type: 'application/octet-stream',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('demo/__vxace-packs/pack-000.bin', undefined);
  });

  test('loads resources through the configured resource fetch adapter', async () => {
    const manifest = GameManifest.fromJson('demo', manifestJson);
    const provider = new GameAssetProvider(manifest);
    const packBytes = new TextEncoder().encode('abcdefghij');
    const adapterFetch = vi.fn(async () => new Response(packBytes.slice(0)));
    configureResourceFetchAdapter({ fetch: adapterFetch });

    const resource = provider.resolveResource('Data/Actors.rvdata2');
    expect(resource).not.toBeNull();

    const bytes = await provider.loadBytes(resource!);
    expect(new TextDecoder().decode(bytes)).toBe('defgh');
    expect(adapterFetch).toHaveBeenCalledTimes(1);
    expect(adapterFetch).toHaveBeenCalledWith('demo/__vxace-packs/pack-000.bin', undefined, {
      kind: 'data',
      url: 'demo/__vxace-packs/pack-000.bin',
      label: '__vxace-packs/pack-000.bin',
    });
  });
});
