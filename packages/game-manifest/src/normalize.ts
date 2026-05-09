export const normalizeGameDir = (value: string) => {
  return value.replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+$/, '');
};

export const normalizeRequestedPath = (value: string, gameDir: string, stripExtension = true) => {
  let normalized = value.normalize('NFC').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  const gameDirPrefix = `${gameDir.toLowerCase()}/`;
  if (normalized.toLowerCase().startsWith(gameDirPrefix)) {
    normalized = normalized.slice(gameDir.length + 1);
  }

  if (stripExtension) {
    normalized = normalized.replace(/\.[^/.]+$/, '');
  }

  return normalized;
};

export const normalizeLookupKey = (value: string) => {
  return value
    .normalize('NFC')
    .replace(/\.[^/.]+$/, '')
    .toLowerCase();
};

export const extractExtension = (value: string) => {
  const matched = value.match(/\.([^./]+)$/);
  return matched ? matched[1].toLowerCase() : '';
};

export const normalizeFontFamilyKey = (value: string) => {
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
};
