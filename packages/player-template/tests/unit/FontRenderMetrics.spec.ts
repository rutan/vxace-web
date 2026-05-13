import { readFile } from 'node:fs/promises';
import type { ManifestFontRecord } from '@rutan/rpgmaker-vxace-web-game-manifest';
import { describe, expect, test } from 'vitest';
import {
  FontRenderMetricsRegistry,
  parseFontRenderMetrics,
  type FontRenderMetrics,
} from '../../src/runtime/core/FontRenderMetrics';

describe('FontRenderMetrics', () => {
  test('derives CSS size ratios from bundled TrueType line metrics', async () => {
    const [vlGothic, stick] = await Promise.all([
      readFile('../../example/demo/Fonts/VL-Gothic-Regular.ttf'),
      readFile('../../example/demo/Fonts/VL-PGothic-Regular.ttf'),
    ]);

    expect(parseFontRenderMetrics(toArrayBuffer(vlGothic))?.cssSizeRatio).toBeCloseTo(1 / 1.27);
    expect(parseFontRenderMetrics(toArrayBuffer(stick))?.cssSizeRatio).toBeCloseTo(1 / 1.27);
  });

  test('keeps metrics for font style variants under the same family alias', () => {
    const registry = new FontRenderMetricsRegistry();
    const regular = metrics(0.75);
    const bold = metrics(0.68);
    const italic = metrics(0.72);

    registry.register(fontRecord('normal', '400'), regular);
    registry.register(fontRecord('normal', '700'), bold);
    registry.register(fontRecord('italic', '400'), italic);

    expect(registry.resolve(['Shared Family'], { style: 'normal', weight: '400' })).toBe(regular);
    expect(registry.resolve(['Shared Family'], { style: 'normal', weight: '700' })).toBe(bold);
    expect(registry.resolve(['Shared Family'], { style: 'italic', weight: '400' })).toBe(italic);
    expect(registry.resolve(['Shared Family'], { style: 'italic', weight: '700' })).toBe(italic);
  });
});

const toArrayBuffer = (bytes: Uint8Array) => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

const fontRecord = (style: string, weight: string): ManifestFontRecord => ({
  data: {
    kind: 'file',
    path: 'Fonts/Shared.ttf',
  },
  extension: 'ttf',
  families: ['Shared Family'],
  style,
  weight,
});

const metrics = (cssSizeRatio: number): FontRenderMetrics => ({
  cssSizeRatio,
  lineHeightRatio: 1 / cssSizeRatio,
  ascentRatio: 1,
  descentRatio: 0.25,
});
