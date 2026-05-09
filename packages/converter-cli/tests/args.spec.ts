import { describe, expect, test } from 'vitest';
import { CliUsageError, parseArgs } from '../src/args';

describe('parseArgs', () => {
  test('parses conversion options', () => {
    expect(
      parseArgs([
        './Game',
        '--out',
        './dist',
        '--game-id=com.example.game',
        '--title',
        'Example',
        '--screen',
        '640x480',
        '--virtual-gamepad',
        'normal',
        '--pack-assets',
        '--exclude-source',
        'Save*.rvdata2',
        '--exclude-source',
        'Profile/**',
        '--omit-unused-assets',
        '--keep',
        'Graphics/Pictures/**',
        '--keep',
        'Audio/SE/Decision',
        '--game-dir',
        'play',
        '--template-dir',
        './template',
        '--inject-html',
        './analytics.html',
        '--inject-html',
        './embed.html',
        '--clean',
        '--fail-on-warning',
      ]),
    ).toEqual({
      kind: 'options',
      options: {
        srcDir: './Game',
        outDir: './dist',
        gameId: 'com.example.game',
        title: 'Example',
        screen: {
          width: 640,
          height: 480,
        },
        virtualGamepad: 'normal',
        packAssets: true,
        excludeSourceFiles: {
          patterns: ['Save*.rvdata2', 'Profile/**'],
        },
        omitUnusedAssets: {
          keepPatterns: ['Graphics/Pictures/**', 'Audio/SE/Decision'],
        },
        gameDirName: 'play',
        includeTemplate: true,
        templateDir: './template',
        injectHtmlFiles: ['./analytics.html', './embed.html'],
        dryRun: false,
        json: false,
        clean: true,
        failOnWarning: true,
      },
    });
  });

  test('rejects missing output directory', () => {
    expect(() => parseArgs(['./Game'])).toThrow(CliUsageError);
  });

  test('rejects missing game id', () => {
    expect(() => parseArgs(['./Game', '--out', './dist'])).toThrow('--game-id is required');
  });

  test('parses the short output option', () => {
    expect(parseArgs(['./Game', '-o', './dist', '--game-id', 'com.example.game'])).toMatchObject({
      kind: 'options',
      options: {
        srcDir: './Game',
        outDir: './dist',
        gameId: 'com.example.game',
        virtualGamepad: 'normal',
        packAssets: false,
        includeTemplate: true,
      },
    });
  });

  test('parses source directories that start with a dash after option terminator', () => {
    expect(parseArgs(['--out', './dist', '--game-id', 'com.example.game', '--', '-Game'])).toMatchObject({
      kind: 'options',
      options: {
        srcDir: '-Game',
        outDir: './dist',
        gameId: 'com.example.game',
      },
    });
  });

  test('rejects clean dry runs', () => {
    expect(() =>
      parseArgs(['./Game', '--out', './dist', '--game-id', 'com.example.game', '--dry-run', '--clean']),
    ).toThrow('--clean cannot be used with --dry-run');
  });

  test('rejects keep patterns without unused asset omission', () => {
    expect(() =>
      parseArgs(['./Game', '--out', './dist', '--game-id', 'com.example.game', '--keep', 'Graphics/Pictures/**']),
    ).toThrow('--keep requires --omit-unused-assets');
  });

  test('parses no-template conversion', () => {
    expect(parseArgs(['./Game', '--out', './dist', '--game-id', 'com.example.game', '--no-template'])).toMatchObject({
      kind: 'options',
      options: {
        includeTemplate: false,
      },
    });
  });

  test('rejects distribution-only options with no-template conversion', () => {
    expect(() =>
      parseArgs(['./Game', '--out', './dist', '--game-id', 'com.example.game', '--no-template', '--game-dir', 'play']),
    ).toThrow('--game-dir cannot be used with --no-template');
    expect(() =>
      parseArgs([
        './Game',
        '--out',
        './dist',
        '--game-id',
        'com.example.game',
        '--no-template',
        '--template-dir',
        './template',
      ]),
    ).toThrow('--template-dir cannot be used with --no-template');
    expect(() =>
      parseArgs([
        './Game',
        '--out',
        './dist',
        '--game-id',
        'com.example.game',
        '--no-template',
        '--inject-html',
        './analytics.html',
      ]),
    ).toThrow('--inject-html cannot be used with --no-template');
  });
});
