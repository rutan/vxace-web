# Agents.md

## About this project

A development project for a compatible runtime that allows RPG Maker VXAce to run in a web browser.
As a general rule, the project aims to run games in the browser while maintaining compatibility without modifying the guest code.

## Applications and packages

- [game-manifest](./packages/game-manifest): A package that defines the manifest specification for game resources and provides utilities for generating and validating manifests.
- [player-template](./packages/player-template): A template for the web player that runs RPG Maker VXAce games. It includes a runtime of the web player.
- [converter-core](./packages/converter-core): A package that provides the core logic for converting RPG Maker VXAce games into a format suitable for web deployment, including resource packaging and manifest generation.
- [converter-cli](./packages/converter-cli): A command-line interface for the converter that allows users to convert their RPG Maker VXAce games using the converter-core package.
- [converter-app](./apps/converter-app): A desktop application that provides a user-friendly interface for converting RPG Maker VXAce games using the converter-core package.
- [playground](./apps/playground): A web application for demonstrating the player template.

## Commands

```
# Building the project (with turborepo)
$ pnpm run build

# Linting code
$ pnpm run lint

# Running tests
$ pnpm run test

# Formatting code (after editing)
$ pnpm run format
```

## `examples/` directory

The `examples/` directory contains game projects for verification purposes. If developers wish to use their own games for verification, they can prefix them with `p-` (e.g., `examples/p-*`) to exclude them from git tracking. However, please do not reference any projects with the `p-` prefix from the test code.
