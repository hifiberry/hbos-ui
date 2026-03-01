# Contributing to HBOS-UI

## Setup

See **[Getting Started](./docs/getting-started.md)** for the full setup guide.

Short version:

```bash
git clone https://github.com/hifiberry/hbos-ui.git
cd hbos-ui && npm install
npm run dev
```

To develop against a real HiFiBerry device, copy `vite.config.dev-server.ts.sample` to `vite.config.dev-server.ts`, set your device IP, then run `npm run dev-server`.

## Prerequisites

Working knowledge of:
- [Vue 3](https://vuejs.org/) Composition API
- [TypeScript](https://www.typescriptlang.org/)
- [Pinia](https://pinia.vuejs.org/) for state management
- [JSDoc](https://jsdoc.app/) for code documentation

## Code guidelines

See **[Development](./docs/development.md)** for the full reference. Key rules:

### Component structure

```typescript
<script setup lang="ts">
  /* IMPORTS */
  /* PROPS */
  /* GLOBAL DEFINITIONS */
  /* FUNCTIONS */
</script>
```

### Naming

| Context | Convention |
|---------|-----------|
| Global constants | `UPPER_CASE_SNAKE_CASE` |
| Functions | `camelCase` |
| Types | `PascalCase` |
| CSS classes | `kebab-case` |

### Separation of concerns

Each function should have a single purpose. Split functions that do two things; merge functions that do the same thing.

### Console logs

```typescript
console.log("filename: descriptive message")
```

### TypeScript

Document public APIs with JSDoc. Run `npm run type-check` before committing.

## Before submitting

```bash
npm run lint       # auto-fixes style issues
npm run type-check # confirms TypeScript is valid
npm run build      # confirms the production build works
```

## Architecture

See **[Architecture](./docs/architecture.md)** for a technical overview of the folder structure, routing, state management, and API layer.
