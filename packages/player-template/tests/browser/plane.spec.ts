import { expect, test } from '@playwright/test';
import { expectNoRuntimeError, loadGame } from './helpers';

test.describe('plane rendering', () => {
  test('tiles bitmap and scrolls with ox and oy', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const bitmapId = app.createBitmapFromSize(8, 8);
      const planeId = app.createPlane();
      const bitmap = app.getObject('bitmap', bitmapId);
      bitmap.fillRect(0, 0, 8, 8, 'rgba(255, 255, 255, 1)');
      app.setBitmapToPlane(planeId, bitmapId);
      app.setProperty('plane', planeId, 'ox', 3);
      app.setProperty('plane', planeId, 'oy', 5);
      app.setProperty('plane', planeId, 'opacity', 128);
      app.setProperty('plane', planeId, 'zIndex', 7);

      const plane = app.getObject('plane', planeId);

      return {
        hasBitmap: plane.texture !== null && plane.texture !== (window as any).PIXI?.Texture?.EMPTY,
        tileX: plane.tilePosition.x,
        tileY: plane.tilePosition.y,
        opacity: app.getProperty('plane', planeId, 'opacity'),
        alpha: plane.alpha,
        zIndex: app.getProperty('plane', planeId, 'zIndex'),
      };
    });

    expect(result.hasBitmap).toBe(true);
    expect(result.tileX).toBe(-3);
    expect(result.tileY).toBe(-5);
    expect(result.opacity).toBe(128);
    expect(result.alpha).toBeCloseTo(128 / 255, 3);
    expect(result.zIndex).toBe(7);
  });

  test('refreshes base and effect textures when the assigned bitmap changes', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const backgroundBitmapId = app.createBitmapFromSize(8, 8);
      const firstBitmapId = app.createBitmapFromSize(8, 8);
      const secondBitmapId = app.createBitmapFromSize(8, 8);
      const backgroundSpriteId = app.createSprite();
      const planeId = app.createPlane();
      const backgroundBitmap = app.getObject('bitmap', backgroundBitmapId);
      const firstBitmap = app.getObject('bitmap', firstBitmapId);
      const secondBitmap = app.getObject('bitmap', secondBitmapId);

      const readPixel = () => {
        const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
        const context = canvas.getContext('2d')!;
        return Array.from(context.getImageData(4, 4, 1, 1).data);
      };

      backgroundBitmap.fillRect(0, 0, 8, 8, 'rgba(0, 255, 0, 1)');
      app.setBitmapToSprite(backgroundSpriteId, backgroundBitmapId);
      app.setProperty('sprite', backgroundSpriteId, 'zIndex', 0);

      firstBitmap.fillRect(0, 0, 8, 8, 'rgba(255, 0, 0, 1)');
      app.setBitmapToPlane(planeId, firstBitmapId);
      app.setColorToPlane(planeId, JSON.stringify({ red: 0, green: 0, blue: 255, alpha: 255 }));
      app.setProperty('plane', planeId, 'zIndex', 1);
      app._renderNow();
      const beforeClear = readPixel();
      const firstListenerCountAfterAssign = firstBitmap._changeListeners.size;

      firstBitmap.clear();
      app._renderNow();
      const afterClear = readPixel();

      app.setBitmapToPlane(planeId, secondBitmapId);
      const firstListenerCountAfterReplace = firstBitmap._changeListeners.size;
      const secondListenerCountAfterReplace = secondBitmap._changeListeners.size;

      app.disposeObject('plane', planeId);
      const secondListenerCountAfterDestroy = secondBitmap._changeListeners.size;

      return {
        beforeClear,
        afterClear,
        firstListenerCountAfterAssign,
        firstListenerCountAfterReplace,
        secondListenerCountAfterReplace,
        secondListenerCountAfterDestroy,
      };
    });

    expect(result.beforeClear).toEqual([0, 0, 255, 255]);
    expect(result.afterClear).toEqual([0, 255, 0, 255]);
    expect(result.firstListenerCountAfterAssign).toBe(1);
    expect(result.firstListenerCountAfterReplace).toBe(0);
    expect(result.secondListenerCountAfterReplace).toBe(1);
    expect(result.secondListenerCountAfterDestroy).toBe(0);
    await expectNoRuntimeError(page);
  });

  test('renders through transparent tilemap cells when used as map parallax', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const bitmapId = app.createBitmapFromSize(8, 8);
      const planeId = app.createPlane();
      const tilemapId = app.createTilemap();
      const snapshotId = app.createBitmapFromSize(1, 1);
      const bitmap = app.getObject('bitmap', bitmapId);

      bitmap.fillRect(0, 0, 8, 8, 'rgba(255, 0, 0, 1)');
      app.setBitmapToPlane(planeId, bitmapId);
      app.setProperty('plane', planeId, 'zIndex', -100);
      app.setDataToTilemap(
        tilemapId,
        JSON.stringify({
          mapData: { xsize: 1, ysize: 1, zsize: 4, data: [0, 0, 0, 0] },
          flags: { xsize: 8192, ysize: 1, zsize: 1, data: [0] },
        }),
      );
      app._renderNow();
      app.copyScreenToBitmap(snapshotId);

      return app.getObject('bitmap', snapshotId).getPixel(16, 16);
    });

    expect(result).toEqual({ red: 255, green: 0, blue: 0, alpha: 255 });
    await expectNoRuntimeError(page);
  });

  test('Plane blend_type 2 renders as RGSS subtract instead of Pixi multiply', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const app = (window as any).rubyBridge.app;
      const backgroundBitmapId = app.createBitmapFromSize(1, 1);
      const planeBitmapId = app.createBitmapFromSize(1, 1);
      const backgroundSpriteId = app.createSprite();
      const planeId = app.createPlane();
      const backgroundBitmap = app.getObject('bitmap', backgroundBitmapId);
      const planeBitmap = app.getObject('bitmap', planeBitmapId);
      const backgroundSprite = app.getObject('sprite', backgroundSpriteId);
      const plane = app.getObject('plane', planeId);

      backgroundBitmap.fillRect(0, 0, 1, 1, 'rgba(200, 120, 90, 1)');
      planeBitmap.fillRect(0, 0, 1, 1, 'rgba(80, 20, 40, 1)');
      app.setBitmapToSprite(backgroundSpriteId, backgroundBitmapId);
      app.setBitmapToPlane(planeId, planeBitmapId);
      backgroundSprite.x = 24;
      backgroundSprite.y = 24;
      backgroundSprite.zIndex = 1000;
      plane.x = 24;
      plane.y = 24;
      plane.zIndex = 1001;
      app.setProperty('plane', planeId, 'blendType', 2);
      app._renderNow();

      const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      const rubyReadback = JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            plane = Plane.new
            plane.blend_type = 2
            { blend_type: plane.blend_type }.to_json
          `,
            'test-plane-blend-type-subtract-readback',
          )
        ).toString(),
      );

      return {
        pixel: Array.from(context.getImageData(24, 24, 1, 1).data),
        blendType: app.getProperty('plane', planeId, 'blendType'),
        pixiBlendMode: plane.blendMode,
        rubyReadback,
      };
    });

    expect(result.pixel).toEqual([120, 100, 50, 255]);
    expect(result.blendType).toBe(2);
    expect(result.pixiBlendMode).not.toBe(2);
    expect(result.rubyReadback.blend_type).toBe(2);
    await expectNoRuntimeError(page);
  });
});
