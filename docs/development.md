# Development

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server (no backend, localhost only) |
| `npm run dev-expose` | Start dev server, accessible on local network |
| `npm run dev-server` | Start dev server proxying to a real HiFiBerry device |
| `npm run dev-server-expose` | Same, but accessible on local network |
| `npm run lint` | Run ESLint and auto-fix issues |
| `npm run format` | Run Prettier on `src/` |
| `npm run type-check` | Run `vue-tsc` type checking |
| `npm run build` | Type-check + production build |
| `npm run build-only` | Production build without type-check |
| `npm run preview` | Preview the production build locally |

## Code style

### Casing conventions

| Context | Convention |
|---------|-----------|
| Global constants | `UPPER_CASE_SNAKE_CASE` |
| Functions | `camelCase` |
| Types and interfaces | `PascalCase` |
| CSS classes | `kebab-case` |
| Vue component files | `PascalCase.vue` |

### Component structure

Follow this order inside `<script setup lang="ts">`:

```typescript
<script setup lang="ts">
  /* IMPORTS */
  /* PROPS */
  /* GLOBAL DEFINITIONS */
  /* FUNCTIONS */
</script>
```

### Separation of concerns

- Each function should do one thing
- Split functions that serve two purposes
- Merge functions that do the same thing

### TypeScript

- Document public functions and complex logic with [JSDoc](https://jsdoc.app/)
- Use types from `src/types/` for shared interfaces
- Run `npm run type-check` before committing

### Console logs

Prefix console logs with the filename so they're easy to trace:

```typescript
console.log("component-name: Something happened")
console.error("api/player: Failed to fetch player state", error)
```

### SCSS

- Use existing SCSS mixins and variables rather than hardcoding values
- Variables and mixins are auto-imported — no manual `@use` needed in components
- Use `@include button-primary-md` and similar mixins for buttons (see [Button System](./button-system.md))
- New design tokens belong in `src/assets/scss/variables/`

## Debugging

### Debug scripts

The `debug/` directory contains shell scripts for diagnosing common issues:

```bash
chmod +x debug/*.sh

# Test API endpoint connectivity
./debug/debug-api-urls.sh

# Debug nginx configuration on the device
./debug/debug-nginx.sh
```

### Vue DevTools

The dev server runs with [vite-plugin-vue-devtools](https://devtools.vuejs.org/) enabled. Open the DevTools panel in your browser to inspect component state, Pinia stores, router history, and performance.

### Browser console

API functions log errors with the pattern `"filename: message"`. Filter the console by a filename prefix to isolate issues from a specific module.

## Adding a new view

1. Create a new `.vue` file in the appropriate `src/views/` subfolder
2. Add a route entry in `src/router/index.ts`
3. Add a navigation link in `src/components/Sidebar.vue` if it needs to appear in the sidebar

## Adding a new API function

1. Find the relevant file in `src/api/` (or create a new one for a new backend service)
2. Use the `appconfig` store to get the base URL:
   ```typescript
   import { useAppConfigStore } from '@/stores/appconfig'
   const configStore = useAppConfigStore()
   const baseUrl = configStore.getApiBaseUrl()
   ```
3. Follow the existing pattern: async function, `fetch`, error handling, typed return value

## Adding a new Pinia store

1. Create a file in `src/stores/` using `defineStore`
2. Register it in `src/main.ts` if it needs to initialize on app start
3. Import it directly in components with `useMyStore()`
