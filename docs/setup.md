# Development Setup

This guide covers the development environment setup and build processes for the HiFiBerryOS WebUI project.

## Prerequisites

- Node.js (latest LTS version recommended)
- npm (comes with Node.js)

## IDE Setup

### Recommended IDE

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

### Type Support for `.vue` Imports in TypeScript

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Project Setup

### Initial Installation

```sh
npm install
```

### Development Commands

#### Start Development Server

```sh
npm run dev
```

This starts the Vite development server with hot-reload for development.

#### Build for Production

```sh
npm run build
```

This command performs type-checking, compilation, and minification for production deployment.

#### Linting

```sh
npm run lint
```

Runs ESLint to check code quality and style consistency.

#### Type Checking

```sh
npm run type-check
```

Runs Vue TypeScript compiler for type checking without building.

## Configuration

### Vite Configuration

The project uses Vite as the build tool. Configuration can be customized in:

- `vite.config.ts` - Main Vite configuration
- `vite.config.dev-server.ts` - Development server specific configuration

See [Vite Configuration Reference](https://vite.dev/config/) for more details.

### TypeScript Configuration

TypeScript is configured through several config files:

- `tsconfig.json` - Base TypeScript configuration
- `tsconfig.app.json` - Application-specific TypeScript settings
- `tsconfig.node.json` - Node.js environment TypeScript settings

### ESLint Configuration

Code linting is configured in `eslint.config.ts`.

## Build Process

The build process includes:

1. **Type Checking** - Validates TypeScript types across the project
2. **Compilation** - Transforms Vue components and TypeScript to JavaScript
3. **Bundling** - Creates optimized bundles for production
4. **Minification** - Reduces file sizes for better performance
5. **Asset Processing** - Optimizes images, fonts, and other static assets

## Development Workflow

1. **Start Development Server**: `npm run dev`
2. **Make Changes**: Edit files with hot-reload feedback
3. **Check Types**: `npm run type-check` (or rely on IDE integration)
4. **Lint Code**: `npm run lint` before committing
5. **Build for Testing**: `npm run build` to verify production build works
6. **Commit Changes**: Follow project git conventions

## Troubleshooting

### Common Issues

1. **Type Check Errors**: Run `npm update` before building to fix type-check errors
2. **WebSocket Issues**: See [known issues](./fixes-needed.md#websocket) for current limitations
3. **Build Failures**: Ensure all dependencies are installed with `npm install`

### Getting Help

- Check [Known Issues](./fixes-needed.md) for documented problems
- Review [Development Roadmap](./development.md) for feature status
- See [Component Documentation](./button-system.md) for usage examples
