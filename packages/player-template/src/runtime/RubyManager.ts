import type { RbValue, RubyVM } from '@ruby/4.0-wasm-wasi';

type QueueItem = {
  label: string;
  code: string;
};

export class RubyEvalError extends Error {
  readonly label: string;
  readonly cause: unknown;

  constructor(label: string, cause: unknown) {
    super(`ruby eval failed in ${label}`);
    this.name = 'RubyEvalError';
    this.label = label;
    this.cause = cause;
  }
}

export class RubyVmBusyError extends Error {
  readonly currentLabel: string;
  readonly requestedLabel: string;

  constructor(currentLabel: string, requestedLabel: string) {
    super(`ruby vm is already evaluating ${currentLabel}; cannot evaluate ${requestedLabel}`);
    this.name = 'RubyVmBusyError';
    this.currentLabel = currentLabel;
    this.requestedLabel = requestedLabel;
  }
}

export class RubyManager {
  readonly #vm: RubyVM;
  private readonly _code: QueueItem[] = [];
  private _currentLabel: string | null = null;

  constructor(vm: RubyVM) {
    this.#vm = vm;
  }

  push(code: string, label = 'anonymous') {
    this.pushNamed(label, code);
  }

  pushNamed(label: string, code: string) {
    this._code.push({ label, code });
  }

  hasCode() {
    return this._code.length;
  }

  isEvaluating() {
    return this._currentLabel !== null;
  }

  async evalAsync(code: string, label = 'anonymous'): Promise<RbValue> {
    if (this._currentLabel !== null) {
      throw new RubyVmBusyError(this._currentLabel, label);
    }

    this._currentLabel = label;
    try {
      return await this.#vm.evalAsync(code);
    } catch (error) {
      throw new RubyEvalError(label, error);
    } finally {
      this._currentLabel = null;
    }
  }

  async evalAsyncCode() {
    if (this._currentLabel !== null) {
      throw new RubyVmBusyError(this._currentLabel, 'queued-code');
    }

    const item = this._code.shift();
    if (!item) return Promise.resolve();

    return this.evalAsync(item.code, item.label);
  }
}
