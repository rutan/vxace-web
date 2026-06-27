export { stripExtension, toPosix } from './pathUtils';

export const clone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};
