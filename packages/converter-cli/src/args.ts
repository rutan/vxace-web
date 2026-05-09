import { parseArgs as parseNodeArgs, type ParseArgsConfig } from 'node:util';
import type { ExcludeSourceFilesOptions, OmitUnusedAssetsOptions } from '@rutan/rpgmaker-vxace-web-converter-core';
import { virtualGamepadMode, type VirtualGamepadMode } from '@rutan/rpgmaker-vxace-web-game-manifest';

export interface CliOptions {
  srcDir: string;
  outDir: string;
  gameId?: string;
  title?: string;
  screen?: {
    width: number;
    height: number;
  };
  virtualGamepad: VirtualGamepadMode;
  packAssets: boolean;
  excludeSourceFiles?: ExcludeSourceFilesOptions;
  omitUnusedAssets?: OmitUnusedAssetsOptions;
  gameDirName: string;
  includeTemplate: boolean;
  templateDir?: string;
  injectHtmlFiles: string[];
  dryRun: boolean;
  json: boolean;
  clean: boolean;
  failOnWarning: boolean;
}

export type ParseArgsResult =
  | {
      kind: 'options';
      options: CliOptions;
    }
  | {
      kind: 'help';
    };

const CLI_PARSE_OPTIONS = {
  out: { type: 'string', short: 'o' },
  'game-id': { type: 'string' },
  title: { type: 'string' },
  screen: { type: 'string' },
  'virtual-gamepad': { type: 'string' },
  'pack-assets': { type: 'boolean', default: false },
  'exclude-source': { type: 'string', multiple: true, default: [] },
  'omit-unused-assets': { type: 'boolean', default: false },
  keep: { type: 'string', multiple: true, default: [] },
  'game-dir': { type: 'string', default: 'game' },
  'no-template': { type: 'boolean', default: false },
  'template-dir': { type: 'string' },
  'inject-html': { type: 'string', multiple: true, default: [] },
  'dry-run': { type: 'boolean', default: false },
  json: { type: 'boolean', default: false },
  clean: { type: 'boolean', default: false },
  'fail-on-warning': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false },
} as const satisfies ParseArgsConfig['options'];

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

export const parseArgs = (argv: string[]): ParseArgsResult => {
  const { positionals, values } = parseCliArgv(argv);

  if (values.help) {
    return { kind: 'help' };
  }

  if (positionals.length !== 1) {
    throw new CliUsageError('Exactly one source directory is required');
  }
  const outDir = values.out;
  if (!outDir) {
    throw new CliUsageError('--out is required');
  }
  if (!values['game-id']) {
    throw new CliUsageError('--game-id is required');
  }
  if (values['dry-run'] && values.clean) {
    throw new CliUsageError('--clean cannot be used with --dry-run');
  }
  if (!values['omit-unused-assets'] && values.keep.length > 0) {
    throw new CliUsageError('--keep requires --omit-unused-assets');
  }
  if (values['no-template'] && values['game-dir'] !== 'game') {
    throw new CliUsageError('--game-dir cannot be used with --no-template');
  }
  if (values['no-template'] && values['template-dir']) {
    throw new CliUsageError('--template-dir cannot be used with --no-template');
  }
  if (values['no-template'] && values['inject-html'].length > 0) {
    throw new CliUsageError('--inject-html cannot be used with --no-template');
  }

  const screen = values.screen ? parseScreen(values.screen) : undefined;
  const virtualGamepad = values['virtual-gamepad']
    ? parsePicklist(values['virtual-gamepad'], virtualGamepadMode, '--virtual-gamepad')
    : 'normal';

  return {
    kind: 'options',
    options: {
      srcDir: positionals[0],
      outDir,
      gameId: values['game-id'],
      ...(values.title ? { title: values.title } : {}),
      ...(screen ? { screen } : {}),
      virtualGamepad,
      packAssets: values['pack-assets'],
      ...(values['exclude-source'].length > 0
        ? {
            excludeSourceFiles: {
              patterns: values['exclude-source'],
            },
          }
        : {}),
      ...(values['omit-unused-assets']
        ? {
            omitUnusedAssets: {
              keepPatterns: values.keep,
            },
          }
        : {}),
      gameDirName: values['game-dir'],
      includeTemplate: !values['no-template'],
      ...(values['template-dir'] ? { templateDir: values['template-dir'] } : {}),
      injectHtmlFiles: values['inject-html'],
      dryRun: values['dry-run'],
      json: values.json,
      clean: values.clean,
      failOnWarning: values['fail-on-warning'],
    },
  };
};

export const HELP_TEXT = `Usage:
  vxace-web-convert <srcDir> --out <outDir> --game-id <id> [options]

Options:
  -o, --out <dir>                  Output distribution directory
      --game-id <id>               Stable game id used for browser save data (required)
      --title <title>              Manifest title. Defaults to Game.ini Title
      --screen <width>x<height>    Screen size. Defaults to 544x416
      --virtual-gamepad <mode>     none | normal | normal-swap | simple. Defaults to normal
      --pack-assets                Pack image, data, and file resources
      --exclude-source <pattern>   Exclude matching source files before conversion. Repeatable
      --omit-unused-assets         Omit unused image, audio, and movie resources
      --keep <pattern>             Keep pattern for unused asset omission. Repeatable
      --game-dir <name>            Directory for converted game files when template is included. Defaults to game
      --no-template                Write converted game files directly to outDir
      --template-dir <dir>         Player template directory override
      --inject-html <file>         Inject HTML file into player template index.html. Repeatable
      --dry-run                    Validate and report without writing files
      --json                       Print detailed conversion report JSON
      --clean                      Remove outDir before conversion
      --fail-on-warning            Exit with code 2 when warnings are produced
  -h, --help                       Show this help
`;

const parseCliArgv = (argv: string[]) => {
  try {
    return parseNodeArgs({
      args: argv,
      options: CLI_PARSE_OPTIONS,
      allowPositionals: true,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new CliUsageError(error.message);
    }
    throw error;
  }
};

const parseScreen = (value: string): CliOptions['screen'] => {
  const match = /^([1-9][0-9]*)x([1-9][0-9]*)$/i.exec(value);
  if (!match) {
    throw new CliUsageError('--screen must be formatted like 544x416');
  }
  return {
    width: Number.parseInt(match[1], 10),
    height: Number.parseInt(match[2], 10),
  };
};

const parsePicklist = <T extends string>(value: string, allowed: readonly T[], optionName: string): T => {
  if (allowed.includes(value as T)) return value as T;
  throw new CliUsageError(`${optionName} must be one of: ${allowed.join(', ')}`);
};
