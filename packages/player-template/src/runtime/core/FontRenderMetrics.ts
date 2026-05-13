import { normalizeFontFamilyKey, type ManifestFontRecord } from '@rutan/rpgmaker-vxace-web-game-manifest';

export type FontRenderMetrics = {
  cssSizeRatio: number;
  lineHeightRatio: number;
  ascentRatio: number;
  descentRatio: number;
};

export type FontRenderMetricsDescriptor = {
  style?: string;
  weight?: string;
};

export class FontRenderMetricsRegistry {
  private readonly _metricsByFamily = new Map<string, Map<string, FontRenderMetrics>>();

  register(font: ManifestFontRecord, metrics: FontRenderMetrics) {
    const variantKey = buildVariantKey(font);

    for (const family of font.families) {
      const normalizedFamily = family.trim();
      if (!normalizedFamily) continue;

      const familyKey = normalizeFontFamilyKey(normalizedFamily);
      const metricsByVariant = this._metricsByFamily.get(familyKey) ?? new Map<string, FontRenderMetrics>();
      metricsByVariant.set(variantKey, metrics);
      this._metricsByFamily.set(familyKey, metricsByVariant);
    }
  }

  resolve(families: string[], descriptor: FontRenderMetricsDescriptor = {}) {
    const normalKey = buildVariantKey({ style: 'normal', weight: '400' });

    for (const family of families) {
      const metricsByVariant = this._metricsByFamily.get(normalizeFontFamilyKey(family));
      if (!metricsByVariant) continue;

      const metrics =
        resolveVariantMetrics(metricsByVariant, descriptor) ??
        metricsByVariant.get(normalKey) ??
        metricsByVariant.values().next().value;
      if (metrics) return metrics;
    }

    return FALLBACK_FONT_RENDER_METRICS;
  }
}

export const FALLBACK_FONT_RENDER_METRICS: FontRenderMetrics = {
  cssSizeRatio: 0.75,
  lineHeightRatio: 4 / 3,
  ascentRatio: 1,
  descentRatio: 1 / 3,
};

export const parseFontRenderMetrics = (buffer: ArrayBuffer): FontRenderMetrics | null => {
  const view = new DataView(buffer);
  const fontOffset = readSfntOffset(view);
  if (fontOffset == null) return null;

  const tables = readTableDirectory(view, fontOffset);
  const head = tables.get('head');
  const hhea = tables.get('hhea');
  if (!head || !hhea || head.length < 20 || hhea.length < 10) return null;

  const unitsPerEm = view.getUint16(head.offset + 18, false);
  if (!Number.isFinite(unitsPerEm) || unitsPerEm <= 0) return null;

  const hheaAscender = view.getInt16(hhea.offset + 4, false);
  const hheaDescender = view.getInt16(hhea.offset + 6, false);
  const hheaLineGap = view.getInt16(hhea.offset + 8, false);
  const os2 = tables.get('OS/2');
  const winMetrics =
    os2 && os2.length >= 78
      ? {
          ascender: view.getUint16(os2.offset + 74, false),
          descender: -view.getUint16(os2.offset + 76, false),
          lineGap: 0,
        }
      : null;

  const sourceMetrics = winMetrics ?? {
    ascender: hheaAscender,
    descender: hheaDescender,
    lineGap: hheaLineGap,
  };
  const ascent = Math.max(0, sourceMetrics.ascender);
  const descent = Math.max(0, -sourceMetrics.descender);
  const lineGap = Math.max(0, sourceMetrics.lineGap);
  const lineHeight = ascent + descent + lineGap;
  if (lineHeight <= 0) return null;

  const lineHeightRatio = lineHeight / unitsPerEm;
  return {
    cssSizeRatio: clamp(1 / lineHeightRatio, 0.5, 1.2),
    lineHeightRatio,
    ascentRatio: ascent / unitsPerEm,
    descentRatio: descent / unitsPerEm,
  };
};

type FontTable = {
  offset: number;
  length: number;
};

const MAX_SFNT_TABLE_COUNT = 1024;

const readSfntOffset = (view: DataView) => {
  if (view.byteLength < 12) return null;

  const signature = readTag(view, 0);
  if (signature === 'ttcf') {
    const fontCount = view.getUint32(8, false);
    if (fontCount <= 0 || view.byteLength < 16) return null;
    return view.getUint32(12, false);
  }

  if (signature === '\x00\x01\x00\x00' || signature === 'OTTO' || signature === 'true' || signature === 'typ1') {
    return 0;
  }

  return null;
};

const readTableDirectory = (view: DataView, fontOffset: number) => {
  const tables = new Map<string, FontTable>();
  if (fontOffset < 0 || fontOffset + 12 > view.byteLength) return tables;

  const declaredTableCount = view.getUint16(fontOffset + 4, false);
  const availableTableCount = Math.floor((view.byteLength - fontOffset - 12) / 16);
  const tableCount = Math.min(declaredTableCount, availableTableCount, MAX_SFNT_TABLE_COUNT);
  for (let index = 0; index < tableCount; index += 1) {
    const recordOffset = fontOffset + 12 + index * 16;

    const tag = readTag(view, recordOffset);
    const offset = view.getUint32(recordOffset + 8, false);
    const length = view.getUint32(recordOffset + 12, false);
    if (offset + length <= view.byteLength) {
      tables.set(tag, { offset, length });
    }
  }

  return tables;
};

const readTag = (view: DataView, offset: number) => {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const resolveVariantMetrics = (
  metricsByVariant: Map<string, FontRenderMetrics>,
  descriptor: FontRenderMetricsDescriptor,
) => {
  const style = normalizeFontStyle(descriptor.style);
  const weight = normalizeFontWeight(descriptor.weight);
  const exact = metricsByVariant.get(buildVariantKey({ style, weight }));
  if (exact) return exact;

  const requestedWeight = Number(weight);
  let closestMetrics: FontRenderMetrics | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const [variantKey, metrics] of metricsByVariant) {
    const [variantStyle, variantWeight] = variantKey.split('|');
    if (variantStyle !== style) continue;

    const distance = Number.isFinite(requestedWeight)
      ? Math.abs(requestedWeight - Number(variantWeight))
      : Number.POSITIVE_INFINITY;
    if (!closestMetrics || distance < closestDistance) {
      closestMetrics = metrics;
      closestDistance = distance;
    }
  }

  return closestMetrics;
};

const buildVariantKey = (descriptor: FontRenderMetricsDescriptor) => {
  return `${normalizeFontStyle(descriptor.style)}|${normalizeFontWeight(descriptor.weight)}`;
};

const normalizeFontStyle = (style: string | undefined) => {
  const normalized = style?.trim().toLowerCase();
  return normalized === 'italic' || normalized === 'oblique' ? normalized : 'normal';
};

const normalizeFontWeight = (weight: string | undefined) => {
  const normalized = weight?.trim().toLowerCase();
  if (!normalized || normalized === 'normal') return '400';
  if (normalized === 'bold') return '700';

  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) {
    return String(Math.min(Math.max(Math.round(numeric), 1), 1000));
  }

  return normalized;
};
