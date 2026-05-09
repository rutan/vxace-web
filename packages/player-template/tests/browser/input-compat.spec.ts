import { expect, test } from '@playwright/test';
import { dispatchKeyEvent, loadGame } from './helpers';

test.describe('input compatibility', () => {
  test('reports 8-way direction only while direction keys are pressed', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const readDir8 = async () => {
      return page.evaluate(async () => {
        const rubyManager = (window as any).rubyBridge.rubyManager;
        return Number((await rubyManager.evalAsync('Input.update; Input.dir8', 'test-input-dir8')).toString());
      });
    };

    expect(await readDir8()).toBe(0);

    await dispatchKeyEvent(page, 'keydown', 'ArrowLeft');
    expect(await readDir8()).toBe(4);

    await dispatchKeyEvent(page, 'keydown', 'ArrowUp');
    expect(await readDir8()).toBe(7);

    await dispatchKeyEvent(page, 'keyup', 'ArrowLeft');
    expect(await readDir8()).toBe(8);

    await dispatchKeyEvent(page, 'keydown', 'ArrowRight');
    expect(await readDir8()).toBe(9);

    await dispatchKeyEvent(page, 'keyup', 'ArrowUp');
    expect(await readDir8()).toBe(6);

    await dispatchKeyEvent(page, 'keydown', 'ArrowDown');
    expect(await readDir8()).toBe(3);

    await dispatchKeyEvent(page, 'keyup', 'ArrowRight');
    expect(await readDir8()).toBe(2);

    await dispatchKeyEvent(page, 'keyup', 'ArrowDown');
    expect(await readDir8()).toBe(0);
  });

  test('tracks Ctrl, Alt, and debug function keys', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    for (const code of ['ControlLeft', 'AltRight', 'F5', 'F6', 'F7', 'F8', 'F9']) {
      await dispatchKeyEvent(page, 'keydown', code);
    }

    const pressed = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      app.updateKey();
      return app.debugSnapshot().keyState;
    });

    expect(pressed.CTRL).toBeGreaterThan(0);
    expect(pressed.ALT).toBeGreaterThan(0);
    expect(pressed.F5).toBeGreaterThan(0);
    expect(pressed.F6).toBeGreaterThan(0);
    expect(pressed.F7).toBeGreaterThan(0);
    expect(pressed.F8).toBeGreaterThan(0);
    expect(pressed.F9).toBeGreaterThan(0);

    for (const code of ['ControlLeft', 'AltRight', 'F5', 'F6', 'F7', 'F8', 'F9']) {
      await dispatchKeyEvent(page, 'keyup', code);
    }

    const released = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      app.updateKey();
      return app.debugSnapshot().keyState;
    });

    expect(released.CTRL).toBe(0);
    expect(released.ALT).toBe(0);
    expect(released.F5).toBe(0);
    expect(released.F6).toBe(0);
    expect(released.F7).toBe(0);
    expect(released.F8).toBe(0);
    expect(released.F9).toBe(0);
  });
});
