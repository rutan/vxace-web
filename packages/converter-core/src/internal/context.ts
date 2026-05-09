import { ConverterWarning, FileConversionRecord } from '../types';
import { PackBuilder } from './packBuilder';

export type ConversionContext = {
  srcDir: string;
  outDir: string;
  dryRun: boolean;
  files: FileConversionRecord[];
  warnings: ConverterWarning[];
  safeAssetPaths: Map<string, string>;
  packBuilder: PackBuilder;
  packAssets: boolean;
  inputFileCount: number;
};
