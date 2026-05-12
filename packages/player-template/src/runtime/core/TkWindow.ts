import { Container, Graphics, Sprite, Rectangle, Texture, TilingSprite } from 'pixi.js';
import { TkBitmap } from './TkBitmap';
import { TkRect, TkTone } from './types';
import { clampChannel, normalizeTone } from './utils';

type NineSliceOptions = {
  fillCenter?: boolean;
  tileVerticalEdges?: boolean;
};

export class TkWindow extends Container {
  private readonly _opennessMask: Graphics;
  private readonly _backgroundSprite: Sprite;
  private readonly _contentsSprite: Sprite;
  private readonly _contentsMask: Graphics;
  private readonly _cursor: Container;
  private readonly _arrows: Graphics;
  private readonly _pauseSign: Graphics;
  private readonly _frame: Container;
  private _windowskin: TkBitmap | null;
  private _windowWidth: number;
  private _windowHeight: number;
  private _padding: number;
  private _paddingBottom: number;
  private _opacity: number;
  private _backOpacity: number;
  private _contentsOpacity: number;
  private _openness: number;
  private _active: boolean;
  private _cursorRect: TkRect;
  private _tone: TkTone;
  private _ox: number;
  private _oy: number;
  private _arrowsVisible: boolean;
  private _pause: boolean;
  private _contentsBitmap: TkBitmap | null;
  private _backgroundCompositeTexture: Texture | null;
  _scrollArrowState: { up: boolean; down: boolean; left: boolean; right: boolean };
  private _requestedVisible: boolean;
  private _closedContentsRevision: number;
  private _hideContentsUntilRefresh: boolean;
  private _hasPresentedOpenContents: boolean;
  private _unsubscribeContentsChange: (() => void) | null;
  private _animationCount: number;

  constructor() {
    super();

    this._opennessMask = new Graphics();
    this._backgroundSprite = new Sprite(Texture.EMPTY);
    this._contentsSprite = new Sprite(Texture.EMPTY);
    this._contentsMask = new Graphics();
    this._cursor = new Container();
    this._arrows = new Graphics();
    this._pauseSign = new Graphics();
    this._frame = new Container();
    this._windowskin = null;
    this._windowWidth = 96;
    this._windowHeight = 96;
    this._padding = 12;
    this._paddingBottom = 12;
    this._opacity = 255;
    this._backOpacity = 192;
    this._contentsOpacity = 255;
    this._openness = 255;
    this._active = true;
    this._cursorRect = { x: 0, y: 0, width: 0, height: 0 };
    this._tone = { red: 0, green: 0, blue: 0, gray: 0 };
    this._ox = 0;
    this._oy = 0;
    this._arrowsVisible = true;
    this._pause = false;
    this._contentsBitmap = null;
    this._backgroundCompositeTexture = null;
    this._scrollArrowState = { up: false, down: false, left: false, right: false };
    this._requestedVisible = true;
    this._closedContentsRevision = 0;
    this._hideContentsUntilRefresh = false;
    this._hasPresentedOpenContents = false;
    this._unsubscribeContentsChange = null;
    this._animationCount = 0;

    this._contentsSprite.mask = this._contentsMask;
    this.mask = this._opennessMask;

    this.addChild(this._backgroundSprite);
    this.addChild(this._contentsSprite);
    this.addChild(this._cursor);
    this.addChild(this._frame);
    this.addChild(this._arrows);
    this.addChild(this._pauseSign);
    this.addChild(this._contentsMask);
    this.addChild(this._opennessMask);

    this._refresh();
  }

  get windowVisible() {
    return this._requestedVisible;
  }

  set windowVisible(value: boolean) {
    this._requestedVisible = Boolean(value);
    this._refreshAlpha();
  }

  get windowWidth() {
    return this._windowWidth;
  }

  set windowWidth(value: number) {
    this._windowWidth = Math.max(value, 1);
    this._refresh();
  }

  get windowHeight() {
    return this._windowHeight;
  }

  set windowHeight(value: number) {
    this._windowHeight = Math.max(value, 1);
    this._refresh();
  }

  get padding() {
    return this._padding;
  }

  set padding(value: number) {
    this._padding = Math.max(value, 0);
    this._refresh();
  }

  get paddingBottom() {
    return this._paddingBottom;
  }

  set paddingBottom(value: number) {
    this._paddingBottom = Math.max(value, 0);
    this._refresh();
  }

  get opacity() {
    return this._opacity;
  }

  set opacity(value: number) {
    this._opacity = clampChannel(value);
    this._refreshAlpha();
  }

  get backOpacity() {
    return this._backOpacity;
  }

  set backOpacity(value: number) {
    this._backOpacity = clampChannel(value);
    this._refreshAlpha();
  }

  get contentsOpacity() {
    return this._contentsOpacity;
  }

  set contentsOpacity(value: number) {
    this._contentsOpacity = clampChannel(value);
    this._refreshAlpha();
  }

  get openness() {
    return this._openness;
  }

  set openness(value: number) {
    const previousOpenness = this._openness;
    this._openness = clampChannel(value);
    if (this._openness <= 0) {
      if (this._hasPresentedOpenContents) {
        this._closedContentsRevision = this._contentsBitmap?.revision ?? 0;
        this._hideContentsUntilRefresh = true;
      }
    } else {
      if (previousOpenness <= 0 && !this._hideContentsUntilRefresh) {
        this._closedContentsRevision = this._contentsBitmap?.revision ?? 0;
      }
    }
    this._refreshOpennessMask();
    this._refreshAlpha();
  }

  get active() {
    return this._active;
  }

  set active(value: boolean) {
    this._active = Boolean(value);
    this._refreshCursorAlpha();
  }

  get arrowsVisible() {
    return this._arrowsVisible;
  }

  set arrowsVisible(value: boolean) {
    this._arrowsVisible = Boolean(value);
    this._refreshArrows();
  }

  get pause() {
    return this._pause;
  }

  set pause(value: boolean) {
    this._pause = Boolean(value);
    this._refreshPauseSign();
  }

  get ox() {
    return this._ox;
  }

  set ox(value: number) {
    this._ox = Math.trunc(Number(value) || 0);
    this._refreshContentsPosition();
    this._refreshCursor();
    this._refreshArrows();
  }

  get oy() {
    return this._oy;
  }

  set oy(value: number) {
    this._oy = Math.trunc(Number(value) || 0);
    this._refreshContentsPosition();
    this._refreshCursor();
    this._refreshArrows();
  }

  set windowskin(value: TkBitmap | null) {
    this._windowskin = value;
    this._refresh();
  }

  set contents(value: TkBitmap | null) {
    this._unsubscribeContentsChange?.();
    this._contentsBitmap = value;
    this._contentsSprite.texture = value ? new Texture(value.texture) : Texture.EMPTY;
    this._closedContentsRevision = value?.revision ?? 0;
    this._hideContentsUntilRefresh = false;
    this._unsubscribeContentsChange = value?.onChange(() => this._refreshAlpha()) ?? null;
    this._refresh();
  }

  set cursorRect(value: TkRect) {
    this._cursorRect = value;
    this._refreshCursor();
  }

  set tone(value: TkTone) {
    this._tone = normalizeTone(value);
    this._refreshTone();
  }

  destroy(options?: Parameters<Container['destroy']>[0]) {
    this._unsubscribeContentsChange?.();
    this._unsubscribeContentsChange = null;
    this._setBackgroundTexture(Texture.EMPTY);
    super.destroy(options);
  }

  notePresented() {
    if (this.visible && this._openness > 0 && this._contentsSprite.alpha > 0) {
      this._hasPresentedOpenContents = true;
    }
  }

  update() {
    this._animationCount += 1;
    this._refreshCursorAlpha();
  }

  private _refresh() {
    this._refreshLayout();
    this._refreshOpennessMask();
    this._refreshFrame();
    this._refreshCursor();
    this._refreshArrows();
    this._refreshPauseSign();
    this._refreshTone();
    this._refreshAlpha();
  }

  private _refreshLayout() {
    const innerMargin = 2;
    const innerWidth = Math.max(this._windowWidth - innerMargin * 2, 1);
    const innerHeight = Math.max(this._windowHeight - innerMargin * 2, 1);
    const contentsWidth = Math.max(this._windowWidth - this._padding * 2, 1);
    const contentsHeight = Math.max(this._windowHeight - this._padding - this._paddingBottom, 1);

    this._backgroundSprite.x = innerMargin;
    this._backgroundSprite.y = innerMargin;
    this._backgroundSprite.width = innerWidth;
    this._backgroundSprite.height = innerHeight;

    this._refreshContentsPosition();

    this._contentsMask.clear();
    this._contentsMask.beginFill(0xffffff, 1);
    this._contentsMask.drawRect(this._padding, this._padding, contentsWidth, contentsHeight);
    this._contentsMask.endFill();
  }

  private _refreshOpennessMask() {
    const openRate = this._openness / 255;
    const openHeight = this._windowHeight * openRate;
    const y = (this._windowHeight - openHeight) / 2;

    this._opennessMask.clear();
    if (openHeight <= 0) return;

    this._opennessMask.beginFill(0xffffff, 1);
    this._opennessMask.drawRect(0, y, this._windowWidth, openHeight);
    this._opennessMask.endFill();
  }

  private _refreshContentsPosition() {
    this._contentsSprite.x = this._padding - this._ox;
    this._contentsSprite.y = this._padding - this._oy;
  }

  private _refreshBackgroundTexture() {
    if (!this._windowskin) {
      this._setBackgroundTexture(Texture.EMPTY);
      return;
    }

    const innerMargin = 2;
    const innerWidth = Math.max(this._windowWidth - innerMargin * 2, 1);
    const innerHeight = Math.max(this._windowHeight - innerMargin * 2, 1);
    const canvas = document.createElement('canvas');
    canvas.width = innerWidth;
    canvas.height = innerHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      this._setBackgroundTexture(Texture.EMPTY);
      return;
    }

    context.imageSmoothingEnabled = true;
    context.drawImage(this._windowskin.canvas, 0, 0, 64, 64, 0, 0, innerWidth, innerHeight);

    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 64;
    patternCanvas.height = 64;
    const patternContext = patternCanvas.getContext('2d');
    if (patternContext) {
      patternContext.drawImage(this._windowskin.canvas, 0, 64, 64, 64, 0, 0, 64, 64);
      const pattern = context.createPattern(patternCanvas, 'repeat');
      if (pattern) {
        context.fillStyle = pattern;
        context.fillRect(0, 0, innerWidth, innerHeight);
      }
    }

    this._applyToneToImageData(context, innerWidth, innerHeight);
    this._setBackgroundTexture(Texture.from(canvas));
  }

  private _refreshFrame() {
    const width = this._windowWidth;
    const height = this._windowHeight;

    this._frame.removeChildren();
    if (!this._windowskin || width <= 0 || height <= 0) return;

    this._addNineSlice(this._frame, 64, 0, 64, 64, 16, 0, 0, width, height);
  }

  private _refreshCursor() {
    const rect = this._cursorRect;
    this._cursor.removeChildren();

    if (rect.width <= 0 || rect.height <= 0) return;

    const x = this._padding + rect.x - this._ox;
    const y = this._padding + rect.y - this._oy;
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);

    if (!this._windowskin) {
      const fallback = new Graphics();
      fallback.lineStyle(2, 0xf7f7f7, 0.85);
      fallback.beginFill(0xffffff, 0.12);
      fallback.drawRoundedRect(x, y, width, height, 8);
      fallback.endFill();
      this._cursor.addChild(fallback);
      return;
    }

    this._addNineSlice(this._cursor, 64, 64, 32, 32, 2, x, y, width, height, {
      fillCenter: true,
      tileVerticalEdges: false,
    });
  }

  private _refreshArrows() {
    const width = this._windowWidth;
    const height = this._windowHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const inset = 8;
    const size = 5;
    const maxScrollX = Math.max(0, (this._contentsBitmap?.width ?? 0) - this._contentsViewWidth());
    const maxScrollY = Math.max(0, (this._contentsBitmap?.height ?? 0) - this._contentsViewHeight());
    const up = this._oy > 0;
    const down = this._oy < maxScrollY;
    const left = this._ox > 0;
    const right = this._ox < maxScrollX;

    this._scrollArrowState = { up, down, left, right };

    this._arrows.clear();
    if (!this._arrowsVisible || width <= 24 || height <= 24 || (!up && !down && !left && !right)) {
      this._arrows.visible = false;
      return;
    }

    this._arrows.beginFill(0xffffff, 0.75);
    if (up) this._arrows.drawPolygon([centerX, inset, centerX - size, inset + size, centerX + size, inset + size]);
    if (down) {
      this._arrows.drawPolygon([
        centerX,
        height - inset,
        centerX - size,
        height - inset - size,
        centerX + size,
        height - inset - size,
      ]);
    }
    if (left) this._arrows.drawPolygon([inset, centerY, inset + size, centerY - size, inset + size, centerY + size]);
    if (right) {
      this._arrows.drawPolygon([
        width - inset,
        centerY,
        width - inset - size,
        centerY - size,
        width - inset - size,
        centerY + size,
      ]);
    }
    this._arrows.endFill();
    this._arrows.visible = true;
  }

  private _refreshPauseSign() {
    const width = this._windowWidth;
    const height = this._windowHeight;
    const centerX = width / 2;
    const y = height - 12;

    this._pauseSign.clear();
    if (!this._pause || width <= 24 || height <= 24) {
      this._pauseSign.visible = false;
      return;
    }

    this._pauseSign.beginFill(0xffffff, 0.85);
    this._pauseSign.drawPolygon([centerX - 8, y, centerX + 8, y, centerX, y + 7]);
    this._pauseSign.endFill();
    this._pauseSign.visible = true;
  }

  private _refreshTone() {
    this._refreshBackgroundTexture();
  }

  private _refreshAlpha() {
    const openRate = this._openness / 255;
    const windowRate = (this._opacity / 255) * openRate;
    const backRate = (this._backOpacity / 255) * windowRate;
    const contentsRevision = this._contentsBitmap?.revision ?? 0;
    if (this._hideContentsUntilRefresh && contentsRevision !== this._closedContentsRevision) {
      this._hideContentsUntilRefresh = false;
    }
    const staleContentsRate = this._hideContentsUntilRefresh ? 0 : 1;
    const contentsRate = (this._contentsOpacity / 255) * openRate * staleContentsRate;

    this.visible = this._requestedVisible && openRate > 0;
    this._frame.alpha = windowRate;
    this._backgroundSprite.alpha = backRate;
    this._contentsSprite.alpha = contentsRate;
    this._arrows.alpha = windowRate;
    this._pauseSign.alpha = windowRate;
    this._refreshCursorAlpha();
  }

  private _refreshCursorAlpha() {
    const blinkCount = this._animationCount % 40;
    let cursorOpacity = this._contentsOpacity;

    if (this._active) {
      if (blinkCount < 20) {
        cursorOpacity -= blinkCount * 8;
      } else {
        cursorOpacity -= (40 - blinkCount) * 8;
      }
    } else {
      cursorOpacity -= 160;
    }

    this._cursor.alpha = clampChannel(cursorOpacity) / 255;
    this._cursor.visible = this._openness > 0;
  }

  private _contentsViewWidth() {
    return Math.max(this._windowWidth - this._padding * 2, 1);
  }

  private _contentsViewHeight() {
    return Math.max(this._windowHeight - this._padding - this._paddingBottom, 1);
  }

  private _addNineSlice(
    container: Container,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    cornerSize: number,
    destX: number,
    destY: number,
    destWidth: number,
    destHeight: number,
    options: NineSliceOptions = {},
  ) {
    const { fillCenter = false, tileVerticalEdges = true } = options;
    const edgeWidth = Math.max(sourceWidth - cornerSize * 2, 1);
    const edgeHeight = Math.max(sourceHeight - cornerSize * 2, 1);
    const destCornerWidth = Math.min(cornerSize, destWidth / 2);
    const destCornerHeight = Math.min(cornerSize, destHeight / 2);
    const innerWidth = Math.max(destWidth - destCornerWidth * 2, 0);
    const innerHeight = Math.max(destHeight - destCornerHeight * 2, 0);
    const right = destX + Math.max(destWidth - destCornerWidth, 0);
    const bottom = destY + Math.max(destHeight - destCornerHeight, 0);

    this._addSkinSprite(
      container,
      sourceX,
      sourceY,
      cornerSize,
      cornerSize,
      destX,
      destY,
      destCornerWidth,
      destCornerHeight,
    );
    this._addSkinSprite(
      container,
      sourceX + cornerSize,
      sourceY,
      edgeWidth,
      cornerSize,
      destX + destCornerWidth,
      destY,
      innerWidth,
      destCornerHeight,
    );
    this._addSkinSprite(
      container,
      sourceX + cornerSize + edgeWidth,
      sourceY,
      cornerSize,
      cornerSize,
      right,
      destY,
      destCornerWidth,
      destCornerHeight,
    );
    if (tileVerticalEdges) {
      this._addSkinTilingSprite(
        container,
        sourceX,
        sourceY + cornerSize,
        cornerSize,
        edgeHeight,
        destX,
        destY + destCornerHeight,
        destCornerWidth,
        innerHeight,
      );
      this._addSkinTilingSprite(
        container,
        sourceX + cornerSize + edgeWidth,
        sourceY + cornerSize,
        cornerSize,
        edgeHeight,
        right,
        destY + destCornerHeight,
        destCornerWidth,
        innerHeight,
      );
    } else {
      this._addSkinSprite(
        container,
        sourceX,
        sourceY + cornerSize,
        cornerSize,
        edgeHeight,
        destX,
        destY + destCornerHeight,
        destCornerWidth,
        innerHeight,
      );
      this._addSkinSprite(
        container,
        sourceX + cornerSize + edgeWidth,
        sourceY + cornerSize,
        cornerSize,
        edgeHeight,
        right,
        destY + destCornerHeight,
        destCornerWidth,
        innerHeight,
      );
    }
    if (fillCenter) {
      this._addSkinSprite(
        container,
        sourceX + cornerSize,
        sourceY + cornerSize,
        edgeWidth,
        edgeHeight,
        destX + destCornerWidth,
        destY + destCornerHeight,
        innerWidth,
        innerHeight,
      );
    }
    this._addSkinSprite(
      container,
      sourceX,
      sourceY + cornerSize + edgeHeight,
      cornerSize,
      cornerSize,
      destX,
      bottom,
      destCornerWidth,
      destCornerHeight,
    );
    this._addSkinSprite(
      container,
      sourceX + cornerSize,
      sourceY + cornerSize + edgeHeight,
      edgeWidth,
      cornerSize,
      destX + destCornerWidth,
      bottom,
      innerWidth,
      destCornerHeight,
    );
    this._addSkinSprite(
      container,
      sourceX + cornerSize + edgeWidth,
      sourceY + cornerSize + edgeHeight,
      cornerSize,
      cornerSize,
      right,
      bottom,
      destCornerWidth,
      destCornerHeight,
    );
  }

  private _addSkinSprite(
    container: Container,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    destX: number,
    destY: number,
    destWidth: number,
    destHeight: number,
  ) {
    if (!this._windowskin || sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) return;

    const sprite = new Sprite(this._skinTexture(sourceX, sourceY, sourceWidth, sourceHeight));
    sprite.x = destX;
    sprite.y = destY;
    sprite.width = destWidth;
    sprite.height = destHeight;
    container.addChild(sprite);
  }

  private _addSkinTilingSprite(
    container: Container,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    destX: number,
    destY: number,
    destWidth: number,
    destHeight: number,
  ) {
    if (!this._windowskin || sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) return;

    const sprite = new TilingSprite(
      this._skinTexture(sourceX, sourceY, sourceWidth, sourceHeight),
      destWidth,
      destHeight,
    );
    sprite.x = destX;
    sprite.y = destY;
    container.addChild(sprite);
  }

  private _skinTexture(x: number, y: number, width: number, height: number) {
    return new Texture(this._windowskin!.texture, new Rectangle(x, y, width, height));
  }

  private _setBackgroundTexture(texture: Texture) {
    const previousTexture = this._backgroundCompositeTexture;
    this._backgroundCompositeTexture = texture === Texture.EMPTY ? null : texture;
    this._backgroundSprite.texture = texture;
    previousTexture?.destroy(true);
  }

  private _applyToneToImageData(context: CanvasRenderingContext2D, width: number, height: number) {
    if (this._tone.red === 0 && this._tone.green === 0 && this._tone.blue === 0 && this._tone.gray === 0) return;

    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    const grayRate = this._tone.gray / 255;
    const saturation = 1 - grayRate;

    for (let index = 0; index < data.length; index += 4) {
      let red = data[index] + this._tone.red;
      let green = data[index + 1] + this._tone.green;
      let blue = data[index + 2] + this._tone.blue;

      if (grayRate > 0) {
        const gray = red * 0.3086 + green * 0.6094 + blue * 0.082;
        red = gray * grayRate + red * saturation;
        green = gray * grayRate + green * saturation;
        blue = gray * grayRate + blue * saturation;
      }

      data[index] = clampChannel(red);
      data[index + 1] = clampChannel(green);
      data[index + 2] = clampChannel(blue);
    }

    context.putImageData(imageData, 0, 0);
  }
}
