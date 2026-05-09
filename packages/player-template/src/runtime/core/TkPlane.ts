import { BLEND_MODES, ColorMatrixFilter, Texture, TilingSprite } from 'pixi.js';
import { TkBitmap } from './TkBitmap';
import { TkColor, TkTone } from './types';
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

export class TkPlane extends TilingSprite {
  private readonly _toneDarkOverlay: TilingSprite;
  private readonly _toneLightOverlay: TilingSprite;
  private readonly _colorOverlay: TilingSprite;
  private readonly _grayFilter: ColorMatrixFilter;
  private _effectTexture: Texture;
  private _baseTexture: Texture;
  private _unsubscribeBitmapChange: (() => void) | null;
  private _bitmap: TkBitmap | null;
  private _ox: number;
  private _oy: number;
  private _opacity: number;
  private _zoomX: number;
  private _zoomY: number;
  private _color: TkColor;
  private _tone: TkTone;
  private _blendType: number;

  constructor(width: number, height: number) {
    super(Texture.EMPTY, width, height);
    this._toneDarkOverlay = new TilingSprite(Texture.EMPTY, width, height);
    this._toneLightOverlay = new TilingSprite(Texture.EMPTY, width, height);
    this._colorOverlay = new TilingSprite(Texture.EMPTY, width, height);
    this._grayFilter = new ColorMatrixFilter();
    this._effectTexture = Texture.EMPTY;
    this._baseTexture = Texture.EMPTY;
    this._unsubscribeBitmapChange = null;
    this._bitmap = null;
    this._ox = 0;
    this._oy = 0;
    this._opacity = 255;
    this._zoomX = 1;
    this._zoomY = 1;
    this._color = { red: 0, green: 0, blue: 0, alpha: 0 };
    this._tone = { red: 0, green: 0, blue: 0, gray: 0 };
    this._blendType = 0;

    this._toneDarkOverlay.blendMode = BLEND_MODES.MULTIPLY;
    this._toneLightOverlay.blendMode = BLEND_MODES.ADD;
    this.addChild(this._toneDarkOverlay);
    this.addChild(this._toneLightOverlay);
    this.addChild(this._colorOverlay);
    this._refreshToneEffect();
    this._refreshColorEffect();
    this._refreshTileTransform();
  }

  get bitmap() {
    return this._bitmap;
  }

  set bitmap(value: TkBitmap | null) {
    if (this._bitmap === value) return;

    this._unsubscribeBitmapChange?.();
    this._unsubscribeBitmapChange = null;
    this._bitmap = value;
    this._unsubscribeBitmapChange =
      value?.onChange(() => {
        this._refreshBaseTexture();
        this._refreshEffectTexture();
      }) ?? null;
    this._refreshBaseTexture();
    this._refreshEffectTexture();
  }

  get ox() {
    return this._ox;
  }

  set ox(value: number) {
    this._ox = Math.trunc(Number(value) || 0);
    this._refreshTileTransform();
  }

  get oy() {
    return this._oy;
  }

  set oy(value: number) {
    this._oy = Math.trunc(Number(value) || 0);
    this._refreshTileTransform();
  }

  get zoomX() {
    return this._zoomX;
  }

  set zoomX(value: number) {
    this._zoomX = normalizeScale(value);
    this._refreshTileTransform();
  }

  get zoomY() {
    return this._zoomY;
  }

  set zoomY(value: number) {
    this._zoomY = normalizeScale(value);
    this._refreshTileTransform();
  }

  get opacity() {
    return this._opacity;
  }

  set opacity(value: number) {
    this._opacity = clampChannel(value);
    this.alpha = this._opacity / 255;
  }

  get blendType() {
    return this._blendType;
  }

  set blendType(value: number) {
    this._blendType = normalizeRgssBlendType(value);
    this.blendMode = rgssBlendTypeToPixiBlendMode(this._blendType);
  }

  get color() {
    return this._color;
  }

  set color(value: TkColor) {
    this._color = normalizeColor(value);
    this._refreshColorEffect();
    this._refreshEffectTexture();
  }

  get tone() {
    return this._tone;
  }

  set tone(value: TkTone) {
    this._tone = normalizeTone(value);
    this._refreshToneEffect();
    this._refreshEffectTexture();
  }

  resize(width: number, height: number) {
    const nextWidth = Math.max(1, Math.trunc(Number(width) || 0));
    const nextHeight = Math.max(1, Math.trunc(Number(height) || 0));
    this.width = nextWidth;
    this.height = nextHeight;
    this._toneDarkOverlay.width = nextWidth;
    this._toneDarkOverlay.height = nextHeight;
    this._toneLightOverlay.width = nextWidth;
    this._toneLightOverlay.height = nextHeight;
    this._colorOverlay.width = nextWidth;
    this._colorOverlay.height = nextHeight;
    this._refreshTileTransform();
  }

  private _refreshTileTransform() {
    this.tilePosition.x = -this._ox;
    this.tilePosition.y = -this._oy;
    this.tileScale.x = this._zoomX;
    this.tileScale.y = this._zoomY;
    for (const overlay of [this._toneDarkOverlay, this._toneLightOverlay, this._colorOverlay]) {
      overlay.tilePosition.x = -this._ox;
      overlay.tilePosition.y = -this._oy;
      overlay.tileScale.x = this._zoomX;
      overlay.tileScale.y = this._zoomY;
    }
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

  private _refreshEffectTexture() {
    if (!this._hasVisibleOverlay() || !this._bitmap) {
      this._setEffectTexture(Texture.EMPTY);
      return;
    }

    this._setEffectTexture(createEffectTexture(this._bitmap));
  }

  private _refreshBaseTexture() {
    this._setBaseTexture(this._bitmap ? new Texture(this._bitmap.texture) : Texture.EMPTY);
  }

  private _setBaseTexture(texture: Texture) {
    const previousTexture = this._baseTexture;

    this._baseTexture = texture;
    this.texture = texture;

    if (previousTexture !== Texture.EMPTY) {
      previousTexture.destroy(false);
    }
  }

  private _setEffectTexture(texture: Texture) {
    if (this._effectTexture !== Texture.EMPTY) {
      this._effectTexture.destroy(true);
    }

    this._effectTexture = texture;
    this._toneDarkOverlay.texture = texture;
    this._toneLightOverlay.texture = texture;
    this._colorOverlay.texture = texture;
  }

  private _hasVisibleOverlay() {
    return this._toneDarkOverlay.visible || this._toneLightOverlay.visible || this._colorOverlay.visible;
  }

  destroy(options?: Parameters<TilingSprite['destroy']>[0]) {
    this._unsubscribeBitmapChange?.();
    this._unsubscribeBitmapChange = null;
    this._setEffectTexture(Texture.EMPTY);
    this._setBaseTexture(Texture.EMPTY);
    super.destroy(options);
  }
}
