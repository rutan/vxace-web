import { expect, test } from '@playwright/test';
import { loadGame } from './helpers';

test.describe('bitmap pixel APIs', () => {
  test('reads, writes, and blurs canvas pixels', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const bitmapId = app.createBitmapFromSize(3, 1);
      const bitmap = app.getObject('bitmap', bitmapId);

      bitmap.setPixel(0, 0, 255, 0, 0, 255);
      bitmap.setPixel(1, 0, 0, 255, 0, 255);
      bitmap.setPixel(2, 0, 0, 0, 255, 255);
      const centerBefore = bitmap.getPixel(1, 0);
      const outside = bitmap.getPixel(-1, 0);

      bitmap.blur();
      const centerAfter = bitmap.getPixel(1, 0);

      return {
        centerBefore,
        outside,
        centerAfter,
      };
    });

    expect(result.centerBefore).toEqual({ red: 0, green: 255, blue: 0, alpha: 255 });
    expect(result.outside).toEqual({ red: 0, green: 0, blue: 0, alpha: 0 });
    expect(result.centerAfter).toEqual({ red: 85, green: 85, blue: 85, alpha: 255 });
  });

  test('Ruby Bitmap#get_pixel and set_pixel roundtrip Color values', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const value = await rubyManager.evalAsync(
        `
        bitmap = Bitmap.new(2, 2)
        bitmap.set_pixel(1, 1, Color.new(12, 34, 56, 255))
        color = bitmap.get_pixel(1, 1)
        [color.red, color.green, color.blue, color.alpha].join(',')
      `,
        'test-bitmap-pixels',
      );
      return value.toString();
    });

    expect(result).toBe('12,34,56,255');
  });

  test('Ruby Bitmap.new rejects zero-sized bitmaps like RGSS3', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const value = await rubyManager.evalAsync(
        `
        [[0, 1], [1, 0], [0, 0]].map do |width, height|
          begin
            Bitmap.new(width, height)
            'created'
          rescue Exception => error
            [error.class.to_s, error.message].join(':')
          end
        end.join('|')
      `,
        'test-bitmap-rejects-zero-size',
      );
      return value.toString();
    });

    expect(result).toBe(
      'RGSSError:failed to create bitmap|RGSSError:failed to create bitmap|RGSSError:failed to create bitmap',
    );
  });

  test('Ruby DL::CPtr can read and write Bitmap pixel buffers', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const value = await rubyManager.evalAsync(
        `
        class Bitmap
          def ptr_for_test
            addr = DL.dlwrap(self) + 16
            cptr = DL::CPtr.new(addr)
            addr = cptr[0, 4].unpack('i')[0] + 8
            cptr.free
            cptr = DL::CPtr.new(addr)
            addr = cptr[0, 4].unpack('i')[0] + 16
            cptr.free
            cptr = DL::CPtr.new(addr)
            addr = cptr[0, 4].unpack('i')[0]
            cptr.free
            DL::CPtr.new(addr, width * height * 4)
          end
        end

        source = Bitmap.new(2, 1)
        source.set_pixel(0, 0, Color.new(10, 20, 30, 255))
        source.set_pixel(1, 0, Color.new(50, 60, 70, 255))
        raw = source.ptr_for_test[0, source.ptr_for_test.size]

        copied = Bitmap.new(2, 1)
        copied.ptr_for_test[0, copied.ptr_for_test.size] = raw
        a = copied.get_pixel(0, 0)
        b = copied.get_pixel(1, 0)
        [raw.bytes.join(':'), a.red, a.green, a.blue, a.alpha, b.red, b.green, b.blue, b.alpha].join(',')
      `,
        'test-dl-cptr-bitmap-pixels',
      );
      return value.toString();
    });

    expect(result).toBe('10:20:30:255:50:60:70:255,10,20,30,255,50,60,70,255');
  });

  test('Ruby Bitmap#hue_change rotates hue, normalizes degrees, and preserves alpha', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const value = await rubyManager.evalAsync(
        `
        bitmap = Bitmap.new(4, 1)
        bitmap.set_pixel(0, 0, Color.new(255, 0, 0, 255))
        bitmap.set_pixel(1, 0, Color.new(255, 0, 0, 128))
        bitmap.set_pixel(2, 0, Color.new(96, 96, 96, 64))
        bitmap.set_pixel(3, 0, Color.new(255, 0, 0, 0))
        returned = bitmap.hue_change(480)
        pixels = 4.times.map do |x|
          color = bitmap.get_pixel(x, 0)
          [color.red, color.green, color.blue, color.alpha].join(':')
        end
        [returned.equal?(bitmap), pixels.join(',')].join('|')
      `,
        'test-bitmap-hue-change',
      );
      return value.toString();
    });

    expect(result).toBe('true|0:255:0:255,0:255:0:128,96:96:96:64,0:0:0:0');
  });

  test('Ruby Bitmap#hue_change wraps negative hue values', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const value = await rubyManager.evalAsync(
        `
        bitmap = Bitmap.new(1, 1)
        bitmap.set_pixel(0, 0, Color.new(255, 0, 0, 255))
        bitmap.hue_change(-240)
        color = bitmap.get_pixel(0, 0)
        [color.red, color.green, color.blue, color.alpha].join(',')
      `,
        'test-bitmap-hue-change-negative',
      );
      return value.toString();
    });

    expect(result).toBe('0,255,0,255');
  });

  test('Ruby Bitmap#clone owns an independent bridge bitmap record', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const value = await rubyManager.evalAsync(
        `
        source = Bitmap.new(2, 1)
        source.set_pixel(0, 0, Color.new(12, 34, 56, 255))
        cloned = source.clone
        cloned.set_pixel(0, 0, Color.new(90, 80, 70, 255))
        cloned.dispose
        sprite = Sprite.new
        sprite.bitmap = source
        color = source.get_pixel(0, 0)
        [
          source.__bitmap_id != cloned.__bitmap_id,
          source.disposed?,
          cloned.disposed?,
          color.red,
          color.green,
          color.blue,
          color.alpha,
        ].join(',')
      `,
        'test-bitmap-clone-independent-record',
      );
      return value.toString();
    });

    expect(result).toBe('true,false,true,12,34,56,255');
  });

  test('radial_blur spreads pixels around the bitmap center', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const bitmapId = app.createBitmapFromSize(9, 9);
      const bitmap = app.getObject('bitmap', bitmapId);
      const alphaTotal = (data: Uint8ClampedArray) => {
        let total = 0;
        for (let index = 3; index < data.length; index += 4) {
          total += data[index];
        }
        return total;
      };
      const countVisiblePixels = (data: Uint8ClampedArray) => {
        let count = 0;
        for (let index = 3; index < data.length; index += 4) {
          if (data[index] > 0) count += 1;
        }
        return count;
      };

      bitmap.setPixel(4, 1, 255, 255, 255, 255);

      const before = bitmap.context.getImageData(0, 0, 9, 9).data;
      const beforeAlphaTotal = alphaTotal(before);
      bitmap.radialBlur(90, 9);
      const after = bitmap.context.getImageData(0, 0, 9, 9).data;

      return {
        beforeAlphaTotal,
        afterAlphaTotal: alphaTotal(after),
        changedPixels: countVisiblePixels(after),
      };
    });

    expect(result.beforeAlphaTotal).toBe(255);
    expect(result.afterAlphaTotal).toBeGreaterThan(255);
    expect(result.changedPixels).toBeGreaterThan(1);
  });

  test('Cache-style bitmap loading applies hue-changed variants', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const bitmapIds: Array<[number, number]> = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const value = await rubyManager.evalAsync(
        `
        module Cache
          @cache = {}

          def self.load_bitmap(folder_name, filename, hue = 0)
            path = folder_name + filename
            return normal_bitmap(path) if hue.to_i == 0

            key = [path, hue.to_i]
            @cache[key] ||= normal_bitmap(path).clone.tap { |bitmap| bitmap.hue_change(hue) }
          end

          def self.normal_bitmap(path)
            @cache[path] ||= Bitmap.new(path)
          end

          def self.battler(filename, hue)
            load_bitmap('Graphics/Battlers/', filename, hue)
          end

          def self.animation(filename, hue)
            load_bitmap('Graphics/Animations/', filename, hue)
          end

          def self.title1(filename, hue)
            load_bitmap('Graphics/Titles1/', filename, hue)
          end

          def self.title2(filename, hue)
            load_bitmap('Graphics/Titles2/', filename, hue)
          end
        end

        pairs = [
          [Cache.battler('Slime', 0), Cache.battler('Slime', 120)],
          [Cache.animation('Fire1', 0), Cache.animation('Fire1', 120)],
          [Cache.title1('Plain', 0), Cache.title1('Plain', 120)],
          [Cache.title2('Forest', 0), Cache.title2('Forest', 120)],
        ]
        pairs.map { |base, shifted| [base.__bitmap_id, shifted.__bitmap_id].join(':') }.join(',')
      `,
        'test-cache-hue-change',
      );
      return value
        .toString()
        .split(',')
        .map((pair: string) => pair.split(':').map((id: string) => Number(id)));
    });

    const result = await page.evaluate((pairs: Array<[number, number]>) => {
      const app = (window as any).rubyBridge.app;

      return pairs.map(([baseId, shiftedId]) => {
        const base = app.getObject('bitmap', baseId);
        const shifted = app.getObject('bitmap', shiftedId);
        const basePixels = base.context.getImageData(0, 0, base.width, base.height).data;
        const shiftedPixels = shifted.context.getImageData(0, 0, shifted.width, shifted.height).data;

        for (let index = 0; index < basePixels.length; index += 4) {
          const alpha = basePixels[index + 3];
          if (alpha === 0) continue;

          const baseRed = basePixels[index];
          const baseGreen = basePixels[index + 1];
          const baseBlue = basePixels[index + 2];
          if (baseRed === baseGreen && baseGreen === baseBlue) continue;

          const shiftedRed = shiftedPixels[index];
          const shiftedGreen = shiftedPixels[index + 1];
          const shiftedBlue = shiftedPixels[index + 2];
          const shiftedAlpha = shiftedPixels[index + 3];
          const changed = baseRed !== shiftedRed || baseGreen !== shiftedGreen || baseBlue !== shiftedBlue;

          if (changed) {
            return {
              changed,
              alphaPreserved: alpha === shiftedAlpha,
              sameRecord: baseId === shiftedId,
            };
          }
        }

        return { changed: false, alphaPreserved: false, sameRecord: baseId === shiftedId };
      });
    }, bitmapIds);

    expect(result).toEqual([
      {
        changed: true,
        alphaPreserved: true,
        sameRecord: false,
      },
      {
        changed: true,
        alphaPreserved: true,
        sameRecord: false,
      },
      {
        changed: true,
        alphaPreserved: true,
        sameRecord: false,
      },
      {
        changed: true,
        alphaPreserved: true,
        sameRecord: false,
      },
    ]);
  });
});
