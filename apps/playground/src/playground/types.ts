import type { GameManifestJson } from '@rutan/rpgmaker-vxace-web-game-manifest';

export type PlaygroundFileEntry = {
  path: string;
  file: File;
};

export type PreparedPlaygroundGame = {
  id: string;
  title: string;
  manifest: GameManifestJson;
  files: PlaygroundFileEntry[];
  warnings: string[];
};

export type PlaygroundStatus = 'idle' | 'reading' | 'running' | 'error';
