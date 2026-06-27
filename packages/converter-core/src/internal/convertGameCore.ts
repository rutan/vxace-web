import { resolve } from 'node:path';
import { ConvertGameOptions } from '../types';
import { convertGameEngine, type ConvertGameCoreResult } from './convertGameEngine';
import { createNodeOutput, createNodeSource, nodeRuntime } from './nodeEnvironment';
import { validateGameRoot, validateOutputDirectory } from './validate';

export const convertGameCore = async (options: ConvertGameOptions): Promise<ConvertGameCoreResult> => {
  const srcDir = resolve(options.srcDir);
  const outDir = resolve(options.outDir);

  validateOutputDirectory(srcDir, outDir);
  await validateGameRoot(srcDir);

  return convertGameEngine({
    ...options,
    source: createNodeSource(srcDir),
    output: createNodeOutput(outDir),
    outputRoot: outDir,
    runtime: nodeRuntime,
  });
};
