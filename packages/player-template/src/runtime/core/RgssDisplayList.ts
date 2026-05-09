import { Container, type DisplayObject } from 'pixi.js';
import { TkSprite } from './TkSprite';
import { TkTilemap } from './TkTilemap';
import { TkViewport } from './TkViewport';

export type RgssDisplayObjectType = 'sprite' | 'plane' | 'tilemap' | 'viewport' | 'window';
export type RgssLayerKind = 'main' | 'tilemapLower' | 'tilemapUpper' | 'viewportRoot';

export type RgssRenderEntry = {
  ownerObjectId: number;
  ownerType: RgssDisplayObjectType;
  layerKind: RgssLayerKind;
  pixiObject: DisplayObject;
  creationOrder: number;
  entryOrder: number;
  rgssZ: number;
  rgssY: number;
};

export type RgssDisplayObject = {
  objectId: number;
  rgssType: RgssDisplayObjectType;
  creationOrder: number;
  viewportId: number | null;
  disposed: boolean;
  renderEntries: RgssRenderEntry[];
};

type RegisterOptions = {
  objectId: number;
  rgssType: RgssDisplayObjectType;
  pixiObject: DisplayObject;
  viewportId?: number | null;
};

export class RgssDisplayList {
  private readonly _rootLayer: Container;
  private readonly _resolveViewport: (viewportId: number) => TkViewport;
  private readonly _objects: Map<number, RgssDisplayObject>;
  private _nextCreationOrder: number;
  private _nextEntryOrder: number;
  private _dirty: boolean;

  constructor(rootLayer: Container, resolveViewport: (viewportId: number) => TkViewport) {
    this._rootLayer = rootLayer;
    this._resolveViewport = resolveViewport;
    this._objects = new Map();
    this._nextCreationOrder = 0;
    this._nextEntryOrder = 0;
    this._dirty = true;
  }

  registerObject(options: RegisterOptions) {
    const creationOrder = this._nextCreationOrder++;
    const object: RgssDisplayObject = {
      objectId: options.objectId,
      rgssType: options.rgssType,
      creationOrder,
      viewportId: options.rgssType === 'viewport' ? null : (options.viewportId ?? null),
      disposed: false,
      renderEntries: this._createEntries(options, creationOrder),
    };

    this._objects.set(options.objectId, object);
    for (const entry of object.renderEntries) {
      this._parentFor(object).addChild(entry.pixiObject);
    }
    this.markDirty();
  }

  moveObjectToViewport(objectId: number, viewportId: number | null) {
    const object = this._objects.get(objectId);
    if (!object || object.disposed || object.rgssType === 'viewport') return;
    if (object.viewportId === viewportId) return;

    for (const entry of object.renderEntries) {
      entry.pixiObject.parent?.removeChild(entry.pixiObject);
    }
    object.viewportId = viewportId;
    for (const entry of object.renderEntries) {
      this._parentFor(object).addChild(entry.pixiObject);
    }
    this.markDirty();
  }

  moveViewportChildrenToRoot(viewportId: number) {
    for (const object of this._objects.values()) {
      if (object.viewportId === viewportId) {
        this.moveObjectToViewport(object.objectId, null);
      }
    }
  }

  unregisterObject(objectId: number) {
    const object = this._objects.get(objectId);
    if (!object) return;

    object.disposed = true;
    for (const entry of object.renderEntries) {
      entry.pixiObject.parent?.removeChild(entry.pixiObject);
    }
    this._objects.delete(objectId);
    this.markDirty();
  }

  markDirty() {
    this._dirty = true;
  }

  sync() {
    this._refreshSortKeys();
    if (!this._dirty) return;

    this._sortLayer(this._rootLayer, null);
    for (const object of this._objects.values()) {
      if (object.rgssType !== 'viewport' || object.disposed) continue;
      this._sortLayer(this._resolveViewport(object.objectId).content, object.objectId);
    }
    this._dirty = false;
  }

  private _createEntries(options: RegisterOptions, creationOrder: number): RgssRenderEntry[] {
    if (options.rgssType === 'tilemap' && options.pixiObject instanceof TkTilemap) {
      return [
        this._createEntry(options, creationOrder, 'tilemapLower', options.pixiObject),
        this._createEntry(options, creationOrder, 'tilemapUpper', options.pixiObject.upperLayer),
      ];
    }

    return [
      this._createEntry(
        options,
        creationOrder,
        options.rgssType === 'viewport' ? 'viewportRoot' : 'main',
        options.pixiObject,
      ),
    ];
  }

  private _createEntry(
    options: RegisterOptions,
    creationOrder: number,
    layerKind: RgssLayerKind,
    pixiObject: DisplayObject,
  ): RgssRenderEntry {
    return {
      ownerObjectId: options.objectId,
      ownerType: options.rgssType,
      layerKind,
      pixiObject,
      creationOrder,
      entryOrder: this._nextEntryOrder++,
      rgssZ: 0,
      rgssY: 0,
    };
  }

  private _refreshSortKeys() {
    for (const object of this._objects.values()) {
      for (const entry of object.renderEntries) {
        const nextZ = this._rgssZ(entry);
        const nextY = this._rgssY(entry);
        if (entry.rgssZ !== nextZ || entry.rgssY !== nextY) {
          entry.rgssZ = nextZ;
          entry.rgssY = nextY;
          this.markDirty();
        }
      }
    }
  }

  private _rgssZ(entry: RgssRenderEntry) {
    if (entry.layerKind === 'tilemapLower') return 0;
    if (entry.layerKind === 'tilemapUpper') return 200;

    return Number((entry.pixiObject as any).zIndex ?? 0) || 0;
  }

  private _rgssY(entry: RgssRenderEntry) {
    if (entry.ownerType === 'sprite' && entry.pixiObject instanceof TkSprite) {
      return Number(entry.pixiObject.y ?? 0) || 0;
    }

    return 0;
  }

  private _sortLayer(container: Container, viewportId: number | null) {
    const entries = [...this._objects.values()]
      .filter((object) => !object.disposed && object.viewportId === viewportId)
      .flatMap((object) => object.renderEntries)
      .sort(compareRgssRenderEntry);

    entries.forEach((entry, index) => {
      if (entry.pixiObject.parent !== container) {
        entry.pixiObject.parent?.removeChild(entry.pixiObject);
        container.addChild(entry.pixiObject);
      }
      if (container.getChildIndex(entry.pixiObject) !== index) {
        container.setChildIndex(entry.pixiObject, index);
      }
    });
  }

  private _parentFor(object: RgssDisplayObject) {
    if (object.viewportId == null) return this._rootLayer;

    return this._resolveViewport(object.viewportId).content;
  }
}

export const compareRgssRenderEntry = (a: RgssRenderEntry, b: RgssRenderEntry) => {
  if (a.rgssZ !== b.rgssZ) return a.rgssZ - b.rgssZ;
  if (a.rgssY !== b.rgssY) return a.rgssY - b.rgssY;
  if (a.creationOrder !== b.creationOrder) return a.creationOrder - b.creationOrder;
  return a.entryOrder - b.entryOrder;
};
