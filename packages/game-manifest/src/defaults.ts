import type { ManifestMetadata } from './types';

export const DEFAULT_METADATA: ManifestMetadata = {
  title: '',
  screen: {
    width: 544,
    height: 416,
  },
  input: {
    virtualGamepad: 'none',
  },
};

export const createDefaultMetadata = (): ManifestMetadata => {
  return {
    title: DEFAULT_METADATA.title,
    screen: {
      ...DEFAULT_METADATA.screen,
    },
    input: {
      ...DEFAULT_METADATA.input,
    },
  };
};
