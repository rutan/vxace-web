# @rutan/rpgmaker-vxace-web-converter-core

Core conversion library for RPG Maker VX Ace Web.

## Overview

This package provides the library API used to convert RPG Maker VX Ace games
into browser-ready files for RPG Maker VX Ace Web.

It can generate a game manifest, rewrite resource paths for browser delivery,
copy the bundled player template, pack game resources, and optionally omit
source files or assets that are statically detected as unused.

Use this package when you want to build your own converter UI, desktop app,
deployment pipeline, or integration. If you only need a command-line tool, use
`@rutan/rpgmaker-vxace-web-converter-cli` instead.

## Installation

```bash
npm install @rutan/rpgmaker-vxace-web-converter-core
```

## Usage

### Create a Browser-Ready Distribution

`convertToDistribution` converts the game files and copies the bundled player
template into the output directory.

```ts
import { convertToDistribution } from '@rutan/rpgmaker-vxace-web-converter-core';

const result = await convertToDistribution({
  srcDir: './my-vxace-game',
  outDir: './dist/my-web-game',
  gameId: 'author-name:game-name',
  metadata: {
    title: 'My Game',
    screen: {
      width: 544,
      height: 416,
    },
    input: {
      virtualGamepad: 'normal',
    },
  },
});

for (const warning of result.warnings) {
  console.warn(`${warning.code}: ${warning.message}`);
}
```

The output directory contains the player template and converted game files. By
default, converted game files are written under `game/` inside `outDir`.

### Convert Game Files Only

`convertGame` converts only the game files. Use this when you provide your own
player template or want to manage the final output layout yourself.

```ts
import { convertGame } from '@rutan/rpgmaker-vxace-web-converter-core';

const result = await convertGame({
  srcDir: './my-vxace-game',
  outDir: './dist/my-web-game/game',
  gameId: 'author-name:game-name',
  metadata: {
    title: 'My Game',
    screen: {
      width: 544,
      height: 416,
    },
    input: {
      virtualGamepad: 'normal',
    },
  },
});
```

## API

### `convertToDistribution(options)`

Creates a complete browser-playable distribution.

Important options:

- `srcDir`: Source RPG Maker VX Ace game directory. It must contain `Game.ini`.
- `outDir`: Output directory for the browser-ready distribution.
- `gameId`: Stable game identifier used as the browser save data namespace.
- `metadata`: Manifest metadata such as title, screen size, and virtual gamepad
  mode.
- `gameDirName`: Directory name for converted game files when the player
  template is included. Defaults to `game`.
- `templateDir`: Optional custom player template directory.
- `injectHtml`: Optional HTML snippet inserted into the player template
  `index.html` at `<!-- USER-SCRIPT -->`.
- `packAssets`: Pack image, data, and file resources into pack files.
- `excludeSourceFiles`: Exclude matching source files before manifest
  generation, asset packing, copying, and unused asset analysis.
- `omitUnusedAssets`: Omit image, audio, and movie resources that are
  statically detected as unused.
- `dryRun`: Validate and report without writing files.

### `convertGame(options)`

Converts only the game files and writes them directly to `outDir`.

Use this API when the caller is responsible for copying or serving the player
template.

## Output Layout

`convertToDistribution` writes the player template and the converted game files:

```txt
outDir/
  index.html
  assets/
  game/
    Game.ini
    manifest.json
    __vxace-assets/
    __vxace-packs/
```

The exact player template files may change with the player package. The
converted game directory name defaults to `game` and can be changed with
`gameDirName`.

`convertGame` writes only converted game files:

```txt
outDir/
  Game.ini
  manifest.json
  __vxace-assets/
  __vxace-packs/
```

## Asset Handling

By default, the converter writes browser-safe asset paths and records the
original VX Ace logical paths in `manifest.json`. The runtime uses the manifest
to resolve extensionless and case-insensitive asset references from guest code.

When `packAssets` is enabled, image, data, and other bundled file resources are
written into pack files. `Game.ini`, `manifest.json`, audio files, and font
files are not packed.

Packed assets are a distribution format for convenience. They are not a strong
copy-protection mechanism.

## Excluding Source Files

`excludeSourceFiles` removes matching source files from the conversion input.
This is useful for files that should never be distributed, such as local save
data or project-specific backup files.

```ts
await convertToDistribution({
  srcDir: './my-vxace-game',
  outDir: './dist/my-web-game',
  gameId: 'author-name:game-name',
  metadata: {
    title: 'My Game',
    screen: {
      width: 544,
      height: 416,
    },
    input: {
      virtualGamepad: 'normal',
    },
  },
  excludeSourceFiles: {
    patterns: ['Save*.rvdata2', 'Profile/**', '*.bak'],
  },
});
```

Use `Save*.rvdata2` to exclude standard root-level VX Ace save files. Custom
save locations are game-specific, so add patterns for those paths when needed.
Patterns are matched against source-relative paths, are case-insensitive, and
support `*`, `**`, and `?`.

`excludeSourceFiles` is applied before manifest generation, asset packing,
copying, and unused asset analysis. Files excluded here cannot be restored by
`omitUnusedAssets.keepPatterns`. Required source files such as `Game.ini` remain
included even when a pattern matches them; the conversion result reports a
warning in that case.

## Omitting Unused Assets

`omitUnusedAssets` removes image, audio, and movie resources that are statically
detected as unused.

```ts
await convertToDistribution({
  srcDir: './my-vxace-game',
  outDir: './dist/my-web-game',
  gameId: 'author-name:game-name',
  metadata: {
    title: 'My Game',
    screen: {
      width: 544,
      height: 416,
    },
    input: {
      virtualGamepad: 'normal',
    },
  },
  omitUnusedAssets: {
    keepPatterns: ['Audio/SE/*'],
  },
});
```

This analysis is conservative but not complete. Resources referenced only from
Ruby scripts, generated strings, plugins, or custom loading logic may not be
detected. Use `keepPatterns` for assets that must remain in the output, and test
the converted game carefully when enabling this option.

`keepPatterns` only applies inside unused asset omission. It can keep image,
audio, and movie resources that would otherwise be omitted as unused. It does
not apply to built-in source exclusions or `excludeSourceFiles`, and it does not
restore files that were excluded before unused asset analysis.

## Warnings and Reports

Both conversion APIs return a `ConversionReport` instead of printing to stdout
or stderr. Callers should decide whether warnings are acceptable for their
workflow.

```ts
if (result.warnings.length > 0) {
  throw new Error(`Conversion completed with ${result.warnings.length} warnings`);
}
```

The report is intended for users and automation:

- `game`: game ID, title, screen size, and input settings.
- `output`: output root, game directory, entrypoint, manifest path, asset
  directory, and pack directory.
- `files`: a conversion table showing whether each source or generated file was
  copied, renamed to a browser-safe path, packed, generated, omitted, or
  ignored.
- `packs`: generated pack files and the source files stored inside each pack,
  including offsets and lengths.
- `warnings`: structured warning codes, messages, related paths, and suggested
  actions when available.
- `stats`: counts for input, output, generated, copied, renamed, packed,
  omitted, ignored, pack, and warning records.

## License

MIT License.
