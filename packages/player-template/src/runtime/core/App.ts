import { GameManifest } from '@rutan/rpgmaker-vxace-web-game-manifest';
import { Application, Container, Graphics as PixiGraphics, Sprite, Texture, type DisplayObject } from 'pixi.js';
import {
  completeBlockingResourceWaitIfIdle,
  configureBlockingResourceWaitPresenter,
  trackBlockingResourceWait,
} from '../utils/blockingResourceWait';
import { configureResourceLoadErrorPresenter } from '../utils/resourceRetry';
import {
  FALLBACK_FONT_RENDER_METRICS,
  FontRenderMetricsRegistry,
  type FontRenderMetricsDescriptor,
} from './FontRenderMetrics';
import { GameAssetProvider } from './GameAssetProvider';
import { KeyManager } from './KeyManager';
import { createDefaultPresenter, type Presenter } from './presenter';
import { RgssDisplayList } from './RgssDisplayList';
import { TkBitmap } from './TkBitmap';
import { TkPlane } from './TkPlane';
import { TkSprite } from './TkSprite';
import { TkTilemap, type SerializedTable } from './TkTilemap';
import { TkViewport } from './TkViewport';
import { TkWindow } from './TkWindow';
import { TkColor, TkTone } from './types';
import { clampChannel, clampUnit } from './utils';
import { VirtualGamepad } from './virtualGamepad';
import { WebAudioTrack } from './WebAudioTrack';

export interface AppParameters {
  assetProvider: GameAssetProvider;
  element: HTMLElement;
  bootStatusElement?: HTMLElement | null;
  fontRenderMetrics?: FontRenderMetricsRegistry;
  presenter?: Presenter;
}

type DebugSnapshot = {
  bitmapCount: number;
  spriteCount: number;
  visibleSpriteCount: number;
  planeCount: number;
  visiblePlaneCount: number;
  tilemapCount: number;
  visibleTilemapCount: number;
  windowCount: number;
  visibleWindowCount: number;
  messageOpen: boolean;
  runtimeErrorOpen: boolean;
  resourceErrorOpen: boolean;
  resourceLoadingOpen: boolean;
  documentHasFocus: boolean;
  activeElementTag: string;
  keyState: Record<string, number>;
  lastBridgeEvent: string;
};

type RecordObj = {
  bitmap: Map<number, TkBitmap>;
  sprite: Map<number, TkSprite>;
  plane: Map<number, TkPlane>;
  tilemap: Map<number, TkTilemap>;
  viewport: Map<number, TkViewport>;
  window: Map<number, TkWindow>;
};

type RecordValue = TkBitmap | TkSprite | TkPlane | TkTilemap | TkViewport | TkWindow;

type SerializedTilemapPayload = {
  mapData: SerializedTable;
  flags: SerializedTable;
};

type SerializedCharacter = {
  bitmapId: number | null;
  x: number;
  y: number;
  characterIndex: number;
  direction: number;
  pattern: number;
  name: string;
};

type AudioKind = 'bgm' | 'bgs' | 'me' | 'se';

export class App {
  private _params: AppParameters;
  private _pixiApp!: Application;
  private _playerElement!: HTMLDivElement;
  private _screenElement!: HTMLDivElement;
  private _presentationContainer!: Container;
  private _rootContainer!: Container;
  private _displayList!: RgssDisplayList;
  private _brightnessOverlay!: PixiGraphics;
  private _frozenSprite!: Sprite;
  private _frozenTexture: Texture | null;
  private _frozenCanvas: HTMLCanvasElement | null;
  private _transitionMaskCanvas: HTMLCanvasElement | null;
  private _transitionTexture: Texture | null;
  private readonly _presenter: Presenter;
  private _record: RecordObj;
  private readonly _assetProvider: GameAssetProvider;
  private readonly _gameManifest: GameManifest;
  private readonly _fontRenderMetrics: FontRenderMetricsRegistry;
  private readonly _keyManager: KeyManager;
  private _lastKeyState: Record<string, number>;
  private _lastBridgeEvent: string;
  private _nextGraphicsUpdateAt: number | null;
  private _graphicsBrightness: number;
  private _audioContext: AudioContext | null;
  private _musicAudio: Record<'bgm' | 'bgs', WebAudioTrack>;
  private _meAudio: WebAudioTrack;
  private _soundEffects: Set<WebAudioTrack>;
  private _meBlocksBgm: boolean;
  private _resumeBgmAfterMe: boolean;
  private _meResumeTimer: number | null;
  private _virtualGamepad!: VirtualGamepad;

  constructor(params: AppParameters) {
    this._params = params;
    this._assetProvider = params.assetProvider;
    this._gameManifest = params.assetProvider.manifest;
    this._fontRenderMetrics = params.fontRenderMetrics ?? new FontRenderMetricsRegistry();
    this._presenter =
      params.presenter ??
      createDefaultPresenter({
        appElement: params.element,
        bootStatusElement: params.bootStatusElement,
      });
    this._record = {
      bitmap: new Map(),
      sprite: new Map(),
      plane: new Map(),
      tilemap: new Map(),
      viewport: new Map(),
      window: new Map(),
    };
    this._keyManager = new KeyManager();
    this._lastKeyState = {};
    this._lastBridgeEvent = 'init';
    this._nextGraphicsUpdateAt = null;
    this._frozenTexture = null;
    this._frozenCanvas = null;
    this._transitionMaskCanvas = null;
    this._transitionTexture = null;
    this._graphicsBrightness = 255;
    this._audioContext = null;
    this._musicAudio = {
      bgm: new WebAudioTrack(() => this._getAudioContext()),
      bgs: new WebAudioTrack(() => this._getAudioContext()),
    };
    this._meAudio = new WebAudioTrack(() => this._getAudioContext());
    this._soundEffects = new Set();
    this._meBlocksBgm = false;
    this._resumeBgmAfterMe = false;
    this._meResumeTimer = null;
    this._setupApplication();
  }

  get pixiApp() {
    return this._pixiApp;
  }

  async loadBitmapFromImage(filename: string) {
    const asset = this._resolveManifestAsset(filename, 'image');
    const sourceKey = this._assetProvider.createCacheKey(asset);

    return this._withBridgeTrace(`loadBitmapFromImage(${filename} -> ${sourceKey})`, async () => {
      const key = generateKey();
      const image = await trackBlockingResourceWait({ kind: 'image', label: filename }, () =>
        this._assetProvider.loadImage(asset, { kind: 'image' }),
      );
      const bitmap = TkBitmap.fromImage(image);

      this._record.bitmap.set(key, bitmap);
      return key;
    });
  }

  createBitmapFromSize(width: number, height: number) {
    return this._withBridgeTrace(`createBitmapFromSize(${width},${height})`, () => {
      const key = generateKey();
      const bitmap = new TkBitmap(width, height);

      this._record.bitmap.set(key, bitmap);
      return key;
    });
  }

  cloneBitmap(bitmapId: number) {
    return this._withBridgeTrace(`cloneBitmap(${bitmapId})`, () => {
      const source = this._record.bitmap.get(bitmapId);
      if (!source) throw `not found bitmap: ${bitmapId}`;

      const key = generateKey();
      this._record.bitmap.set(key, source.clone());
      return key;
    });
  }

  createSprite(viewportId?: number) {
    return this._withBridgeTrace('createSprite', () => {
      const key = generateKey();
      const sprite = new TkSprite();

      this._record.sprite.set(key, sprite);
      this._displayList.registerObject({ objectId: key, rgssType: 'sprite', pixiObject: sprite, viewportId });
      return key;
    });
  }

  createPlane(viewportId?: number) {
    return this._withBridgeTrace('createPlane', () => {
      const key = generateKey();
      const plane = new TkPlane(this._pixiApp.screen.width, this._pixiApp.screen.height);

      this._record.plane.set(key, plane);
      this._displayList.registerObject({ objectId: key, rgssType: 'plane', pixiObject: plane, viewportId });
      return key;
    });
  }

  createTilemap(viewportId?: number) {
    return this._withBridgeTrace('createTilemap', () => {
      const key = generateKey();
      const tilemap = new TkTilemap(this._pixiApp.screen.width, this._pixiApp.screen.height);

      this._record.tilemap.set(key, tilemap);
      this._displayList.registerObject({ objectId: key, rgssType: 'tilemap', pixiObject: tilemap, viewportId });
      return key;
    });
  }

  createViewport() {
    return this._withBridgeTrace('createViewport', () => {
      const key = generateKey();
      const viewport = new TkViewport(this._pixiApp.screen.width, this._pixiApp.screen.height);

      this._record.viewport.set(key, viewport);
      this._displayList.registerObject({ objectId: key, rgssType: 'viewport', pixiObject: viewport.displayObject });
      return key;
    });
  }

  createWindow(viewportId?: number) {
    return this._withBridgeTrace('createWindow', () => {
      const key = generateKey();
      const window = new TkWindow();

      this._record.window.set(key, window);
      this._displayList.registerObject({ objectId: key, rgssType: 'window', pixiObject: window, viewportId });
      return key;
    });
  }

  getObject(type: keyof RecordObj, id: number) {
    return this._record[type].get(id);
  }

  fontExists(name: string) {
    return this._gameManifest.fontExists(String(name));
  }

  resolveFontFamilies(serializedNames: string) {
    const names = parseJson<string[]>('font families', serializedNames);
    if (!Array.isArray(names)) return '[]';

    return JSON.stringify(this._gameManifest.resolveFontFamilies(names.map((name) => String(name))));
  }

  resolveFontRenderMetrics(serializedNames: string, serializedDescriptor?: string) {
    const names = parseJson<string[]>('font render metrics', serializedNames);
    if (!Array.isArray(names)) return JSON.stringify(FALLBACK_FONT_RENDER_METRICS);

    const descriptor = serializedDescriptor ? parseFontRenderMetricsDescriptor(serializedDescriptor) : {};
    const families = this._gameManifest.resolveFontFamilies(names.map((name) => String(name)));
    return JSON.stringify(this._fontRenderMetrics.resolve(families.length > 0 ? families : names, descriptor));
  }

  getProperty(type: keyof RecordObj, id: number, prop: string) {
    return this._withBridgeTrace(`getProperty(${type},${id},${prop})`, () => {
      const obj = this._record[type].get(id);
      if (!obj) return null;
      if (type === 'window' && prop === 'visible') return (obj as TkWindow).windowVisible;

      return (obj as any)[prop];
    });
  }

  setProperty(type: keyof RecordObj, id: number, prop: string, value: any) {
    return this._withBridgeTrace(`setProperty(${type},${id},${prop})`, () => {
      const obj = this._record[type].get(id);
      if (!obj) return null;

      if (type === 'window' && prop === 'visible') {
        (obj as TkWindow).windowVisible = Boolean(value);
        return null;
      }

      if (type === 'tilemap' && prop === 'visible') {
        const tilemap = obj as TkTilemap;
        tilemap.visible = Boolean(value);
        tilemap.upperLayer.visible = Boolean(value);
        return null;
      }

      (obj as any)[prop] = value;
      if (prop === 'zIndex' || prop === 'y') this._displayList.markDirty();
      return null;
    });
  }

  disposeObject(type: keyof RecordObj, id: number) {
    this._withBridgeTrace(`disposeObject(${type},${id})`, () => {
      const obj = this._record[type].get(id);
      if (!obj) return;

      this._record[type].delete(id);
      if (type === 'viewport') this._displayList.moveViewportChildrenToRoot(id);
      if (type !== 'bitmap') this._displayList.unregisterObject(id);
      this._destroyObject(type, obj);
    });
  }

  setBitmapToSprite(spriteId: number, bitmapId: number | null) {
    this._withBridgeTrace(`setBitmapToSprite(${spriteId},${bitmapId})`, () => {
      const sprite = this._record.sprite.get(spriteId);
      if (!sprite) throw `not found sprite: ${spriteId}`;

      const bitmap = bitmapId == null ? null : this._record.bitmap.get(bitmapId);
      if (bitmapId != null && !bitmap) throw `not found bitmap: ${bitmapId}`;

      sprite.bitmap = bitmap ?? null;
    });
  }

  setBitmapToPlane(planeId: number, bitmapId: number | null) {
    this._withBridgeTrace(`setBitmapToPlane(${planeId},${bitmapId ?? 'nil'})`, () => {
      const plane = this._record.plane.get(planeId);
      if (!plane) throw `not found plane: ${planeId}`;

      plane.bitmap = bitmapId == null ? null : (this._record.bitmap.get(bitmapId) ?? null);
    });
  }

  setDataToTilemap(tilemapId: number, serializedPayload: string) {
    this._withBridgeTrace(`setDataToTilemap(${tilemapId})`, () => {
      const tilemap = this._record.tilemap.get(tilemapId);
      if (!tilemap) throw `not found tilemap: ${tilemapId}`;
      const payload = parseJson<SerializedTilemapPayload>('tilemap payload', serializedPayload);

      tilemap.mapData = payload.mapData;
      tilemap.flags = payload.flags;
      tilemap.update();
    });
  }

  setBitmapsToTilemap(tilemapId: number, serializedBitmapIds: string) {
    this._withBridgeTrace(`setBitmapsToTilemap(${tilemapId})`, () => {
      const tilemap = this._record.tilemap.get(tilemapId);
      if (!tilemap) throw `not found tilemap: ${tilemapId}`;
      const bitmapIds = parseJson<Array<number | null>>('tilemap bitmap ids', serializedBitmapIds);
      if (!Array.isArray(bitmapIds)) throw new Error('tilemap bitmap ids must be an array');
      const resolved = bitmapIds.map((bitmapId) => {
        if (bitmapId == null) return null;
        return this._record.bitmap.get(Number(bitmapId)) ?? null;
      });

      tilemap.bitmaps = resolved;
      tilemap.update();
    });
  }

  setCharactersToTilemap(tilemapId: number, serializedCharacters: string) {
    this._withBridgeTrace(`setCharactersToTilemap(${tilemapId})`, () => {
      const tilemap = this._record.tilemap.get(tilemapId);
      if (!tilemap) throw `not found tilemap: ${tilemapId}`;
      const characters = parseJson<SerializedCharacter[]>('tilemap characters', serializedCharacters);
      if (!Array.isArray(characters)) throw new Error('tilemap characters must be an array');
      const resolved = characters.map((character) => ({
        bitmap: character.bitmapId == null ? null : (this._record.bitmap.get(Number(character.bitmapId)) ?? null),
        x: Number(character.x ?? 0),
        y: Number(character.y ?? 0),
        characterIndex: Number(character.characterIndex ?? 0),
        direction: Number(character.direction ?? 2),
        pattern: Number(character.pattern ?? 1),
        name: String(character.name ?? ''),
      }));

      tilemap.characters = resolved;
      tilemap.update();
    });
  }

  setContentsToWindow(windowId: number, bitmapId: number | null) {
    this._withBridgeTrace(`setContentsToWindow(${windowId},${bitmapId ?? 'nil'})`, () => {
      const window = this._record.window.get(windowId);
      if (!window) throw `not found window: ${windowId}`;

      window.contents = bitmapId ? (this._record.bitmap.get(bitmapId) ?? null) : null;
    });
  }

  setWindowskinToWindow(windowId: number, bitmapId: number | null) {
    this._withBridgeTrace(`setWindowskinToWindow(${windowId},${bitmapId ?? 'nil'})`, () => {
      const window = this._record.window.get(windowId);
      if (!window) throw `not found window: ${windowId}`;

      window.windowskin = bitmapId ? (this._record.bitmap.get(bitmapId) ?? null) : null;
    });
  }

  setCursorRectToWindow(windowId: number, x: number, y: number, width: number, height: number) {
    this._withBridgeTrace(`setCursorRectToWindow(${windowId},${x},${y},${width},${height})`, () => {
      const window = this._record.window.get(windowId);
      if (!window) throw `not found window: ${windowId}`;

      window.cursorRect = { x, y, width, height };
    });
  }

  setToneToWindow(windowId: number, serializedTone: string) {
    this._withBridgeTrace(`setToneToWindow(${windowId})`, () => {
      const window = this._record.window.get(windowId);
      if (!window) throw `not found window: ${windowId}`;

      window.tone = parseJson<TkTone>('window tone', serializedTone);
    });
  }

  setSrcRectToSprite(spriteId: number, x: number, y: number, width: number, height: number) {
    this._withBridgeTrace(`setSrcRectToSprite(${spriteId},${x},${y},${width},${height})`, () => {
      const sprite = this._record.sprite.get(spriteId);
      if (!sprite) throw `not found sprite: ${spriteId}`;

      sprite.srcRect = { x, y, width, height };
    });
  }

  setColorToSprite(spriteId: number, serializedColor: string) {
    this._withBridgeTrace(`setColorToSprite(${spriteId})`, () => {
      const sprite = this._record.sprite.get(spriteId);
      if (!sprite) throw `not found sprite: ${spriteId}`;

      sprite.color = parseJson<TkColor>('sprite color', serializedColor);
    });
  }

  setToneToSprite(spriteId: number, serializedTone: string) {
    this._withBridgeTrace(`setToneToSprite(${spriteId})`, () => {
      const sprite = this._record.sprite.get(spriteId);
      if (!sprite) throw `not found sprite: ${spriteId}`;

      sprite.tone = parseJson<TkTone>('sprite tone', serializedTone);
    });
  }

  setColorToPlane(planeId: number, serializedColor: string) {
    this._withBridgeTrace(`setColorToPlane(${planeId})`, () => {
      const plane = this._record.plane.get(planeId);
      if (!plane) throw `not found plane: ${planeId}`;

      plane.color = parseJson<TkColor>('plane color', serializedColor);
    });
  }

  setToneToPlane(planeId: number, serializedTone: string) {
    this._withBridgeTrace(`setToneToPlane(${planeId})`, () => {
      const plane = this._record.plane.get(planeId);
      if (!plane) throw `not found plane: ${planeId}`;

      plane.tone = parseJson<TkTone>('plane tone', serializedTone);
    });
  }

  setFlashToSprite(spriteId: number, serializedColor: string, duration: number) {
    this._withBridgeTrace(`setFlashToSprite(${spriteId},${duration})`, () => {
      const sprite = this._record.sprite.get(spriteId);
      if (!sprite) throw `not found sprite: ${spriteId}`;

      const color = serializedColor === 'null' ? null : parseJson<TkColor>('sprite flash color', serializedColor);
      sprite.flash(color, duration);
    });
  }

  setFlashToViewport(viewportId: number, serializedColor: string, duration: number) {
    this._withBridgeTrace(`setFlashToViewport(${viewportId},${duration})`, () => {
      const viewport = this._record.viewport.get(viewportId);
      if (!viewport) throw `not found viewport: ${viewportId}`;

      const color = serializedColor === 'null' ? null : parseJson<TkColor>('viewport flash color', serializedColor);
      viewport.flash(color, duration);
    });
  }

  updateSpriteEffects(spriteId: number) {
    return this._withBridgeTrace(`updateSpriteEffects(${spriteId})`, () => {
      const sprite = this._record.sprite.get(spriteId);
      if (!sprite) throw `not found sprite: ${spriteId}`;

      return sprite.advanceEffects();
    });
  }

  updateViewportEffects(viewportId: number) {
    this._withBridgeTrace(`updateViewportEffects(${viewportId})`, () => {
      const viewport = this._record.viewport.get(viewportId);
      if (!viewport) throw `not found viewport: ${viewportId}`;

      viewport.advanceEffects();
    });
  }

  setRectToViewport(viewportId: number, x: number, y: number, width: number, height: number) {
    this._withBridgeTrace(`setRectToViewport(${viewportId},${x},${y},${width},${height})`, () => {
      const viewport = this._record.viewport.get(viewportId);
      if (!viewport) throw `not found viewport: ${viewportId}`;

      viewport.rect = { x, y, width, height };
    });
  }

  setColorToViewport(viewportId: number, serializedColor: string) {
    this._withBridgeTrace(`setColorToViewport(${viewportId})`, () => {
      const viewport = this._record.viewport.get(viewportId);
      if (!viewport) throw `not found viewport: ${viewportId}`;

      viewport.color = parseJson<TkColor>('viewport color', serializedColor);
    });
  }

  setToneToViewport(viewportId: number, serializedTone: string) {
    this._withBridgeTrace(`setToneToViewport(${viewportId})`, () => {
      const viewport = this._record.viewport.get(viewportId);
      if (!viewport) throw `not found viewport: ${viewportId}`;

      viewport.tone = parseJson<TkTone>('viewport tone', serializedTone);
    });
  }

  setViewport(type: 'sprite' | 'plane' | 'tilemap' | 'window', id: number, viewportId: number | null) {
    this._withBridgeTrace(`setViewport(${type},${id},${viewportId ?? 'nil'})`, () => {
      const displayObject = this._record[type].get(id);
      if (!displayObject) throw `not found ${type}: ${id}`;
      if (viewportId != null && !this._record.viewport.has(viewportId)) throw `not found viewport: ${viewportId}`;

      this._displayList.moveObjectToViewport(id, viewportId ?? null);
    });
  }

  updateTilemap(tilemapId: number) {
    this._withBridgeTrace(`updateTilemap(${tilemapId})`, () => {
      const tilemap = this._record.tilemap.get(tilemapId);
      if (!tilemap) throw `not found tilemap: ${tilemapId}`;

      tilemap.update();
    });
  }

  async updateGraphics(frameRate: number) {
    const fps = normalizeFrameRate(frameRate);
    const intervalMs = 1000 / fps;
    this._lastBridgeEvent = `updateGraphics(${fps})`;

    try {
      const targetTime = this._nextGraphicsUpdateAt ?? performance.now() + intervalMs;
      this._renderNow();
      this._presenter.completeBoot();
      // Reaching Graphics.update means RGSS has returned to the frame loop.
      completeBlockingResourceWaitIfIdle();
      await waitMs(targetTime - performance.now());

      const nextTargetTime = targetTime + intervalMs;
      const currentTime = performance.now();
      this._nextGraphicsUpdateAt =
        nextTargetTime < currentTime - intervalMs ? currentTime + intervalMs : nextTargetTime;
    } catch (error) {
      this._lastBridgeEvent = `updateGraphics(${fps}) failed: ${String(error)}`;
      throw error;
    }
  }

  resetGraphicsFramePacing() {
    this._nextGraphicsUpdateAt = null;
  }

  setGraphicsBrightness(brightness: number) {
    this._withBridgeTrace(`setGraphicsBrightness(${brightness})`, () => {
      this._graphicsBrightness = clampChannel(brightness);
      this._refreshBrightnessOverlay();
    });
  }

  resizeScreen(width: number, height: number) {
    this._withBridgeTrace(`resizeScreen(${width},${height})`, () => {
      const nextWidth = Math.max(1, Math.trunc(Number(width) || 0));
      const nextHeight = Math.max(1, Math.trunc(Number(height) || 0));

      this._pixiApp.renderer.resize(nextWidth, nextHeight);
      this._applyViewSize(nextWidth, nextHeight);
      this._refreshBrightnessOverlay();
      this._refreshFrozenSpriteLayout();
      this._record.tilemap.forEach((tilemap) => tilemap.resize(nextWidth, nextHeight));
      this._record.plane.forEach((plane) => plane.resize(nextWidth, nextHeight));
      this._renderNow();
    });
  }

  freezeGraphics() {
    this._withBridgeTrace('freezeGraphics', () => {
      const canvas = this._extractScreenCanvas(false);
      this._replaceFrozenTexture(canvas);
      this._frozenSprite.alpha = 1;
      this._frozenSprite.visible = true;
      this._renderNow();
    });
  }

  setFrozenGraphicsOpacity(opacity: number) {
    this._withBridgeTrace(`setFrozenGraphicsOpacity(${opacity})`, () => {
      const normalized = clampUnit(Number(opacity) || 0);
      this._frozenSprite.alpha = normalized;
      this._frozenSprite.visible = normalized > 0 && this._frozenTexture != null;
    });
  }

  async prepareGraphicsTransition(filename: string | null, vague = 40) {
    const normalizedFilename = filename == null || String(filename).length === 0 ? null : String(filename);
    this._lastBridgeEvent = `prepareGraphicsTransition(${normalizedFilename ?? 'nil'},${vague})`;

    if (!normalizedFilename) {
      this._transitionMaskCanvas = null;
      return false;
    }

    const source = this._resolveManifestAsset(normalizedFilename, 'image');
    try {
      const image = await trackBlockingResourceWait({ kind: 'image', label: normalizedFilename }, () =>
        this._assetProvider.loadImage(source, { kind: 'image' }),
      );
      this._transitionMaskCanvas = createScaledMaskCanvas(
        image,
        this._pixiApp.screen.width,
        this._pixiApp.screen.height,
      );
      this._lastBridgeEvent = `prepareGraphicsTransition(${normalizedFilename} -> ${this._assetProvider.createCacheKey(source)})`;
      return true;
    } catch (error) {
      this._transitionMaskCanvas = null;
      const detail = error instanceof Error ? error.message : String(error);
      this._lastBridgeEvent = `prepareGraphicsTransition(${normalizedFilename}) fallback: ${detail}`;
      return false;
    }
  }

  setFrozenGraphicsTransitionProgress(progress: number, vague = 40) {
    this._withBridgeTrace(`setFrozenGraphicsTransitionProgress(${progress},${vague})`, () => {
      const normalized = clampUnit(Number(progress) || 0);
      if (!this._transitionMaskCanvas || !this._frozenCanvas) {
        this.setFrozenGraphicsOpacity(1 - normalized);
        return;
      }

      const canvas = createTransitionCanvas(
        this._frozenCanvas,
        this._transitionMaskCanvas,
        normalized,
        Math.max(1, Math.trunc(Number(vague) || 0)),
      );
      this._replaceTransitionTexture(canvas);
      this._frozenSprite.alpha = 1;
      this._frozenSprite.visible = normalized < 1;
    });
  }

  clearFrozenGraphics() {
    this._withBridgeTrace('clearFrozenGraphics', () => {
      this._destroyFrozenTexture();
      this._transitionMaskCanvas = null;
      this._renderNow();
    });
  }

  playMovie(filename: string) {
    this._withBridgeTrace(`playMovie(${filename})`, () => {
      const source = this._assetProvider.resolveAsset(filename, 'movie');
      this._lastBridgeEvent = source
        ? `playMovie(${filename} -> ${this._assetProvider.createCacheKey(source)}) fallback`
        : `playMovie(${filename}) unsupported`;
    });
  }

  copyScreenToBitmap(bitmapId: number) {
    this._withBridgeTrace(`copyScreenToBitmap(${bitmapId})`, () => {
      const bitmap = this._record.bitmap.get(bitmapId);
      if (!bitmap) throw `not found bitmap: ${bitmapId}`;

      const canvas = this._extractScreenCanvas(true);
      bitmap.replaceWithCanvas(canvas);
    });
  }

  playAudio(kind: AudioKind, filename: string, volume = 100, pitch = 100, pos: number | null = null) {
    this._withBridgeTrace(`playAudio(${kind},${filename})`, () => {
      const asset = this._resolveManifestAsset(filename, 'audio');
      const source = this._assetProvider.createAudioSource(asset, { kind: 'data', label: filename });
      const posSeconds = rgssAudioPosToSeconds(pos);

      if (kind === 'bgm' || kind === 'bgs') {
        const deferStart = kind === 'bgm' && this._isMePlaying();
        if (deferStart) {
          this._resumeBgmAfterMe = true;
        }
        void this._musicAudio[kind]
          .play(source, volume, pitch, posSeconds, { deferStart, loop: true })
          .then(() => {
            if (!deferStart || this._isMePlaying()) return;

            this._resumeBgmAfterMe = false;
            this._musicAudio.bgm.resume();
          })
          .catch((error) => this._handleWebAudioPlaybackFailure(kind, filename, error));
        return;
      }

      if (kind === 'se') {
        const soundEffect = new WebAudioTrack(() => this._getAudioContext());
        this._soundEffects.add(soundEffect);
        void soundEffect
          .play(source, volume, pitch, posSeconds, {
            loop: false,
            onEnded: () => {
              soundEffect.stop();
              this._soundEffects.delete(soundEffect);
            },
          })
          .catch((error) => {
            this._soundEffects.delete(soundEffect);
            this._handleWebAudioPlaybackFailure(kind, filename, error);
          });
        return;
      }

      if (kind === 'me') {
        this._meBlocksBgm = true;
        this._pauseBgmForMe();
        this._clearMeResumeTimer();
        this._meAudio.stop();
        void this._meAudio
          .play(source, volume, pitch, posSeconds, { loop: false, onEnded: () => this._finishMePlayback() })
          .catch((error) => {
            this._finishMePlayback();
            this._handleWebAudioPlaybackFailure(kind, filename, error);
          });
        return;
      }
    });
  }

  stopAudio(kind: AudioKind) {
    this._withBridgeTrace(`stopAudio(${kind})`, () => {
      if (kind === 'se') {
        this._soundEffects.forEach((soundEffect) => soundEffect.stop());
        this._soundEffects.clear();
        return;
      }

      if (kind === 'bgm' || kind === 'bgs') {
        this._musicAudio[kind].stop();
        return;
      }

      this._meAudio.stop();
      this._clearMeResumeTimer();
      this._meBlocksBgm = false;
      this._resumeBgmAfterMeIfNeeded();
    });
  }

  fadeAudio(kind: Exclude<AudioKind, 'se'>, time: number) {
    this._withBridgeTrace(`fadeAudio(${kind},${time})`, () => {
      if (kind === 'bgm' || kind === 'bgs') {
        this._musicAudio[kind].fade(time);
        return;
      }

      this._meAudio.fade(time);
      this._clearMeResumeTimer();
      this._meResumeTimer = window.setTimeout(
        () => {
          this._meResumeTimer = null;
          this._resumeBgmAfterMeIfNeeded();
        },
        Math.max(0, Number(time) || 0),
      );
    });
  }

  audioPos(kind: Exclude<AudioKind, 'se'>) {
    return this._withBridgeTrace(`audioPos(${kind})`, () => {
      if (kind === 'bgm' || kind === 'bgs') return secondsToRgssAudioPos(this._musicAudio[kind].positionSeconds());

      return secondsToRgssAudioPos(this._meAudio.positionSeconds());
    });
  }

  updateKey() {
    this._keyManager.update();
    this._lastKeyState = { ...this._keyManager.state };

    return this._keyManager.state;
  }

  showMessage(lines: unknown) {
    this._presenter.showMessage({ lines });
  }

  closeMessage() {
    this._presenter.closeMessage();
  }

  isMessageOpen() {
    return this._presenter.isMessageOpen();
  }

  showRuntimeError(message: string) {
    this._presenter.showRuntimeError({ message });
  }

  hideRuntimeError() {
    this._presenter.hideRuntimeError();
  }

  showResourceLoadError: Presenter['showResourceLoadError'] = (presentation) => {
    this._presenter.showResourceLoadError(presentation);
  };

  hideResourceLoadError() {
    this._presenter.hideResourceLoadError();
  }

  showResourceLoading: Presenter['showResourceLoading'] = (presentation) => {
    this._presenter.showResourceLoading(presentation);
  };

  hideResourceLoading() {
    this._presenter.hideResourceLoading();
  }

  recordDebugEvent(label: string) {
    this._lastBridgeEvent = label;
  }

  debugSnapshot(): DebugSnapshot {
    const presenterSnapshot = this._presenter.snapshot();
    return {
      bitmapCount: this._record.bitmap.size,
      spriteCount: this._record.sprite.size,
      visibleSpriteCount: countVisible(this._record.sprite),
      planeCount: this._record.plane.size,
      visiblePlaneCount: countVisible(this._record.plane),
      tilemapCount: this._record.tilemap.size,
      visibleTilemapCount: countVisible(this._record.tilemap),
      windowCount: this._record.window.size,
      visibleWindowCount: countVisible(this._record.window),
      messageOpen: presenterSnapshot.messageOpen,
      runtimeErrorOpen: presenterSnapshot.runtimeErrorOpen,
      resourceErrorOpen: presenterSnapshot.resourceErrorOpen,
      resourceLoadingOpen: presenterSnapshot.resourceLoadingOpen,
      documentHasFocus: document.hasFocus(),
      activeElementTag: document.activeElement?.tagName ?? '',
      keyState: { ...this._lastKeyState },
      lastBridgeEvent: this._lastBridgeEvent,
    };
  }

  private _setupApplication() {
    this._pixiApp = new Application({
      width: this._gameManifest.screen.width,
      height: this._gameManifest.screen.height,
      autoStart: false,
      preserveDrawingBuffer: true, // for PLiCy
    });

    this._playerElement = document.createElement('div');
    this._playerElement.className = 'game-player';
    this._params.element.appendChild(this._playerElement);

    this._screenElement = document.createElement('div');
    this._screenElement.className = 'game-screen';
    this._playerElement.appendChild(this._screenElement);
    this._screenElement.appendChild(this._pixiApp.view as HTMLCanvasElement);

    this._pixiApp.stage.sortableChildren = false;
    this._presentationContainer = new Container();
    this._presentationContainer.sortableChildren = false;
    this._rootContainer = new Container();
    this._rootContainer.sortableChildren = false;
    this._displayList = new RgssDisplayList(this._rootContainer, (viewportId) => {
      const viewport = this._record.viewport.get(viewportId);
      if (!viewport) throw `not found viewport: ${viewportId}`;
      return viewport;
    });
    this._brightnessOverlay = new PixiGraphics();
    this._frozenSprite = new Sprite(Texture.EMPTY);
    this._frozenSprite.visible = false;

    this._presentationContainer.addChild(this._rootContainer);
    this._presentationContainer.addChild(this._brightnessOverlay);
    this._pixiApp.stage.addChild(this._presentationContainer);
    this._pixiApp.stage.addChild(this._frozenSprite);
    this._applyViewSize(this._pixiApp.screen.width, this._pixiApp.screen.height);
    this._refreshBrightnessOverlay();
    this._refreshFrozenSpriteLayout();

    this._presenter.mount({ screenElement: this._screenElement });
    configureBlockingResourceWaitPresenter({
      showBlockingResourceWait: (presentation) => this.showResourceLoading(presentation),
      hideBlockingResourceWait: () => this.hideResourceLoading(),
    });
    configureResourceLoadErrorPresenter({
      showResourceLoadError: (presentation) => this.showResourceLoadError(presentation),
      hideResourceLoadError: () => this.hideResourceLoadError(),
    });

    this._setupVirtualGamepad();
    this._refreshPlayerLayout();
    window.addEventListener('resize', this._onWindowResize);

    window.addEventListener('pointerdown', () => this._resumeAudioContext(), { passive: true });
    window.addEventListener('pointerdown', this._onWindowPointerDown, { passive: true });
    window.addEventListener('keydown', () => this._resumeAudioContext());
    window.addEventListener('touchstart', () => this._resumeAudioContext(), { passive: true });
  }

  private _withBridgeTrace<T>(label: string, callback: () => T): T {
    this._lastBridgeEvent = label;

    try {
      return callback();
    } catch (error) {
      this._lastBridgeEvent = `${label} failed: ${String(error)}`;
      throw error;
    }
  }

  private _destroyObject(type: keyof RecordObj, obj: RecordValue) {
    if (type === 'bitmap') {
      (obj as TkBitmap).destroy();
      return;
    }

    if (type === 'viewport') {
      const viewport = obj as TkViewport;
      while (viewport.content.children.length > 0) {
        const child = viewport.content.children[0];
        viewport.content.removeChild(child);
        this._rootContainer.addChild(child);
      }
      viewport.displayObject.parent?.removeChild(viewport.displayObject);
      viewport.displayObject.destroy({ children: true });
      return;
    }

    const displayObject = obj as DisplayObject;
    displayObject.parent?.removeChild(displayObject);
    displayObject.destroy({ children: true, texture: type === 'tilemap', baseTexture: type === 'tilemap' });
  }

  private _refreshBrightnessOverlay() {
    const width = this._pixiApp.screen.width;
    const height = this._pixiApp.screen.height;
    const alpha = clampUnit((255 - this._graphicsBrightness) / 255);

    this._brightnessOverlay.clear();
    if (alpha <= 0 || width <= 0 || height <= 0) {
      this._brightnessOverlay.visible = false;
      return;
    }

    this._brightnessOverlay.beginFill(0x000000, alpha);
    this._brightnessOverlay.drawRect(0, 0, width, height);
    this._brightnessOverlay.endFill();
    this._brightnessOverlay.visible = true;
  }

  private _refreshFrozenSpriteLayout() {
    this._frozenSprite.x = 0;
    this._frozenSprite.y = 0;
    this._frozenSprite.width = this._pixiApp.screen.width;
    this._frozenSprite.height = this._pixiApp.screen.height;
  }

  private _extractScreenCanvas(includeFrozenOverlay: boolean) {
    const previousVisible = this._frozenSprite.visible;
    const previousAlpha = this._frozenSprite.alpha;

    try {
      if (!includeFrozenOverlay) {
        this._frozenSprite.visible = false;
      }
      this._renderNow();

      const extract = (this._pixiApp.renderer as any).extract;
      if (!extract?.canvas) throw new Error('renderer extract is unavailable');

      return extract.canvas(undefined, this._pixiApp.screen) as HTMLCanvasElement;
    } finally {
      if (!includeFrozenOverlay) {
        this._frozenSprite.visible = previousVisible;
        this._frozenSprite.alpha = previousAlpha;
        this._renderNow();
      }
    }
  }

  private _replaceFrozenTexture(source: HTMLCanvasElement) {
    this._destroyFrozenTexture();

    this._frozenCanvas = source;
    this._frozenTexture = Texture.from(source);
    this._frozenSprite.texture = this._frozenTexture;
    this._refreshFrozenSpriteLayout();
  }

  private _replaceTransitionTexture(source: HTMLCanvasElement) {
    this._transitionTexture?.destroy(true);
    this._transitionTexture = Texture.from(source);
    this._frozenSprite.texture = this._transitionTexture;
    this._refreshFrozenSpriteLayout();
  }

  private _destroyFrozenTexture() {
    this._frozenSprite.visible = false;
    this._frozenSprite.alpha = 0;
    this._frozenSprite.texture = Texture.EMPTY;
    this._frozenTexture?.destroy(true);
    this._transitionTexture?.destroy(true);
    this._frozenTexture = null;
    this._transitionTexture = null;
    this._frozenCanvas = null;
  }

  private _applyViewSize(width: number, height: number) {
    const view = this._pixiApp.view as HTMLCanvasElement;
    view.style.width = `${width}px`;
    view.style.height = `${height}px`;
    this._screenElement.style.width = `${width}px`;
    this._screenElement.style.height = `${height}px`;
    this._refreshPlayerLayout();
  }

  private _refreshPlayerLayout() {
    if (!this._screenElement || !this._playerElement) return;

    const width = this._pixiApp.screen.width;
    const height = this._pixiApp.screen.height;
    const viewportWidth = Math.max(1, window.innerWidth || width);
    const viewportHeight = Math.max(1, window.innerHeight || height);
    const scale = Math.min(viewportWidth / width, viewportHeight / height);
    const scaledWidth = Math.floor(width * scale);
    const scaledHeight = Math.floor(height * scale);

    this._screenElement.style.transform = `scale(${scale})`;
    this._playerElement.style.width = `${scaledWidth}px`;
    this._playerElement.style.height = `${scaledHeight}px`;
  }

  private _setupVirtualGamepad() {
    this._virtualGamepad = new VirtualGamepad({
      keyManager: this._keyManager,
      gameManifest: this._gameManifest,
    });
    this._params.element.appendChild(this._virtualGamepad.element);
  }

  private _onWindowResize = () => {
    this._refreshPlayerLayout();
  };

  private _onWindowPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') {
      this._virtualGamepad.hideVirtualGamepad();
    } else if (event.pointerType === 'touch') {
      this._virtualGamepad.showVirtualGamepad();
    }
  };

  private _renderNow() {
    this._record.window.forEach((window) => window.update());
    this._displayList.sync();
    this._pixiApp.render();
    this._record.window.forEach((window) => window.notePresented());
  }

  private _resolveManifestAsset(filename: string, type: 'audio' | 'image') {
    const resolved = this._assetProvider.resolveAsset(filename, type);
    if (!resolved) throw new Error(`asset not found in manifest: ${filename}`);

    return resolved;
  }

  private _pauseBgmForMe() {
    if (this._musicAudio.bgm.pause()) this._resumeBgmAfterMe = true;
  }

  private _isMePlaying() {
    return this._meBlocksBgm || !this._meAudio.paused;
  }

  private _finishMePlayback() {
    this._meAudio.stop();
    this._clearMeResumeTimer();
    this._meBlocksBgm = false;
    this._resumeBgmAfterMeIfNeeded();
  }

  private _resumeBgmAfterMeIfNeeded() {
    if (!this._resumeBgmAfterMe) return;

    this._resumeBgmAfterMe = false;
    this._musicAudio.bgm.resume();
  }

  private _clearMeResumeTimer() {
    if (this._meResumeTimer == null) return;

    window.clearTimeout(this._meResumeTimer);
    this._meResumeTimer = null;
  }

  private _getAudioContext() {
    if (!this._audioContext) {
      const AudioContextCtor = window.AudioContext;
      this._audioContext = new AudioContextCtor();
    }

    return this._audioContext;
  }

  private _handleWebAudioPlaybackFailure(kind: AudioKind, filename: string, error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    this._lastBridgeEvent = `playAudio(${kind},${filename}) failed: ${detail}`;
  }

  private _resumeAudioContext() {
    if (this._audioContext?.state === 'suspended') {
      this._audioContext.resume().catch(() => undefined);
    }
  }
}

const generateKey = (() => {
  let id = 0;
  return () => {
    return ++id;
  };
})();

const countVisible = (records: Map<number, { visible?: boolean }>) => {
  let count = 0;
  records.forEach((record) => {
    if (record.visible !== false) count += 1;
  });
  return count;
};

const parseJson = <T>(label: string, source: string): T => {
  try {
    return JSON.parse(source) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid ${label}: ${detail}`);
  }
};

const parseFontRenderMetricsDescriptor = (source: string): FontRenderMetricsDescriptor => {
  const value = parseJson<unknown>('font render metrics descriptor', source);
  if (!value || typeof value !== 'object') return {};

  const record = value as Record<string, unknown>;
  return {
    style: typeof record.style === 'string' ? record.style : undefined,
    weight: typeof record.weight === 'string' ? record.weight : undefined,
  };
};

const waitMs = (milliseconds: number) => {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, Math.max(0, milliseconds));
  });
};

const normalizeFrameRate = (value: number) => {
  const fps = Math.trunc(Number(value) || 0);
  return fps > 0 ? fps : 60;
};

const rgssAudioPosToSeconds = (value: number | null | undefined) => {
  if (value == null) return null;
  return Math.max(0, (Number(value) || 0) / 1000);
};

const secondsToRgssAudioPos = (value: number) => {
  return Math.max(0, (Number(value) || 0) * 1000);
};

const createScaledMaskCanvas = (image: HTMLImageElement, width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.trunc(width));
  canvas.height = Math.max(1, Math.trunc(height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('failed to create transition mask canvas context');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const createTransitionCanvas = (
  frozenCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  progress: number,
  vague: number,
) => {
  const width = frozenCanvas.width;
  const height = frozenCanvas.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  const frozenContext = frozenCanvas.getContext('2d');
  const maskContext = maskCanvas.getContext('2d');
  if (!context || !frozenContext || !maskContext) throw new Error('failed to create transition canvas context');

  const frozen = frozenContext.getImageData(0, 0, width, height);
  const mask = maskContext.getImageData(0, 0, width, height);
  const output = context.createImageData(width, height);
  const threshold = progress * 255;
  const softness = Math.max(1, vague);

  for (let index = 0; index < frozen.data.length; index += 4) {
    const luminance = (mask.data[index] + mask.data[index + 1] + mask.data[index + 2]) / 3;
    const keepFrozen = 1 - clampUnit((threshold - luminance + softness) / softness);
    output.data[index] = frozen.data[index];
    output.data[index + 1] = frozen.data[index + 1];
    output.data[index + 2] = frozen.data[index + 2];
    output.data[index + 3] = Math.round(frozen.data[index + 3] * keepFrozen);
  }

  context.putImageData(output, 0, 0);
  return canvas;
};
