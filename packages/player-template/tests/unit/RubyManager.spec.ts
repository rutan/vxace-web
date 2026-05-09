import { describe, expect, test, vi } from 'vitest';
import { RubyEvalError, RubyManager, RubyVmBusyError } from '../../src/runtime/RubyManager';

describe('RubyManager', () => {
  test('evaluates queued code in FIFO order with labels', async () => {
    const evalAsync = vi.fn(async (code: string) => `result:${code}`);
    const manager = new RubyManager({ evalAsync } as any);

    manager.pushNamed('first-label', 'first-code');
    manager.push('second-code', 'second-label');

    expect(manager.hasCode()).toBe(2);
    await expect(manager.evalAsyncCode()).resolves.toBe('result:first-code');
    await expect(manager.evalAsyncCode()).resolves.toBe('result:second-code');
    expect(manager.hasCode()).toBe(0);
    expect(evalAsync).toHaveBeenNthCalledWith(1, 'first-code');
    expect(evalAsync).toHaveBeenNthCalledWith(2, 'second-code');
  });

  test('wraps VM failures with the evaluation label and clears busy state', async () => {
    const cause = new Error('boom');
    const manager = new RubyManager({
      evalAsync: vi.fn(async () => {
        throw cause;
      }),
    } as any);

    await expect(manager.evalAsync('broken-code', 'broken-label')).rejects.toMatchObject({
      name: 'RubyEvalError',
      label: 'broken-label',
      cause,
    } satisfies Partial<RubyEvalError>);
    expect(manager.isEvaluating()).toBe(false);
  });

  test('rejects reentrant evaluation while the VM is busy', async () => {
    const pending = createDeferred<string>();
    const manager = new RubyManager({
      evalAsync: vi.fn(() => pending.promise),
    } as any);

    const firstEvaluation = manager.evalAsync('long-code', 'current-label');
    expect(manager.isEvaluating()).toBe(true);

    await expect(manager.evalAsync('next-code', 'requested-label')).rejects.toMatchObject({
      name: 'RubyVmBusyError',
      currentLabel: 'current-label',
      requestedLabel: 'requested-label',
    } satisfies Partial<RubyVmBusyError>);

    pending.resolve('done');
    await expect(firstEvaluation).resolves.toBe('done');
    expect(manager.isEvaluating()).toBe(false);
  });
});

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};
