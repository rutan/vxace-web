import { expect, test } from '@playwright/test';
import {
  clickGameCanvas,
  expectNoRuntimeError,
  loadGame,
  readAppDebugSnapshot,
  tapKey,
  waitForTilemap,
  waitForVisibleWindow,
} from './helpers';

type AppDebugSnapshot = {
  tilemapCount: number;
  windowCount: number;
  visibleWindowCount: number;
  runtimeErrorOpen: boolean;
  lastBridgeEvent: string;
};

test.describe('demo menu flow', () => {
  test('menu opens from the map without runtime errors', async ({ page }, testInfo) => {
    const readSnapshot = () => {
      return readAppDebugSnapshot<AppDebugSnapshot>(page);
    };

    await loadGame(page, { gameDir: 'demo', settleMs: 3000, canvasTimeout: 20_000 });

    await clickGameCanvas(page);
    await tapKey(page, 'Enter');

    await page.waitForTimeout(500);
    await waitForTilemap(page);

    await page.waitForTimeout(1000);
    const beforeMenu = await readSnapshot();

    await clickGameCanvas(page);
    await tapKey(page, 'x');
    await page.waitForTimeout(500);

    await waitForVisibleWindow(page);

    await expectNoRuntimeError(page);
    const afterMenu = await readSnapshot();

    await tapKey(page, 'c');

    await page.waitForTimeout(500);
    await expectNoRuntimeError(page);
    const afterItemScene = await readSnapshot();

    await testInfo.attach('before-menu-snapshot', {
      body: Buffer.from(JSON.stringify(beforeMenu, null, 2)),
      contentType: 'application/json',
    });
    await testInfo.attach('after-menu-snapshot', {
      body: Buffer.from(JSON.stringify(afterMenu, null, 2)),
      contentType: 'application/json',
    });
    await testInfo.attach('after-item-scene-snapshot', {
      body: Buffer.from(JSON.stringify(afterItemScene, null, 2)),
      contentType: 'application/json',
    });

    expect(afterMenu.runtimeErrorOpen).toBe(false);
    expect(afterMenu.visibleWindowCount).toBeGreaterThanOrEqual(1);
    expect(afterItemScene.runtimeErrorOpen).toBe(false);
    expect(afterItemScene.visibleWindowCount).toBeGreaterThanOrEqual(1);
  });

  test('returning to title from the game end menu restores the title screen', async ({ page }) => {
    const readSnapshot = () => {
      return readAppDebugSnapshot<AppDebugSnapshot>(page);
    };

    await loadGame(page, { gameDir: 'demo', settleMs: 3000, canvasTimeout: 20_000 });

    await clickGameCanvas(page);
    await tapKey(page, 'Enter');
    await waitForTilemap(page);
    await page.waitForTimeout(1000);

    await clickGameCanvas(page);
    await tapKey(page, 'x');
    await waitForVisibleWindow(page);
    for (let index = 0; index < 5; index += 1) {
      await tapKey(page, 'ArrowDown', { beforeUpDelay: 60, afterUpDelay: 80 });
    }
    await tapKey(page, 'Enter');
    await page.waitForTimeout(1000);
    await waitForVisibleWindow(page);
    await tapKey(page, 'Enter');

    await expect
      .poll(async () => {
        const snapshot = await readSnapshot();
        return snapshot.runtimeErrorOpen ? -1 : snapshot.tilemapCount;
      })
      .toBe(0);

    const titleSnapshot = await readSnapshot();
    expect(titleSnapshot.windowCount).toBeGreaterThanOrEqual(1);

    const averageBrightness = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      app._renderNow();
      const canvas = app.pixiApp.renderer.extract.canvas(undefined, app.pixiApp.screen) as HTMLCanvasElement;
      const context = canvas.getContext('2d');
      if (!context) return 0;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        total += pixels[index] + pixels[index + 1] + pixels[index + 2];
      }
      return total / ((pixels.length / 4) * 3);
    });

    await expectNoRuntimeError(page);
    expect(averageBrightness).toBeGreaterThan(5);
  });
});
