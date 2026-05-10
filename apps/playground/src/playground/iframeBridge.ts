import type { PreparedPlaygroundGame } from './types';

const READY_MESSAGE = 'vxace-playground-ready';
const CONFIG_MESSAGE = 'vxace-playground-config';

export function sendGameToIframe(iframe: HTMLIFrameElement, game: PreparedPlaygroundGame) {
  const targetWindow = iframe.contentWindow;
  if (!targetWindow) return;

  targetWindow.postMessage(
    {
      type: CONFIG_MESSAGE,
      payload: {
        manifest: game.manifest,
        files: game.files,
      },
    },
    window.location.origin,
  );
}

export function isPlaygroundReadyMessage(event: MessageEvent) {
  return event.origin === window.location.origin && event.data?.type === READY_MESSAGE;
}

export const PLAYER_TEMPLATE_URL = `${import.meta.env.BASE_URL}template/index.html?playground=1`;
