import { default as audioCode } from './audio.rb?raw';
import { default as bitmapCode } from './bitmap.rb?raw';
import { default as colorCode } from './color.rb?raw';
import { default as errorsCode } from './errors.rb?raw';
import { default as fontCode } from './font.rb?raw';
import { default as graphicsCode } from './graphics.rb?raw';
import { default as inputCode } from './input.rb?raw';
import { default as kernelCode } from './kernel.rb?raw';
import { default as objectLifecycleCode } from './object_lifecycle.rb?raw';
import { default as planeCode } from './plane.rb?raw';
import { default as rectCode } from './rect.rb?raw';
import { default as rpgCode } from './rpg.rb?raw';
import { default as saveFileStorageCode } from './save_file_storage.rb?raw';
import { default as spriteCode } from './sprite.rb?raw';
import { default as tableCode } from './table.rb?raw';
import { default as tilemapCode } from './tilemap.rb?raw';
import { default as toneCode } from './tone.rb?raw';
import { default as viewportCode } from './viewport.rb?raw';
import { default as win32ApiCode } from './win32_api.rb?raw';
import { default as windowCode } from './window.rb?raw';

export const coreCode = [
  audioCode,
  bitmapCode,
  colorCode,
  errorsCode,
  fontCode,
  graphicsCode,
  inputCode,
  kernelCode,
  objectLifecycleCode,
  saveFileStorageCode,
  rectCode,
  rpgCode,
  spriteCode,
  planeCode,
  tableCode,
  tilemapCode,
  toneCode,
  viewportCode,
  windowCode,
  win32ApiCode,
].join('\n');
