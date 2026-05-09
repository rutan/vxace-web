import { expect, test } from '@playwright/test';
import { expectNoRuntimeError, loadGame, readAppDebugSnapshot, startNewGame, tapKey } from './helpers';

type AppDebugSnapshot = {
  runtimeErrorOpen: boolean;
  tilemapCount: number;
  visibleWindowCount: number;
  lastBridgeEvent: string;
};

test.describe('demo equip flow', () => {
  test('equip scene opens for the first actor without asset load runtime errors', async ({ page }, testInfo) => {
    const readSnapshot = () => {
      return readAppDebugSnapshot<AppDebugSnapshot>(page);
    };

    await loadGame(page, { gameDir: 'demo', settleMs: 3000, canvasTimeout: 20_000 });

    await startNewGame(page);

    await tapKey(page, 'x');
    await expectNoRuntimeError(page);

    await tapKey(page, 'ArrowDown');
    await tapKey(page, 'ArrowDown');
    await tapKey(page, 'c');
    await tapKey(page, 'c');

    await page.waitForTimeout(800);
    await expectNoRuntimeError(page);

    const equipSnapshot = await readSnapshot();
    await testInfo.attach('equip-scene-snapshot', {
      body: Buffer.from(JSON.stringify(equipSnapshot, null, 2)),
      contentType: 'application/json',
    });

    expect(equipSnapshot.runtimeErrorOpen).toBe(false);
    expect(equipSnapshot.visibleWindowCount).toBeGreaterThanOrEqual(1);
  });
});
