

## Fix Build Error in useProjections.test.ts

The test file uses `node:test` and `node:assert/strict` which require Node.js type definitions. The `@types/node` package is already installed, but `tsconfig.app.json` (which includes `src/`) doesn't reference Node types.

### Plan

1. **Add `"types": ["node"]`** to `tsconfig.app.json` `compilerOptions` — this tells TypeScript to include Node.js type definitions for all files in `src/`, resolving the `node:test` and `node:assert/strict` imports.

Single-line change, no other files affected.

