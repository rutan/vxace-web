/// <reference types="vite/client" />

import type { ConverterApi } from '../../shared/converterApi';

declare global {
  interface Window {
    vxaceConverter?: ConverterApi;
  }
}
