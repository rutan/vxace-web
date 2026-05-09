import { extname as posixExtname } from 'node:path/posix';
import { ResourceType } from '@rutan/rpgmaker-vxace-web-game-manifest';
import { toPosix } from './utils';

export const IMAGE_EXTENSIONS = new Set(['.png', '.bmp', '.jpg', '.jpeg']);
export const AUDIO_EXTENSIONS = new Set(['.ogg', '.mp3', '.wav', '.m4a', '.wma', '.mid', '.midi']);
export const MOVIE_EXTENSIONS = new Set(['.mp4', '.webm', '.ogv', '.avi']);
export const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2']);

export const EXTENSION_PRIORITY: Partial<Record<ResourceType, string[]>> = {
  image: ['png', 'bmp', 'jpg', 'jpeg'],
  audio: ['ogg', 'm4a', 'mp3', 'wav', 'wma', 'mid', 'midi'],
  movie: ['mp4', 'webm', 'ogv', 'avi'],
  font: ['ttf', 'otf', 'woff2', 'woff'],
};

export const detectResourceType = (relativePath: string): ResourceType => {
  const normalized = toPosix(relativePath);
  const extension = posixExtname(normalized).toLowerCase();

  if (normalized.startsWith('Graphics/') && IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (normalized.startsWith('Audio/') && AUDIO_EXTENSIONS.has(extension)) return 'audio';
  if (normalized.startsWith('Movies/') && MOVIE_EXTENSIONS.has(extension)) return 'movie';
  if (normalized.startsWith('Fonts/') && FONT_EXTENSIONS.has(extension)) return 'font';
  if (normalized.startsWith('Data/') && extension === '.rvdata2') return 'data';

  return 'file';
};
