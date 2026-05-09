export type ManagedKey =
  | 'LEFT'
  | 'RIGHT'
  | 'UP'
  | 'DOWN'
  | 'A'
  | 'B'
  | 'C'
  | 'X'
  | 'Y'
  | 'Z'
  | 'L'
  | 'R'
  | 'CTRL'
  | 'ALT'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9';

const MANAGED_KEYS: ManagedKey[] = [
  'LEFT',
  'RIGHT',
  'UP',
  'DOWN',
  'A',
  'B',
  'C',
  'X',
  'Y',
  'Z',
  'L',
  'R',
  'CTRL',
  'ALT',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
];

interface KeyboardMap {
  LEFT: boolean;
  RIGHT: boolean;
  UP: boolean;
  DOWN: boolean;
  A: boolean;
  B: boolean;
  C: boolean;
  X: boolean;
  Y: boolean;
  Z: boolean;
  L: boolean;
  R: boolean;
  CTRL: boolean;
  ALT: boolean;
  F5: boolean;
  F6: boolean;
  F7: boolean;
  F8: boolean;
  F9: boolean;
}

interface KeyState {
  LEFT: number;
  RIGHT: number;
  UP: number;
  DOWN: number;
  A: number;
  B: number;
  C: number;
  X: number;
  Y: number;
  Z: number;
  L: number;
  R: number;
  CTRL: number;
  ALT: number;
  F5: number;
  F6: number;
  F7: number;
  F8: number;
  F9: number;
}

const KEYBOARD_MAP: { [key: string]: ManagedKey } = {
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ShiftLeft: 'A',
  ShiftRight: 'A',
  KeyX: 'B',
  Esc: 'B',
  Escape: 'B',
  KeyZ: 'C',
  Space: 'C',
  Enter: 'C',
  KeyA: 'X',
  KeyS: 'Y',
  KeyD: 'Z',
  KeyQ: 'L',
  KeyW: 'R',
  ControlLeft: 'CTRL',
  ControlRight: 'CTRL',
  AltLeft: 'ALT',
  AltRight: 'ALT',
  F5: 'F5',
  F6: 'F6',
  F7: 'F7',
  F8: 'F8',
  F9: 'F9',
};

export class KeyManager {
  private _keyboardMap: KeyboardMap = {
    LEFT: false,
    RIGHT: false,
    UP: false,
    DOWN: false,
    A: false,
    B: false,
    C: false,
    X: false,
    Y: false,
    Z: false,
    L: false,
    R: false,
    CTRL: false,
    ALT: false,
    F5: false,
    F6: false,
    F7: false,
    F8: false,
    F9: false,
  };

  private _virtualMap: KeyboardMap = {
    LEFT: false,
    RIGHT: false,
    UP: false,
    DOWN: false,
    A: false,
    B: false,
    C: false,
    X: false,
    Y: false,
    Z: false,
    L: false,
    R: false,
    CTRL: false,
    ALT: false,
    F5: false,
    F6: false,
    F7: false,
    F8: false,
    F9: false,
  };

  private _state: KeyState = {
    LEFT: 0,
    RIGHT: 0,
    UP: 0,
    DOWN: 0,
    A: 0,
    B: 0,
    C: 0,
    X: 0,
    Y: 0,
    Z: 0,
    L: 0,
    R: 0,
    CTRL: 0,
    ALT: 0,
    F5: 0,
    F6: 0,
    F7: 0,
    F8: 0,
    F9: 0,
  };

  constructor() {
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('blur', this._onWindowBlur);
  }

  get state() {
    return this._state;
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    window.removeEventListener('blur', this._onWindowBlur);
  }

  setVirtualKey(key: ManagedKey, pressed: boolean) {
    this._virtualMap[key] = pressed;
  }

  clear() {
    MANAGED_KEYS.forEach((key) => {
      this._keyboardMap[key] = false;
      this._virtualMap[key] = false;
      this._state[key] = 0;
    });
  }

  update() {
    MANAGED_KEYS.forEach((key) => {
      if (this._keyboardMap[key] || this._virtualMap[key]) {
        this._state[key] += 1;
      } else {
        this._state[key] = 0;
      }
    });
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    const key = KEYBOARD_MAP[e.code];
    if (!key) return;

    e.preventDefault();
    this._keyboardMap[key] = true;
  };

  private _onKeyUp = (e: KeyboardEvent) => {
    const key = KEYBOARD_MAP[e.code];
    if (!key) return;

    e.preventDefault();
    this._keyboardMap[key] = false;
  };

  private _onWindowBlur = () => {
    this.clear();
  };

  private _onVisibilityChange = () => {
    if (document.visibilityState !== 'hidden') return;

    this.clear();
  };
}
