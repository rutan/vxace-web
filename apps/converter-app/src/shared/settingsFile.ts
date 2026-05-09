import * as v from 'valibot';
import { appErrorCodes, CodedAppError } from './appError';
import { createInitialDraft, draftSchema, type Draft } from './draft';

export const SETTINGS_FILE_TYPE = 'vxace-web-converter-settings';
export const SETTINGS_FILE_VERSION = 1;

export const settingsFileSchema = v.object({
  type: v.literal(SETTINGS_FILE_TYPE),
  version: v.literal(SETTINGS_FILE_VERSION),
  draft: draftSchema,
});
export type SettingsFile = v.InferOutput<typeof settingsFileSchema>;

export const createSettingsFile = (draft: Draft): SettingsFile => {
  const parsedDraft = v.safeParse(draftSchema, draft, {
    abortEarly: true,
    abortPipeEarly: true,
  });
  if (!parsedDraft.success) throw new CodedAppError(appErrorCodes.settingsFileInvalid);

  return {
    type: SETTINGS_FILE_TYPE,
    version: SETTINGS_FILE_VERSION,
    draft: parsedDraft.output,
  };
};

export const parseSettingsFile = (input: unknown): Draft => {
  if (!isRecord(input) || input['type'] !== SETTINGS_FILE_TYPE) {
    throw new CodedAppError(appErrorCodes.settingsFileInvalid);
  }

  if (input['version'] !== SETTINGS_FILE_VERSION) {
    throw new CodedAppError(appErrorCodes.settingsFileUnsupportedVersion);
  }

  const parsed = v.safeParse(settingsFileSchema, normalizeSettingsFileInput(input), {
    abortEarly: true,
    abortPipeEarly: true,
  });
  if (!parsed.success) throw new CodedAppError(appErrorCodes.settingsFileInvalid);

  return parsed.output.draft;
};

const normalizeSettingsFileInput = (input: unknown): unknown => {
  if (!isRecord(input) || !isRecord(input['draft'])) return input;

  const initialDraft = createInitialDraft();
  const draft = input['draft'];

  return {
    ...input,
    draft: {
      ...initialDraft,
      ...draft,
      screen: isRecord(draft['screen'])
        ? {
            ...initialDraft.screen,
            ...draft['screen'],
          }
        : initialDraft.screen,
    },
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};
