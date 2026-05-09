import { Page } from '@playwright/test';

export async function dispatchKeyEvent(page: Page, type: 'keydown' | 'keyup', code: string) {
  await page.evaluate(
    ({ eventType, keyCode }) => {
      document.dispatchEvent(new KeyboardEvent(eventType, { code: keyCode, bubbles: true, cancelable: true }));
    },
    { eventType: type, keyCode: code },
  );
}

export async function tapKey(
  page: Page,
  key: string,
  options: {
    beforeUpDelay?: number;
    afterUpDelay?: number;
    whileDown?: () => Promise<void> | void;
  } = {},
) {
  const { beforeUpDelay = 120, afterUpDelay = 200, whileDown } = options;
  await page.keyboard.down(key);
  await page.waitForTimeout(beforeUpDelay);
  await whileDown?.();
  await page.keyboard.up(key);
  await page.waitForTimeout(afterUpDelay);
}
