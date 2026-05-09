import { internalCode } from './0_internal';
import { coreCode } from './1_core';
import { extensionCode } from './2_extension';
import { default as mainCode } from './main.rb?raw';

export const rubyRuntimeCode = [internalCode, coreCode, extensionCode].join('\n');
export const rubyCode = [rubyRuntimeCode, mainCode].join('\n');
