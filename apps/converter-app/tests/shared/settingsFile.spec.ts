import { describe, expect, test } from 'vitest';
import {
  appErrorCodes,
  createInitialDraft,
  createSettingsFile,
  parseSettingsFile,
  SETTINGS_FILE_TYPE,
} from '../../src/shared';

describe('settingsFile', () => {
  test('roundtrips editable draft values', () => {
    const draft = {
      ...createInitialDraft(),
      srcDir: ' /tmp/source ',
      outDir: '',
      title: '',
      gameId: '',
      screen: {
        width: 1,
        height: 416,
      },
    };

    expect(parseSettingsFile(createSettingsFile(draft))).toEqual(draft);
  });

  test('rejects invalid settings files', () => {
    expect(() => parseSettingsFile({ type: 'unknown', version: 1, draft: createInitialDraft() })).toThrow(
      appErrorCodes.settingsFileInvalid,
    );
  });

  test('rejects unsupported settings file versions', () => {
    expect(() =>
      parseSettingsFile({
        type: SETTINGS_FILE_TYPE,
        version: 999,
        draft: createInitialDraft(),
      }),
    ).toThrow(appErrorCodes.settingsFileUnsupportedVersion);
  });

  test('fills new draft fields when reading older settings files', () => {
    const oldDraft: Record<string, unknown> = { ...createInitialDraft() };
    delete oldDraft['useExcludeSourceFiles'];
    delete oldDraft['excludeSourceFilePatterns'];
    delete oldDraft['useInjectHtml'];
    delete oldDraft['injectHtmlFilePaths'];

    expect(
      parseSettingsFile({
        type: SETTINGS_FILE_TYPE,
        version: 1,
        draft: oldDraft,
      }),
    ).toMatchObject({
      useExcludeSourceFiles: false,
      excludeSourceFilePatterns: ['Save*.rvdata2'],
      useInjectHtml: false,
      injectHtmlFilePaths: [],
    });
  });
});
