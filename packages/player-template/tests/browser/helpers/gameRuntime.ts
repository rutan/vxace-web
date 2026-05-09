import { Page, expect } from '@playwright/test';

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

const DEFAULT_CANVAS_POINT: CanvasPoint = { x: 32, y: 32 };

export function gameUrl({ gameDir, guest }: Pick<GameLoadOptions, 'gameDir' | 'guest'>) {
  const params = new URLSearchParams({ game_dir: gameDir });
  if (guest === false) {
    params.set('guest', '0');
  }
  return `/?${params.toString()}`;
}

export async function loadGame(page: Page, options: GameLoadOptions) {
  const { settleMs = 1500, canvasTimeout = 10_000, assertNoRuntimeError = true } = options;

  await page.goto(gameUrl(options), { waitUntil: 'load' });
  await expectGameCanvas(page, { timeout: canvasTimeout });

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
    .poll(async () => {
      const snapshot = await readAppDebugSnapshot<Pick<AppDebugSnapshot, 'tilemapCount'>>(page);
      return snapshot.tilemapCount;
    })
    .toBeGreaterThanOrEqual(minCount);
}

export async function waitForVisibleWindow(page: Page, minCount = 1) {
  await expect
    .poll(async () => {
      const snapshot = await readAppDebugSnapshot<Pick<AppDebugSnapshot, 'visibleWindowCount'>>(page);
      return snapshot.visibleWindowCount;
    })
    .toBeGreaterThanOrEqual(minCount);
}
