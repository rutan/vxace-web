export interface ParsedPosixPath {
  dir: string;
  name: string;
  ext: string;
}

export const toPosix = (value: string) => {
  return value.replaceAll('\\', '/');
};

export const normalizeRelativePath = (value: string) => {
  return toPosix(value.normalize('NFC')).replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+/g, '/');
};

export const posixJoin = (...parts: string[]) => {
  const joined = parts
    .filter((part) => part.length > 0)
    .join('/')
    .replace(/\/+/g, '/');

  return joined.replace(/^\.\//, '');
};

export const posixBasename = (value: string) => {
  const normalized = toPosix(value).replace(/\/+$/g, '');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(index + 1) : normalized;
};

export const posixDirname = (value: string) => {
  const normalized = toPosix(value).replace(/\/+$/g, '');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(0, index) : '';
};

export const posixExtname = (value: string) => {
  const basename = posixBasename(value);
  const index = basename.lastIndexOf('.');
  if (index <= 0) return '';
  return basename.slice(index);
};

export const posixParse = (value: string): ParsedPosixPath => {
  const normalized = toPosix(value);
  const dir = posixDirname(normalized);
  const basename = posixBasename(normalized);
  const ext = posixExtname(basename);
  const name = ext ? basename.slice(0, -ext.length) : basename;

  return { dir, name, ext };
};

export const stripExtension = (relativePath: string) => {
  const parsed = posixParse(toPosix(relativePath));
  return `${parsed.dir ? `${parsed.dir}/` : ''}${parsed.name}`;
};
