import { expect, test } from '@playwright/test';
import { loadGame } from './helpers';

test.describe('RubyManager', () => {
  test('keeps the VM private and rejects reentrant evaluation while the game loop is running', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo' });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;

      try {
        await rubyManager.evalAsync('1 + 1', 'test-reentrant-eval');
        return {
          errorName: null,
          errorMessage: null,
          exposesVm: '_vm' in rubyManager,
          isEvaluating: rubyManager.isEvaluating(),
        };
      } catch (error) {
        return {
          errorName: error instanceof Error ? error.name : null,
          errorMessage: error instanceof Error ? error.message : String(error),
          exposesVm: '_vm' in rubyManager,
          isEvaluating: rubyManager.isEvaluating(),
        };
      }
    });

    expect(result.exposesVm).toBe(false);
    expect(result.isEvaluating).toBe(true);
    expect(result.errorName).toBe('RubyVmBusyError');
    expect(result.errorMessage).toContain('test-reentrant-eval');
  });
});
