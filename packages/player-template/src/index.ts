import { fileURLToPath } from 'node:url';

export type { SavedDataInfo, SaveStorageAdapter } from './runtime/utils/saveStorage';

export const PLAYER_TEMPLATE_DIR = fileURLToPath(new URL('./template/', import.meta.url));
export const getPlayerTemplateDir = () => PLAYER_TEMPLATE_DIR;
