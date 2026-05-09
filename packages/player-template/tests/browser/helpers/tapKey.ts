import { Page } from '@playwright/test';

type TestManagedKey = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'A' | 'B' | 'C' | 'X' | 'Y' | 'Z' | 'L' | 'R';

const KEY_CODE_BY_KEY: Record<string, string> = {
  c: 'KeyZ',
  C: 'KeyZ',
  x: 'KeyX',
  X: 'KeyX',
  z: 'KeyZ',
  Z: 'KeyZ',
  Enter: 'Enter',
  Space: 'Space',
  Escape: 'Escape',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUp: 'ArrowUp',
};

const MANAGED_KEY_BY_KEY: Record<string, TestManagedKey> = {
  c: 'C',
  C: 'C',
  z: 'C',
  Z: 'C',
  Enter: 'C',
  Space: 'C',
  x: 'B',
  X: 'B',
  Escape: 'B',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  ArrowUp: 'UP',
};

export async function dispatchKeyEvent(page: Page, type: 'keydown' | 'keyup', code: string) {
  await page.evaluate(
    ({ eventType, keyCode }) => {
      document.dispatchEvent(new KeyboardEvent(eventType, { code: keyCode, bubbles: true, cancelable: true }));
    },
    { eventType: type, keyCode: code },
  );
}

async function setRuntimeKey(page: Page, key: TestManagedKey, pressed: boolean) {
  await page.evaluate(
    ({ managedKey, isPressed }) => {
      const keyManager = (window as any).rubyBridge?.app?._keyManager;
      if (keyManager?.setVirtualKey) {
        keyManager.setVirtualKey(managedKey, isPressed);
        return;
      }

      const fallbackCodeByKey: Record<string, string> = {
        B: 'KeyX',
        C: 'KeyZ',
        DOWN: 'ArrowDown',
        LEFT: 'ArrowLeft',
        RIGHT: 'ArrowRight',
        UP: 'ArrowUp',
      };
      const code = fallbackCodeByKey[managedKey];
      if (code) {
        document.dispatchEvent(
          new KeyboardEvent(isPressed ? 'keydown' : 'keyup', { code, bubbles: true, cancelable: true }),
        );
      }
    },
    { managedKey: key, isPressed: pressed },
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
  const code = KEY_CODE_BY_KEY[key] ?? key;
  const managedKey = MANAGED_KEY_BY_KEY[key];

  if (managedKey) {
    await setRuntimeKey(page, managedKey, true);
  } else {
    await dispatchKeyEvent(page, 'keydown', code);
  }

  try {
    await page.waitForTimeout(beforeUpDelay);
    await whileDown?.();
  } finally {
    if (managedKey) {
      await setRuntimeKey(page, managedKey, false);
    } else {
      await dispatchKeyEvent(page, 'keyup', code);
    }
  }

  await page.waitForTimeout(afterUpDelay);
}
