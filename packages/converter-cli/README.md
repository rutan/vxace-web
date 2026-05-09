# @rutan/rpgmaker-vxace-web-converter-cli

Command-line converter for RPG Maker VX Ace Web.

## Overview

This package provides the `vxace-web-convert` command for converting RPG Maker
VX Ace games into browser-ready distributions.

The converter reads a VX Ace game directory, generates a game manifest, rewrites
runtime resource paths for browser delivery, and optionally copies the bundled
player template into the output directory.

## Installation

```bash
npm install -g @rutan/rpgmaker-vxace-web-converter-cli
```

## Usage

```bash
vxace-web-convert <srcDir> --out <outDir> --game-id <id> [options]
```

`<srcDir>` must be an RPG Maker VX Ace game directory that contains `Game.ini`.
The output directory must be separate from the source directory.

## Options

### Required Options

- `<srcDir>`
  - Source RPG Maker VX Ace game directory.
  - This can be a VX Ace project directory or a deployed game directory.
- `--out <path>`
  - Output directory for the converted distribution.
  - The directory must not be the same as the source directory, inside the
    source directory, or a parent of the source directory.
- `--game-id <id>`
  - Stable game identifier used by the runtime.
  - Use a unique value such as `author-name:game-name` or `com.example.game`.
  - This ID is used as the browser save data namespace. **Changing it after
    release will make existing browser saves invisible to the runtime.**

### Game Metadata Options

- `--title <title>`
  - Game title written to the manifest.
  - Defaults to the `Title` value in `Game.ini`.
- `--screen <width>x<height>`
  - Runtime screen size.
  - Format: `544x416`.
  - Defaults to `544x416`.
- `--virtual-gamepad <mode>`
  - Virtual gamepad mode for touch devices.
  - Supported modes:
    - `normal`: Direction pad, four face buttons, and L / R buttons.
    - `normal-swap`: Same layout as `normal`, but swaps the confirm and cancel
      button positions.
    - `simple`: Direction pad and two face buttons.
    - `none`: Disable the virtual gamepad.
  - Defaults to `normal`.

### Output Layout Options

- `--template-dir <dir>`
  - Use a custom player template directory instead of the bundled template.
- `--inject-html <file>`
  - Read an HTML file and inject it into player template `index.html` at
    `<!-- USER-SCRIPT -->`.
  - Repeatable.
  - Cannot be used with `--no-template`.
- `--game-dir <name>`
  - Directory name for converted game files when the player template is
    included.
  - Defaults to `game`.
  - Cannot be used with `--no-template`.
- `--no-template`
  - Do not copy the player template.
  - Converted game files are written directly into `--out`.
  - Cannot be used with `--template-dir` or `--game-dir`.

### Asset Handling Options

- `--pack-assets`
  - Write image, data, and other bundled file resources into pack files.
  - `Game.ini`, `manifest.json`, audio files, and font files are not packed.
  - This is a packaging format for distribution convenience. It is not a strong
    copy-protection mechanism.
- `--exclude-source <pattern>`
  - Exclude matching source files before manifest generation, asset packing,
    copying, and unused asset analysis.
  - Matches source-relative paths case-insensitively.
  - Supports `*`, `**`, and `?`.
  - Repeatable.
  - Example: `--exclude-source "Save*.rvdata2"`.
  - Quote patterns to prevent shell expansion.

### Optimization Options

- `--omit-unused-assets`
  - Omit image, audio, and movie resources that are statically detected as
    unused.
  - **This analysis is conservative but not complete. Resources referenced only
    from Ruby scripts, generated strings, plugins, or custom loading logic may
    not be detected.**
  - Test the converted game carefully when using this option.
- `--keep <pattern>`
  - Keep matching assets even when `--omit-unused-assets` is enabled.
  - Supports wildcard patterns.
  - Repeatable.
  - Example: `--keep "Audio/SE/*"`.
  - This only applies to unused asset omission. It does not restore files
    excluded by `--exclude-source`.

Source file exclusion is applied before unused asset omission:

```txt
built-in exclusions
-> --exclude-source
-> --omit-unused-assets / --keep
-> manifest / pack / copy
```

### Validation and Automation

- `--dry-run`
  - Validate and report without writing files.
- `--json`
  - Print a machine-readable JSON report to stdout.
- `--clean`
  - Remove `--out` before conversion if it already contains files.
  - Use this when intentionally replacing an existing output directory.
- `--fail-on-warning`
  - Exit with status code `2` when conversion warnings are produced.

## Examples

```bash
# Basic conversion with required options
vxace-web-convert ./my-vxace-game \
  --out ./dist/my-web-game \
  --game-id author-name:game-name

# Replace an existing output directory
vxace-web-convert ./my-vxace-game \
  --out ./dist/my-web-game \
  --game-id author-name:game-name \
  --clean

# Generate packed assets
vxace-web-convert ./my-vxace-game \
  --out ./dist/my-web-game \
  --game-id author-name:game-name \
  --pack-assets

# Omit unused assets while keeping script-loaded sound effects
vxace-web-convert ./my-vxace-game \
  --out ./dist/my-web-game \
  --game-id author-name:game-name \
  --omit-unused-assets \
  --keep "Audio/SE/*"

# Exclude local save files from the distribution
vxace-web-convert ./my-vxace-game \
  --out ./dist/my-web-game \
  --game-id author-name:game-name \
  --exclude-source "Save*.rvdata2"

# Validate conversion in CI
vxace-web-convert ./my-vxace-game \
  --out ./dist/my-web-game \
  --game-id author-name:game-name \
  --dry-run \
  --json \
  --fail-on-warning
```

## License

MIT License.
