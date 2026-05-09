import { expect, test } from '@playwright/test';
import {
  expectNoRuntimeError,
  focusGameCanvas,
  loadGame,
  readAppDebugSnapshot,
  readRuntimeError,
  tapKey,
  waitForTilemap,
} from './helpers';

type AppDebugSnapshot = {
  bitmapCount: number;
  spriteCount: number;
  visibleSpriteCount: number;
  tilemapCount: number;
  visibleTilemapCount: number;
  windowCount: number;
  visibleWindowCount: number;
  messageOpen: boolean;
  runtimeErrorOpen: boolean;
  documentHasFocus: boolean;
  activeElementTag: string;
  keyState: Record<string, number>;
  lastBridgeEvent: string;
};

test.describe('demo boot smoke', () => {
  test('title boot and new game transition stay free of runtime errors', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const readSnapshot = () => {
      return readAppDebugSnapshot<AppDebugSnapshot>(page);
    };

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.stack || `${error.name}: ${error.message}`);
    });

    await loadGame(page, { gameDir: 'demo', settleMs: 3000, canvasTimeout: 20_000 });
    const titleSnapshot = await readSnapshot();
    expect(titleSnapshot.runtimeErrorOpen).toBe(false);
    expect(titleSnapshot.spriteCount).toBeGreaterThanOrEqual(2);
    expect(titleSnapshot.windowCount).toBeGreaterThanOrEqual(1);
    expect(titleSnapshot.tilemapCount).toBe(0);

    await testInfo.attach('title-screenshot', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    await testInfo.attach('title-snapshot', {
      body: Buffer.from(JSON.stringify(titleSnapshot, null, 2)),
      contentType: 'application/json',
    });

    await focusGameCanvas(page);
    let duringInputSnapshot: AppDebugSnapshot | null = null;
    await tapKey(page, 'Enter', {
      afterUpDelay: 0,
      whileDown: async () => {
        duringInputSnapshot = await readSnapshot();
        await testInfo.attach('during-input-snapshot', {
          body: Buffer.from(JSON.stringify(duringInputSnapshot, null, 2)),
          contentType: 'application/json',
        });
      },
    });
    const afterInputSnapshot = await readSnapshot();
    await testInfo.attach('after-input-snapshot', {
      body: Buffer.from(JSON.stringify(afterInputSnapshot, null, 2)),
      contentType: 'application/json',
    });
    if (afterInputSnapshot.runtimeErrorOpen) {
      await testInfo.attach('runtime-error', {
        body: Buffer.from(await readRuntimeError(page)),
        contentType: 'text/plain',
      });
    }
    if (consoleErrors.length > 0) {
      await testInfo.attach('console-errors', {
        body: Buffer.from(consoleErrors.join('\n\n')),
        contentType: 'text/plain',
      });
    }
    await waitForTilemap(page);
    await expectNoRuntimeError(page);
    const mapSnapshot = await readSnapshot();
    expect(mapSnapshot.runtimeErrorOpen).toBe(false);
    expect(mapSnapshot.tilemapCount).toBeGreaterThanOrEqual(1);
    expect(mapSnapshot.visibleTilemapCount).toBeGreaterThanOrEqual(1);

    await testInfo.attach('after-new-game-screenshot', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    await testInfo.attach('map-snapshot', {
      body: Buffer.from(JSON.stringify(mapSnapshot, null, 2)),
      contentType: 'application/json',
    });

    expect(pageErrors, pageErrors.join('\n\n')).toEqual([]);
    expect(consoleErrors, consoleErrors.join('\n\n')).toEqual([]);
  });
});
