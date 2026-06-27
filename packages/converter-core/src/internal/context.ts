import { ConverterWarning, FileConversionRecord } from '../types';
import { ConversionOutput, ConversionRuntime, ConversionSource } from './environment';
import { PackBuilder } from './packBuilder';

export type ConversionContext = {
  source: ConversionSource;
  output: ConversionOutput | undefined;
  runtime: ConversionRuntime;
  outputRoot: string;
  dryRun: boolean;
  files: FileConversionRecord[];
  warnings: ConverterWarning[];
  safeAssetPaths: Map<string, string>;
  packBuilder: PackBuilder;
  packAssets: boolean;
  inputFileCount: number;
};
