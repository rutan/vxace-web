import { BLEND_MODES, ColorMatrixFilter, Rectangle, Sprite, Texture } from 'pixi.js';
import { TkBitmap } from './TkBitmap';
import { TkRect, TkColor, TkTone } from './types';
import {
  clampChannel,
  normalizeColor,
  normalizeTone,
  clampUnit,
  normalizeScale,
  rgbToHex,
  buildSaturationMatrix,
  createEffectTexture,
  normalizeRgssBlendType,
  rgssBlendTypeToPixiBlendMode,
} from './utils';

type DisplayTextureRecord = {
  texture: Texture;
  ownsBase: boolean;
  sourceCanvas?: HTMLCanvasElement;
};

type EffectTextureRecord = {
  texture: Texture;
  ownsBase: boolean;
};

export class TkSprite extends Sprite {
  private readonly _toneDarkOverlay: Sprite;
  private readonly _toneLightOverlay: Sprite;
  private readonly _colorOverlay: Sprite;
  private readonly _flashOverlay: Sprite;
  private readonly _grayFilter: ColorMatrixFilter;
  private _effectTexture: Texture;
  private _effectTextureOwnsBase: boolean;
  private _displayTexture: Texture;
  private _displayTextureOwnsBase: boolean;
  private _displayTextureCacheKey: string | null;
  private _displayTextureSourceCanvas: HTMLCanvasElement | null;
  private readonly _displayTextureCache: Map<string, DisplayTextureRecord>;
  private _effectTextureFrameKey: string | null;
  private _effectTextureRevision: number | null;
  private _unsubscribeBitmapChange: (() => void) | null;
  private _bitmap: TkBitmap | null;
  private _ox: number;
  private _oy: number;
  private _angle: number;
  private _zoomX: number;
  private _zoomY: number;
  private _mirror: boolean;
  private _srcRect: { x: number; y: number; width: number; height: number };
  private _opacity: number;
  private _bushDepth: number;
  private _bushOpacity: number;
  private _color: TkColor;
  private _tone: TkTone;
  private _flashColor: TkColor;
  private _flashDuration: number;
  private _flashRemaining: number;
  private _waveAmp: number;
  private _waveLength: number;
  private _waveSpeed: number;
  private _wavePhase: number;
  private _blendType: number;

  constructor() {
    super();
    this._toneDarkOverlay = new Sprite(Texture.EMPTY);
    this._toneLightOverlay = new Sprite(Texture.EMPTY);
    this._colorOverlay = new Sprite(Texture.EMPTY);
    this._flashOverlay = new Sprite(Texture.EMPTY);
    this._grayFilter = new ColorMatrixFilter();
    this._effectTexture = Texture.EMPTY;
    this._effectTextureOwnsBase = false;
    this._displayTexture = Texture.EMPTY;
    this._displayTextureOwnsBase = false;
    this._displayTextureCacheKey = null;
    this._displayTextureSourceCanvas = null;
    this._displayTextureCache = new Map();
    this._effectTextureFrameKey = null;
    this._effectTextureRevision = null;
    this._unsubscribeBitmapChange = null;
    this._bitmap = null;
    this._ox = 0;
    this._oy = 0;
    this._angle = 0;
    this._zoomX = 1;
    this._zoomY = 1;
    this._mirror = false;
    this._srcRect = { x: 0, y: 0, width: 0, height: 0 };
    this._opacity = 255;
    this._bushDepth = 0;
    this._bushOpacity = 128;
    this._color = { red: 0, green: 0, blue: 0, alpha: 0 };
    this._tone = { red: 0, green: 0, blue: 0, gray: 0 };
    this._flashColor = { red: 0, green: 0, blue: 0, alpha: 0 };
    this._flashDuration = 0;
    this._flashRemaining = 0;
    this._waveAmp = 0;
    this._waveLength = 180;
    this._waveSpeed = 360;
    this._wavePhase = 0;
    this._blendType = 0;

    this._toneDarkOverlay.blendMode = BLEND_MODES.MULTIPLY;
    this._toneLightOverlay.blendMode = BLEND_MODES.ADD;
    this.addChild(this._toneDarkOverlay);
    this.addChild(this._toneLightOverlay);
    this.addChild(this._colorOverlay);
    this.addChild(this._flashOverlay);
  }

  get bitmap() {
    return this._bitmap;
  }

  set bitmap(value: TkBitmap | null) {
    if (this._bitmap === value) return;

    this._unsubscribeBitmapChange?.();
    this._unsubscribeBitmapChange = null;
    this._bitmap = value;
    if (value) {
      this._srcRect = { x: 0, y: 0, width: value.width, height: value.height };
    }
    this._unsubscribeBitmapChange =
      value?.onChange(() => {
        clearSharedEffectTextureCache(value);
        this._clearDisplayTextureCache();
        this._clearEffectTexture();
        this._refreshTexture();
      }) ?? null;
    this._clearEffectTexture();
    this._clearDisplayTextureCache();
    this._refreshTexture();
  }

  get rgssWidth() {
    return this._logicalTextureSize().width;
  }

  get rgssHeight() {
    return this._logicalTextureSize().height;
  }

  get ox() {
    return this._ox;
  }

  set ox(value: number) {
    this._ox = value;
    this._refreshAnchor();
  }

  get oy() {
    return this._oy;
  }

  set oy(value: number) {
    this._oy = value;
    this._refreshAnchor();
  }

  get angle() {
    return this._angle;
  }

  set angle(value: number) {
    this._angle = value;
    this.rotation = (this._angle * Math.PI) / 180;
  }

  get zoomX() {
    return this._zoomX;
  }

  set zoomX(value: number) {
    this._zoomX = normalizeScale(value);
    this._refreshScale();
  }

  get zoomY() {
    return this._zoomY;
  }

  set zoomY(value: number) {
    this._zoomY = normalizeScale(value);
    this._refreshScale();
  }

  get mirror() {
    return this._mirror;
  }

  set mirror(value: boolean) {
    this._mirror = Boolean(value);
    this._refreshScale();
  }

  get opacity() {
    return this._opacity;
  }

  set opacity(value: number) {
    const nextOpacity = clampChannel(value);
    if (this._opacity === nextOpacity) return;

    this._opacity = nextOpacity;
    this.alpha = this._opacity / 255;
  }

  get blendType() {
    return this._blendType;
  }

  set blendType(value: number) {
    this._blendType = normalizeRgssBlendType(value);
    this.blendMode = rgssBlendTypeToPixiBlendMode(this._blendType);
  }

  get bushDepth() {
    return this._bushDepth;
  }

  set bushDepth(value: number) {
    const nextBushDepth = Math.max(0, Math.trunc(Number(value) || 0));
    if (this._bushDepth === nextBushDepth) return;

    this._bushDepth = nextBushDepth;
    this._refreshTexture();
  }

  get bushOpacity() {
    return this._bushOpacity;
  }

  set bushOpacity(value: number) {
    const nextBushOpacity = clampChannel(value);
    if (this._bushOpacity === nextBushOpacity) return;

    this._bushOpacity = nextBushOpacity;
    this._refreshTexture();
  }

  get waveAmp() {
    return this._waveAmp;
  }

  set waveAmp(value: number) {
    this._waveAmp = Math.max(0, Number(value) || 0);
    this._refreshWaveEffect();
  }

  get waveLength() {
    return this._waveLength;
  }

  set waveLength(value: number) {
    this._waveLength = Math.max(1, Number(value) || 0);
    this._refreshWaveEffect();
  }

  get waveSpeed() {
    return this._waveSpeed;
  }

  set waveSpeed(value: number) {
    this._waveSpeed = Number(value) || 0;
  }

  get wavePhase() {
    return this._wavePhase;
  }

  set wavePhase(value: number) {
    this._wavePhase = Number(value) || 0;
    this._refreshWaveEffect();
  }

  set color(value: TkColor) {
    this._color = normalizeColor(value);
    this._refreshEffects();
  }

  set tone(value: TkTone) {
    this._tone = normalizeTone(value);
    this._refreshEffects();
  }

  get srcRect() {
    return this._srcRect;
  }

  set srcRect(value: { x: number; y: number; width: number; height: number }) {
    const nextSrcRect = normalizeSrcRect(value);
    if (srcRectEquals(this._srcRect, nextSrcRect)) return;

    this._srcRect = nextSrcRect;
    this._refreshTexture();
  }

  flash(color: TkColor | null, duration: number) {
    this._flashColor = color ? normalizeColor(color) : { red: 0, green: 0, blue: 0, alpha: 0 };
    this._flashDuration = Math.max(0, Math.trunc(Number(duration) || 0));
    this._flashRemaining = this._flashDuration;
    this._refreshFlashEffect();
    this._syncEffectTexture();
  }

  advanceEffects() {
    if (this._waveAmp > 0 && this._waveSpeed !== 0) {
      this._wavePhase = normalizeDegrees(this._wavePhase + this._waveSpeed / this._waveLength);
      this._refreshWaveEffect();
    }

    if (this._flashRemaining > 0) {
      this._flashRemaining -= 1;
      this._refreshFlashEffect();
      this._syncEffectTexture();
    }

    return this._wavePhase;
  }

  private _refreshAnchor() {
    if (this.texture) {
      this.anchor.x = (this._ox + this._waveMargin()) / this.texture.width;
      this.anchor.y = this._oy / this.texture.height;
    } else {
      this.anchor.x = 0;
      this.anchor.y = 0;
    }

    this._refreshEffectLayout();
  }

  private _logicalTextureSize() {
    if (this._srcRect.width > 0 && this._srcRect.height > 0) {
      return {
        width: this._srcRect.width,
        height: this._srcRect.height,
      };
    }

    return {
      width: this._bitmap?.width ?? 0,
      height: this._bitmap?.height ?? 0,
    };
  }

  private _refreshScale() {
    this.scale.x = this._mirror ? -this._zoomX : this._zoomX;
    this.scale.y = this._zoomY;
  }

  private _refreshTexture() {
    if (!this._bitmap) {
      this._setDisplayTexture(Texture.EMPTY);
      this._clearEffectTexture();
      this._refreshAnchor();
      this._refreshEffects();
      return;
    }

    const rect = this._srcRect;
    const frame = textureFrameForRect(rect);
    const frameKey = sourceRectKey(rect);
    const displayTexture = this._displayTextureFor(rect, frame, frameKey);
    this._setDisplayTexture(
      displayTexture.texture,
      displayTexture.ownsBase,
      displayTexture.cacheKey,
      displayTexture.sourceCanvas ?? null,
    );
    this._clearEffectTexture();

    this._refreshAnchor();
    this._refreshEffects();
  }

  private _displayTextureFor(rect: TkRect, frame: Rectangle | null, frameKey: string) {
    if (!this._bitmap) {
      return { texture: Texture.EMPTY, ownsBase: false, cacheKey: null };
    }

    if (this._waveAmp > 0) {
      const displayTexture = createDisplayTexture(this._bitmap, rect, frame, this._bushDepth, this._bushOpacity, {
        amp: this._waveAmp,
        length: this._waveLength,
        phase: this._wavePhase,
      });
      return { ...displayTexture, cacheKey: null };
    }

    const cacheKey = [
      this._bitmap.revision,
      frameKey,
      Math.min(this._bushDepth, Math.max(0, rect.height)),
      this._bushOpacity,
    ].join('|');
    const cached = this._displayTextureCache.get(cacheKey);
    if (cached) return { ...cached, cacheKey };

    const displayTexture = createDisplayTexture(this._bitmap, rect, frame, this._bushDepth, this._bushOpacity);
    this._displayTextureCache.set(cacheKey, displayTexture);
    return { ...displayTexture, cacheKey };
  }

  private _refreshEffects() {
    this._refreshEffectLayout();
    this._refreshToneEffect();
    this._refreshColorEffect();
    this._refreshFlashEffect();
    this._syncEffectTexture();
  }

  private _refreshEffectLayout() {
    const width = this.texture?.width ?? 0;
    const height = this.texture?.height ?? 0;
    const x = -this.anchor.x * width;
    const y = -this.anchor.y * height;

    this._toneDarkOverlay.position.set(x, y);
    this._toneLightOverlay.position.set(x, y);
    this._colorOverlay.position.set(x, y);
    this._flashOverlay.position.set(x, y);
  }

  private _refreshToneEffect() {
    const positive = {
      red: clampChannel(Math.max(this._tone.red, 0)),
      green: clampChannel(Math.max(this._tone.green, 0)),
      blue: clampChannel(Math.max(this._tone.blue, 0)),
    };
    const negative = {
      red: clampChannel(255 + Math.min(this._tone.red, 0)),
      green: clampChannel(255 + Math.min(this._tone.green, 0)),
      blue: clampChannel(255 + Math.min(this._tone.blue, 0)),
    };
    const hasPositive = positive.red > 0 || positive.green > 0 || positive.blue > 0;
    const hasNegative = negative.red < 255 || negative.green < 255 || negative.blue < 255;

    this._toneLightOverlay.tint = rgbToHex(positive.red, positive.green, positive.blue);
    this._toneLightOverlay.visible = hasPositive;

    this._toneDarkOverlay.tint = rgbToHex(negative.red, negative.green, negative.blue);
    this._toneDarkOverlay.visible = hasNegative;

    const saturation = 1 - clampUnit(this._tone.gray / 255);
    if (saturation < 1) {
      this._grayFilter.matrix = buildSaturationMatrix(saturation);
      this.filters = [this._grayFilter];
    } else {
      this.filters = [];
    }
  }

  private _refreshColorEffect() {
    const alpha = clampUnit(this._color.alpha / 255);

    this._colorOverlay.tint = rgbToHex(this._color.red, this._color.green, this._color.blue);
    this._colorOverlay.alpha = alpha;
    this._colorOverlay.visible = alpha > 0;
  }

  private _refreshFlashEffect() {
    const progress = this._flashDuration > 0 ? this._flashRemaining / this._flashDuration : 0;
    const alpha = clampUnit((this._flashColor.alpha / 255) * progress);

    this._flashOverlay.tint = rgbToHex(this._flashColor.red, this._flashColor.green, this._flashColor.blue);
    this._flashOverlay.alpha = alpha;
    this._flashOverlay.visible = alpha > 0;
  }

  private _refreshWaveEffect() {
    this.skew.x = 0;
    this._refreshTexture();
  }

  private _setEffectTexture(texture: Texture, ownsBase = false) {
    if (this._effectTexture !== Texture.EMPTY && this._effectTextureOwnsBase) {
      this._effectTexture.destroy(true);
    }

    this._effectTexture = texture;
    this._effectTextureOwnsBase = ownsBase;
    this._toneDarkOverlay.texture = texture;
    this._toneLightOverlay.texture = texture;
    this._colorOverlay.texture = texture;
    this._flashOverlay.texture = texture;
  }

  private _setDisplayTexture(
    texture: Texture,
    ownsBase = false,
    cacheKey: string | null = null,
    sourceCanvas: HTMLCanvasElement | null = null,
  ) {
    if (this._displayTexture === texture && this._displayTextureCacheKey === cacheKey) return;

    if (this._displayTexture !== Texture.EMPTY && this._displayTextureCacheKey === null) {
      this._displayTexture.destroy(this._displayTextureOwnsBase);
    }

    this._displayTexture = texture;
    this._displayTextureOwnsBase = ownsBase;
    this._displayTextureCacheKey = cacheKey;
    this._displayTextureSourceCanvas = sourceCanvas;
    this.texture = texture;
  }

  private _clearDisplayTextureCache() {
    const currentCacheKey = this._displayTextureCacheKey;
    if (currentCacheKey !== null) {
      this._displayTexture = Texture.EMPTY;
      this._displayTextureOwnsBase = false;
      this._displayTextureCacheKey = null;
      this._displayTextureSourceCanvas = null;
      this.texture = Texture.EMPTY;
    }

    this._displayTextureCache.forEach((record) => {
      record.texture.destroy(record.ownsBase);
    });
    this._displayTextureCache.clear();
  }

  private _syncEffectTexture() {
    if (!this._hasVisibleTextureOverlay()) {
      this._clearEffectTexture();
      return;
    }

    this._ensureEffectTexture();
  }

  private _ensureEffectTexture() {
    if (!this._bitmap) {
      this._clearEffectTexture();
      return;
    }

    const frameKey = this._displayTextureSourceCanvas
      ? [
          'generated',
          textureFrameKey(this.texture.frame),
          this._bushDepth,
          this._bushOpacity,
          this._waveAmp,
          this._waveLength,
          this._wavePhase,
        ].join('|')
      : textureFrameKey(this.texture.frame);
    if (
      this._effectTexture !== Texture.EMPTY &&
      this._effectTextureRevision === this._bitmap.revision &&
      this._effectTextureFrameKey === frameKey
    ) {
      return;
    }

    const effectTexture = this._displayTextureSourceCanvas
      ? createEffectTextureFromCanvas(this._displayTextureSourceCanvas)
      : getSharedEffectTexture(this._bitmap, this.texture.frame);
    this._setEffectTexture(effectTexture.texture, effectTexture.ownsBase);
    this._effectTextureRevision = this._bitmap.revision;
    this._effectTextureFrameKey = frameKey;
  }

  private _waveMargin() {
    return this._waveAmp > 0 ? Math.ceil(this._waveAmp) : 0;
  }

  private _clearEffectTexture() {
    this._setEffectTexture(Texture.EMPTY);
    this._effectTextureRevision = null;
    this._effectTextureFrameKey = null;
  }

  private _hasVisibleTextureOverlay() {
    return (
      this._toneDarkOverlay.visible ||
      this._toneLightOverlay.visible ||
      this._colorOverlay.visible ||
      this._flashOverlay.visible
    );
  }

  destroy(options?: Parameters<Sprite['destroy']>[0]) {
    this._unsubscribeBitmapChange?.();
    this._unsubscribeBitmapChange = null;
    this._clearEffectTexture();
    this._clearDisplayTextureCache();
    this._setDisplayTexture(Texture.EMPTY);
    super.destroy(options);
  }
}

const normalizeDegrees = (value: number) => {
  const normalized = Number(value) || 0;
  return ((normalized % 360) + 360) % 360;
};

const normalizeSrcRect = (rect: TkRect): TkRect => {
  return {
    x: Math.trunc(Number(rect.x) || 0),
    y: Math.trunc(Number(rect.y) || 0),
    width: Math.trunc(Number(rect.width) || 0),
    height: Math.trunc(Number(rect.height) || 0),
  };
};

const srcRectEquals = (left: TkRect, right: TkRect) => {
  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
};

const textureFrameForRect = (rect: TkRect) => {
  if (rect.width <= 0 || rect.height <= 0) return null;

  return new Rectangle(rect.x, rect.y, rect.width, rect.height);
};

const sourceRectKey = (rect: TkRect) => {
  return `${rect.x},${rect.y},${rect.width},${rect.height}`;
};

const sharedEffectTextureCache = new WeakMap<TkBitmap, Map<string, Texture>>();

const getSharedEffectTexture = (bitmap: TkBitmap, frame: Rectangle | null): EffectTextureRecord => {
  const frameKey = frame ? textureFrameKey(frame) : 'full';
  const cacheKey = `${bitmap.revision}|${frameKey}`;
  let cache = sharedEffectTextureCache.get(bitmap);
  if (!cache) {
    cache = new Map();
    sharedEffectTextureCache.set(bitmap, cache);
  }

  const cached = cache.get(cacheKey);
  if (cached) return { texture: cached, ownsBase: false };

  const texture = createEffectTexture(bitmap, frame);
  if (texture === Texture.EMPTY) return { texture, ownsBase: false };

  cache.set(cacheKey, texture);
  return { texture, ownsBase: false };
};

const clearSharedEffectTextureCache = (bitmap: TkBitmap) => {
  const cache = sharedEffectTextureCache.get(bitmap);
  if (!cache) return;

  cache.forEach((texture) => texture.destroy(true));
  cache.clear();
};

const createEffectTextureFromCanvas = (source: HTMLCanvasElement) => {
  if (source.width <= 0 || source.height <= 0) return { texture: Texture.EMPTY, ownsBase: false };

  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext('2d');
  if (!context) return { texture: Texture.EMPTY, ownsBase: false };

  context.drawImage(source, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
  }
  context.putImageData(imageData, 0, 0);

  return { texture: Texture.from(canvas), ownsBase: true };
};

const createDisplayTexture = (
  bitmap: TkBitmap,
  rect: TkRect,
  frame: Rectangle | null,
  bushDepth: number,
  bushOpacity: number,
  wave?: { amp: number; length: number; phase: number },
) => {
  const width = rect.width;
  const height = rect.height;
  if (width <= 0 || height <= 0) return { texture: Texture.EMPTY, ownsBase: false };

  const normalizedBushDepth = Math.min(Math.max(0, Math.trunc(Number(bushDepth) || 0)), height);
  const hasBushOpacity = normalizedBushDepth > 0 && bushOpacity < 255;
  const waveAmp = wave ? Math.max(0, Number(wave.amp) || 0) : 0;
  const hasWave = waveAmp > 0;
  const isOutOfBounds = rect.x < 0 || rect.y < 0 || rect.x + width > bitmap.width || rect.y + height > bitmap.height;

  if (!hasBushOpacity && !hasWave && !isOutOfBounds) {
    return {
      texture: frame ? new Texture(bitmap.texture, frame) : new Texture(bitmap.texture),
      ownsBase: false,
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return { texture: Texture.EMPTY, ownsBase: false };

  const sourceX = Math.max(0, rect.x);
  const sourceY = Math.max(0, rect.y);
  const sourceRight = Math.min(bitmap.width, rect.x + width);
  const sourceBottom = Math.min(bitmap.height, rect.y + height);
  const sourceWidth = Math.max(0, sourceRight - sourceX);
  const sourceHeight = Math.max(0, sourceBottom - sourceY);
  if (sourceWidth > 0 && sourceHeight > 0) {
    context.drawImage(
      bitmap.canvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      Math.max(0, -rect.x),
      Math.max(0, -rect.y),
      sourceWidth,
      sourceHeight,
    );
  }

  if (hasBushOpacity) {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    const alphaRate = clampUnit(bushOpacity / 255);
    const startY = height - normalizedBushDepth;
    for (let y = startY; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4 + 3;
        data[index] = Math.round(data[index] * alphaRate);
      }
    }
    context.putImageData(imageData, 0, 0);
  }

  if (!hasWave) {
    return { texture: Texture.from(canvas), ownsBase: true, sourceCanvas: canvas };
  }

  const wavedCanvas = document.createElement('canvas');
  const waveMargin = Math.ceil(waveAmp);
  wavedCanvas.width = width + waveMargin * 2;
  wavedCanvas.height = height;
  const wavedContext = wavedCanvas.getContext('2d');
  if (!wavedContext) return { texture: Texture.EMPTY, ownsBase: false };

  wavedContext.imageSmoothingEnabled = false;
  const waveLength = Math.max(1, Number(wave?.length) || 0);
  const wavePhase = Number(wave?.phase) || 0;
  for (let y = 0; y < height; y += 1) {
    const radians = ((wavePhase + (y * 360) / waveLength) * Math.PI) / 180;
    const offsetX = Math.round(Math.sin(radians) * waveAmp);
    wavedContext.drawImage(canvas, 0, y, width, 1, waveMargin + offsetX, y, width, 1);
  }

  return { texture: Texture.from(wavedCanvas), ownsBase: true, sourceCanvas: wavedCanvas };
};

const textureFrameKey = (frame: Rectangle) => {
  return `${frame.x},${frame.y},${frame.width},${frame.height}`;
};
