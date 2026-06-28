# @rutan/rpgmaker-vxace-web-game-manifest

Manifest schema and utilities for VX Ace Web Runtime.

## Overview

This package defines the game manifest format used by VX Ace Web Runtime and
provides helpers for parsing, validating, cloning, and resolving manifest
records.

The manifest is shared by the converter and the browser runtime. It stores game
metadata, resource lookup records, pack file metadata, and font records so the
runtime can resolve VX Ace-style asset paths in a browser environment.

## Installation

```bash
npm install @rutan/rpgmaker-vxace-web-game-manifest
```

## Usage

### Parse and Use a Manifest

`GameManifest` is the easiest API for runtime-style lookups.

```ts
import { GameManifest } from '@rutan/rpgmaker-vxace-web-game-manifest';

const response = await fetch('/game/manifest.json');
const json = await response.json();

const manifest = GameManifest.fromJson('game', json);
const title = manifest.metadata.title;
const screen = manifest.screen;

const image = manifest.resolveAsset('Graphics/Characters/Hero', 'image');
if (image) {
  console.log(image.logicalPath, image.data);
}
```

`GameManifest.fromJson()` validates the input JSON and throws a
`GameManifestJsonParseError` when the manifest is invalid.

### Safe Parsing

Use `safeParseGameManifestJson` when you want to report validation issues
without throwing.

```ts
import { safeParseGameManifestJson } from '@rutan/rpgmaker-vxace-web-game-manifest';

const result = safeParseGameManifestJson(json);
if (!result.ok) {
  for (const issue of result.error) {
    console.error(issue.message);
  }
} else {
  console.log(result.manifest.id);
}
```

### Create an Empty Manifest

`createEmptyGameManifestJson` creates a schema-valid empty manifest. Converter
tools can use this as a starting point before adding resources and fonts.

```ts
import { createEmptyGameManifestJson } from '@rutan/rpgmaker-vxace-web-game-manifest';

const manifest = createEmptyGameManifestJson('game', {
  id: 'author-name:game-name',
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

### `GameManifest`

Wrapper class for validated manifest JSON.

Important methods and properties:

- `GameManifest.fromJson(gameDir, json)`: Parse and validate unknown JSON.
- `GameManifest.fromManifestJson(gameDir, manifest)`: Wrap an already typed
  manifest object.
- `GameManifest.empty(gameDir)`: Create an empty manifest wrapper.
- `manifest.metadata`: Manifest metadata.
- `manifest.screen`: Runtime screen size.
- `manifest.fonts`: Font records.
- `manifest.packs`: Pack records.
- `manifest.toJson()`: Clone the underlying manifest JSON.
- `manifest.resolveAsset(path, expectedType)`: Resolve an image, audio, movie,
  or font asset request.
- `manifest.resolveResource(path)`: Resolve any resource request.
- `manifest.fontExists(name)`: Check whether a font family exists.
- `manifest.resolveFontFamilies(names)`: Resolve font family aliases to
  available families.
- `manifest.getPack(packId)`: Get pack metadata by pack id.

### Parsing Helpers

- `parseGameManifestJson(json)`: Parse and validate unknown JSON. Throws on
  validation errors.
- `safeParseGameManifestJson(json)`: Parse and validate unknown JSON. Returns
  `{ ok: true, manifest }` or `{ ok: false, error }`.

### Creation and Clone Helpers

- `createDefaultMetadata()`: Create default metadata.
- `createEmptyGameManifestJson(gameDir, options)`: Create an empty manifest.
- `cloneGameManifestJson(manifest)`: Deep clone a manifest object.

### Resolution Helpers

- `resolveAsset(manifest, gameDir, requestedPath, expectedType)`: Resolve an
  asset by VX Ace-style path.
- `resolveResource(manifest, gameDir, requestedPath)`: Resolve any resource by
  VX Ace-style path.
- `toPublicUrl(gameDir, relativePath)`: Build an encoded public URL for a
  manifest resource path.
- `fontExists(fonts, name)`: Check whether a font family exists.
- `resolveFontFamilies(fonts, names)`: Resolve requested font families.
- `buildFontFamilyLookup(fonts)`: Build the normalized font family lookup map.

## Path Resolution

VX Ace game scripts usually reference assets without file extensions and expect
Windows-style case-insensitive paths. The manifest lookup helpers normalize
paths so the browser runtime can reproduce that behavior.

Resolution normalizes requested paths by:

- converting backslashes to slashes
- removing leading `./` or `/`
- removing the game directory prefix when present
- normalizing Unicode to NFC
- matching lookup keys case-insensitively
- resolving extensionless requests through manifest candidates

When an extension is provided, `resolveAsset` prefers candidates with the same
extension. If no exact extension match is found, it can still fall back to the
first candidate of the expected asset type. `resolveResource` requires the
extension to match when an extension is provided.

## Manifest IDs

Manifest `id` values are used by the runtime as stable game identifiers,
including browser save data namespacing. They should be unique and should not
change between releases of the same game.

Valid IDs use this pattern:

```txt
^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$
```

Examples:

- `author-name:game-name`
- `com.example.my-game`

## License

MIT License.
