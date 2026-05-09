import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import {
  appErrorCodes,
  conversionDraftSchema,
  createInitialDraft,
  createOutputSubdirectoryName,
  draftSchema,
  getDraftOutputDirectory,
} from '../../src/shared';

describe('draftSchema', () => {
  test('allows editable empty values', () => {
    const parsed = v.safeParse(draftSchema, {
      ...createInitialDraft(),
      srcDir: '',
      outDir: '',
      title: '',
      gameId: '',
    });

    expect(parsed.success).toBe(true);
  });

  test('rejects zero screen dimensions while editing', () => {
    const parsed = v.safeParse(draftSchema, {
      ...createInitialDraft(),
      screen: {
        width: 0,
        height: 416,
      },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.issues[0].message).toBe(appErrorCodes.draftScreenInvalid);
  });
});

describe('conversionDraftSchema', () => {
  test('requires execution-ready values and normalizes strings', () => {
    const parsed = v.safeParse(conversionDraftSchema, {
      ...createInitialDraft(),
      srcDir: ' /tmp/source ',
      outDir: ' /tmp/output ',
      outputSubdirectoryName: ' Example Game ',
      title: ' Example Game ',
      gameId: ' vxace:example ',
      screen: {
        width: 544,
        height: 416,
      },
      excludeSourceFilePatterns: [' Save*.rvdata2 ', ' '],
      keepUnusedAssetsPatterns: [' Graphics/Pictures/** ', ' '],
      injectHtmlFilePaths: [' /tmp/inject.html ', ' '],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.output).toMatchObject({
      srcDir: '/tmp/source',
      outDir: '/tmp/output',
      outputSubdirectoryName: 'Example Game',
      title: 'Example Game',
      gameId: 'vxace:example',
      excludeSourceFilePatterns: ['Save*.rvdata2', ''],
      keepUnusedAssetsPatterns: ['Graphics/Pictures/**', ''],
      injectHtmlFilePaths: ['/tmp/inject.html', ''],
    });
  });

  test('rejects editable empty values when converting', () => {
    const parsed = v.safeParse(conversionDraftSchema, createInitialDraft(), {
      abortEarly: true,
      abortPipeEarly: true,
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.issues[0].message).toBe(appErrorCodes.draftSrcDirRequired);
  });
});

describe('output directory helpers', () => {
  test('creates safe default folder names from game titles', () => {
    expect(createOutputSubdirectoryName(' Example: Game / Demo ')).toBe('Example- Game - Demo');
    expect(createOutputSubdirectoryName('...')).toBe('game');
  });

  test('builds the displayed output directory from the parent folder and folder name', () => {
    expect(
      getDraftOutputDirectory({
        ...createInitialDraft(),
        outDir: '/tmp/output',
        outputSubdirectoryName: 'Example Game',
      }),
    ).toBe('/tmp/output/Example Game');
  });
});
