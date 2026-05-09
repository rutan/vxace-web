import { expect, test } from '@playwright/test';
import { expectNoRuntimeError, loadGame } from './helpers';

test.describe('graphics bridge', () => {
  test('resize, freeze, and snapshot APIs stay operational', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const bitmapId = app.createBitmapFromSize(1, 1);

      app.resizeScreen(320, 240);
      app.setGraphicsBrightness(96);
      app.freezeGraphics();
      app.setFrozenGraphicsOpacity(0.5);
      app.copyScreenToBitmap(bitmapId);
      await app.updateGraphics(60);
      app.clearFrozenGraphics();
      app.setGraphicsBrightness(255);

      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
      const snapshot = app.debugSnapshot();

      return {
        canvasWidth: canvas?.width ?? 0,
        canvasHeight: canvas?.height ?? 0,
        canvasStyleWidth: canvas?.style.width ?? '',
        canvasStyleHeight: canvas?.style.height ?? '',
        bitmapWidth: app.getProperty('bitmap', bitmapId, 'width'),
        bitmapHeight: app.getProperty('bitmap', bitmapId, 'height'),
        runtimeErrorOpen: snapshot.runtimeErrorOpen,
      };
    });

    expect(result.canvasWidth).toBe(320);
    expect(result.canvasHeight).toBe(240);
    expect(result.canvasStyleWidth).toBe('320px');
    expect(result.canvasStyleHeight).toBe('240px');
    expect(result.bitmapWidth).toBe(320);
    expect(result.bitmapHeight).toBe(240);
    expect(result.runtimeErrorOpen).toBe(false);
    await expectNoRuntimeError(page);
  });

  test('filename transition and movie fallback stay operational', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', settleMs: 500, assertNoRuntimeError: false });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      app.freezeGraphics();
      const prepared = await app.prepareGraphicsTransition('Graphics/rutan', 24);
      app.setFrozenGraphicsTransitionProgress(0.5, 24);
      const transitionSnapshot = app.debugSnapshot();
      app.clearFrozenGraphics();
      app.playMovie('Movies/opening');
      const movieSnapshot = app.debugSnapshot();

      return {
        prepared,
        transitionEvent: transitionSnapshot.lastBridgeEvent,
        movieEvent: movieSnapshot.lastBridgeEvent,
        runtimeErrorOpen: movieSnapshot.runtimeErrorOpen,
      };
    });

    expect(result.prepared).toBe(true);
    expect(result.transitionEvent).toContain('setFrozenGraphicsTransitionProgress');
    expect(result.movieEvent).toContain('playMovie(Movies/opening)');
    expect(result.runtimeErrorOpen).toBe(false);
    await expectNoRuntimeError(page);
  });

  test('missing image assets fail without default extension fetch fallback', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', settleMs: 500, assertNoRuntimeError: false });

    const result = await page.evaluate(async () => {
      const originalFetch = window.fetch.bind(window);
      let requestedMissingAsset = false;
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.includes('Graphics/MissingAsset')) requestedMissingAsset = true;
        return originalFetch(input, init);
      };

      try {
        await (window as any).rubyBridge.app.loadBitmapFromImage('Graphics/MissingAsset');
        return { message: null, requestedMissingAsset };
      } catch (error) {
        return { message: String(error), requestedMissingAsset };
      } finally {
        window.fetch = originalFetch;
      }
    });

    expect(result.message).toContain('asset not found in manifest: Graphics/MissingAsset');
    expect(result.requestedMissingAsset).toBe(false);
  });

  test('image network failures show retry UI and resume the pending load', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    let requestCount = 0;
    await page.route(
      (url) => url.pathname.includes('/minimal/Graphics/') && url.pathname.endsWith('.png'),
      async (route) => {
        requestCount += 1;
        if (requestCount === 1) {
          await route.abort('failed');
          return;
        }

        await route.continue();
      },
    );

    const resultPromise = page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const bitmapId = await app.loadBitmapFromImage('Graphics/rutan');
      return {
        width: app.getProperty('bitmap', bitmapId, 'width'),
        height: app.getProperty('bitmap', bitmapId, 'height'),
        resourceErrorOpen: app.debugSnapshot().resourceErrorOpen,
      };
    });

    await expect(page.locator('.resource-error')).toBeVisible();
    await expect(page.locator('.resource-error__title')).toContainText('Graphics/rutan.png');
    await page.locator('.resource-error__retry').click();

    await expect(resultPromise).resolves.toMatchObject({
      width: 128,
      height: 128,
      resourceErrorOpen: false,
    });
    expect(requestCount).toBe(2);
    await expect(page.locator('.resource-error')).toBeHidden();
    await expectNoRuntimeError(page);
  });

  test('serial blocking resource loads show loading UI until Graphics.update', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    let requestCount = 0;
    await page.route(
      (url) => url.pathname.includes('/minimal/Graphics/') && url.pathname.endsWith('.png'),
      async (route) => {
        requestCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 160));
        await route.continue();
      },
    );

    const resultPromise = page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const sleep = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
      for (let index = 0; index < 4; index += 1) {
        await app.loadBitmapFromImage('Graphics/rutan');
        if (index < 3) await sleep(300);
      }

      const beforeUpdate = app.debugSnapshot().resourceLoadingOpen;
      await app.updateGraphics(60);
      return {
        beforeUpdate,
        afterUpdate: app.debugSnapshot().resourceLoadingOpen,
        runtimeErrorOpen: app.debugSnapshot().runtimeErrorOpen,
      };
    });

    await expect(page.locator('.resource-loading')).toBeVisible();
    await expect(page.locator('.resource-loading__label')).toHaveText('Loading...');
    await page.waitForTimeout(350);
    await expect(page.locator('.resource-loading')).toBeVisible();

    await expect(resultPromise).resolves.toEqual({
      beforeUpdate: true,
      afterUpdate: false,
      runtimeErrorOpen: false,
    });
    await expect(page.locator('.resource-loading')).toBeHidden();
    expect(requestCount).toBe(4);
    await expectNoRuntimeError(page);
  });

  test('resource load error messages follow the browser language', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    const messages = await page.evaluate(() => {
      const setLanguages = (languages: string[], language: string) => {
        Object.defineProperty(window.navigator, 'languages', {
          configurable: true,
          get: () => languages,
        });
        Object.defineProperty(window.navigator, 'language', {
          configurable: true,
          get: () => language,
        });
      };
      const show = () => {
        const app = (window as any).rubyBridge.app;
        app.showResourceLoadError({
          kind: 'image',
          url: 'game/Graphics/Faces/Actor1.png',
          label: 'Graphics/Faces/Actor1.png',
          attempt: 1,
          message: '',
          detail: '',
          retry: () => undefined,
        });
        return {
          title: document.querySelector('.resource-error__title')?.textContent,
          content: document.querySelector('.resource-error__content')?.textContent,
          retry: document.querySelector('.resource-error__retry')?.textContent,
        };
      };

      setLanguages(['en-US'], 'en-US');
      const en = show();
      setLanguages(['ja-JP', 'en-US'], 'ja-JP');
      const ja = show();
      return { en, ja };
    });

    expect(messages.en).toEqual({
      title: 'Loading Error: Graphics/Faces/Actor1.png',
      content: 'Failed to load the file.\nCheck your network connection and try again.',
      retry: 'Retry',
    });
    expect(messages.ja).toEqual({
      title: '読み込みエラー: Graphics/Faces/Actor1.png',
      content: 'ファイルの読み込みに失敗しました。\nネットワーク状況を確認して、リトライしてください。',
      retry: 'リトライする',
    });
  });

  test('Graphics.update pacing absorbs Ruby-side frame work', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', settleMs: 500, assertNoRuntimeError: false });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const sleep = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

      app.resetGraphicsFramePacing();

      const startedAt = performance.now();
      for (let index = 0; index < 4; index += 1) {
        await sleep(20);
        await app.updateGraphics(20);
      }

      return performance.now() - startedAt;
    });

    expect(result).toBeLessThan(250);
  });

  test('Ruby Graphics transition and play_movie bridge do not raise', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 500, assertNoRuntimeError: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const value = await rubyManager.evalAsync(
        `
        Graphics.freeze
        Graphics.transition(2, 'Graphics/rutan', 24)
        Graphics.play_movie('Movies/opening')
        JS.global[:rubyBridge][:app].debugSnapshot()[:lastBridgeEvent].to_s
      `,
        'test-graphics-ruby-bridge',
      );
      return value.toString();
    });

    expect(result).toContain('playMovie(Movies/opening)');
    await expectNoRuntimeError(page);
  });

  test('Ruby Graphics transition restores brightness after fadeout', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 500, assertNoRuntimeError: false });

    const brightness = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const value = await rubyManager.evalAsync(
        `
        Graphics.fadeout(1)
        Graphics.freeze
        Graphics.transition(2)
        Graphics.brightness
      `,
        'test-graphics-transition-brightness',
      );
      return Number(value.toString());
    });

    expect(brightness).toBe(255);
    await expectNoRuntimeError(page);
  });
});
