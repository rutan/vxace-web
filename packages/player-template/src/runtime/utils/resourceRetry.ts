export type RetryableResourceKind = 'data' | 'image';

export type ResourceLoadContext = {
  kind: RetryableResourceKind;
  url: string;
  label?: string;
};

export type ResourceLoadErrorPresentation = {
  kind: RetryableResourceKind;
  url: string;
  label: string;
  attempt: number;
  message: string;
  detail: string;
  retry: () => void;
};

export type ResourceLoadErrorPresenter = {
  showResourceLoadError: (presentation: ResourceLoadErrorPresentation) => void;
  hideResourceLoadError: () => void;
};

type PendingFailure = {
  context: ResourceLoadContext;
  error: RetryableResourceLoadError;
  attempt: number;
};

export class RetryableResourceLoadError extends Error {
  readonly url: string;
  readonly status: number | null;

  constructor(message: string, params: { url: string; status?: number | null }) {
    super(message);
    this.name = 'RetryableResourceLoadError';
    this.url = params.url;
    this.status = params.status ?? null;
  }
}

export class ResourceRetryManager {
  private _presenter: ResourceLoadErrorPresenter | null = null;
  private readonly _pendingFailures = new Map<symbol, PendingFailure>();
  private readonly _retryResolvers = new Set<() => void>();

  setPresenter(presenter: ResourceLoadErrorPresenter | null) {
    this._presenter = presenter;
    this._refreshPresentation();
  }

  async load<T>(context: ResourceLoadContext, request: () => Promise<T>) {
    let attempt = 1;

    for (;;) {
      try {
        return await request();
      } catch (error) {
        if (!(error instanceof RetryableResourceLoadError)) throw error;

        await this._waitForRetry(context, error, attempt);
        attempt += 1;
      }
    }
  }

  retry() {
    const resolvers = [...this._retryResolvers];
    this._retryResolvers.clear();
    this._pendingFailures.clear();
    this._presenter?.hideResourceLoadError();
    resolvers.forEach((resolve) => resolve());
  }

  private async _waitForRetry(context: ResourceLoadContext, error: RetryableResourceLoadError, attempt: number) {
    const key = Symbol('resource-load-failure');
    this._pendingFailures.set(key, { context, error, attempt });
    this._refreshPresentation();

    try {
      await new Promise<void>((resolve) => {
        this._retryResolvers.add(resolve);
      });
    } finally {
      this._pendingFailures.delete(key);
      this._refreshPresentation();
    }
  }

  private _refreshPresentation() {
    if (!this._presenter) return;

    const latestFailure = [...this._pendingFailures.values()].at(-1);
    if (!latestFailure) {
      this._presenter.hideResourceLoadError();
      return;
    }

    this._presenter.showResourceLoadError({
      kind: latestFailure.context.kind,
      url: latestFailure.context.url,
      label: latestFailure.context.label ?? latestFailure.context.url,
      attempt: latestFailure.attempt,
      message: '通信エラーが発生しました。',
      detail: formatResourceLoadFailure(latestFailure),
      retry: () => this.retry(),
    });
  }
}

export const resourceRetryManager = new ResourceRetryManager();

export const configureResourceLoadErrorPresenter = (presenter: ResourceLoadErrorPresenter | null) => {
  resourceRetryManager.setPresenter(presenter);
};

const formatResourceLoadFailure = ({ context, error, attempt }: PendingFailure) => {
  const lines = [
    `読み込み: ${context.label ?? context.url}`,
    `URL: ${context.url}`,
    `試行回数: ${attempt}`,
    `詳細: ${error.message}`,
  ];

  return lines.join('\n');
};
