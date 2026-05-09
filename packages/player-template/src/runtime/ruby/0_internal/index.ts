import { default as iniFileCode } from './ini_file.rb?raw';
import { default as moduleCode } from './module.rb?raw';

export const internalCode = [moduleCode, iniFileCode].join('\n');
