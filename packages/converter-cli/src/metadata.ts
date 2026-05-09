import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { TextDecoder } from 'node:util';
import type { ManifestMetadata } from '@rutan/rpgmaker-vxace-web-game-manifest';
import type { CliOptions } from './args';

export interface ResolvedMetadata {
  gameId: string;
  metadata: ManifestMetadata;
  warnings: string[];
}

const GAME_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export const resolveMetadata = async (options: CliOptions): Promise<ResolvedMetadata> => {
  const gameTitle = await readGameIniTitle(options.srcDir);
  const title = options.title ?? gameTitle ?? path.basename(path.resolve(options.srcDir));
  if (!options.gameId) {
    throw new Error('--game-id is required');
  }
  const gameId = options.gameId;
  const warnings: string[] = [];

  if (!GAME_ID_PATTERN.test(gameId)) {
    throw new Error(`Invalid game id: ${gameId}`);
  }

  return {
    gameId,
    metadata: {
      title,
      screen: options.screen ?? {
        width: 544,
        height: 416,
      },
      input: {
        virtualGamepad: options.virtualGamepad,
      },
    },
    warnings,
  };
};

export const readGameIniTitle = async (srcDir: string): Promise<string | undefined> => {
  let contentBytes: Buffer;
  try {
    contentBytes = await fs.readFile(path.join(srcDir, 'Game.ini'));
  } catch {
    return undefined;
  }

  const content = decodeGameIni(contentBytes);
  let section = '';
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;

    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1].trim().toLowerCase();
      continue;
    }

    if (section !== 'game') continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    if (key !== 'title') continue;
    const value = line.slice(separatorIndex + 1).trim();
    return value || undefined;
  }

  return undefined;
};

const decodeGameIni = (content: Uint8Array) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(content);
  } catch {
    return new TextDecoder('shift_jis').decode(content);
  }
};
