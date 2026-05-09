import { afterEach, describe, expect, test, vi } from 'vitest';
import { loadGameManifest } from '../../src/runtime/core/GameManifest';

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
  resources: {},
  packs: {},
  fonts: [],
};

describe('loadGameManifest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('loads a runtime manifest over fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(responseFromJson(manifestJson));

    const manifest = await loadGameManifest('/demo/');

    expect(fetch).toHaveBeenCalledWith('demo/manifest.json');
    expect(manifest.gameDir).toBe('demo');
    expect(manifest.id).toBe('com.example.demo-game');
    expect(manifest.screen).toEqual({ width: 640, height: 480 });
  });

  test('throws when manifest fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    await expect(loadGameManifest('missing')).rejects.toThrow('offline');
  });

  test('throws when manifest returns an error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    } as Response);

    await expect(loadGameManifest('missing')).rejects.toThrow(
      'manifest fetch failed for missing/manifest.json: HTTP 503 Service Unavailable',
    );
  });
});

const responseFromJson = (json: unknown) => {
  return {
    ok: true,
    json: async () => json,
  } as Response;
};
