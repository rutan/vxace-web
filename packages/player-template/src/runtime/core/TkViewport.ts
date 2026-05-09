import { BLEND_MODES, ColorMatrixFilter, Container, Graphics } from 'pixi.js';
import { TkRect, TkColor, TkTone } from './types';
import {
  clampChannel,
  normalizeColor,
  normalizeTone,
  clampUnit,
  rgbToHex,
  normalizeRect,
  buildSaturationMatrix,
} from './utils';

export class TkViewport {
  private readonly _root: Container;
  private readonly _content: Container;
  private readonly _mask: Graphics;
  private readonly _toneDarkOverlay: Graphics;
  private readonly _toneLightOverlay: Graphics;
  private readonly _colorOverlay: Graphics;
  private readonly _flashOverlay: Graphics;
  private readonly _grayFilter: ColorMatrixFilter;
  private _rect: TkRect;
  private _color: TkColor;
  private _tone: TkTone;
  private _visible: boolean;
  private _zIndex: number;
  private _ox: number;
  private _oy: number;
  private _flashColor: TkColor;
  private _flashDuration: number;
  private _flashRemaining: number;
  private _flashHidesContent: boolean;

  constructor(width: number, height: number) {
    this._root = new Container();
    this._root.sortableChildren = false;
    this._content = new Container();
    this._content.sortableChildren = false;
    this._mask = new Graphics();
    this._toneDarkOverlay = new Graphics();
    this._toneLightOverlay = new Graphics();
    this._colorOverlay = new Graphics();
    this._flashOverlay = new Graphics();
    this._grayFilter = new ColorMatrixFilter();
    this._rect = { x: 0, y: 0, width, height };
    this._color = { red: 0, green: 0, blue: 0, alpha: 0 };
    this._tone = { red: 0, green: 0, blue: 0, gray: 0 };
    this._visible = true;
    this._zIndex = 0;
    this._ox = 0;
    this._oy = 0;
    this._flashColor = { red: 0, green: 0, blue: 0, alpha: 0 };
    this._flashDuration = 0;
    this._flashRemaining = 0;
    this._flashHidesContent = false;

    this._mask.renderable = false;
    this._toneDarkOverlay.blendMode = BLEND_MODES.MULTIPLY;
    this._toneLightOverlay.blendMode = BLEND_MODES.ADD;
    this._content.mask = this._mask;
    this._toneDarkOverlay.mask = this._mask;
    this._toneLightOverlay.mask = this._mask;
    this._colorOverlay.mask = this._mask;
    this._flashOverlay.mask = this._mask;

    this._root.addChild(this._content);
    this._root.addChild(this._toneDarkOverlay);
    this._root.addChild(this._toneLightOverlay);
    this._root.addChild(this._colorOverlay);
    this._root.addChild(this._flashOverlay);
    this._root.addChild(this._mask);

    this._refresh();
  }

  get displayObject() {
    return this._root;
  }

  get content() {
    return this._content;
  }

  get visible() {
    return this._visible;
  }

  set visible(value: boolean) {
    this._visible = Boolean(value);
    this._refreshVisibility();
  }

  get zIndex() {
    return this._zIndex;
  }

  set zIndex(value: number) {
    this._zIndex = Number(value) || 0;
    this._root.zIndex = this._zIndex;
  }

  get ox() {
    return this._ox;
  }

  set ox(value: number) {
    this._ox = Number(value) || 0;
    this._refreshScroll();
  }

  get oy() {
    return this._oy;
  }

  set oy(value: number) {
    this._oy = Number(value) || 0;
    this._refreshScroll();
  }

  set rect(value: TkRect) {
    this._rect = normalizeRect(value);
    this._refreshLayout();
  }

  set color(value: TkColor) {
    this._color = normalizeColor(value);
    this._refreshColorOverlay();
  }

  set tone(value: TkTone) {
    this._tone = normalizeTone(value);
    this._refreshTone();
  }

  flash(color: TkColor | null, duration: number) {
    this._flashColor = color ? normalizeColor(color) : { red: 0, green: 0, blue: 0, alpha: 0 };
    this._flashDuration = Math.max(0, Math.trunc(Number(duration) || 0));
    this._flashRemaining = this._flashDuration;
    this._flashHidesContent = color == null && this._flashDuration > 0;
    this._refreshFlashOverlay();
    this._refreshFlashVisibility();
  }

  advanceEffects() {
    if (this._flashRemaining > 0) {
      this._flashRemaining -= 1;
      this._refreshFlashOverlay();
      this._refreshFlashVisibility();
    }
  }

  private _refresh() {
    this._refreshLayout();
    this._refreshScroll();
    this._refreshTone();
    this._refreshColorOverlay();
    this._refreshFlashOverlay();
    this._refreshVisibility();
    this._root.zIndex = this._zIndex;
  }

  private _refreshLayout() {
    this._root.x = this._rect.x;
    this._root.y = this._rect.y;
    this._mask.clear();
    this._mask.beginFill(0xffffff, 1);
    this._mask.drawRect(0, 0, this._rect.width, this._rect.height);
    this._mask.endFill();
    this._refreshTone();
    this._refreshColorOverlay();
    this._refreshFlashOverlay();
    this._refreshVisibility();
  }

  private _refreshScroll() {
    this._content.x = -this._ox;
    this._content.y = -this._oy;
  }

  private _refreshVisibility() {
    this._root.visible = this._visible && this._rect.width > 0 && this._rect.height > 0;
  }

  private _refreshTone() {
    const width = this._rect.width;
    const height = this._rect.height;
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

    this._toneLightOverlay.clear();
    if (hasPositive && width > 0 && height > 0) {
      this._toneLightOverlay.beginFill(rgbToHex(positive.red, positive.green, positive.blue), 1);
      this._toneLightOverlay.drawRect(0, 0, width, height);
      this._toneLightOverlay.endFill();
    }
    this._toneLightOverlay.visible = hasPositive;

    this._toneDarkOverlay.clear();
    if (hasNegative && width > 0 && height > 0) {
      this._toneDarkOverlay.beginFill(rgbToHex(negative.red, negative.green, negative.blue), 1);
      this._toneDarkOverlay.drawRect(0, 0, width, height);
      this._toneDarkOverlay.endFill();
    }
    this._toneDarkOverlay.visible = hasNegative;

    const saturation = 1 - clampUnit(this._tone.gray / 255);
    if (saturation < 1) {
      this._grayFilter.matrix = buildSaturationMatrix(saturation);
      this._content.filters = [this._grayFilter];
    } else {
      this._content.filters = [];
    }
  }

  private _refreshColorOverlay() {
    const width = this._rect.width;
    const height = this._rect.height;
    const alpha = clampUnit(this._color.alpha / 255);
    const visible = alpha > 0 && width > 0 && height > 0;

    this._colorOverlay.clear();
    if (visible) {
      this._colorOverlay.beginFill(rgbToHex(this._color.red, this._color.green, this._color.blue), alpha);
      this._colorOverlay.drawRect(0, 0, width, height);
      this._colorOverlay.endFill();
    }
    this._colorOverlay.visible = visible;
  }

  private _refreshFlashOverlay() {
    const width = this._rect.width;
    const height = this._rect.height;
    const progress = this._flashDuration > 0 ? this._flashRemaining / this._flashDuration : 0;
    const alpha = clampUnit((this._flashColor.alpha / 255) * progress);
    const visible = alpha > 0 && width > 0 && height > 0;

    this._flashOverlay.clear();
    if (visible) {
      this._flashOverlay.beginFill(
        rgbToHex(this._flashColor.red, this._flashColor.green, this._flashColor.blue),
        alpha,
      );
      this._flashOverlay.drawRect(0, 0, width, height);
      this._flashOverlay.endFill();
    }
    this._flashOverlay.visible = visible;
  }

  private _refreshFlashVisibility() {
    this._content.visible = !(this._flashHidesContent && this._flashRemaining > 0);
  }
}
