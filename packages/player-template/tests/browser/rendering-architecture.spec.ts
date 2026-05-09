import { expect, test } from '@playwright/test';
import { expectNoRuntimeError, loadGame } from './helpers';

test.describe('RGSS3 rendering architecture', () => {
  test('sorts root sprites by z, y, then creation order', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const lowY = app.createSprite();
      const highY = app.createSprite();
      const firstSameY = app.createSprite();
      const secondSameY = app.createSprite();

      app.setProperty('sprite', lowY, 'zIndex', 10);
      app.setProperty('sprite', highY, 'zIndex', 10);
      app.setProperty('sprite', lowY, 'y', 8);
      app.setProperty('sprite', highY, 'y', 24);
      app.setProperty('sprite', firstSameY, 'zIndex', 20);
      app.setProperty('sprite', secondSameY, 'zIndex', 20);
      app.setProperty('sprite', firstSameY, 'y', 12);
      app.setProperty('sprite', secondSameY, 'y', 12);
      app._renderNow();

      const root = app._rootContainer;
      const indexOf = (type: string, id: number) => root.children.indexOf(app.getObject(type, id));

      return {
        lowY: indexOf('sprite', lowY),
        highY: indexOf('sprite', highY),
        firstSameY: indexOf('sprite', firstSameY),
        secondSameY: indexOf('sprite', secondSameY),
      };
    });

    expect(result.lowY).toBeLessThan(result.highY);
    expect(result.firstSameY).toBeLessThan(result.secondSameY);
    await expectNoRuntimeError(page);
  });

  test('does not use y for Window, Plane, or Tilemap sort keys', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const plane = app.createPlane();
      const tilemap = app.createTilemap();
      const win = app.createWindow();

      app.setProperty('plane', plane, 'zIndex', 50);
      app.setProperty('plane', plane, 'y', 9999);
      app.setProperty('window', win, 'zIndex', 50);
      app.setProperty('window', win, 'y', 9999);
      app._renderNow();

      const root = app._rootContainer;

      return {
        plane: root.children.indexOf(app.getObject('plane', plane)),
        tilemapLower: root.children.indexOf(app.getObject('tilemap', tilemap)),
        tilemapUpper: root.children.indexOf(app.getObject('tilemap', tilemap).upperLayer),
        win: root.children.indexOf(app.getObject('window', win)),
      };
    });

    expect(result.tilemapLower).toBeLessThan(result.plane);
    expect(result.plane).toBeLessThan(result.win);
    expect(result.win).toBeLessThan(result.tilemapUpper);
    await expectNoRuntimeError(page);
  });

  test('keeps original creation order when objects move into a viewport', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const older = app.createSprite();
      const newer = app.createSprite();
      const viewport = app.createViewport();

      app.setProperty('sprite', older, 'zIndex', 10);
      app.setProperty('sprite', newer, 'zIndex', 10);
      app.setProperty('sprite', older, 'y', 5);
      app.setProperty('sprite', newer, 'y', 5);
      app.setViewport('sprite', newer, viewport);
      app.setViewport('sprite', older, viewport);
      app._renderNow();

      const content = app.getObject('viewport', viewport).content;

      return {
        older: content.children.indexOf(app.getObject('sprite', older)),
        newer: content.children.indexOf(app.getObject('sprite', newer)),
      };
    });

    expect(result.older).toBeLessThan(result.newer);
    await expectNoRuntimeError(page);
  });

  test('rejects missing viewport moves without detaching the object', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const sprite = app.createSprite();
      const viewport = app.createViewport();

      app.setViewport('sprite', sprite, viewport);
      app._renderNow();

      const content = app.getObject('viewport', viewport).content;
      const before = content.children.indexOf(app.getObject('sprite', sprite));
      let message = '';
      try {
        app.setViewport('sprite', sprite, 999_999);
      } catch (error) {
        message = String(error);
      }
      app._renderNow();

      return {
        before,
        after: content.children.indexOf(app.getObject('sprite', sprite)),
        parentIsViewportContent: app.getObject('sprite', sprite).parent === content,
        message,
      };
    });

    expect(result.before).toBeGreaterThanOrEqual(0);
    expect(result.after).toBe(result.before);
    expect(result.parentIsViewportContent).toBe(true);
    expect(result.message).toContain('not found viewport');
    await expectNoRuntimeError(page);
  });

  test('places multi-entry tilemaps around sprites by each render entry z', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const tilemap = app.createTilemap();
      const sprite = app.createSprite();

      app.setProperty('sprite', sprite, 'zIndex', 100);
      app._renderNow();

      const root = app._rootContainer;
      const tilemapObject = app.getObject('tilemap', tilemap);

      return {
        lower: root.children.indexOf(tilemapObject),
        sprite: root.children.indexOf(app.getObject('sprite', sprite)),
        upper: root.children.indexOf(tilemapObject.upperLayer),
      };
    });

    expect(result.lower).toBeLessThan(result.sprite);
    expect(result.sprite).toBeLessThan(result.upper);
    await expectNoRuntimeError(page);
  });

  test('sorts viewport display objects by viewport z and creation order', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const first = app.createViewport();
      const second = app.createViewport();

      app.setProperty('viewport', first, 'zIndex', 5);
      app.setProperty('viewport', second, 'zIndex', 5);
      app._renderNow();
      const sameZ = {
        first: app._rootContainer.children.indexOf(app.getObject('viewport', first).displayObject),
        second: app._rootContainer.children.indexOf(app.getObject('viewport', second).displayObject),
      };

      app.setProperty('viewport', first, 'zIndex', 6);
      app._renderNow();
      const raisedFirst = {
        first: app._rootContainer.children.indexOf(app.getObject('viewport', first).displayObject),
        second: app._rootContainer.children.indexOf(app.getObject('viewport', second).displayObject),
      };

      return { sameZ, raisedFirst };
    });

    expect(result.sameZ.first).toBeLessThan(result.sameZ.second);
    expect(result.raisedFirst.second).toBeLessThan(result.raisedFirst.first);
    await expectNoRuntimeError(page);
  });
});
