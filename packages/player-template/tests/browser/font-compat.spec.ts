import { expect, test } from '@playwright/test';
import { expectNoRuntimeError, loadGame } from './helpers';

test.describe('font compatibility', () => {
  test('preloads manifest fonts and exposes Font.exist?', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false, settleMs: 500 });

    const result = await page.evaluate(async () => {
      await document.fonts.ready;

      const rubyManager = (window as any).rubyBridge.rubyManager;
      const value = await rubyManager.evalAsync(
        `
        font = Font.new(['Missing Font', 'VL Gothic'], 20)
        fallback = Font.new('Missing Font', 20)
        disabled_font = Font.new('VL Gothic', 24)
        disabled_font.color.alpha = 160
        JSON.generate({
          vl_gothic: Font.exist?('VL Gothic'),
          vl_gothic_hyphen: Font.exist?('VL-Gothic'),
          missing: Font.exist?('Missing Font'),
          family: font.__send__(:__to_css_font_family),
          fallback_family: fallback.__send__(:__to_css_font_family),
          default_css_font: Font.new.__to_css_font,
          default_metrics: JS.global[:rubyBridge][:app].resolveFontRenderMetrics(JSON.generate(['VL Gothic'])).to_s,
          disabled_out_color: disabled_font.__to_css_out_color,
          disabled_shadow_color: disabled_font.__to_css_shadow_color
        })
      `,
        'test-font-exist',
      );

      return {
        ruby: JSON.parse(value.toString()),
        browserLoaded: document.fonts.check('18px "VL Gothic"'),
      };
    });

    expect(result.ruby.vl_gothic).toBe(true);
    expect(result.ruby.vl_gothic_hyphen).toBe(true);
    expect(result.ruby.missing).toBe(false);
    expect(result.ruby.family).toBe('"VL Gothic"');
    expect(result.ruby.fallback_family).toBe('"VL Gothic"');
    expect(result.ruby.default_css_font).toBe('18.9px "VL Gothic"');
    expect(JSON.parse(result.ruby.default_metrics).cssSizeRatio).toBeCloseTo(1 / 1.27);
    expect(readRgbaAlpha(result.ruby.disabled_out_color)).toBeCloseTo((128 / 255) * (160 / 255));
    expect(result.ruby.disabled_shadow_color).toBe('rgba(0, 0, 0, 0.6274509803921569)');
    expect(result.browserLoaded).toBe(true);
    await expectNoRuntimeError(page);
  });
});

const readRgbaAlpha = (value: string) => {
  const match = value.match(/,\s*([0-9.]+)\)$/);
  if (!match) throw new Error(`invalid rgba value: ${value}`);
  return Number(match[1]);
};
