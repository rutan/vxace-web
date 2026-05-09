import { expect, test } from '@playwright/test';
import { expectNoRuntimeError, loadGame } from './helpers';

test.describe('player shell', () => {
  test('uses manifest title and fits the game screen into the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await loadGame(page, { gameDir: 'minimal', settleMs: 500 });

    await expect(page).toHaveTitle('minimal');

    const layout = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();

      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        styleWidth: canvas.style.width,
        styleHeight: canvas.style.height,
      };
    });

    expect(layout.width).toBe(785);
    expect(layout.height).toBe(600);
    expect(layout.left).toBe(8);
    expect(layout.top).toBe(0);
    expect(layout.styleWidth).toBe('544px');
    expect(layout.styleHeight).toBe('416px');
    await expect(page.locator('.boot-status')).toHaveCount(0);
    await expectNoRuntimeError(page);
  });

  test('shows virtual gamepad after touch and maps buttons to runtime input', async ({ page }) => {
    await page.route('**/minimal/manifest.json', async (route) => {
      const response = await route.fetch();
      const manifest = await response.json();
      manifest.metadata.input.virtualGamepad = 'normal';
      await route.fulfill({ json: manifest });
    });

    await loadGame(page, { gameDir: 'minimal', settleMs: 500 });

    await expect(page.locator('.virtual-gamepad')).toBeHidden();
    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 1 }));
    });
    await expect(page.locator('.virtual-gamepad')).toBeVisible();
    await expect(page.locator('button[aria-label="B button"]')).toHaveClass(/virtual-gamepad__face-button--b/);
    await expect(page.locator('button[aria-label="C button"]')).toHaveClass(/virtual-gamepad__face-button--c/);

    const cButton = page.locator('button[aria-label="C button"]');
    await cButton.evaluate((element) => {
      element.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 2, isPrimary: true }),
      );
    });
    const pressed = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      return app.updateKey().C;
    });
    expect(pressed).toBeGreaterThan(0);

    await cButton.evaluate((element) => {
      element.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 2, isPrimary: true }),
      );
    });
    const released = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      return app.updateKey().C;
    });
    expect(released).toBe(0);
    await expectNoRuntimeError(page);
  });

  test('switches dpad direction while keeping the same touch active', async ({ page }) => {
    await page.route('**/minimal/manifest.json', async (route) => {
      const response = await route.fetch();
      const manifest = await response.json();
      manifest.metadata.input.virtualGamepad = 'normal';
      await route.fulfill({ json: manifest });
    });

    await loadGame(page, { gameDir: 'minimal', settleMs: 500 });
    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 1 }));
    });

    const dpad = page.locator('.virtual-gamepad__dpad');
    await dpad.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      element.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: rect.right - 4,
          clientY: rect.top + rect.height / 2,
          pointerType: 'touch',
          pointerId: 3,
          isPrimary: true,
        }),
      );
    });

    const rightPressed = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const state = app.updateKey();
      return { right: state.RIGHT, up: state.UP };
    });
    expect(rightPressed.right).toBeGreaterThan(0);
    expect(rightPressed.up).toBe(0);

    await dpad.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      element.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + 4,
          pointerType: 'touch',
          pointerId: 3,
          isPrimary: true,
        }),
      );
    });

    const upPressed = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const state = app.updateKey();
      return { right: state.RIGHT, up: state.UP };
    });
    expect(upPressed.right).toBe(0);
    expect(upPressed.up).toBeGreaterThan(0);

    await dpad.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      element.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + 4,
          pointerType: 'touch',
          pointerId: 3,
          isPrimary: true,
        }),
      );
    });

    const released = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const state = app.updateKey();
      return { right: state.RIGHT, up: state.UP };
    });
    expect(released.right).toBe(0);
    expect(released.up).toBe(0);
    await expectNoRuntimeError(page);
  });

  test('uses normal-swap layout to swap face button class names', async ({ page }) => {
    await page.route('**/minimal/manifest.json', async (route) => {
      const response = await route.fetch();
      const manifest = await response.json();
      manifest.metadata.input.virtualGamepad = 'normal-swap';
      await route.fulfill({ json: manifest });
    });

    await loadGame(page, { gameDir: 'minimal', settleMs: 500 });
    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 1 }));
    });

    const layout = await page.evaluate(() => {
      const bButton = document.querySelector('button[aria-label="B button"]')!;
      const cButton = document.querySelector('button[aria-label="C button"]')!;
      const b = bButton.getBoundingClientRect();
      const c = cButton.getBoundingClientRect();
      return {
        bClassName: bButton.className,
        bLeft: Math.round(b.left),
        bTop: Math.round(b.top),
        cClassName: cButton.className,
        cLeft: Math.round(c.left),
        cTop: Math.round(c.top),
      };
    });

    expect(layout.bClassName).toContain('virtual-gamepad__face-button--c');
    expect(layout.cClassName).toContain('virtual-gamepad__face-button--b');
    expect(layout.bLeft).toBeGreaterThan(layout.cLeft);
    expect(layout.bTop).toBeLessThan(layout.cTop);
    await expectNoRuntimeError(page);
  });

  test('uses simple layout with only B and C face buttons', async ({ page }) => {
    await page.route('**/minimal/manifest.json', async (route) => {
      const response = await route.fetch();
      const manifest = await response.json();
      manifest.metadata.input.virtualGamepad = 'simple';
      await route.fulfill({ json: manifest });
    });

    await loadGame(page, { gameDir: 'minimal', settleMs: 500 });
    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 1 }));
    });

    const layout = await page.evaluate(() => {
      const labels = [...document.querySelectorAll('.virtual-gamepad button[aria-label]:not([aria-hidden])')].map(
        (element) => element.getAttribute('aria-label'),
      );
      const b = document.querySelector('button[aria-label="B button"]')!.getBoundingClientRect();
      const c = document.querySelector('button[aria-label="C button"]')!.getBoundingClientRect();
      return {
        labels,
        bLeft: Math.round(b.left),
        bTop: Math.round(b.top),
        cLeft: Math.round(c.left),
        cTop: Math.round(c.top),
      };
    });

    expect(layout.labels).toEqual(['B button', 'C button']);
    expect(layout.bLeft).toBeLessThan(layout.cLeft);
    expect(layout.bTop).toBeGreaterThan(layout.cTop);
    await expectNoRuntimeError(page);
  });
});
