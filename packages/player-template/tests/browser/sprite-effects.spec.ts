import { expect, test } from '@playwright/test';
import { expectNoRuntimeError, loadGame } from './helpers';

test.describe('sprite effects', () => {
  test('flash fades on update and wave shifts horizontal lines', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const backgroundBitmapId = app.createBitmapFromSize(16, 16);
      const bitmapId = app.createBitmapFromSize(8, 4);
      const backgroundSpriteId = app.createSprite();
      const spriteId = app.createSprite();
      const backgroundSprite = app.getObject('sprite', backgroundSpriteId);
      const backgroundBitmap = app.getObject('bitmap', backgroundBitmapId);
      const sprite = app.getObject('sprite', spriteId);
      const bitmap = app.getObject('bitmap', bitmapId);
      backgroundBitmap.fillRect(0, 0, 16, 16, 'rgba(0, 255, 0, 1)');
      bitmap.fillRect(1, 0, 1, 4, 'rgba(255, 255, 255, 1)');
      app.setBitmapToSprite(backgroundSpriteId, backgroundBitmapId);
      app.setBitmapToSprite(spriteId, bitmapId);

      app.setFlashToSprite(spriteId, JSON.stringify({ red: 255, green: 0, blue: 0, alpha: 128 }), 4);
      const flashVisibleBefore = sprite._flashOverlay.visible;
      const flashAlphaBefore = sprite._flashOverlay.alpha;
      app.updateSpriteEffects(spriteId);
      app.updateSpriteEffects(spriteId);
      app.updateSpriteEffects(spriteId);
      app.updateSpriteEffects(spriteId);
      const flashVisibleAfter = sprite._flashOverlay.visible;

      app.setProperty('sprite', spriteId, 'waveAmp', 1);
      app.setProperty('sprite', spriteId, 'waveLength', 4);
      app.setProperty('sprite', spriteId, 'wavePhase', 0);
      backgroundSprite.x = 20;
      backgroundSprite.y = 20;
      backgroundSprite.zIndex = 999;
      sprite.x = 24;
      sprite.y = 24;
      sprite.zIndex = 1000;
      app._renderNow();

      const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;

      return {
        flashVisibleBefore,
        flashAlphaBefore,
        flashVisibleAfter,
        waveTopLine: Array.from(context.getImageData(25, 24, 1, 1).data),
        waveSecondLine: Array.from(context.getImageData(26, 25, 1, 1).data),
        waveSecondLineOriginalX: Array.from(context.getImageData(25, 25, 1, 1).data),
        waveSkew: sprite.skew.x,
        waveAmp: app.getProperty('sprite', spriteId, 'waveAmp'),
        waveLength: app.getProperty('sprite', spriteId, 'waveLength'),
        wavePhase: app.getProperty('sprite', spriteId, 'wavePhase'),
      };
    });

    expect(result.flashVisibleBefore).toBe(true);
    expect(result.flashAlphaBefore).toBeCloseTo(128 / 255, 3);
    expect(result.flashVisibleAfter).toBe(false);
    expect(result.waveTopLine).toEqual([255, 255, 255, 255]);
    expect(result.waveSecondLine).toEqual([255, 255, 255, 255]);
    expect(result.waveSecondLineOriginalX).toEqual([0, 255, 0, 255]);
    expect(result.waveSkew).toBe(0);
    expect(result.waveAmp).toBe(1);
    expect(result.waveLength).toBe(4);
    expect(result.wavePhase).toBe(0);
  });

  test('flash effect is clipped to source bitmap alpha', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const backgroundBitmapId = app.createBitmapFromSize(8, 8);
      const spriteBitmapId = app.createBitmapFromSize(8, 8);
      const backgroundSpriteId = app.createSprite();
      const spriteId = app.createSprite();
      const backgroundBitmap = app.getObject('bitmap', backgroundBitmapId);
      const spriteBitmap = app.getObject('bitmap', spriteBitmapId);
      const backgroundSprite = app.getObject('sprite', backgroundSpriteId);
      const sprite = app.getObject('sprite', spriteId);

      backgroundBitmap.fillRect(0, 0, 8, 8, 'rgba(0, 255, 0, 1)');
      spriteBitmap.clear();
      spriteBitmap.setPixel(0, 0, 255, 255, 255, 255);

      app.setBitmapToSprite(backgroundSpriteId, backgroundBitmapId);
      app.setBitmapToSprite(spriteId, spriteBitmapId);
      backgroundSprite.x = 24;
      backgroundSprite.y = 24;
      backgroundSprite.zIndex = 1000;
      sprite.x = 24;
      sprite.y = 24;
      sprite.zIndex = 1001;

      app.setFlashToSprite(spriteId, JSON.stringify({ red: 255, green: 0, blue: 0, alpha: 255 }), 1);
      app._renderNow();

      const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      const opaque = Array.from(context.getImageData(24, 24, 1, 1).data);
      const transparent = Array.from(context.getImageData(25, 24, 1, 1).data);

      return { opaque, transparent };
    });

    expect(result.opaque).toEqual([255, 0, 0, 255]);
    expect(result.transparent).toEqual([0, 255, 0, 255]);
    await expectNoRuntimeError(page);
  });

  test('sprite alpha effect masks are shared for the same bitmap frame', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const bitmapId = app.createBitmapFromSize(32, 32);
      const firstSpriteId = app.createSprite();
      const secondSpriteId = app.createSprite();
      const bitmap = app.getObject('bitmap', bitmapId);
      const firstSprite = app.getObject('sprite', firstSpriteId);
      const secondSprite = app.getObject('sprite', secondSpriteId);

      bitmap.fillRect(0, 0, 32, 32, 'rgba(255, 255, 255, 1)');
      app.setBitmapToSprite(firstSpriteId, bitmapId);
      app.setBitmapToSprite(secondSpriteId, bitmapId);
      app.setSrcRectToSprite(firstSpriteId, 0, 0, 16, 16);
      app.setSrcRectToSprite(secondSpriteId, 0, 0, 16, 16);
      app.setFlashToSprite(firstSpriteId, JSON.stringify({ red: 255, green: 0, blue: 0, alpha: 255 }), 1);
      app.setFlashToSprite(secondSpriteId, JSON.stringify({ red: 0, green: 0, blue: 255, alpha: 255 }), 1);

      return {
        sharedTexture: firstSprite._effectTexture === secondSprite._effectTexture,
        firstVisible: firstSprite._flashOverlay.visible,
        secondVisible: secondSprite._flashOverlay.visible,
      };
    });

    expect(result.sharedTexture).toBe(true);
    expect(result.firstVisible).toBe(true);
    expect(result.secondVisible).toBe(true);
    await expectNoRuntimeError(page);
  });

  test('Ruby Sprite zoom and mirror properties bridge to Pixi scale', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            sprite = Sprite.new
            sprite.zoom_x = 1.5
            sprite.zoom_y = 0.75
            sprite.mirror = true
            object = JS.global[:rubyBridge][:app].getObject('sprite', sprite.instance_variable_get(:@__sprite_id))
            {
              zoom_x: sprite.zoom_x,
              zoom_y: sprite.zoom_y,
              mirror: sprite.mirror,
              scale_x: object[:scale][:x].to_f,
              scale_y: object[:scale][:y].to_f
            }.to_json
          `,
            'test-sprite-zoom-mirror',
          )
        ).toString(),
      );
    });

    expect(result.zoom_x).toBeCloseTo(1.5);
    expect(result.zoom_y).toBeCloseTo(0.75);
    expect(result.mirror).toBe(true);
    expect(result.scale_x).toBeCloseTo(-1.5);
    expect(result.scale_y).toBeCloseTo(0.75);
    await expectNoRuntimeError(page);
  });

  test('Ruby Sprite width and height follow bitmap and src_rect', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            sprite = Sprite.new
            sprite.bitmap = Bitmap.new(80, 48)
            full = [sprite.width, sprite.height]
            sprite.src_rect = Rect.new(8, 8, 24, 16)
            clipped = [sprite.width, sprite.height]
            { full: full, clipped: clipped }.to_json
          `,
            'test-sprite-size-src-rect',
          )
        ).toString(),
      );
    });

    expect(result.full).toEqual([80, 48]);
    expect(result.clipped).toEqual([24, 16]);
    await expectNoRuntimeError(page);
  });

  test('Ruby Sprite update advances wave phase through the JS object state', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            sprite = Sprite.new
            sprite.wave_amp = 8
            sprite.wave_length = 180
            sprite.wave_speed = 360
            before = sprite.wave_phase
            sprite.update
            object = JS.global[:rubyBridge][:app].getObject('sprite', sprite.instance_variable_get(:@__sprite_id))
            { before: before, ruby_phase: sprite.wave_phase, js_phase: object[:wavePhase].to_f }.to_json
          `,
            'test-sprite-wave-update',
          )
        ).toString(),
      );
    });

    expect(result.before).toBe(0);
    expect(result.ruby_phase).toBeCloseTo(2);
    expect(result.js_phase).toBeCloseTo(2);
    await expectNoRuntimeError(page);
  });

  test('Sprite blend_type 2 renders as RGSS subtract instead of Pixi multiply', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const app = (window as any).rubyBridge.app;
      const backgroundBitmapId = app.createBitmapFromSize(1, 1);
      const spriteBitmapId = app.createBitmapFromSize(1, 1);
      const backgroundSpriteId = app.createSprite();
      const spriteId = app.createSprite();
      const backgroundBitmap = app.getObject('bitmap', backgroundBitmapId);
      const spriteBitmap = app.getObject('bitmap', spriteBitmapId);
      const backgroundSprite = app.getObject('sprite', backgroundSpriteId);
      const sprite = app.getObject('sprite', spriteId);

      backgroundBitmap.fillRect(0, 0, 1, 1, 'rgba(200, 120, 90, 1)');
      spriteBitmap.fillRect(0, 0, 1, 1, 'rgba(80, 20, 40, 1)');
      app.setBitmapToSprite(backgroundSpriteId, backgroundBitmapId);
      app.setBitmapToSprite(spriteId, spriteBitmapId);
      backgroundSprite.x = 24;
      backgroundSprite.y = 24;
      backgroundSprite.zIndex = 1000;
      sprite.x = 24;
      sprite.y = 24;
      sprite.zIndex = 1001;
      app.setProperty('sprite', spriteId, 'blendType', 2);
      app._renderNow();

      const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      const rubyReadback = JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            sprite = Sprite.new
            sprite.blend_type = 2
            { blend_type: sprite.blend_type }.to_json
          `,
            'test-sprite-blend-type-subtract-readback',
          )
        ).toString(),
      );

      return {
        pixel: Array.from(context.getImageData(24, 24, 1, 1).data),
        blendType: app.getProperty('sprite', spriteId, 'blendType'),
        pixiBlendMode: sprite.blendMode,
        rubyReadback,
      };
    });

    expect(result.pixel).toEqual([120, 100, 50, 255]);
    expect(result.blendType).toBe(2);
    expect(result.pixiBlendMode).not.toBe(2);
    expect(result.rubyReadback.blend_type).toBe(2);
    await expectNoRuntimeError(page);
  });

  test('sprite remains visible after src_rect replaces the display texture', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const bitmapId = app.createBitmapFromSize(32, 32);
      const spriteId = app.createSprite();
      const bitmap = app.getObject('bitmap', bitmapId);
      const sprite = app.getObject('sprite', spriteId);

      bitmap.fillRect(0, 0, 32, 32, 'rgba(255, 0, 0, 1)');
      app.setBitmapToSprite(spriteId, bitmapId);
      app.setSrcRectToSprite(spriteId, 0, 0, 16, 16);
      sprite.x = 24;
      sprite.y = 24;
      sprite.zIndex = 1000;
      app._renderNow();

      const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      return Array.from(context.getImageData(24, 24, 1, 1).data);
    });

    expect(result).toEqual([255, 0, 0, 255]);
    await expectNoRuntimeError(page);
  });

  test('negative src_rect y shifts the visible bitmap downward', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const backgroundBitmapId = app.createBitmapFromSize(8, 8);
      const spriteBitmapId = app.createBitmapFromSize(4, 4);
      const backgroundSpriteId = app.createSprite();
      const spriteId = app.createSprite();
      const backgroundBitmap = app.getObject('bitmap', backgroundBitmapId);
      const spriteBitmap = app.getObject('bitmap', spriteBitmapId);
      const backgroundSprite = app.getObject('sprite', backgroundSpriteId);
      const sprite = app.getObject('sprite', spriteId);

      backgroundBitmap.fillRect(0, 0, 8, 8, 'rgba(0, 255, 0, 1)');
      spriteBitmap.fillRect(0, 0, 4, 4, 'rgba(255, 0, 0, 1)');
      app.setBitmapToSprite(backgroundSpriteId, backgroundBitmapId);
      app.setBitmapToSprite(spriteId, spriteBitmapId);
      app.setSrcRectToSprite(spriteId, 0, -2, 4, 4);
      backgroundSprite.x = 24;
      backgroundSprite.y = 24;
      backgroundSprite.zIndex = 1000;
      sprite.x = 24;
      sprite.y = 24;
      sprite.zIndex = 1001;
      app._renderNow();

      const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;

      return {
        srcRect: { ...sprite.srcRect },
        topPixel: Array.from(context.getImageData(24, 24, 1, 1).data),
        shiftedPixel: Array.from(context.getImageData(24, 26, 1, 1).data),
      };
    });

    expect(result.srcRect).toEqual({ x: 0, y: -2, width: 4, height: 4 });
    expect(result.topPixel).toEqual([0, 255, 0, 255]);
    expect(result.shiftedPixel).toEqual([255, 0, 0, 255]);
    await expectNoRuntimeError(page);
  });

  test('sprite bitmap changes tolerate temporarily out-of-range src_rect', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            sprite = Sprite.new
            sprite.bitmap = Bitmap.new(96, 64)
            first = [sprite.src_rect.x, sprite.src_rect.y, sprite.src_rect.width, sprite.src_rect.height]
            sprite.src_rect = Rect.new(80, 48, 80, 80)
            sprite.bitmap = Bitmap.new(32, 32)
            second = [sprite.src_rect.x, sprite.src_rect.y, sprite.src_rect.width, sprite.src_rect.height]
            { first: first, second: second }.to_json
          `,
            'test-sprite-bitmap-src-rect',
          )
        ).toString(),
      );
    });

    expect(result.first).toEqual([0, 0, 96, 64]);
    expect(result.second).toEqual([0, 0, 32, 32]);
    await expectNoRuntimeError(page);
  });

  test('JS Sprite bitmap assignment also resets srcRect to the full bitmap', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const spriteId = app.createSprite();
      const firstBitmapId = app.createBitmapFromSize(96, 64);
      const secondBitmapId = app.createBitmapFromSize(32, 32);
      const sprite = app.getObject('sprite', spriteId);

      app.setBitmapToSprite(spriteId, firstBitmapId);
      const first = { ...sprite.srcRect };
      app.setSrcRectToSprite(spriteId, 80, 48, 80, 80);
      app.setBitmapToSprite(spriteId, secondBitmapId);

      return { first, second: { ...sprite.srcRect } };
    });

    expect(result.first).toEqual({ x: 0, y: 0, width: 96, height: 64 });
    expect(result.second).toEqual({ x: 0, y: 0, width: 32, height: 32 });
    await expectNoRuntimeError(page);
  });

  test('sprite bitmap can be cleared from Ruby', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return (
        await rubyManager.evalAsync(
          `
          sprite = Sprite.new
          sprite.bitmap = Bitmap.new(96, 96)
          sprite.bitmap = nil
          'ok'
        `,
          'test-sprite-bitmap-nil',
        )
      ).toString();
    });

    expect(result).toBe('ok');
    await expectNoRuntimeError(page);
  });
});
