import type { BlockingResourceWaitPresentation } from '../utils/blockingResourceWait';
import type { ResourceLoadErrorPresentation } from '../utils/resourceRetry';

export type MessagePresentation = {
  lines: unknown;
};

export type RuntimeErrorPresentation = {
  message: string;
};

export type BootStatusPhase =
  | 'loadingManifest'
  | 'loadingFonts'
  | 'loadingRubyRuntime'
  | 'initializingRubyVm'
  | 'startingGame';

export type BootStatusPresentation = {
  phase: BootStatusPhase;
};

export type PresenterMountParameters = {
  screenElement: HTMLElement;
};

export type PresenterSnapshot = {
  messageOpen: boolean;
  runtimeErrorOpen: boolean;
  resourceErrorOpen: boolean;
  resourceLoadingOpen: boolean;
};

export interface Presenter {
  mount(params: PresenterMountParameters): void;
  dispose(): void;
  showBootStatus(presentation: BootStatusPresentation): void;
  showBootError(message: string): void;
  completeBoot(): void;
  showMessage(presentation: MessagePresentation): void;
  closeMessage(): void;
  isMessageOpen(): boolean;
  showRuntimeError(presentation: RuntimeErrorPresentation): void;
  hideRuntimeError(): void;
  showResourceLoadError(presentation: ResourceLoadErrorPresentation): void;
  hideResourceLoadError(): void;
  showResourceLoading(presentation: BlockingResourceWaitPresentation): void;
  hideResourceLoading(): void;
  snapshot(): PresenterSnapshot;
}

export interface PresenterParameters {
  appElement: HTMLElement;
  bootStatusElement?: HTMLElement | null;
  bootStatusMessageElement?: HTMLElement | null;
}

export function createDefaultPresenter(params: PresenterParameters): Presenter {
  return new DefaultDomPresenter(params);
}

class DefaultDomPresenter implements Presenter {
  private _screenElement: HTMLElement | null = null;
  private _bootStatusElement: HTMLElement | null;
  private _bootStatusMessageElement: HTMLElement | null;
  private _messageElement: HTMLDivElement | null = null;
  private _messageContentElement: HTMLDivElement | null = null;
  private _runtimeErrorElement: HTMLDivElement | null = null;
  private _runtimeErrorContentElement: HTMLPreElement | null = null;
  private _resourceErrorElement: HTMLDivElement | null = null;
  private _resourceErrorTitleElement: HTMLDivElement | null = null;
  private _resourceErrorContentElement: HTMLDivElement | null = null;
  private _resourceErrorRetryButton: HTMLButtonElement | null = null;
  private _resourceLoadingElement: HTMLDivElement | null = null;
  private _resourceLoadingLabelElement: HTMLDivElement | null = null;

  constructor(params: PresenterParameters) {
    this._bootStatusElement = params.bootStatusElement ?? params.appElement.querySelector<HTMLElement>('.boot-status');
    this._bootStatusMessageElement =
      params.bootStatusMessageElement ??
      this._bootStatusElement?.querySelector<HTMLElement>('.boot-status__message') ??
      params.appElement.querySelector<HTMLElement>('.boot-status__message');
  }

  mount(params: PresenterMountParameters) {
    if (this._screenElement === params.screenElement && this._messageElement) return;

    this.disposeScreenPresentation();
    this._screenElement = params.screenElement;
    this._createMessageElements(params.screenElement);
    this._createRuntimeErrorElements(params.screenElement);
    this._createResourceLoadingElements(params.screenElement);
    this._createResourceErrorElements(params.screenElement);
  }

  dispose() {
    this.disposeScreenPresentation();
    this._bootStatusElement = null;
    this._bootStatusMessageElement = null;
  }

  showBootStatus(presentation: BootStatusPresentation) {
    if (this._bootStatusMessageElement) {
      this._bootStatusMessageElement.classList.remove('boot-status__message--error');
      this._bootStatusMessageElement.textContent = localizeBootStatusMessage(presentation.phase);
    }
  }

  showBootError(message: string) {
    if (!this._bootStatusMessageElement) return;

    this._bootStatusMessageElement.classList.add('boot-status__message--error');
    this._bootStatusMessageElement.textContent = message;
  }

  completeBoot() {
    this._bootStatusElement?.remove();
    this._bootStatusElement = null;
    this._bootStatusMessageElement = null;
  }

  showMessage(presentation: MessagePresentation) {
    if (!this._messageElement || !this._messageContentElement) return;

    const texts = Array.isArray(presentation.lines)
      ? presentation.lines.map(formatMessageLine)
      : [formatMessageLine(presentation.lines)];
    this._messageContentElement.textContent = texts.join('\n');
    this._messageElement.hidden = false;
  }

  closeMessage() {
    if (!this._messageElement || !this._messageContentElement) return;

    this._messageElement.hidden = true;
    this._messageContentElement.textContent = '';
  }

  isMessageOpen() {
    return this._messageElement ? !this._messageElement.hidden : false;
  }

  showRuntimeError(presentation: RuntimeErrorPresentation) {
    if (!this._runtimeErrorElement || !this._runtimeErrorContentElement) return;

    this.completeBoot();
    this._runtimeErrorContentElement.textContent = presentation.message;
    this._runtimeErrorElement.hidden = false;
  }

  hideRuntimeError() {
    if (!this._runtimeErrorElement || !this._runtimeErrorContentElement) return;

    this._runtimeErrorElement.hidden = true;
    this._runtimeErrorContentElement.textContent = '';
  }

  showResourceLoadError(presentation: ResourceLoadErrorPresentation) {
    if (
      !this._resourceErrorElement ||
      !this._resourceErrorTitleElement ||
      !this._resourceErrorContentElement ||
      !this._resourceErrorRetryButton
    ) {
      return;
    }

    this.completeBoot();
    this.hideResourceLoading();
    const message = localizeResourceLoadErrorMessage(presentation.label);
    this._resourceErrorTitleElement.textContent = message.title;
    this._resourceErrorContentElement.textContent = message.content;
    this._resourceErrorRetryButton.textContent = message.retry;
    this._resourceErrorRetryButton.onclick = () => presentation.retry();
    this._resourceErrorElement.hidden = false;
  }

  hideResourceLoadError() {
    if (
      !this._resourceErrorElement ||
      !this._resourceErrorTitleElement ||
      !this._resourceErrorContentElement ||
      !this._resourceErrorRetryButton
    ) {
      return;
    }

    this._resourceErrorElement.hidden = true;
    this._resourceErrorTitleElement.textContent = '';
    this._resourceErrorContentElement.textContent = '';
    this._resourceErrorRetryButton.onclick = null;
  }

  showResourceLoading(_presentation: BlockingResourceWaitPresentation) {
    if (!this._resourceLoadingElement || !this._resourceLoadingLabelElement) return;
    if (this._resourceErrorElement && !this._resourceErrorElement.hidden) return;

    this.completeBoot();
    const message = localizeResourceLoadingMessage();
    this._resourceLoadingLabelElement.textContent = message.label;
    this._resourceLoadingElement.hidden = false;
  }

  hideResourceLoading() {
    if (!this._resourceLoadingElement || !this._resourceLoadingLabelElement) return;

    this._resourceLoadingElement.hidden = true;
    this._resourceLoadingLabelElement.textContent = '';
  }

  snapshot(): PresenterSnapshot {
    return {
      messageOpen: this.isMessageOpen(),
      runtimeErrorOpen: this._runtimeErrorElement ? !this._runtimeErrorElement.hidden : false,
      resourceErrorOpen: this._resourceErrorElement ? !this._resourceErrorElement.hidden : false,
      resourceLoadingOpen: this._resourceLoadingElement ? !this._resourceLoadingElement.hidden : false,
    };
  }

  private disposeScreenPresentation() {
    this._messageElement?.remove();
    this._runtimeErrorElement?.remove();
    this._resourceLoadingElement?.remove();
    if (this._resourceErrorRetryButton) {
      this._resourceErrorRetryButton.onclick = null;
    }
    this._resourceErrorElement?.remove();
    this._screenElement = null;
    this._messageElement = null;
    this._messageContentElement = null;
    this._runtimeErrorElement = null;
    this._runtimeErrorContentElement = null;
    this._resourceErrorElement = null;
    this._resourceErrorTitleElement = null;
    this._resourceErrorContentElement = null;
    this._resourceErrorRetryButton = null;
    this._resourceLoadingElement = null;
    this._resourceLoadingLabelElement = null;
  }

  private _createMessageElements(screenElement: HTMLElement) {
    this._messageElement = document.createElement('div');
    this._messageElement.className = 'message-window';
    this._messageElement.hidden = true;

    this._messageContentElement = document.createElement('div');
    this._messageContentElement.className = 'message-window__content';
    this._messageElement.appendChild(this._messageContentElement);

    const hint = document.createElement('div');
    hint.className = 'message-window__hint';
    hint.textContent = 'Z / Enter';
    this._messageElement.appendChild(hint);

    screenElement.appendChild(this._messageElement);
  }

  private _createRuntimeErrorElements(screenElement: HTMLElement) {
    this._runtimeErrorElement = document.createElement('div');
    this._runtimeErrorElement.className = 'runtime-error';
    this._runtimeErrorElement.hidden = true;

    const title = document.createElement('div');
    title.className = 'runtime-error__title';
    title.textContent = 'Runtime Error';
    this._runtimeErrorElement.appendChild(title);

    this._runtimeErrorContentElement = document.createElement('pre');
    this._runtimeErrorContentElement.className = 'runtime-error__content';
    this._runtimeErrorElement.appendChild(this._runtimeErrorContentElement);

    screenElement.appendChild(this._runtimeErrorElement);
  }

  private _createResourceLoadingElements(screenElement: HTMLElement) {
    this._resourceLoadingElement = document.createElement('div');
    this._resourceLoadingElement.className = 'resource-loading';
    this._resourceLoadingElement.hidden = true;

    const innerElement = document.createElement('div');
    innerElement.className = 'resource-loading__inner';
    this._resourceLoadingElement.appendChild(innerElement);

    const spinnerElement = document.createElement('div');
    spinnerElement.className = 'resource-loading__spinner';
    innerElement.appendChild(spinnerElement);

    this._resourceLoadingLabelElement = document.createElement('div');
    this._resourceLoadingLabelElement.className = 'resource-loading__label';
    innerElement.appendChild(this._resourceLoadingLabelElement);

    screenElement.appendChild(this._resourceLoadingElement);
  }

  private _createResourceErrorElements(screenElement: HTMLElement) {
    this._resourceErrorElement = document.createElement('div');
    this._resourceErrorElement.className = 'resource-error';
    this._resourceErrorElement.hidden = true;

    const innerElement = document.createElement('div');
    innerElement.className = 'resource-error__inner';
    this._resourceErrorElement.appendChild(innerElement);

    this._resourceErrorTitleElement = document.createElement('div');
    this._resourceErrorTitleElement.className = 'resource-error__title';
    innerElement.appendChild(this._resourceErrorTitleElement);

    this._resourceErrorContentElement = document.createElement('div');
    this._resourceErrorContentElement.className = 'resource-error__content';
    innerElement.appendChild(this._resourceErrorContentElement);

    this._resourceErrorRetryButton = document.createElement('button');
    this._resourceErrorRetryButton.className = 'resource-error__retry';
    this._resourceErrorRetryButton.type = 'button';
    this._resourceErrorRetryButton.textContent = 'リトライする';
    innerElement.appendChild(this._resourceErrorRetryButton);

    screenElement.appendChild(this._resourceErrorElement);
  }
}

const formatMessageLine = (line: unknown) => {
  if (line == null) return '';
  if (typeof line === 'string') return line;
  if (typeof line === 'number' || typeof line === 'boolean' || typeof line === 'bigint' || typeof line === 'symbol') {
    return String(line);
  }
  if (line instanceof Error) return line.message;
  if (typeof line === 'object') {
    try {
      return JSON.stringify(line) ?? '';
    } catch {
      return '';
    }
  }
  return '';
};

const localizeBootStatusMessage = (phase: BootStatusPhase) => {
  const messages: Record<BootStatusPhase, string> = {
    loadingManifest: 'Loading game manifest...',
    loadingFonts: 'Loading fonts...',
    loadingRubyRuntime: 'Loading Ruby runtime...',
    initializingRubyVm: 'Initializing Ruby VM...',
    startingGame: 'Starting game...',
  };

  return messages[phase];
};

const localizeResourceLoadErrorMessage = (label: string) => {
  if (browserPrefersJapanese()) {
    return {
      title: `読み込みエラー: ${label}`,
      content: 'ファイルの読み込みに失敗しました。\nネットワーク状況を確認して、リトライしてください。',
      retry: 'リトライする',
    };
  }

  return {
    title: `Loading Error: ${label}`,
    content: 'Failed to load the file.\nCheck your network connection and try again.',
    retry: 'Retry',
  };
};

const localizeResourceLoadingMessage = () => {
  if (browserPrefersJapanese()) {
    return {
      label: '読み込み中...',
    };
  }

  return {
    label: 'Loading...',
  };
};

const browserPrefersJapanese = () => {
  const languages = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  return languages.some((language) => language.toLowerCase().startsWith('ja'));
};
