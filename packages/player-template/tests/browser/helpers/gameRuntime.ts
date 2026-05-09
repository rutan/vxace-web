import { Page, expect } from '@playwright/test';
import { tapKey } from './tapKey';

export type GameLoadOptions = {
  gameDir: 'minimal' | 'demo';
  guest?: boolean;
  settleMs?: number;
  canvasTimeout?: number;
  assertNoRuntimeError?: boolean;
};

export type CanvasPoint = {
  x: number;
  y: number;
};

export type AppDebugSnapshot = {
  bitmapCount: number;
  spriteCount: number;
  visibleSpriteCount: number;
  tilemapCount: number;
  visibleTilemapCount: number;
  windowCount: number;
  visibleWindowCount: number;
  messageOpen: boolean;
  runtimeErrorOpen: boolean;
  resourceErrorOpen: boolean;
  documentHasFocus: boolean;
  activeElementTag: string;
  keyState: Record<string, number>;
  lastBridgeEvent: string;
};

export type WaitForSceneOptions = {
  minCount?: number;
  timeout?: number;
};

const DEFAULT_CANVAS_POINT: CanvasPoint = { x: 32, y: 32 };
const IS_CI = process.env.CI === 'true';
const DEFAULT_CANVAS_TIMEOUT = IS_CI ? 60_000 : 10_000;
const DEFAULT_STATE_TIMEOUT = IS_CI ? 60_000 : 20_000;

export function gameUrl({ gameDir, guest }: Pick<GameLoadOptions, 'gameDir' | 'guest'>) {
  const params = new URLSearchParams({ game_dir: gameDir });
  if (guest === false) {
    params.set('guest', '0');
  }
  return `/?${params.toString()}`;
}

export async function loadGame(page: Page, options: GameLoadOptions) {
  const { settleMs = 1500, canvasTimeout = DEFAULT_CANVAS_TIMEOUT, assertNoRuntimeError = true } = options;
  const effectiveCanvasTimeout = IS_CI ? Math.max(canvasTimeout, DEFAULT_CANVAS_TIMEOUT) : canvasTimeout;

  await page.goto(gameUrl(options), { waitUntil: 'load' });
  await expectGameCanvas(page, { timeout: effectiveCanvasTimeout });

  if (settleMs > 0) {
    await page.waitForTimeout(settleMs);
  }

  if (assertNoRuntimeError) {
    await expectNoRuntimeError(page);
  }
}

export async function expectGameCanvas(page: Page, options: { timeout?: number } = {}) {
  await expect(page.locator('canvas')).toBeVisible(options);
}

export async function clickGameCanvas(page: Page, point: CanvasPoint = DEFAULT_CANVAS_POINT) {
  await page.locator('canvas').click({ position: point });
}

export async function focusGameCanvas(page: Page) {
  await clickGameCanvas(page);
}

export async function expectNoRuntimeError(page: Page) {
  await expect(page.locator('.runtime-error')).toBeHidden();
}

export async function readRuntimeError(page: Page) {
  return (await page.locator('.runtime-error__content').textContent()) ?? '';
}

export async function readAppDebugSnapshot<T extends Partial<AppDebugSnapshot> = AppDebugSnapshot>(page: Page) {
  return page.evaluate<T>(() => {
    return (window as any).rubyBridge.app.debugSnapshot();
  });
}

export async function waitForTilemap(page: Page, minCount = 1) {
  await expect
    .poll(
      async () => {
        const snapshot = await readAppDebugSnapshot<Pick<AppDebugSnapshot, 'tilemapCount'>>(page);
        return snapshot.tilemapCount;
      },
      { timeout: DEFAULT_STATE_TIMEOUT },
    )
    .toBeGreaterThanOrEqual(minCount);
}

export async function startNewGame(page: Page, options: WaitForSceneOptions = {}) {
  const { minCount = 1, timeout = DEFAULT_STATE_TIMEOUT } = options;
  const startedAt = Date.now();
  let lastSnapshot: Pick<AppDebugSnapshot, 'runtimeErrorOpen' | 'tilemapCount'> | null = null;

  await focusGameCanvas(page);

  while (Date.now() - startedAt < timeout) {
    lastSnapshot = await readAppDebugSnapshot<Pick<AppDebugSnapshot, 'runtimeErrorOpen' | 'tilemapCount'>>(page);
    if (lastSnapshot.runtimeErrorOpen) {
      expect(lastSnapshot.runtimeErrorOpen).toBe(false);
    }
    if (lastSnapshot.tilemapCount >= minCount) {
      return;
    }

    await tapKey(page, 'Enter', { afterUpDelay: 500 });
    lastSnapshot = await readAppDebugSnapshot<Pick<AppDebugSnapshot, 'runtimeErrorOpen' | 'tilemapCount'>>(page);
    if (lastSnapshot.runtimeErrorOpen) {
      expect(lastSnapshot.runtimeErrorOpen).toBe(false);
    }
    if (lastSnapshot.tilemapCount >= minCount) {
      return;
    }
  }

  expect(lastSnapshot?.tilemapCount ?? 0).toBeGreaterThanOrEqual(minCount);
}

export async function returnToTitleFromMapMenu(page: Page, options: { timeout?: number } = {}) {
  const { timeout = DEFAULT_STATE_TIMEOUT } = options;
  const startedAt = Date.now();
  let lastSnapshot: Pick<AppDebugSnapshot, 'runtimeErrorOpen' | 'tilemapCount'> | null = null;

  while (Date.now() - startedAt < timeout) {
    lastSnapshot = await readAppDebugSnapshot<Pick<AppDebugSnapshot, 'runtimeErrorOpen' | 'tilemapCount'>>(page);
    if (lastSnapshot.runtimeErrorOpen) {
      expect(lastSnapshot.runtimeErrorOpen).toBe(false);
    }
    if (lastSnapshot.tilemapCount === 0) {
      return;
    }

    await focusGameCanvas(page);
    await tapKey(page, 'x', { afterUpDelay: 500 });
    await waitForVisibleWindow(page);

    for (let index = 0; index < 5; index += 1) {
      await tapKey(page, 'ArrowDown', { beforeUpDelay: 180, afterUpDelay: 180 });
    }

    await tapKey(page, 'Enter', { afterUpDelay: 500 });
    await waitForVisibleWindow(page);
    await tapKey(page, 'Enter', { afterUpDelay: 500 });
  }

  expect(lastSnapshot?.tilemapCount ?? 1).toBe(0);
}

export async function waitForVisibleWindow(page: Page, minCount = 1) {
  await expect
    .poll(
      async () => {
        const snapshot = await readAppDebugSnapshot<Pick<AppDebugSnapshot, 'visibleWindowCount'>>(page);
        return snapshot.visibleWindowCount;
      },
      { timeout: DEFAULT_STATE_TIMEOUT },
    )
    .toBeGreaterThanOrEqual(minCount);
}
