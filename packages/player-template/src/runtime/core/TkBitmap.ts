import { BaseTexture } from 'pixi.js';
import { loadImage } from './utils';
import { clampChannel, clampUnit } from './utils';

export class TkBitmap {
  private _canvas!: HTMLCanvasElement;
  private _ctx!: CanvasRenderingContext2D;
  private _texture!: BaseTexture;
  private _revision = 0;
  private readonly _changeListeners = new Set<() => void>();

  constructor(width = 1, height = 1) {
    this._createCanvas(width, height);
  }

  get context() {
    return this._ctx;
  }

  get canvas() {
    return this._canvas;
  }

  get width() {
    return this._canvas.width;
  }

  get height() {
    return this._canvas.height;
  }

  get texture() {
    return this._texture;
  }

  get revision() {
    return this._revision;
  }

  drawText(
    cssFont: string,
    _size: number,
    color: string,
    outColor: string,
    shadowColor: string,
    outline: boolean,
    shadow: boolean,
    x: number,
    y: number,
    width: number,
    height: number,
    str: string,
    align: number,
  ) {
    recordBitmapEvent('TkBitmap.drawText');
    this._ctx.save();
    this._ctx.font = cssFont;

    const ms = this._ctx.measureText(str);
    const strWidth = Math.min(ms.width, width);
    const px = align === 0 ? x : align === 1 ? x + (width - strWidth) / 2 : x + width - strWidth;
    const padding = 4;
    const renderScale = TEXT_RENDER_SCALE;
    const renderWidth = Math.max(1, Math.ceil((width + padding * 2) * renderScale));
    const renderHeight = Math.max(1, Math.ceil((height + padding * 2) * renderScale));
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = renderWidth;
    renderCanvas.height = renderHeight;

    const renderContext = renderCanvas.getContext('2d')!;
    renderContext.scale(renderScale, renderScale);
    renderContext.font = cssFont;
    renderContext.textBaseline = 'middle';
    renderContext.textAlign = 'left';
    renderContext.lineJoin = 'round';

    const localX = px - x + padding;
    const localY = height / 2 + padding;
    if (shadow) {
      renderContext.fillStyle = shadowColor;
      renderContext.fillText(str, localX + 2, localY + 2, strWidth);
    }

    if (outline) {
      renderContext.strokeStyle = outColor;
      renderContext.lineWidth = 2;
      renderContext.strokeText(str, localX, localY, strWidth);
    }

    renderContext.fillStyle = color;
    renderContext.fillText(str, localX, localY, strWidth);

    this._ctx.imageSmoothingEnabled = true;
    this._ctx.imageSmoothingQuality = 'high';
    this._ctx.drawImage(renderCanvas, x - padding, y - padding, renderWidth / renderScale, renderHeight / renderScale);
    this._ctx.restore();
    this._markChanged();
  }

  clear() {
    this.context.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._markChanged();
  }

  clearRect(x: number, y: number, width: number, height: number) {
    this.context.clearRect(x, y, width, height);
    this._markChanged();
  }

  fillRect(x: number, y: number, width: number, height: number, color: string) {
    this._ctx.fillStyle = color;
    this._ctx.fillRect(x, y, width, height);
    this._markChanged();
  }

  gradientFillRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color1: string,
    color2: string,
    vertical: boolean,
  ) {
    const gradient = vertical
      ? this._ctx.createLinearGradient(x, y, x, y + height)
      : this._ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);

    this._ctx.fillStyle = gradient;
    this._ctx.fillRect(x, y, width, height);
    this._markChanged();
  }

  blt(source: TkBitmap, dx: number, dy: number, sx: number, sy: number, sw: number, sh: number, opacity = 255) {
    this._drawBitmap(source, dx, dy, sw, sh, sx, sy, sw, sh, opacity);
  }

  stretchBlt(
    source: TkBitmap,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    opacity = 255,
  ) {
    this._drawBitmap(source, dx, dy, dw, dh, sx, sy, sw, sh, opacity);
  }

  measureText(cssFont: string, str: string) {
    recordBitmapEvent('TkBitmap.measureText');
    this._ctx.font = cssFont;
    return this._ctx.measureText(str).width;
  }

  getPixel(x: number, y: number) {
    const px = Math.trunc(Number(x) || 0);
    const py = Math.trunc(Number(y) || 0);
    if (px < 0 || py < 0 || px >= this._canvas.width || py >= this._canvas.height) {
      return { red: 0, green: 0, blue: 0, alpha: 0 };
    }

    const data = this._ctx.getImageData(px, py, 1, 1).data;
    return {
      red: data[0],
      green: data[1],
      blue: data[2],
      alpha: data[3],
    };
  }

  setPixel(x: number, y: number, red: number, green: number, blue: number, alpha: number) {
    const px = Math.trunc(Number(x) || 0);
    const py = Math.trunc(Number(y) || 0);
    if (px < 0 || py < 0 || px >= this._canvas.width || py >= this._canvas.height) return;

    const imageData = this._ctx.createImageData(1, 1);
    imageData.data[0] = clampChannel(red);
    imageData.data[1] = clampChannel(green);
    imageData.data[2] = clampChannel(blue);
    imageData.data[3] = clampChannel(alpha);
    this._ctx.putImageData(imageData, px, py);
    this._markChanged();
  }

  getRgbaPixelsBase64() {
    const imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    return bytesToBase64(imageData.data);
  }

  putRgbaPixelsBase64(base64: string) {
    const imageData = this._ctx.createImageData(this._canvas.width, this._canvas.height);
    const binary = atob(String(base64));
    const length = Math.min(binary.length, imageData.data.length);

    for (let index = 0; index < length; index += 1) {
      imageData.data[index] = binary.charCodeAt(index);
    }

    this._ctx.putImageData(imageData, 0, 0);
    this._markChanged();
  }

  blur() {
    const width = this._canvas.width;
    const height = this._canvas.height;
    if (width <= 0 || height <= 0) return;

    const source = this._ctx.getImageData(0, 0, width, height);
    const output = this._ctx.createImageData(width, height);
    const src = source.data;
    const dest = output.data;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let red = 0;
        let green = 0;
        let blue = 0;
        let alpha = 0;
        let count = 0;

        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const sx = x + ox;
            const sy = y + oy;
            if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;

            const sourceIndex = (sy * width + sx) * 4;
            red += src[sourceIndex];
            green += src[sourceIndex + 1];
            blue += src[sourceIndex + 2];
            alpha += src[sourceIndex + 3];
            count += 1;
          }
        }

        const destIndex = (y * width + x) * 4;
        dest[destIndex] = Math.round(red / count);
        dest[destIndex + 1] = Math.round(green / count);
        dest[destIndex + 2] = Math.round(blue / count);
        dest[destIndex + 3] = Math.round(alpha / count);
      }
    }

    this._ctx.putImageData(output, 0, 0);
    this._markChanged();
  }

  radialBlur(angle: number, division: number) {
    const width = this._canvas.width;
    const height = this._canvas.height;
    const steps = Math.max(2, Math.trunc(Number(division) || 0));
    if (width <= 0 || height <= 0) return;

    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const sourceContext = source.getContext('2d');
    if (!sourceContext) return;
    sourceContext.drawImage(this._canvas, 0, 0);

    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;
    const outputContext = output.getContext('2d');
    if (!outputContext) return;

    const totalAngle = ((Number(angle) || 0) * Math.PI) / 180;
    const centerX = width / 2;
    const centerY = height / 2;
    outputContext.globalCompositeOperation = 'lighter';
    outputContext.globalAlpha = 1 / steps;
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = 'high';

    for (let index = 0; index < steps; index += 1) {
      const rate = steps === 1 ? 0 : index / (steps - 1) - 0.5;
      const rotation = totalAngle * rate;
      outputContext.save();
      outputContext.translate(centerX, centerY);
      outputContext.rotate(rotation);
      outputContext.translate(-centerX, -centerY);
      outputContext.drawImage(source, 0, 0);
      outputContext.restore();
    }

    this._ctx.clearRect(0, 0, width, height);
    this._ctx.drawImage(output, 0, 0);
    this._markChanged();
  }

  hueChange(hue: number) {
    const width = this._canvas.width;
    const height = this._canvas.height;
    const degrees = normalizeHueDegrees(hue);
    if (width <= 0 || height <= 0 || degrees === 0) return;

    const imageData = this._ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      const [red, green, blue] = rotateRgbHue(data[index], data[index + 1], data[index + 2], degrees);
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = alpha;
    }

    this._ctx.putImageData(imageData, 0, 0);
    this._markChanged();
  }

  resize(width: number, height: number) {
    const nextWidth = Math.max(1, Math.trunc(Number(width) || 0));
    const nextHeight = Math.max(1, Math.trunc(Number(height) || 0));
    if (this._canvas.width === nextWidth && this._canvas.height === nextHeight) return;

    this._canvas.width = nextWidth;
    this._canvas.height = nextHeight;
    this._texture.setSize(nextWidth, nextHeight);
    this._markChanged();
  }

  replaceWithCanvas(source: HTMLCanvasElement) {
    this.resize(source.width, source.height);
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._ctx.drawImage(source, 0, 0);
    this._markChanged();
  }

  clone() {
    const bitmap = new TkBitmap(this.width, this.height);
    bitmap.context.drawImage(this._canvas, 0, 0);
    bitmap._markChanged();
    return bitmap;
  }

  destroy() {
    this._texture.destroy();
    this._changeListeners.clear();
  }

  onChange(listener: () => void) {
    this._changeListeners.add(listener);
    return () => {
      this._changeListeners.delete(listener);
    };
  }

  private _drawBitmap(
    source: TkBitmap,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    opacity: number,
  ) {
    if (!source || sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;

    const alpha = clampUnit((Number(opacity) || 0) / 255);
    if (alpha <= 0) return;

    this._ctx.save();
    this._ctx.globalAlpha = alpha;
    this._ctx.drawImage(
      source.canvas,
      Math.trunc(Number(sx) || 0),
      Math.trunc(Number(sy) || 0),
      Math.trunc(Number(sw) || 0),
      Math.trunc(Number(sh) || 0),
      Math.trunc(Number(dx) || 0),
      Math.trunc(Number(dy) || 0),
      Math.trunc(Number(dw) || 0),
      Math.trunc(Number(dh) || 0),
    );
    this._ctx.restore();
    this._markChanged();
  }

  private _createCanvas(width: number, height: number) {
    if (this._canvas) return this._canvas;

    this._canvas = document.createElement('canvas');
    this._canvas.width = width;
    this._canvas.height = height;
    this._ctx = this._canvas.getContext('2d')!;

    this._texture = BaseTexture.from(this._canvas);

    return this._canvas;
  }

  private _markChanged() {
    this._revision += 1;
    this._texture.update();
    this._changeListeners.forEach((listener) => listener());
  }

  static async loadImage(filename: string) {
    const image = await loadImage(filename);
    return TkBitmap.fromImage(image);
  }

  static fromImage(image: HTMLImageElement) {
    const bitmap = new TkBitmap(image.width, image.height);
    bitmap.context.drawImage(image, 0, 0);
    bitmap._markChanged();
    return bitmap;
  }
}

const recordBitmapEvent = (label: string) => {
  (window as any).rubyBridge?.app?.recordDebugEvent?.(label);
};

const TEXT_RENDER_SCALE = 2;
const BASE64_CHUNK_SIZE = 0x8000;

const bytesToBase64 = (bytes: Uint8ClampedArray) => {
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + BASE64_CHUNK_SIZE);
    const chars = Array.from({ length: chunk.length }, (_, index) => String.fromCharCode(chunk[index]));
    binary += chars.join('');
  }

  return btoa(binary);
};

const normalizeHueDegrees = (value: number) => {
  const hue = Math.trunc(Number(value) || 0) % 360;
  return hue < 0 ? hue + 360 : hue;
};

const rotateRgbHue = (red: number, green: number, blue: number, degrees: number): [number, number, number] => {
  const [hue, saturation, lightness] = rgbToHsl(red, green, blue);
  return hslToRgb((hue + degrees) % 360, saturation, lightness);
};

const rgbToHsl = (red: number, green: number, blue: number): [number, number, number] => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) return [0, 0, lightness];

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;

  if (max === r) {
    hue = (g - b) / delta + (g < b ? 6 : 0);
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  return [hue * 60, saturation, lightness];
};

const hslToRgb = (hue: number, saturation: number, lightness: number): [number, number, number] => {
  if (saturation === 0) {
    const channel = Math.round(lightness * 255);
    return [channel, channel, channel];
  }

  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const h = hue / 360;

  return [
    Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, h) * 255),
    Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  ];
};

const hueToRgb = (p: number, q: number, hue: number) => {
  let h = hue;
  if (h < 0) h += 1;
  if (h > 1) h -= 1;
  if (h < 1 / 6) return p + (q - p) * 6 * h;
  if (h < 1 / 2) return q;
  if (h < 2 / 3) return p + (q - p) * (2 / 3 - h) * 6;
  return p;
};
