// @vitest-environment happy-dom

import { afterEach, describe, expect, test } from 'vitest';
import { KeyManager } from '../../src/runtime/core/KeyManager';

let manager: KeyManager | null = null;

afterEach(() => {
  manager?.dispose();
  manager = null;
  setDocumentVisibility('visible');
});

describe('KeyManager', () => {
  test('maps keyboard events and tracks pressed frame counts', () => {
    manager = new KeyManager();

    const keyDown = dispatchKeyboardEvent('keydown', 'ArrowLeft');
    manager.update();

    expect(keyDown.defaultPrevented).toBe(true);
    expect(manager.state.LEFT).toBe(1);

    manager.update();
    expect(manager.state.LEFT).toBe(2);

    const keyUp = dispatchKeyboardEvent('keyup', 'ArrowLeft');
    manager.update();

    expect(keyUp.defaultPrevented).toBe(true);
    expect(manager.state.LEFT).toBe(0);
  });

  test('maps RGSS action and function keys', () => {
    manager = new KeyManager();

    dispatchKeyboardEvent('keydown', 'Enter');
    dispatchKeyboardEvent('keydown', 'Escape');
    dispatchKeyboardEvent('keydown', 'ControlRight');
    dispatchKeyboardEvent('keydown', 'F9');
    manager.update();

    expect(manager.state.C).toBe(1);
    expect(manager.state.B).toBe(1);
    expect(manager.state.CTRL).toBe(1);
    expect(manager.state.F9).toBe(1);
  });

  test('combines virtual keys with keyboard state', () => {
    manager = new KeyManager();

    manager.setVirtualKey('C', true);
    manager.update();
    expect(manager.state.C).toBe(1);

    dispatchKeyboardEvent('keydown', 'Enter');
    manager.update();
    expect(manager.state.C).toBe(2);

    dispatchKeyboardEvent('keyup', 'Enter');
    manager.update();
    expect(manager.state.C).toBe(3);

    manager.setVirtualKey('C', false);
    manager.update();
    expect(manager.state.C).toBe(0);
  });

  test('clears keyboard and virtual state after window blur', () => {
    manager = new KeyManager();

    dispatchKeyboardEvent('keydown', 'Enter');
    manager.setVirtualKey('LEFT', true);
    manager.update();
    expect(manager.state.C).toBe(1);
    expect(manager.state.LEFT).toBe(1);

    window.dispatchEvent(new Event('blur'));
    manager.update();

    expect(manager.state.C).toBe(0);
    expect(manager.state.LEFT).toBe(0);
  });

  test('clears keyboard and virtual state when the document becomes hidden', () => {
    manager = new KeyManager();

    dispatchKeyboardEvent('keydown', 'ArrowDown');
    manager.setVirtualKey('B', true);
    manager.update();
    expect(manager.state.DOWN).toBe(1);
    expect(manager.state.B).toBe(1);

    setDocumentVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    manager.update();

    expect(manager.state.DOWN).toBe(0);
    expect(manager.state.B).toBe(0);
  });

  test('ignores unknown keys and stops listening after dispose', () => {
    manager = new KeyManager();

    const unknownKey = dispatchKeyboardEvent('keydown', 'KeyP');
    manager.update();
    expect(unknownKey.defaultPrevented).toBe(false);
    expect(manager.state.C).toBe(0);

    const disposedManager = manager;
    disposedManager.dispose();
    manager = null;

    dispatchKeyboardEvent('keydown', 'Enter');
    disposedManager.update();
    expect(disposedManager.state.C).toBe(0);
  });
});

const dispatchKeyboardEvent = (type: 'keydown' | 'keyup', code: string) => {
  const event = new KeyboardEvent(type, {
    code,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
};

const setDocumentVisibility = (visibilityState: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: visibilityState,
  });
};
