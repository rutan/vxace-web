import { sep as pathSep } from 'node:path';
import { parse as posixParse } from 'node:path/posix';

export const toPosix = (value: string) => {
  return value.replaceAll(pathSep, '/');
};

export const stripExtension = (relativePath: string) => {
  const parsed = posixParse(toPosix(relativePath));
  return `${parsed.dir ? `${parsed.dir}/` : ''}${parsed.name}`;
};

export const clone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};
