import { BaseTexture, Sprite, Texture } from 'pixi.js';
import { TkBitmap } from './TkBitmap';

const TILE_SIZE = 32;
const TILE_ID_B = 0;
const TILE_ID_C = 256;
const TILE_ID_D = 512;
const TILE_ID_E = 768;
const TILE_ID_A5 = 1536;
const TILE_ID_A1 = 2048;
const TILE_ID_A2 = 2816;
const TILE_ID_A3 = 4352;
const TILE_ID_A4 = 5888;
const TILE_ID_MAX = 8192;
const SHADOW_LAYER_INDEX = 3;
const UPPER_TILE_LAYER_INDEX = 2;
const SHADOW_ALPHA = 0.45;
const AUTOTILE_ANIMATION_INTERVAL = 30;
const WATER_SURFACE_SEQUENCE = [0, 1, 2, 1] as const;
const TILE_FLAG_UPPER = 0x10;

type QuarterTile = readonly [number, number];
type AutotileShape = readonly [QuarterTile, QuarterTile, QuarterTile, QuarterTile];
type AutotileTable = ReadonlyArray<AutotileShape>;
type CharacterSpec = {
  bitmap: TkBitmap | null;
  x: number;
  y: number;
  characterIndex: number;
  direction: number;
  pattern: number;
  name: string;
};
type TilemapLayerKind = 'ground0' | 'ground1' | 'shadow' | 'normal' | 'upper';

export type SerializedTable = {
  xsize: number;
  ysize: number;
  zsize: number;
  data: number[];
};

const FLOOR_AUTOTILE_TABLE: AutotileTable = [
  [
    [2, 4],
    [1, 4],
    [2, 3],
    [1, 3],
  ],
  [
    [2, 0],
    [1, 4],
    [2, 3],
    [1, 3],
  ],
  [
    [2, 4],
    [3, 0],
    [2, 3],
    [1, 3],
  ],
  [
    [2, 0],
    [3, 0],
    [2, 3],
    [1, 3],
  ],
  [
    [2, 4],
    [1, 4],
    [2, 3],
    [3, 1],
  ],
  [
    [2, 0],
    [1, 4],
    [2, 3],
    [3, 1],
  ],
  [
    [2, 4],
    [3, 0],
    [2, 3],
    [3, 1],
  ],
  [
    [2, 0],
    [3, 0],
    [2, 3],
    [3, 1],
  ],
  [
    [2, 4],
    [1, 4],
    [2, 1],
    [1, 3],
  ],
  [
    [2, 0],
    [1, 4],
    [2, 1],
    [1, 3],
  ],
  [
    [2, 4],
    [3, 0],
    [2, 1],
    [1, 3],
  ],
  [
    [2, 0],
    [3, 0],
    [2, 1],
    [1, 3],
  ],
  [
    [2, 4],
    [1, 4],
    [2, 1],
    [3, 1],
  ],
  [
    [2, 0],
    [1, 4],
    [2, 1],
    [3, 1],
  ],
  [
    [2, 4],
    [3, 0],
    [2, 1],
    [3, 1],
  ],
  [
    [2, 0],
    [3, 0],
    [2, 1],
    [3, 1],
  ],
  [
    [0, 4],
    [1, 4],
    [0, 3],
    [1, 3],
  ],
  [
    [0, 4],
    [3, 0],
    [0, 3],
    [1, 3],
  ],
  [
    [0, 4],
    [1, 4],
    [0, 3],
    [3, 1],
  ],
  [
    [0, 4],
    [3, 0],
    [0, 3],
    [3, 1],
  ],
  [
    [2, 2],
    [1, 2],
    [2, 3],
    [1, 3],
  ],
  [
    [2, 2],
    [1, 2],
    [2, 3],
    [3, 1],
  ],
  [
    [2, 2],
    [1, 2],
    [2, 1],
    [1, 3],
  ],
  [
    [2, 2],
    [1, 2],
    [2, 1],
    [3, 1],
  ],
  [
    [2, 4],
    [3, 4],
    [2, 3],
    [3, 3],
  ],
  [
    [2, 4],
    [3, 4],
    [2, 1],
    [3, 3],
  ],
  [
    [2, 0],
    [3, 4],
    [2, 3],
    [3, 3],
  ],
  [
    [2, 0],
    [3, 4],
    [2, 1],
    [3, 3],
  ],
  [
    [2, 4],
    [1, 4],
    [2, 5],
    [1, 5],
  ],
  [
    [2, 0],
    [1, 4],
    [2, 5],
    [1, 5],
  ],
  [
    [2, 4],
    [3, 0],
    [2, 5],
    [1, 5],
  ],
  [
    [2, 0],
    [3, 0],
    [2, 5],
    [1, 5],
  ],
  [
    [0, 4],
    [3, 4],
    [0, 3],
    [3, 3],
  ],
  [
    [2, 2],
    [1, 2],
    [2, 5],
    [1, 5],
  ],
  [
    [0, 2],
    [1, 2],
    [0, 3],
    [1, 3],
  ],
  [
    [0, 2],
    [1, 2],
    [0, 3],
    [3, 1],
  ],
  [
    [2, 2],
    [3, 2],
    [2, 3],
    [3, 3],
  ],
  [
    [2, 2],
    [3, 2],
    [2, 1],
    [3, 3],
  ],
  [
    [2, 4],
    [3, 4],
    [2, 5],
    [3, 5],
  ],
  [
    [2, 0],
    [3, 4],
    [2, 5],
    [3, 5],
  ],
  [
    [0, 4],
    [1, 4],
    [0, 5],
    [1, 5],
  ],
  [
    [0, 4],
    [3, 0],
    [0, 5],
    [1, 5],
  ],
  [
    [0, 2],
    [3, 2],
    [0, 3],
    [3, 3],
  ],
  [
    [0, 2],
    [1, 2],
    [0, 5],
    [1, 5],
  ],
  [
    [0, 4],
    [3, 4],
    [0, 5],
    [3, 5],
  ],
  [
    [2, 2],
    [3, 2],
    [2, 5],
    [3, 5],
  ],
  [
    [0, 2],
    [3, 2],
    [0, 5],
    [3, 5],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
] as const;

const WALL_AUTOTILE_TABLE: AutotileTable = [
  [
    [2, 2],
    [1, 2],
    [2, 1],
    [1, 1],
  ],
  [
    [0, 2],
    [1, 2],
    [0, 1],
    [1, 1],
  ],
  [
    [2, 0],
    [1, 0],
    [2, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [2, 2],
    [3, 2],
    [2, 1],
    [3, 1],
  ],
  [
    [0, 2],
    [3, 2],
    [0, 1],
    [3, 1],
  ],
  [
    [2, 0],
    [3, 0],
    [2, 1],
    [3, 1],
  ],
  [
    [0, 0],
    [3, 0],
    [0, 1],
    [3, 1],
  ],
  [
    [2, 2],
    [1, 2],
    [2, 3],
    [1, 3],
  ],
  [
    [0, 2],
    [1, 2],
    [0, 3],
    [1, 3],
  ],
  [
    [2, 0],
    [1, 0],
    [2, 3],
    [1, 3],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 3],
    [1, 3],
  ],
  [
    [2, 2],
    [3, 2],
    [2, 3],
    [3, 3],
  ],
  [
    [0, 2],
    [3, 2],
    [0, 3],
    [3, 3],
  ],
  [
    [2, 0],
    [3, 0],
    [2, 3],
    [3, 3],
  ],
  [
    [0, 0],
    [3, 0],
    [0, 3],
    [3, 3],
  ],
] as const;

const WATERFALL_AUTOTILE_TABLE: AutotileTable = [
  [
    [2, 0],
    [1, 0],
    [2, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [2, 0],
    [3, 0],
    [2, 1],
    [3, 1],
  ],
  [
    [0, 0],
    [3, 0],
    [0, 1],
    [3, 1],
  ],
] as const;

export class TkTilemap extends Sprite {
  private readonly _canvas: HTMLCanvasElement;
  private readonly _ctx: CanvasRenderingContext2D;
  private readonly _baseTexture: BaseTexture;
  private readonly _upperCanvas: HTMLCanvasElement;
  private readonly _upperCtx: CanvasRenderingContext2D;
  private readonly _upperBaseTexture: BaseTexture;
  private readonly _upperSprite: Sprite;
  private readonly _tileCacheCanvas: HTMLCanvasElement;
  private readonly _tileCacheCtx: CanvasRenderingContext2D;
  private readonly _upperTileCacheCanvas: HTMLCanvasElement;
  private readonly _upperTileCacheCtx: CanvasRenderingContext2D;
  private _bitmaps: Array<TkBitmap | null>;
  private _characters: CharacterSpec[];
  private _mapData: SerializedTable | null;
  private _flags: SerializedTable | null;
  private _ox: number;
  private _oy: number;
  private _animationFrame: number;
  private _tileCacheDirty: boolean;
  private _tileCacheStartX: number | null;
  private _tileCacheStartY: number | null;
  private _tileCacheAnimationStep: number | null;
  private _tileCacheBitmapRevisionKey: string | null;
  private _tileCacheCols: number;
  private _tileCacheRows: number;

  constructor(width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const texture = Texture.from(canvas);
    super(texture);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('failed to create 2d context');
    const upperCanvas = document.createElement('canvas');
    upperCanvas.width = width;
    upperCanvas.height = height;
    const upperTexture = Texture.from(upperCanvas);
    const upperCtx = upperCanvas.getContext('2d');
    if (!upperCtx) throw new Error('failed to create upper tilemap context');
    const upperSprite = new Sprite(upperTexture);
    const tileCacheCanvas = document.createElement('canvas');
    const tileCacheCtx = tileCacheCanvas.getContext('2d');
    if (!tileCacheCtx) throw new Error('failed to create tile cache context');
    const upperTileCacheCanvas = document.createElement('canvas');
    const upperTileCacheCtx = upperTileCacheCanvas.getContext('2d');
    if (!upperTileCacheCtx) throw new Error('failed to create upper tile cache context');

    this._canvas = canvas;
    this._ctx = ctx;
    this._baseTexture = texture.baseTexture;
    this._upperCanvas = upperCanvas;
    this._upperCtx = upperCtx;
    this._upperBaseTexture = upperTexture.baseTexture;
    this._upperSprite = upperSprite;
    this._tileCacheCanvas = tileCacheCanvas;
    this._tileCacheCtx = tileCacheCtx;
    this._upperTileCacheCanvas = upperTileCacheCanvas;
    this._upperTileCacheCtx = upperTileCacheCtx;
    this._bitmaps = [];
    this._characters = [];
    this._mapData = null;
    this._flags = null;
    this._ox = 0;
    this._oy = 0;
    this._animationFrame = 0;
    this._tileCacheDirty = true;
    this._tileCacheStartX = null;
    this._tileCacheStartY = null;
    this._tileCacheAnimationStep = null;
    this._tileCacheBitmapRevisionKey = null;
    this._tileCacheCols = 0;
    this._tileCacheRows = 0;
    this.roundPixels = true;
    this.zIndex = 0;
    this._upperSprite.roundPixels = true;
    this._upperSprite.zIndex = 200;
  }

  get upperLayer() {
    return this._upperSprite;
  }

  set bitmaps(value: Array<TkBitmap | null>) {
    this._bitmaps = value;
    this._invalidateTileCache();
  }

  set characters(value: CharacterSpec[]) {
    this._characters = value;
  }

  set mapData(value: SerializedTable | null) {
    this._mapData = value;
    this._invalidateTileCache();
  }

  set flags(value: SerializedTable | null) {
    this._flags = value;
    this._invalidateTileCache();
  }

  get ox() {
    return this._ox;
  }

  set ox(value: number) {
    this._ox = value;
  }

  get oy() {
    return this._oy;
  }

  set oy(value: number) {
    this._oy = value;
  }

  resize(width: number, height: number) {
    const nextWidth = Math.max(1, Math.trunc(Number(width) || 0));
    const nextHeight = Math.max(1, Math.trunc(Number(height) || 0));
    if (this._canvas.width === nextWidth && this._canvas.height === nextHeight) return;

    this._canvas.width = nextWidth;
    this._canvas.height = nextHeight;
    this._upperCanvas.width = nextWidth;
    this._upperCanvas.height = nextHeight;
    this._baseTexture.setSize(nextWidth, nextHeight);
    this._upperBaseTexture.setSize(nextWidth, nextHeight);
    this._invalidateTileCache();
    this.update();
  }

  update() {
    this._animationFrame += 1;
    this._paint();
  }

  private _paint() {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._upperCtx.clearRect(0, 0, this._upperCanvas.width, this._upperCanvas.height);

    if (!this.visible || !this._mapData) {
      this._baseTexture.update();
      this._upperBaseTexture.update();
      return;
    }

    const mapWidth = this._mapData.xsize;
    const mapHeight = this._mapData.ysize;
    const tileCols = Math.ceil(this._canvas.width / TILE_SIZE) + 1;
    const tileRows = Math.ceil(this._canvas.height / TILE_SIZE) + 1;
    const startX = Math.floor(this._ox / TILE_SIZE);
    const startY = Math.floor(this._oy / TILE_SIZE);
    const offsetX = -(this._ox % TILE_SIZE);
    const offsetY = -(this._oy % TILE_SIZE);
    const animationStep = this._autotileAnimationStep();
    const bitmapRevisionKey = this._bitmapRevisionKey();

    this._refreshTileCache(mapWidth, mapHeight, tileCols, tileRows, startX, startY, animationStep, bitmapRevisionKey);
    this._ctx.drawImage(this._tileCacheCanvas, offsetX, offsetY);

    this._drawCharacters(this._ctx);
    this._upperCtx.drawImage(this._upperTileCacheCanvas, offsetX, offsetY);
    this._baseTexture.update();
    this._upperBaseTexture.update();
  }

  override destroy(options?: Parameters<Sprite['destroy']>[0]) {
    this._upperSprite.parent?.removeChild(this._upperSprite);
    this._upperSprite.destroy(options as any);
    super.destroy(options as any);
  }

  private _refreshTileCache(
    mapWidth: number,
    mapHeight: number,
    tileCols: number,
    tileRows: number,
    startX: number,
    startY: number,
    animationStep: number,
    bitmapRevisionKey: string,
  ) {
    const nextCacheWidth = tileCols * TILE_SIZE;
    const nextCacheHeight = tileRows * TILE_SIZE;
    if (this._tileCacheCanvas.width !== nextCacheWidth || this._tileCacheCanvas.height !== nextCacheHeight) {
      this._tileCacheCanvas.width = nextCacheWidth;
      this._tileCacheCanvas.height = nextCacheHeight;
      this._upperTileCacheCanvas.width = nextCacheWidth;
      this._upperTileCacheCanvas.height = nextCacheHeight;
      this._tileCacheDirty = true;
    }

    const needsRepaint =
      this._tileCacheDirty ||
      this._tileCacheStartX !== startX ||
      this._tileCacheStartY !== startY ||
      this._tileCacheAnimationStep !== animationStep ||
      this._tileCacheBitmapRevisionKey !== bitmapRevisionKey ||
      this._tileCacheCols !== tileCols ||
      this._tileCacheRows !== tileRows;
    if (!needsRepaint || !this._mapData) return;

    const mapDepth = this._mapData.zsize;
    this._tileCacheCtx.clearRect(0, 0, this._tileCacheCanvas.width, this._tileCacheCanvas.height);
    this._upperTileCacheCtx.clearRect(0, 0, this._upperTileCacheCanvas.width, this._upperTileCacheCanvas.height);

    for (let row = 0; row < tileRows; row += 1) {
      for (let col = 0; col < tileCols; col += 1) {
        const mapX = startX + col;
        const mapY = startY + row;
        if (mapX < 0 || mapX >= mapWidth || mapY < 0 || mapY >= mapHeight) continue;

        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        this._drawTilemapLayer('ground0', this._tileCacheCtx, x, y, mapX, mapY, mapDepth, animationStep);
        this._drawTableEdge(this._tileCacheCtx, x, y, mapX, mapY, 0);
        this._drawTilemapLayer('ground1', this._tileCacheCtx, x, y, mapX, mapY, mapDepth, animationStep);
        this._drawTableEdge(this._tileCacheCtx, x, y, mapX, mapY, 1);
        this._drawTilemapLayer('shadow', this._tileCacheCtx, x, y, mapX, mapY, mapDepth, animationStep);
        this._drawTilemapLayer('normal', this._tileCacheCtx, x, y, mapX, mapY, mapDepth, animationStep);
        this._drawTilemapLayer('upper', this._upperTileCacheCtx, x, y, mapX, mapY, mapDepth, animationStep);
      }
    }

    this._tileCacheDirty = false;
    this._tileCacheStartX = startX;
    this._tileCacheStartY = startY;
    this._tileCacheAnimationStep = animationStep;
    this._tileCacheBitmapRevisionKey = bitmapRevisionKey;
    this._tileCacheCols = tileCols;
    this._tileCacheRows = tileRows;
  }

  private _drawTilemapLayer(
    kind: TilemapLayerKind,
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    mapX: number,
    mapY: number,
    mapDepth: number,
    animationStep: number,
  ) {
    if (kind === 'ground0') {
      this._drawTile(ctx, this._readTile(mapX, mapY, 0), screenX, screenY, animationStep);
      return;
    }

    if (kind === 'ground1') {
      if (mapDepth > 1) this._drawTile(ctx, this._readTile(mapX, mapY, 1), screenX, screenY, animationStep);
      return;
    }

    if (kind === 'shadow') {
      if (mapDepth > SHADOW_LAYER_INDEX)
        this._drawShadow(ctx, this._readTile(mapX, mapY, SHADOW_LAYER_INDEX), screenX, screenY);
      return;
    }

    if (kind === 'normal') {
      if (mapDepth <= UPPER_TILE_LAYER_INDEX) return;

      const tileId = this._readTile(mapX, mapY, UPPER_TILE_LAYER_INDEX);
      if (!this._isUpperTile(tileId)) this._drawTile(ctx, tileId, screenX, screenY, animationStep);
      return;
    }

    if (kind === 'upper') {
      if (UPPER_TILE_LAYER_INDEX >= mapDepth) return;

      const tileId = this._readTile(mapX, mapY, UPPER_TILE_LAYER_INDEX);
      if (this._isUpperTile(tileId)) this._drawTile(ctx, tileId, screenX, screenY, animationStep);
    }
  }

  private _drawTableEdge(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    mapX: number,
    mapY: number,
    layer: number,
  ) {
    if (mapY <= 0 || !this._mapData || layer >= this._mapData.zsize) return;

    const tileId = this._readTile(mapX, mapY - 1, layer);
    if (!this._isTableTile(tileId)) return;

    this._drawAutotileTableEdge(ctx, tileId, screenX, screenY);
  }

  private _drawShadow(ctx: CanvasRenderingContext2D, shadowBits: number, dx: number, dy: number) {
    const bits = shadowBits & 0x0f;
    if (bits === 0) return;

    const half = TILE_SIZE / 2;
    ctx.fillStyle = `rgba(0, 0, 0, ${SHADOW_ALPHA})`;

    if ((bits & 0x01) !== 0) ctx.fillRect(dx, dy, half, half);
    if ((bits & 0x02) !== 0) ctx.fillRect(dx + half, dy, half, half);
    if ((bits & 0x04) !== 0) ctx.fillRect(dx, dy + half, half, half);
    if ((bits & 0x08) !== 0) ctx.fillRect(dx + half, dy + half, half, half);
  }

  private _drawTile(ctx: CanvasRenderingContext2D, tileId: number, dx: number, dy: number, animationStep: number) {
    if (!isVisibleTile(tileId)) return;

    if (isAutotile(tileId)) {
      this._drawAutotile(ctx, tileId, dx, dy, animationStep);
    } else {
      this._drawNormalTile(ctx, tileId, dx, dy);
    }
  }

  private _drawNormalTile(ctx: CanvasRenderingContext2D, tileId: number, dx: number, dy: number) {
    const setNumber = isTileA5(tileId) ? 4 : 5 + Math.floor(tileId / 256);
    const sheet = this._bitmaps[setNumber];
    if (!sheet) {
      this._drawDebugTile(ctx, tileId, dx, dy);
      return;
    }

    const sx = ((Math.floor(tileId / 128) % 2) * 8 + (tileId % 8)) * TILE_SIZE;
    const sy = (Math.floor((tileId % 256) / 8) % 16) * TILE_SIZE;

    ctx.drawImage(sheet.canvas, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, TILE_SIZE, TILE_SIZE);
  }

  private _drawAutotile(ctx: CanvasRenderingContext2D, tileId: number, dx: number, dy: number, animationStep: number) {
    const kind = getAutotileKind(tileId);
    const shape = getAutotileShape(tileId);
    const tx = kind % 8;
    const ty = Math.floor(kind / 8);
    const waterSurfaceIndex = WATER_SURFACE_SEQUENCE[animationStep % WATER_SURFACE_SEQUENCE.length];
    let setNumber = 0;
    let bx = 0;
    let by = 0;
    let autotileTable = FLOOR_AUTOTILE_TABLE;
    let isTable = false;

    if (isTileA1(tileId)) {
      setNumber = 0;
      if (kind === 0) {
        bx = waterSurfaceIndex * 2;
        by = 0;
      } else if (kind === 1) {
        bx = waterSurfaceIndex * 2;
        by = 3;
      } else if (kind === 2) {
        bx = 6;
        by = 0;
      } else if (kind === 3) {
        bx = 6;
        by = 3;
      } else {
        bx = Math.floor(tx / 4) * 8;
        by = ty * 6 + (Math.floor(tx / 2) % 2) * 3;
        if (kind % 2 === 0) {
          bx += waterSurfaceIndex * 2;
        } else {
          bx += 6;
          autotileTable = WATERFALL_AUTOTILE_TABLE;
          by += animationStep % 3;
        }
      }
    } else if (isTileA2(tileId)) {
      setNumber = 1;
      bx = tx * 2;
      by = (ty - 2) * 3;
      isTable = this._isTableTile(tileId);
    } else if (isTileA3(tileId)) {
      setNumber = 2;
      bx = tx * 2;
      by = (ty - 6) * 2;
      autotileTable = WALL_AUTOTILE_TABLE;
    } else if (isTileA4(tileId)) {
      setNumber = 3;
      bx = tx * 2;
      by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
      if (ty % 2 === 1) {
        autotileTable = WALL_AUTOTILE_TABLE;
      }
    }

    const sheet = this._bitmaps[setNumber];
    if (!sheet) {
      this._drawDebugTile(ctx, tileId, dx, dy);
      return;
    }

    const table = autotileTable[shape];
    const half = TILE_SIZE / 2;
    for (let i = 0; i < 4; i += 1) {
      const [qsx, qsy] = table[i];
      const sx = (bx * 2 + qsx) * half;
      const sy = (by * 2 + qsy) * half;
      const tx1 = dx + (i % 2) * half;
      const ty1 = dy + Math.floor(i / 2) * half;

      if (isTable && (qsy === 1 || qsy === 5)) {
        const qsx2 = qsy === 1 ? (4 - qsx) % 4 : qsx;
        const qsy2 = 3;
        const sx2 = (bx * 2 + qsx2) * half;
        const sy2 = (by * 2 + qsy2) * half;
        ctx.drawImage(sheet.canvas, sx2, sy2, half, half, tx1, ty1, half, half);
        ctx.drawImage(sheet.canvas, sx, sy, half, half / 2, tx1, ty1 + half / 2, half, half / 2);
      } else {
        ctx.drawImage(sheet.canvas, sx, sy, half, half, tx1, ty1, half, half);
      }
    }
  }

  private _drawAutotileTableEdge(ctx: CanvasRenderingContext2D, tileId: number, dx: number, dy: number) {
    const kind = getAutotileKind(tileId);
    const shape = getAutotileShape(tileId);
    const tx = kind % 8;
    const ty = Math.floor(kind / 8);
    const bx = tx * 2;
    const by = (ty - 2) * 3;
    const sheet = this._bitmaps[1];
    if (!sheet) return;

    const table = FLOOR_AUTOTILE_TABLE[shape];
    const half = TILE_SIZE / 2;
    for (let i = 2; i < 4; i += 1) {
      const [qsx, qsy] = table[i];
      if (qsy !== 1 && qsy !== 5) continue;

      const sx = (bx * 2 + qsx) * half;
      const sy = (by * 2 + qsy) * half;
      const tx1 = dx + (i % 2) * half;
      ctx.drawImage(sheet.canvas, sx, sy + half / 2, half, half / 2, tx1, dy, half, half / 2);
    }
  }

  private _drawDebugTile(ctx: CanvasRenderingContext2D, tileId: number, dx: number, dy: number) {
    const hue = (tileId * 37) % 360;
    const flag = this._readFlag(tileId);

    ctx.fillStyle = `hsl(${hue}, 55%, 42%)`;
    ctx.fillRect(dx, dy, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.strokeRect(dx + 0.5, dy + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '10px monospace';
    ctx.fillText(String(tileId), dx + 4, dy + 12, TILE_SIZE - 8);

    if ((flag & TILE_FLAG_UPPER) !== 0) {
      ctx.strokeStyle = 'rgba(255, 240, 120, 0.9)';
      ctx.strokeRect(dx + 2.5, dy + 2.5, TILE_SIZE - 5, TILE_SIZE - 5);
    }
  }

  private _drawCharacters(ctx: CanvasRenderingContext2D) {
    const sorted = [...this._characters].sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });

    sorted.forEach((character) => {
      if (!character.bitmap) return;

      const isBig = character.name.includes('$');
      const isObjectCharacter = character.name.includes('!');
      const bitmap = character.bitmap.canvas;
      const frameWidth = isBig ? bitmap.width / 3 : bitmap.width / 12;
      const frameHeight = isBig ? bitmap.height / 4 : bitmap.height / 8;
      const characterBlockX = isBig ? 0 : (character.characterIndex % 4) * 3;
      const characterBlockY = isBig ? 0 : Math.floor(character.characterIndex / 4) * 4;
      const pattern = ((character.pattern % 3) + 3) % 3;
      const directionRow = directionToRow(character.direction);
      const sx = (characterBlockX + pattern) * frameWidth;
      const sy = (characterBlockY + directionRow) * frameHeight;
      const dx = character.x * TILE_SIZE - this._ox + (TILE_SIZE - frameWidth) / 2;
      const dy = character.y * TILE_SIZE - this._oy + TILE_SIZE - frameHeight + (isObjectCharacter ? 0 : -6);

      if (dx + frameWidth < 0 || dy + frameHeight < 0) return;
      if (dx > this._canvas.width || dy > this._canvas.height) return;

      ctx.drawImage(bitmap, sx, sy, frameWidth, frameHeight, dx, dy, frameWidth, frameHeight);
    });
  }

  private _invalidateTileCache() {
    this._tileCacheDirty = true;
  }

  private _autotileAnimationStep() {
    return Math.floor(Math.max(0, this._animationFrame - 1) / AUTOTILE_ANIMATION_INTERVAL);
  }

  private _bitmapRevisionKey() {
    return this._bitmaps.map((bitmap) => bitmap?.revision ?? 'nil').join(',');
  }

  private _readTile(x: number, y: number, z: number) {
    if (!this._mapData) return 0;

    const index = x + y * this._mapData.xsize + z * this._mapData.xsize * this._mapData.ysize;
    return Number(this._mapData.data[index] ?? 0);
  }

  private _readFlag(tileId: number) {
    if (!this._flags) return 0;

    return Number(this._flags.data[tileId] ?? 0);
  }

  private _isTableTile(tileId: number) {
    return isTileA2(tileId) && (this._readFlag(tileId) & 0x80) !== 0;
  }

  private _isUpperTile(tileId: number) {
    return isVisibleTile(tileId) && (this._readFlag(tileId) & TILE_FLAG_UPPER) !== 0;
  }
}

function isVisibleTile(tileId: number) {
  return tileId > 0 && tileId < TILE_ID_MAX;
}

function isAutotile(tileId: number) {
  return tileId >= TILE_ID_A1;
}

function isTileA1(tileId: number) {
  return tileId >= TILE_ID_A1 && tileId < TILE_ID_A2;
}

function isTileA2(tileId: number) {
  return tileId >= TILE_ID_A2 && tileId < TILE_ID_A3;
}

function isTileA3(tileId: number) {
  return tileId >= TILE_ID_A3 && tileId < TILE_ID_A4;
}

function isTileA4(tileId: number) {
  return tileId >= TILE_ID_A4 && tileId < TILE_ID_MAX;
}

function isTileA5(tileId: number) {
  return tileId >= TILE_ID_A5 && tileId < TILE_ID_A1;
}

function getAutotileKind(tileId: number) {
  return Math.floor((tileId - TILE_ID_A1) / 48);
}

function getAutotileShape(tileId: number) {
  return (tileId - TILE_ID_A1) % 48;
}

function directionToRow(direction: number) {
  switch (direction) {
    case 2:
      return 0;
    case 4:
      return 1;
    case 6:
      return 2;
    case 8:
      return 3;
    default:
      return 0;
  }
}

// Keep the VXAce tile ID boundary constants documented even before every range is used.
void TILE_ID_B;
void TILE_ID_C;
void TILE_ID_D;
void TILE_ID_E;
