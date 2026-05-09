import { expect, test } from '@playwright/test';
import { loadGame } from './helpers';

test.describe('tilemap priority', () => {
  test('draws RGSS3 tilemap layers in the documented lower and upper order', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const tilemapId = app.createTilemap();
      const tileSheetId = app.createBitmapFromSize(128, 32);
      const tileSheet = app.getObject('bitmap', tileSheetId);

      tileSheet.fillRect(32, 0, 32, 32, 'rgba(255, 0, 0, 1)');
      tileSheet.fillRect(64, 0, 32, 32, 'rgba(0, 255, 0, 1)');
      tileSheet.fillRect(96, 0, 32, 32, 'rgba(0, 0, 255, 1)');
      app.setBitmapsToTilemap(tilemapId, JSON.stringify([null, null, null, null, null, tileSheetId]));

      const sample = (mapData: number[], flags: any) => {
        app.setDataToTilemap(
          tilemapId,
          JSON.stringify({ mapData: { xsize: 1, ysize: 1, zsize: 4, data: mapData }, flags }),
        );
        app.updateTilemap(tilemapId);
        const tilemap = app.getObject('tilemap', tilemapId);
        const lowerContext = tilemap._canvas.getContext('2d');
        const upperContext = tilemap._upperCanvas.getContext('2d');
        return {
          lower: Array.from(lowerContext.getImageData(16, 16, 1, 1).data),
          upper: Array.from(upperContext.getImageData(16, 16, 1, 1).data),
        };
      };

      return {
        lowerLayer2Wins: sample([1, 2, 3, 0], { xsize: 8192, ysize: 1, zsize: 1, data: [0, 0, 0, 0] }),
        layer2UpperOnly: sample([1, 2, 3, 0], { xsize: 8192, ysize: 1, zsize: 1, data: [0, 0, 0, 0x10] }),
        layer0UpperFlagIgnored: sample([1, 0, 0, 0], { xsize: 8192, ysize: 1, zsize: 1, data: [0, 0x10] }),
      };
    });

    expect(result.lowerLayer2Wins.lower).toEqual([0, 0, 255, 255]);
    expect(result.lowerLayer2Wins.upper[3]).toBe(0);
    expect(result.layer2UpperOnly.lower).toEqual([0, 255, 0, 255]);
    expect(result.layer2UpperOnly.upper).toEqual([0, 0, 255, 255]);
    expect(result.layer0UpperFlagIgnored.lower).toEqual([255, 0, 0, 255]);
    expect(result.layer0UpperFlagIgnored.upper[3]).toBe(0);
  });

  test('draws shadow bits into the four RGSS3 quadrants', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const tilemapId = app.createTilemap();
      const tileSheetId = app.createBitmapFromSize(64, 32);
      const tileSheet = app.getObject('bitmap', tileSheetId);

      tileSheet.fillRect(32, 0, 32, 32, 'rgba(255, 255, 255, 1)');
      app.setBitmapsToTilemap(tilemapId, JSON.stringify([null, null, null, null, null, tileSheetId]));
      app.setDataToTilemap(
        tilemapId,
        JSON.stringify({
          mapData: { xsize: 1, ysize: 1, zsize: 4, data: [1, 0, 0, 0x0f] },
          flags: { xsize: 8192, ysize: 1, zsize: 1, data: [0, 0] },
        }),
      );
      app.updateTilemap(tilemapId);

      const context = app.getObject('tilemap', tilemapId)._canvas.getContext('2d');
      return {
        topLeft: Array.from(context.getImageData(8, 8, 1, 1).data),
        topRight: Array.from(context.getImageData(24, 8, 1, 1).data),
        bottomLeft: Array.from(context.getImageData(8, 24, 1, 1).data),
        bottomRight: Array.from(context.getImageData(24, 24, 1, 1).data),
      };
    });

    for (const pixel of [result.topLeft, result.topRight, result.bottomLeft, result.bottomRight]) {
      expect(pixel[0]).toBeLessThan(255);
      expect(pixel[1]).toBeLessThan(255);
      expect(pixel[2]).toBeLessThan(255);
      expect(pixel[3]).toBe(255);
    }
  });

  test('extends A2 counter table edges into the tile below', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const tilemapId = app.createTilemap();
      const a2SheetId = app.createBitmapFromSize(512, 128);
      const bSheetId = app.createBitmapFromSize(64, 32);
      const a2Sheet = app.getObject('bitmap', a2SheetId);
      const bSheet = app.getObject('bitmap', bSheetId);
      const tableTileId = 3195;
      const flags = Array(8192).fill(0);

      bSheet.fillRect(32, 0, 32, 32, 'rgba(0, 0, 255, 1)');
      a2Sheet.fillRect(448, 88, 32, 8, 'rgba(0, 255, 0, 1)');
      flags[tableTileId] = 0x80;

      app.setBitmapsToTilemap(tilemapId, JSON.stringify([null, a2SheetId, null, null, null, bSheetId]));
      app.setDataToTilemap(
        tilemapId,
        JSON.stringify({
          mapData: { xsize: 1, ysize: 2, zsize: 4, data: [0, 1, tableTileId, 0, 0, 0, 0, 0] },
          flags: { xsize: 8192, ysize: 1, zsize: 1, data: flags },
        }),
      );
      app.updateTilemap(tilemapId);

      const context = app.getObject('tilemap', tilemapId)._canvas.getContext('2d');
      return Array.from(context.getImageData(8, 36, 1, 1).data);
    });

    expect(result).toEqual([0, 255, 0, 255]);
  });

  test('star tiles render above character sprites', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;

      const samplePriority = async (tileFlag: number) => {
        const tilemapId = app.createTilemap();
        const tileSheetId = app.createBitmapFromSize(64, 32);
        const characterBitmapId = app.createBitmapFromSize(32, 32);
        const spriteId = app.createSprite();
        const snapshotId = app.createBitmapFromSize(1, 1);
        const tileSheet = app.getObject('bitmap', tileSheetId);
        const characterBitmap = app.getObject('bitmap', characterBitmapId);

        tileSheet.fillRect(32, 0, 32, 32, 'rgba(0, 255, 0, 1)');
        characterBitmap.fillRect(0, 0, 32, 32, 'rgba(255, 0, 0, 1)');

        app.setBitmapsToTilemap(tilemapId, JSON.stringify([null, null, null, null, null, tileSheetId]));
        app.setDataToTilemap(
          tilemapId,
          JSON.stringify({
            mapData: { xsize: 1, ysize: 1, zsize: 4, data: [0, 0, 1, 0] },
            flags: { xsize: 8192, ysize: 1, zsize: 1, data: [0, tileFlag] },
          }),
        );
        app.setBitmapToSprite(spriteId, characterBitmapId);
        app.setProperty('sprite', spriteId, 'zIndex', 100);
        await app.updateGraphics(60);
        app.copyScreenToBitmap(snapshotId);

        const snapshot = app.getObject('bitmap', snapshotId);
        const pixel = snapshot.getPixel(16, 16);

        app.disposeObject('bitmap', snapshotId);
        app.disposeObject('sprite', spriteId);
        app.disposeObject('tilemap', tilemapId);
        app.disposeObject('bitmap', tileSheetId);
        app.disposeObject('bitmap', characterBitmapId);

        return pixel;
      };

      return {
        normalTile: await samplePriority(0),
        starTile: await samplePriority(0x10),
      };
    });

    expect(result.normalTile).toEqual({ red: 255, green: 0, blue: 0, alpha: 255 });
    expect(result.starTile).toEqual({ red: 0, green: 255, blue: 0, alpha: 255 });
  });
});
