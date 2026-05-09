import { convertGameCore } from './internal/convertGameCore';
import { ConvertGameOptions, ConvertGameResult } from './types';

export const convertGame = async (options: ConvertGameOptions): Promise<ConvertGameResult> => {
  return (await convertGameCore(options)).report;
};
