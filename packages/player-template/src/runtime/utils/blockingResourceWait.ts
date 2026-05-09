export type BlockingResourceWaitKind = 'data' | 'image';

export type BlockingResourceWaitContext = {
  kind: BlockingResourceWaitKind;
  label?: string;
};

export type BlockingResourceWaitPresentation = {
  kind: BlockingResourceWaitKind;
  label: string;
  elapsedMs: number;
  activeCount: number;
};

export type BlockingResourceWaitPresenter = {
  showBlockingResourceWait: (presentation: BlockingResourceWaitPresentation) => void;
  hideBlockingResourceWait: () => void;
};

type PendingWait = {
  context: BlockingResourceWaitContext;
};

const DEFAULT_SHOW_DELAY_MS = 500;

export class BlockingResourceWaitManager {
  private _presenter: BlockingResourceWaitPresenter | null = null;
  private readonly _pendingWaits = new Map<symbol, PendingWait>();
  private _showDelayMs = DEFAULT_SHOW_DELAY_MS;
  private _sessionStartedAt: number | null = null;
  private _showTimer: ReturnType<typeof setTimeout> | null = null;
  private _visible = false;
  private _presented = false;

  setPresenter(presenter: BlockingResourceWaitPresenter | null) {
    this._presenter = presenter;
    this._refreshPresentation();
  }

  setShowDelayMs(milliseconds: number) {
    this._showDelayMs = Math.max(0, Math.trunc(Number(milliseconds) || 0));
  }

  async track<T>(context: BlockingResourceWaitContext, request: () => Promise<T>) {
    const key = this._beginWait(context);
    let failed = false;

    try {
      return await request();
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      this._endWait(key, failed);
    }
  }

  completeIfIdle() {
    if (this._pendingWaits.size > 0) return;

    this._clearSession();
  }

  private _beginWait(context: BlockingResourceWaitContext) {
    const key = Symbol('blocking-resource-wait');
    this._pendingWaits.set(key, { context });

    if (this._sessionStartedAt == null) {
      this._sessionStartedAt = Date.now();
      this._showTimer = globalThis.setTimeout(() => {
        this._showTimer = null;
        if (this._sessionStartedAt == null) return;

        this._visible = true;
        this._refreshPresentation();
      }, this._showDelayMs);
    }

    this._refreshPresentation();
    return key;
  }

  private _endWait(key: symbol, failed: boolean) {
    this._pendingWaits.delete(key);

    if (failed) {
      this._clearSession();
      return;
    }

    // Keep the session open until Graphics.update confirms RGSS has returned to the frame loop.
    this._refreshPresentation();
  }

  private _clearSession() {
    if (
      this._sessionStartedAt == null &&
      this._showTimer == null &&
      !this._visible &&
      !this._presented &&
      this._pendingWaits.size === 0
    ) {
      return;
    }

    if (this._showTimer != null) {
      globalThis.clearTimeout(this._showTimer);
      this._showTimer = null;
    }

    this._sessionStartedAt = null;
    this._visible = false;
    this._hidePresentation();
  }

  private _hidePresentation() {
    if (!this._presented) return;

    this._presented = false;
    this._presenter?.hideBlockingResourceWait();
  }

  private _refreshPresentation() {
    if (!this._presenter) return;

    if (!this._visible) {
      this._hidePresentation();
      return;
    }

    const activeWaits = [...this._pendingWaits.values()];
    const latestWait = activeWaits.at(-1);
    if (!latestWait || this._sessionStartedAt == null) return;

    this._presented = true;
    this._presenter.showBlockingResourceWait({
      kind: latestWait.context.kind,
      label: latestWait.context.label ?? '',
      elapsedMs: Date.now() - this._sessionStartedAt,
      activeCount: activeWaits.length,
    });
  }
}

export const blockingResourceWaitManager = new BlockingResourceWaitManager();

export const configureBlockingResourceWaitPresenter = (presenter: BlockingResourceWaitPresenter | null) => {
  blockingResourceWaitManager.setPresenter(presenter);
};

export const trackBlockingResourceWait = <T>(context: BlockingResourceWaitContext, request: () => Promise<T>) => {
  return blockingResourceWaitManager.track(context, request);
};

export const completeBlockingResourceWaitIfIdle = () => {
  blockingResourceWaitManager.completeIfIdle();
};
