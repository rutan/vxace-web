# Agents.md

## About this project

A development project for a compatible runtime that allows RPG Maker VXAce to run in a web browser.
As a general rule, the project aims to run games in the browser while maintaining compatibility without modifying the guest code.

## Documents

- [Runtime Policy](./docs/runtime-policy.md)
  - Policy for implementing the runtime
- [Browser Testing](./docs/browser-testing.md)
  - How to verify operation in the browser

## Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for demo
pnpm run build-demo

# Run unit tests
pnpm run test:unit

# Run browser tests
pnpm run test:browser

# Format code and run lint
# Always run these when making changes to the code
pnpm run format
pnpm run lint
```
