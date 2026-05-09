import { BLEND_MODES, Rectangle, Texture } from 'pixi.js';
import { fetchBlob } from '../utils/fetch';
import { TkBitmap } from './TkBitmap';
import { TkColor, TkRect, TkTone } from './types';

export async function loadImage(filename: string) {
  const blob = await fetchBlob(filename, undefined, { kind: 'image', label: filename });
  return loadImageFromBlob(blob, filename);
}

export async function loadImageFromBlob(blob: Blob, label: string) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.src = objectUrl;
    await decodeImage(image);
    return image;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to decode image: ${label}: ${detail}`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function decodeImage(image: HTMLImageElement) {
  if (typeof image.decode === 'function') return image.decode();

  return new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = (event) => reject(event);
  });
}

export const clampChannel = (value: number) => {
  return Math.max(0, Math.min(255, Math.trunc(Number(value) || 0)));
};

export const clampRange = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, Math.trunc(Number(value) || 0)));
};

export const clampUnit = (value: number) => {
  return Math.max(0, Math.min(1, value));
};

export const normalizeScale = (value: number) => {
  const scale = Number(value);
  return Number.isFinite(scale) ? scale : 1;
};

export const normalizeColor = (value: TkColor): TkColor => {
  return {
    red: clampChannel(value.red),
    green: clampChannel(value.green),
    blue: clampChannel(value.blue),
    alpha: clampChannel(value.alpha),
  };
};

export const normalizeTone = (value: TkTone): TkTone => {
  return {
    red: clampRange(value.red, -255, 255),
    green: clampRange(value.green, -255, 255),
    blue: clampRange(value.blue, -255, 255),
    gray: clampChannel(value.gray),
  };
};

export const rgbToHex = (red: number, green: number, blue: number) => {
  return (clampChannel(red) << 16) + (clampChannel(green) << 8) + clampChannel(blue);
};

export const normalizeRect = (value: TkRect): TkRect => {
  return {
    x: Number(value.x) || 0,
    y: Number(value.y) || 0,
    width: Math.max(0, Number(value.width) || 0),
    height: Math.max(0, Number(value.height) || 0),
  };
};

export const buildSaturationMatrix = (
  saturation: number,
): [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
] => {
  const inverse = 1 - saturation;
  const lr = 0.3086;
  const lg = 0.6094;
  const lb = 0.082;

  return [
    lr * inverse + saturation,
    lg * inverse,
    lb * inverse,
    0,
    0,
    lr * inverse,
    lg * inverse + saturation,
    lb * inverse,
    0,
    0,
    lr * inverse,
    lg * inverse,
    lb * inverse + saturation,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ];
};

export const createEffectTexture = (bitmap: TkBitmap, frame: Rectangle | null = null) => {
  const sourceX = frame ? frame.x : 0;
  const sourceY = frame ? frame.y : 0;
  const width = frame ? frame.width : bitmap.width;
  const height = frame ? frame.height : bitmap.height;
  if (width <= 0 || height <= 0) return Texture.EMPTY;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Texture.EMPTY;

  context.drawImage(bitmap.canvas, sourceX, sourceY, width, height, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
  }
  context.putImageData(imageData, 0, 0);

  return Texture.from(canvas);
};
export const normalizeRgssBlendType = (value: number) => {
  return Math.trunc(Number(value) || 0);
};

export const rgssBlendTypeToPixiBlendMode = (value: number) => {
  switch (normalizeRgssBlendType(value)) {
    case 1:
      return BLEND_MODES.ADD;
    case 2:
      return BLEND_MODES.SUBTRACT;
    default:
      return BLEND_MODES.NORMAL;
  }
};
