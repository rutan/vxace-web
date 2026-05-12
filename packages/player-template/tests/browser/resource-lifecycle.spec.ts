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

  test('Ruby GC disposes overwritten RGSS sprites', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const before = app.debugSnapshot();

      const ids = JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            def make_overwritten_rgss_sprite_ids
              sprite = Sprite.new
              first_id = sprite.instance_variable_get(:@__sprite_id)
              sprite = Sprite.new
              second_id = sprite.instance_variable_get(:@__sprite_id)
              $__resource_lifecycle_kept_sprite = sprite
              [first_id, second_id].to_json
            end

            make_overwritten_rgss_sprite_ids
          `,
            'test-rgss-sprite-gc-dispose',
          )
        ).toString(),
      );
      const afterCreate = app.debugSnapshot();

      await rubyManager.evalAsync('GC.start', 'test-rgss-sprite-gc-start');
      const afterGc = app.debugSnapshot();
      const firstDisposed = app.getObject('sprite', ids[0]) == null;
      const secondAlive = app.getObject('sprite', ids[1]) != null;

      await rubyManager.evalAsync(
        '$__resource_lifecycle_kept_sprite.dispose; $__resource_lifecycle_kept_sprite = nil',
        'test-rgss-sprite-gc-cleanup',
      );

      return {
        before,
        afterCreate,
        afterGc,
        firstDisposed,
        secondAlive,
      };
    });

    expect(result.afterCreate.spriteCount).toBe(result.before.spriteCount + 2);
    expect(result.afterGc.spriteCount).toBe(result.before.spriteCount + 1);
    expect(result.firstDisposed).toBe(true);
    expect(result.secondAlive).toBe(true);
  });

  test('Graphics.freeze collects overwritten RGSS sprites before scene transitions', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const before = app.debugSnapshot();

      const ids = JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            bitmap = Bitmap.new(16, 16)
            sprite = Sprite.new
            sprite.bitmap = bitmap
            first_id = sprite.instance_variable_get(:@__sprite_id)
            sprite = Sprite.new
            sprite.bitmap = bitmap
            $__resource_lifecycle_kept_bitmap = bitmap
            $__resource_lifecycle_kept_sprite = sprite

            before_freeze = JS.global[:rubyBridge][:app].debugSnapshot()[:spriteCount].to_i
            Graphics.freeze
            after_freeze = JS.global[:rubyBridge][:app].debugSnapshot()[:spriteCount].to_i

            {
              first_id: first_id,
              second_id: sprite.instance_variable_get(:@__sprite_id),
              before_freeze: before_freeze,
              after_freeze: after_freeze
            }.to_json
          `,
            'test-graphics-freeze-collects-overwritten-sprite',
          )
        ).toString(),
      );

      const firstDisposed = app.getObject('sprite', ids.first_id) == null;
      const secondAlive = app.getObject('sprite', ids.second_id) != null;

      await rubyManager.evalAsync(
        `
        $__resource_lifecycle_kept_sprite.dispose
        $__resource_lifecycle_kept_bitmap.dispose
        $__resource_lifecycle_kept_sprite = nil
        $__resource_lifecycle_kept_bitmap = nil
      `,
        'test-graphics-freeze-collects-overwritten-sprite-cleanup',
      );

      return { before, ids, firstDisposed, secondAlive };
    });

    expect(result.ids.before_freeze).toBe(result.before.spriteCount + 2);
    expect(result.ids.after_freeze).toBe(result.before.spriteCount + 1);
    expect(result.firstDisposed).toBe(true);
    expect(result.secondAlive).toBe(true);
  });
});
