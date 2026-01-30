# AGENTS.md

This file provides guidance to for working with code in this repository.

## Project Overview

VS Code extension that visualizes which parts of TSX/JSX code originate from JavaScript, TypeScript, JSX, or React. It color-codes syntax by origin layer to help developers understand the layered nature of modern React development.

## Commands

```bash
pnpm install              # Install dependencies
pnpm run compile          # Compile TypeScript to JavaScript (outputs to /out)
pnpm run watch           # Watch and recompile on changes
pnpm run lint            # Lint with ESLint
```

**Important:** Always run `pnpm run compile` after completing any code changes.

## Architecture

The extension lives in `src/` and consists of five source files:

- **extension.ts** - Activation, command registration (`why-react-code-looks-like-that.toggle`), event handling. Activates on `onLanguage:typescriptreact` and `onLanguage:javascriptreact`.
- **classifier.ts** - Core engine (~750 lines). Uses TypeScript Compiler API to parse TSX/JSX and classify AST nodes by origin.
- **decorator.ts** - Creates VS Code TextEditorDecorationType objects and applies decorations to editor.
- **config.ts** - Reads color customization from VS Code settings with fallback defaults.
- **types.ts** - Type definitions: `OriginType`, `ClassifiedRegion`, `LayerColors`.

## How It Works

The classifier uses the TypeScript Compiler API to parse TSX/JSX into an AST, then walks the tree classifying nodes by `SyntaxKind`. Overlapping regions are resolved by priority: React > TypeScript > JSX > JavaScript. The result is a flat list of non-overlapping regions rendered as VS Code text decorations.
