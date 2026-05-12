import { expect, test } from '@playwright/test';
import { loadGame } from './helpers';

test.describe('window compatibility', () => {
  test('visible returns a Ruby boolean after show and hide', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;

      const rubyResult = await rubyManager.evalAsync(
        `
        require 'json'
        window = Window.new(0, 0, 120, 80)
        initial = window.visible
        window.hide
        hidden = window.visible
        hidden_branch = window.visible ? 'truthy' : 'falsey'
        window.show
        shown = window.visible
        {
          initial: initial,
          hidden: hidden,
          hidden_branch: hidden_branch,
          shown: shown
        }.to_json
      `,
        'test-window-visible-ruby-boolean',
      );

      return JSON.parse(rubyResult.toString());
    });

    expect(result).toEqual({
      initial: true,
      hidden: false,
      hidden_branch: 'falsey',
      shown: true,
    });
  });

  test('windowskin composites background and pattern before applying window opacity', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const skinId = await app.loadBitmapFromImage('Graphics/System/Window');
      const windowObject = app.getObject('window', windowId);

      app.setWindowskinToWindow(windowId, skinId);
      app.setProperty('window', windowId, 'windowWidth', 160);
      app.setProperty('window', windowId, 'windowHeight', 80);

      const backgroundFrame = windowObject._backgroundSprite.texture.frame;
      const firstFrameSlice = windowObject._frame.children[0].texture.frame;
      const backgroundTexture = windowObject._backgroundSprite.texture;
      app.setProperty('window', windowId, 'padding', 8);
      app.setProperty('window', windowId, 'pause', true);

      return {
        background: {
          x: backgroundFrame.x,
          y: backgroundFrame.y,
          width: backgroundFrame.width,
          height: backgroundFrame.height,
        },
        frame: {
          x: firstFrameSlice.x,
          y: firstFrameSlice.y,
          width: firstFrameSlice.width,
          height: firstFrameSlice.height,
        },
        backgroundWidth: windowObject._backgroundSprite.width,
        backgroundHeight: windowObject._backgroundSprite.height,
        backgroundTextureReused: backgroundTexture === windowObject._backgroundSprite.texture,
      };
    });

    expect(result.background).toEqual({ x: 0, y: 0, width: 156, height: 76 });
    expect(result.frame).toEqual({ x: 64, y: 0, width: 16, height: 16 });
    expect(result.backgroundWidth).toBe(156);
    expect(result.backgroundHeight).toBe(76);
    expect(result.backgroundTextureReused).toBe(true);
  });

  test('window tone is applied to the composited background before back opacity', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const backgroundId = app.createBitmapFromSize(96, 96);
      const backgroundSpriteId = app.createSprite();
      const skinId = app.createBitmapFromSize(128, 128);
      const windowId = app.createWindow();
      const background = app.getObject('bitmap', backgroundId);
      const skin = app.getObject('bitmap', skinId);
      const backgroundSprite = app.getObject('sprite', backgroundSpriteId);

      background.fillRect(0, 0, 96, 96, 'rgba(100, 100, 100, 1)');
      app.setBitmapToSprite(backgroundSpriteId, backgroundId);
      backgroundSprite.zIndex = 0;

      skin.clear();
      skin.fillRect(0, 0, 64, 64, 'rgba(40, 80, 120, 1)');
      skin.fillRect(0, 64, 64, 64, 'rgba(255, 255, 255, 0.10196078431372549)');

      app.setWindowskinToWindow(windowId, skinId);
      app.setProperty('window', windowId, 'x', 0);
      app.setProperty('window', windowId, 'y', 0);
      app.setProperty('window', windowId, 'zIndex', 100);
      app.setProperty('window', windowId, 'windowWidth', 68);
      app.setProperty('window', windowId, 'windowHeight', 68);
      app.setProperty('window', windowId, 'backOpacity', 192);
      app.setToneToWindow(windowId, JSON.stringify({ red: -34, green: 0, blue: 68, gray: 0 }));
      app._renderNow();

      const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      return Array.from(context.getImageData(10, 10, 1, 1).data);
    });

    expect(result[0]).toBeGreaterThanOrEqual(43);
    expect(result[0]).toBeLessThanOrEqual(47);
    expect(result[1]).toBeGreaterThanOrEqual(96);
    expect(result[1]).toBeLessThanOrEqual(101);
    expect(result[2]).toBeGreaterThanOrEqual(174);
    expect(result[2]).toBeLessThanOrEqual(180);
    expect(result[3]).toBe(255);
  });

  test('window background follows windowskin bitmap mutations after assignment', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const skinId = app.createBitmapFromSize(128, 128);
      const windowId = app.createWindow();
      const skin = app.getObject('bitmap', skinId);
      const readPixel = () => {
        app._renderNow();
        const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
        const context = canvas.getContext('2d')!;
        return Array.from(context.getImageData(34, 34, 1, 1).data);
      };

      skin.clear();
      skin.fillRect(0, 0, 64, 64, 'rgba(255, 0, 0, 1)');
      app.setWindowskinToWindow(windowId, skinId);
      app.setProperty('window', windowId, 'x', 0);
      app.setProperty('window', windowId, 'y', 0);
      app.setProperty('window', windowId, 'windowWidth', 68);
      app.setProperty('window', windowId, 'windowHeight', 68);
      app.setProperty('window', windowId, 'backOpacity', 255);
      const before = readPixel();

      skin.fillRect(0, 0, 64, 64, 'rgba(0, 0, 255, 1)');
      const after = readPixel();

      return { before, after };
    });

    expect(result.before).toEqual([255, 0, 0, 255]);
    expect(result.after).toEqual([0, 0, 255, 255]);
  });

  test('windowskin frame slices do not overlap on short windows', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const skinId = await app.loadBitmapFromImage('Graphics/System/Window');
      const windowObject = app.getObject('window', windowId);

      app.setWindowskinToWindow(windowId, skinId);
      app.setProperty('window', windowId, 'windowWidth', 320);
      app.setProperty('window', windowId, 'windowHeight', 24);

      return windowObject._frame.children.map((child: any) => ({
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height,
      }));
    });

    expect(result.length).toBe(6);
    expect(result.every((slice: any) => slice.y >= 0 && slice.y + slice.height <= 24)).toBe(true);
    expect(result.every((slice: any) => slice.height <= 12)).toBe(true);
    expect(result.filter((slice: any) => slice.y === 0)).toHaveLength(3);
    expect(result.filter((slice: any) => slice.y === 12)).toHaveLength(3);
  });

  test('windowskin side frame slices are tiled instead of vertically scaled', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const skinId = await app.loadBitmapFromImage('Graphics/System/Window');
      const windowObject = app.getObject('window', windowId);

      app.setWindowskinToWindow(windowId, skinId);
      app.setProperty('window', windowId, 'windowWidth', 320);
      app.setProperty('window', windowId, 'windowHeight', 40);

      return [windowObject._frame.children[3], windowObject._frame.children[4]].map((child: any) => ({
        hasTileScale: child.tileScale != null,
        sourceHeight: child.texture.frame.height,
        displayHeight: child.height,
      }));
    });

    expect(result).toEqual([
      { hasTileScale: true, sourceHeight: 32, displayHeight: 8 },
      { hasTileScale: true, sourceHeight: 32, displayHeight: 8 },
    ]);
  });

  test('windowskin cursor uses the 32px cursor patch region', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const skinId = await app.loadBitmapFromImage('Graphics/System/Window');
      const windowObject = app.getObject('window', windowId);

      app.setWindowskinToWindow(windowId, skinId);
      app.setProperty('window', windowId, 'padding', 12);
      app.setCursorRectToWindow(windowId, 4, 6, 96, 24);

      return windowObject._cursor.children.map((child: any) => ({
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height,
        sourceX: child.texture.frame.x,
        sourceY: child.texture.frame.y,
        sourceWidth: child.texture.frame.width,
        sourceHeight: child.texture.frame.height,
      }));
    });

    expect(result[0]).toEqual({
      x: 16,
      y: 18,
      width: 2,
      height: 2,
      sourceX: 64,
      sourceY: 64,
      sourceWidth: 2,
      sourceHeight: 2,
    });
    expect(result).toContainEqual({
      x: 110,
      y: 40,
      width: 2,
      height: 2,
      sourceX: 94,
      sourceY: 94,
      sourceWidth: 2,
      sourceHeight: 2,
    });
    expect(result).toContainEqual({
      x: 18,
      y: 20,
      width: 92,
      height: 20,
      sourceX: 66,
      sourceY: 66,
      sourceWidth: 28,
      sourceHeight: 28,
    });
  });

  test('windowskin cursor side slices are stretched instead of tiled', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const skinId = await app.loadBitmapFromImage('Graphics/System/Window');
      const windowObject = app.getObject('window', windowId);

      app.setWindowskinToWindow(windowId, skinId);
      app.setCursorRectToWindow(windowId, 0, 0, 136, 24);

      return [windowObject._cursor.children[3], windowObject._cursor.children[4]].map((child: any) => ({
        hasTileScale: child.tileScale != null,
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height,
        sourceX: child.texture.frame.x,
        sourceY: child.texture.frame.y,
        sourceWidth: child.texture.frame.width,
        sourceHeight: child.texture.frame.height,
      }));
    });

    expect(result).toEqual([
      {
        hasTileScale: false,
        x: 12,
        y: 14,
        width: 2,
        height: 20,
        sourceX: 64,
        sourceY: 66,
        sourceWidth: 2,
        sourceHeight: 28,
      },
      {
        hasTileScale: false,
        x: 146,
        y: 14,
        width: 2,
        height: 20,
        sourceX: 94,
        sourceY: 66,
        sourceWidth: 2,
        sourceHeight: 28,
      },
    ]);
  });

  test('cursor blinks with the window animation count when active', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const windowObject = app.getObject('window', windowId);

      app.setProperty('window', windowId, 'contentsOpacity', 255);
      app.setProperty('window', windowId, 'openness', 255);
      app.setProperty('window', windowId, 'active', true);
      app.setCursorRectToWindow(windowId, 0, 0, 96, 24);

      const initialAlpha = windowObject._cursor.alpha;
      for (let i = 0; i < 10; i += 1) windowObject.update();
      const activeAlpha = windowObject._cursor.alpha;

      app.setProperty('window', windowId, 'active', false);
      for (let i = 0; i < 10; i += 1) windowObject.update();
      const inactiveAlpha = windowObject._cursor.alpha;
      const inactiveChildCount = windowObject._cursor.children.length;

      app.setCursorRectToWindow(windowId, 4, 4, 64, 24);
      const inactiveSetRectChildCount = windowObject._cursor.children.length;

      app.setProperty('window', windowId, 'openness', 0);
      const closedVisible = windowObject._cursor.visible;

      return { initialAlpha, activeAlpha, inactiveAlpha, inactiveChildCount, inactiveSetRectChildCount, closedVisible };
    });

    expect(result.initialAlpha).toBe(1);
    expect(result.activeAlpha).toBeCloseTo(175 / 255, 3);
    expect(result.inactiveAlpha).toBeCloseTo(95 / 255, 3);
    expect(result.inactiveChildCount).toBeGreaterThan(0);
    expect(result.inactiveSetRectChildCount).toBeGreaterThan(0);
    expect(result.closedVisible).toBe(false);
  });

  test('window opacity hides the standard background while preserving contents opacity', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const windowObject = app.getObject('window', windowId);

      app.setProperty('window', windowId, 'windowWidth', 160);
      app.setProperty('window', windowId, 'windowHeight', 64);
      app.setProperty('window', windowId, 'opacity', 0);
      app.setProperty('window', windowId, 'backOpacity', 192);
      app.setProperty('window', windowId, 'contentsOpacity', 255);
      app.setProperty('window', windowId, 'openness', 255);

      return {
        frameAlpha: windowObject._frame.alpha,
        backgroundAlpha: windowObject._backgroundSprite.alpha,
        contentsAlpha: windowObject._contentsSprite.alpha,
      };
    });

    expect(result.frameAlpha).toBe(0);
    expect(result.backgroundAlpha).toBe(0);
    expect(result.contentsAlpha).toBe(1);
  });

  test('closed windows hide stale contents until the backing bitmap changes while reopening', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const contentsId = app.createBitmapFromSize(160, 64);
      const windowObject = app.getObject('window', windowId);
      const bitmapObject = app.getObject('bitmap', contentsId);

      app.setContentsToWindow(windowId, contentsId);
      app.setProperty('window', windowId, 'contentsOpacity', 255);
      app.setProperty('window', windowId, 'openness', 255);
      bitmapObject.fillRect(0, 0, 160, 64, '#ffffff');
      const visibleBeforeClose = windowObject._contentsSprite.alpha;

      await app.updateGraphics(60);
      app.setProperty('window', windowId, 'openness', 0);
      app.setProperty('window', windowId, 'openness', 48);
      const hiddenWhileStale = windowObject._contentsSprite.alpha;

      bitmapObject.clear();
      const visibleAfterRefresh = windowObject._contentsSprite.alpha;

      return {
        visibleBeforeClose,
        hiddenWhileStale,
        visibleAfterRefresh,
      };
    });

    expect(result.visibleBeforeClose).toBe(1);
    expect(result.hiddenWhileStale).toBe(0);
    expect(result.visibleAfterRefresh).toBeCloseTo(48 / 255, 2);
  });

  test('windows closed before their first rendered frame keep their initialized contents when opened', async ({
    page,
  }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const contentsId = app.createBitmapFromSize(160, 64);
      const windowObject = app.getObject('window', windowId);
      const bitmapObject = app.getObject('bitmap', contentsId);

      app.setContentsToWindow(windowId, contentsId);
      app.setProperty('window', windowId, 'contentsOpacity', 255);
      bitmapObject.fillRect(0, 0, 160, 64, '#ffffff');
      app.setProperty('window', windowId, 'openness', 0);
      app.setProperty('window', windowId, 'openness', 48);

      return windowObject._contentsSprite.alpha;
    });

    expect(result).toBeCloseTo(48 / 255, 2);
  });

  test('window contents refresh is not presented before the next explicit graphics update', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const renderer = app._pixiApp.renderer;
      const originalRender = renderer.render.bind(renderer);
      const windowId = app.createWindow();
      const contentsId = app.createBitmapFromSize(160, 64);
      const bitmapObject = app.getObject('bitmap', contentsId);
      let renderCount = 0;

      renderer.render = (...args: any[]) => {
        renderCount += 1;
        return originalRender(...args);
      };

      app.setContentsToWindow(windowId, contentsId);
      bitmapObject.fillRect(0, 0, 160, 64, '#ffffff');
      app._renderNow();
      const afterInitialRender = renderCount;

      bitmapObject.clear();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterPendingRefresh = renderCount;

      app._renderNow();
      const afterExplicitRender = renderCount;
      renderer.render = originalRender;

      return {
        tickerStarted: app._pixiApp.ticker.started,
        afterInitialRender,
        afterPendingRefresh,
        afterExplicitRender,
      };
    });

    expect(result.tickerStarted).toBe(false);
    expect(result.afterInitialRender).toBe(1);
    expect(result.afterPendingRefresh).toBe(1);
    expect(result.afterExplicitRender).toBe(2);
  });

  test('ox and oy scroll window contents and cursor', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const windowObject = app.getObject('window', windowId);

      app.setProperty('window', windowId, 'windowWidth', 160);
      app.setProperty('window', windowId, 'windowHeight', 96);
      app.setProperty('window', windowId, 'padding', 12);
      app.setProperty('window', windowId, 'ox', 8);
      app.setProperty('window', windowId, 'oy', 6);
      app.setCursorRectToWindow(windowId, 20, 18, 48, 24);
      app.setToneToWindow(windowId, JSON.stringify({ red: 24, green: -16, blue: 0, gray: 0 }));

      return {
        ox: app.getProperty('window', windowId, 'ox'),
        oy: app.getProperty('window', windowId, 'oy'),
        contentsX: windowObject._contentsSprite.x,
        contentsY: windowObject._contentsSprite.y,
        cursorBounds: windowObject._cursor.getLocalBounds(),
      };
    });

    expect(result.ox).toBe(8);
    expect(result.oy).toBe(6);
    expect(result.contentsX).toBe(4);
    expect(result.contentsY).toBe(6);
    expect(result.cursorBounds.x).toBeCloseTo(23, 1);
    expect(result.cursorBounds.y).toBeCloseTo(23, 1);
  });

  test('pause, arrows, and padding bottom affect window state', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const windowId = app.createWindow();
      const windowObject = app.getObject('window', windowId);

      app.setProperty('window', windowId, 'windowWidth', 120);
      app.setProperty('window', windowId, 'windowHeight', 80);
      app.setProperty('window', windowId, 'padding', 10);
      app.setProperty('window', windowId, 'paddingBottom', 18);
      app.setProperty('window', windowId, 'arrowsVisible', true);
      app.setProperty('window', windowId, 'pause', true);
      const maskWithPaddingBottom = windowObject._contentsMask.getLocalBounds();

      app.setProperty('window', windowId, 'arrowsVisible', false);
      app.setProperty('window', windowId, 'pause', false);

      const rubyContentsHeight = await rubyManager.evalAsync(
        `
        window = Window.new(0, 0, 120, 80)
        window.padding = 10
        window.padding_bottom = 18
        window.contents_height.to_s
      `,
        'test-window-contents-height',
      );

      return {
        maskHeight: maskWithPaddingBottom.height,
        arrowsHidden: !windowObject._arrows.visible,
        pauseHidden: !windowObject._pauseSign.visible,
        rubyContentsHeight: rubyContentsHeight.toString(),
      };
    });

    expect(result.maskHeight).toBe(52);
    expect(result.arrowsHidden).toBe(true);
    expect(result.pauseHidden).toBe(true);
    expect(result.rubyContentsHeight).toBe('52');
  });

  test('openness clips closed windows and arrows follow scrollable directions', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const windowId = app.createWindow();
      const windowObject = app.getObject('window', windowId);
      const contentsId = app.createBitmapFromSize(160, 120);

      app.setProperty('window', windowId, 'windowWidth', 100);
      app.setProperty('window', windowId, 'windowHeight', 80);
      app.setProperty('window', windowId, 'padding', 10);
      app.setProperty('window', windowId, 'paddingBottom', 10);
      app.setContentsToWindow(windowId, contentsId);
      app.setProperty('window', windowId, 'arrowsVisible', true);

      app.setProperty('window', windowId, 'openness', 0);
      const closedVisible = windowObject.visible;
      const closedMaskHeight = windowObject._opennessMask.getLocalBounds().height;

      app.setProperty('window', windowId, 'openness', 128);
      const halfOpenVisible = windowObject.visible;
      const halfOpenMask = windowObject._opennessMask.getLocalBounds();

      app.setProperty('window', windowId, 'openness', 255);
      app.setProperty('window', windowId, 'ox', 0);
      app.setProperty('window', windowId, 'oy', 0);
      const topLeftArrows = { ...windowObject._scrollArrowState };

      app.setProperty('window', windowId, 'ox', 80);
      app.setProperty('window', windowId, 'oy', 60);
      const bottomRightArrows = { ...windowObject._scrollArrowState };

      app.setProperty('window', windowId, 'visible', false);
      app.setProperty('window', windowId, 'openness', 255);
      const hiddenStaysHidden = !windowObject.visible;

      return {
        closedVisible,
        closedMaskHeight,
        halfOpenVisible,
        halfOpenMaskY: halfOpenMask.y,
        halfOpenMaskHeight: halfOpenMask.height,
        topLeftArrows,
        bottomRightArrows,
        hiddenStaysHidden,
      };
    });

    expect(result.closedVisible).toBe(false);
    expect(result.closedMaskHeight).toBe(0);
    expect(result.halfOpenVisible).toBe(true);
    expect(result.halfOpenMaskY).toBeCloseTo((80 - (80 * 128) / 255) / 2, 2);
    expect(result.halfOpenMaskHeight).toBeCloseTo((80 * 128) / 255, 2);
    expect(result.topLeftArrows).toEqual({ up: false, down: true, left: false, right: true });
    expect(result.bottomRightArrows).toEqual({ up: true, down: false, left: true, right: false });
    expect(result.hiddenStaysHidden).toBe(true);
  });
});
