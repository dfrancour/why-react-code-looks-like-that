# Changelog

All notable changes to "Why React Code Looks Like That" will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-30

### Added

- Initial release
- Toggle command to highlight TSX/JSX code by origin layer
- Four-layer classification: JavaScript, TypeScript, JSX, and React
- Color-coded syntax highlighting using VS Code text decorations
- Legend panel in Explorer sidebar with Turn Off and About buttons
- Customizable colors via VS Code settings
- Support for `.tsx` and `.jsx` files

### Classification Features

- JavaScript: variables, functions, classes, control flow, imports/exports, comments
- TypeScript: type annotations, interfaces, type aliases, generics, enums, `as`/`satisfies` expressions
- JSX: tags, attributes, fragments, expressions, spread attributes
- React: hooks (`useState`, `useEffect`, etc.), `key`/`ref` props, React types (`FC`, `ReactNode`, etc.), utility functions (`memo`, `forwardRef`, etc.)
