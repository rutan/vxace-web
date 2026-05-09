import { GameManifest, type VirtualGamepadMode } from '@rutan/rpgmaker-vxace-web-game-manifest';
import { KeyManager, type ManagedKey } from './KeyManager';

type VirtualGamepadButton = {
  key: ManagedKey;
  label: string;
  className: string;
};

type DpadKey = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const VIRTUAL_GAMEPAD_DPAD_BUTTONS: VirtualGamepadButton[] = [
  { key: 'UP', label: '↑', className: 'virtual-gamepad__dpad-button virtual-gamepad__dpad-button--up' },
  { key: 'LEFT', label: '←', className: 'virtual-gamepad__dpad-button virtual-gamepad__dpad-button--left' },
  { key: 'RIGHT', label: '→', className: 'virtual-gamepad__dpad-button virtual-gamepad__dpad-button--right' },
  { key: 'DOWN', label: '↓', className: 'virtual-gamepad__dpad-button virtual-gamepad__dpad-button--down' },
];

const VIRTUAL_GAMEPAD_BUTTONS: Record<VirtualGamepadMode, VirtualGamepadButton[]> = {
  normal: [
    { key: 'L', label: 'L', className: 'virtual-gamepad__shoulder virtual-gamepad__shoulder--left' },
    { key: 'R', label: 'R', className: 'virtual-gamepad__shoulder virtual-gamepad__shoulder--right' },
    { key: 'A', label: 'A', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--a' },
    { key: 'X', label: 'X', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--x' },
    { key: 'Y', label: 'Y', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--y' },
    { key: 'B', label: 'B', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--b' },
    { key: 'C', label: 'C', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--c' },
  ],
  'normal-swap': [
    { key: 'L', label: 'L', className: 'virtual-gamepad__shoulder virtual-gamepad__shoulder--left' },
    { key: 'R', label: 'R', className: 'virtual-gamepad__shoulder virtual-gamepad__shoulder--right' },
    { key: 'A', label: 'A', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--a' },
    { key: 'X', label: 'X', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--y' },
    { key: 'Y', label: 'Y', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--x' },
    { key: 'B', label: 'B', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--c' },
    { key: 'C', label: 'C', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--b' },
  ],
  simple: [
    { key: 'B', label: 'B', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--simple-b' },
    { key: 'C', label: 'C', className: 'virtual-gamepad__face-button virtual-gamepad__face-button--simple-c' },
  ],
  none: [],
};

const VIRTUAL_GAMEPAD_LAYOUT_CLASS: Record<VirtualGamepadMode, string> = {
  normal: 'virtual-gamepad--normal',
  'normal-swap': 'virtual-gamepad--normal-swap',
  simple: 'virtual-gamepad--simple',
  none: 'virtual-gamepad--disabled',
};

export interface VirtualGamepadOptions {
  keyManager: KeyManager;
  gameManifest: GameManifest;
}

export class VirtualGamepad {
  private _keyManager: KeyManager;
  private _gameManifest: GameManifest;
  private _virtualGamepadElement: HTMLDivElement;
  private _virtualPointerKeys: Map<number, ManagedKey>;
  private _virtualDpadPointerIds: Set<number>;

  constructor(options: VirtualGamepadOptions) {
    const { keyManager, gameManifest } = options;

    this._keyManager = keyManager;
    this._gameManifest = gameManifest;
    this._virtualPointerKeys = new Map();
    this._virtualDpadPointerIds = new Set();

    const layout = gameManifest.metadata.input.virtualGamepad;

    this._virtualGamepadElement = document.createElement('div');
    this._virtualGamepadElement.className = ['virtual-gamepad', VIRTUAL_GAMEPAD_LAYOUT_CLASS[layout]].join(' ');
    this._virtualGamepadElement.hidden = true;

    const dpad = document.createElement('div');
    dpad.className = 'virtual-gamepad__dpad';
    dpad.setAttribute('aria-label', 'D-pad');
    dpad.addEventListener('pointerdown', (event) => this._pressVirtualDpad(event));
    dpad.addEventListener('pointermove', (event) => this._moveVirtualDpad(event));
    dpad.addEventListener('pointerup', (event) => this._releaseVirtualDpad(event));
    dpad.addEventListener('pointercancel', (event) => this._releaseVirtualDpad(event));
    dpad.addEventListener('lostpointercapture', (event) => this._releaseVirtualDpad(event));

    const shoulders = document.createElement('div');
    shoulders.className = 'virtual-gamepad__shoulders';
    const faceButtons = document.createElement('div');
    faceButtons.className = 'virtual-gamepad__face-buttons';

    for (const button of VIRTUAL_GAMEPAD_DPAD_BUTTONS) {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = button.className;
      element.textContent = button.label;
      element.setAttribute('aria-label', `${button.label} button`);
      element.tabIndex = -1;
      element.setAttribute('aria-hidden', 'true');
      dpad.appendChild(element);
    }

    const buttons = layout ? VIRTUAL_GAMEPAD_BUTTONS[layout] : [];
    for (const button of buttons) {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = button.className;
      element.textContent = button.label;
      element.setAttribute('aria-label', `${button.label} button`);
      element.addEventListener('pointerdown', (event) => this._pressVirtualButton(event, button.key));
      element.addEventListener('pointerup', (event) => this._releaseVirtualButton(event));
      element.addEventListener('pointercancel', (event) => this._releaseVirtualButton(event));
      element.addEventListener('lostpointercapture', (event) => this._releaseVirtualButton(event));

      if (isVirtualGamepadShoulder(button)) {
        shoulders.appendChild(element);
      } else {
        faceButtons.appendChild(element);
      }
    }

    this._virtualGamepadElement.appendChild(shoulders);
    this._virtualGamepadElement.appendChild(dpad);
    this._virtualGamepadElement.appendChild(faceButtons);
  }

  get element() {
    return this._virtualGamepadElement;
  }

  showVirtualGamepad() {
    if (this._gameManifest.metadata.input.virtualGamepad === 'none') return;
    if (!this._virtualGamepadElement.hidden) return;

    this._virtualGamepadElement.hidden = false;
  }

  hideVirtualGamepad() {
    if (this._gameManifest.metadata.input.virtualGamepad === 'none') return;
    if (this._virtualGamepadElement.hidden) return;

    this._virtualGamepadElement.hidden = true;
    this._virtualPointerKeys.clear();
    this._virtualDpadPointerIds.clear();
  }

  private _pressVirtualButton(event: PointerEvent, key: ManagedKey) {
    if (this._gameManifest.metadata.input.virtualGamepad === 'none') return;

    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture && !target.hasPointerCapture(event.pointerId)) {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic browser tests and some touch stacks may not expose an active pointer capture target.
      }
    }
    this.showVirtualGamepad();
    this._virtualPointerKeys.set(event.pointerId, key);
    this._keyManager.setVirtualKey(key, true);
  }

  private _pressVirtualDpad(event: PointerEvent) {
    if (this._gameManifest.metadata.input.virtualGamepad === 'none') return;

    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture && !target.hasPointerCapture(event.pointerId)) {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic browser tests and some touch stacks may not expose an active pointer capture target.
      }
    }
    this.showVirtualGamepad();
    this._virtualDpadPointerIds.add(event.pointerId);
    this._updateVirtualDpadDirection(event);
  }

  private _moveVirtualDpad(event: PointerEvent) {
    if (!this._virtualDpadPointerIds.has(event.pointerId)) return;

    event.preventDefault();
    this._updateVirtualDpadDirection(event);
  }

  private _releaseVirtualDpad(event: PointerEvent) {
    if (!this._virtualDpadPointerIds.has(event.pointerId)) return;

    this._virtualDpadPointerIds.delete(event.pointerId);
    this._releaseVirtualButton(event);
  }

  private _releaseVirtualButton(event: PointerEvent) {
    const key = this._virtualPointerKeys.get(event.pointerId);
    if (!key) return;

    event.preventDefault();
    this._virtualPointerKeys.delete(event.pointerId);
    this._keyManager.setVirtualKey(key, false);
  }

  private _updateVirtualDpadDirection(event: PointerEvent) {
    const direction = this._resolveVirtualDpadDirection(event);
    const previousKey = this._virtualPointerKeys.get(event.pointerId);

    if (previousKey === direction) return;
    if (previousKey) this._keyManager.setVirtualKey(previousKey, false);

    if (direction) {
      this._virtualPointerKeys.set(event.pointerId, direction);
      this._keyManager.setVirtualKey(direction, true);
    } else {
      this._virtualPointerKeys.delete(event.pointerId);
    }
  }

  private _resolveVirtualDpadDirection(event: PointerEvent): DpadKey | null {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const deadZone = Math.min(rect.width, rect.height) * 0.16;

    if (Math.hypot(dx, dy) < deadZone) return null;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'RIGHT' : 'LEFT';
    return dy > 0 ? 'DOWN' : 'UP';
  }
}

const isVirtualGamepadShoulder = (button: VirtualGamepadButton) => {
  return button.className.includes('__shoulder');
};
