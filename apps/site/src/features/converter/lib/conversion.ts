import type { ConverterCopy } from '$i18n';
import type { Draft, VirtualGamepadMode } from '../model/converter';
import type { ProjectFileEntry } from './projectFiles';

export const validateDraft = (draft: Draft, files: ProjectFileEntry[], copy: ConverterCopy) => {
  if (files.length === 0) throw new Error(copy.conversion.errors.noProject);
  if (!draft.title.trim()) throw new Error(copy.gameSettings.title.required);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(draft.gameId.trim())) {
    throw new Error(copy.gameSettings.gameId.invalid);
  }
  if (!Number.isInteger(draft.screenWidth) || draft.screenWidth < 1) {
    throw new Error(copy.gameSettings.screenSize.invalidWidth);
  }
  if (!Number.isInteger(draft.screenHeight) || draft.screenHeight < 1) {
    throw new Error(copy.gameSettings.screenSize.invalidHeight);
  }
};

export const splitLines = (value: string) => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

export const createGameId = (value: string) => {
  return `web:${
    value
      .normalize('NFKD')
      .replace(/[^\dA-Za-z._:-]+/g, '-')
      .replace(/^-+/, '')
      .slice(0, 60) || 'game'
  }`;
};

export const sanitizeFilename = (value: string) => {
  const sanitized = Array.from(value, (char) => {
    return char.charCodeAt(0) <= 31 || '<>:"/\\|?*'.includes(char) ? '-' : char;
  }).join('');

  return sanitized.replace(/[. ]+$/g, '') || 'vxace-game';
};

export const formatVirtualGamepad = (value: VirtualGamepadMode, copy: ConverterCopy) => {
  return copy.gameSettings.virtualGamepad.options[value] ?? value;
};

export const formatBytes = (value: number) => {
  if (value < 1024) return `${value.toLocaleString()} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  for (const unit of units) {
    if (size < 1024 || unit === units[units.length - 1]) {
      return `${size.toLocaleString(undefined, { maximumFractionDigits: size >= 10 ? 1 : 2 })} ${unit}`;
    }
    size /= 1024;
  }
  return `${value.toLocaleString()} B`;
};

export const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};
