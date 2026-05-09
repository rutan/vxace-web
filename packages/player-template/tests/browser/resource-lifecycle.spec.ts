import { expect, test } from '@playwright/test';
import { loadGame } from './helpers';

test.describe('resource lifecycle', () => {
  test('disposeObject removes bridge records and display objects', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const before = app.debugSnapshot();
      const bitmapId = app.createBitmapFromSize(16, 16);
      const spriteId = app.createSprite();
      const planeId = app.createPlane();
      const tilemapId = app.createTilemap();
      const windowId = app.createWindow();
      const viewportId = app.createViewport();
      const afterCreate = app.debugSnapshot();

      app.disposeObject('sprite', spriteId);
      app.disposeObject('plane', planeId);
      app.disposeObject('tilemap', tilemapId);
      app.disposeObject('window', windowId);
      app.disposeObject('viewport', viewportId);
      app.disposeObject('bitmap', bitmapId);
      const afterDispose = app.debugSnapshot();

      return {
        before,
        afterCreate,
        afterDispose,
        disposedBitmap: app.getObject('bitmap', bitmapId) == null,
        disposedSprite: app.getObject('sprite', spriteId) == null,
        disposedPlane: app.getObject('plane', planeId) == null,
        disposedTilemap: app.getObject('tilemap', tilemapId) == null,
        disposedWindow: app.getObject('window', windowId) == null,
        disposedViewport: app.getObject('viewport', viewportId) == null,
      };
    });

    expect(result.afterCreate.bitmapCount).toBe(result.before.bitmapCount + 1);
    expect(result.afterCreate.spriteCount).toBe(result.before.spriteCount + 1);
    expect(result.afterCreate.planeCount).toBe(result.before.planeCount + 1);
    expect(result.afterCreate.tilemapCount).toBe(result.before.tilemapCount + 1);
    expect(result.afterCreate.windowCount).toBe(result.before.windowCount + 1);
    expect(result.afterDispose.bitmapCount).toBe(result.before.bitmapCount);
    expect(result.afterDispose.spriteCount).toBe(result.before.spriteCount);
    expect(result.afterDispose.planeCount).toBe(result.before.planeCount);
    expect(result.afterDispose.tilemapCount).toBe(result.before.tilemapCount);
    expect(result.afterDispose.windowCount).toBe(result.before.windowCount);
    expect(result.disposedBitmap).toBe(true);
    expect(result.disposedSprite).toBe(true);
    expect(result.disposedPlane).toBe(true);
    expect(result.disposedTilemap).toBe(true);
    expect(result.disposedWindow).toBe(true);
    expect(result.disposedViewport).toBe(true);
  });
});
