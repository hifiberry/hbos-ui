# Contributing to HBOS-UI
This document describes the process of contributing
to the *HBOS-UI* project.

## Setup
### Prerequisites
To start contributing, some knowledge of the following
technologies is required:
- [nodejs](https://nodejs.org/en)
- [typescript](https://www.typescriptlang.org/)
- [vuejs](https://vuejs.org/)
- [jsdoc](https://jsdoc.app/)

### Project setup
1. Install [nodejs](https://nodejs.org/en)
2. Clone repository: `git clone https://github.com/hifiberry/hbos-ui.git`
3. Install packages: `cd hbos-ui && npm install`
4. Start dev-server: `npm run dev`

### Connect with backend
To connect the *HBOS-UI* dev server with a backend (most likely an RPi),
use the `vite.config.dev-server.ts`. In there, you will need to configure
the backend's ip-address. A sample of this file is [available](https://github.com/hifiberry/hbos-ui/blob/dev/vite.config.dev-server.ts.sample).
To start the frontend using this `vite.config.dev-server.ts` use:
```bash
npm run dev-server
```


## Code guidelines
Please follow the code guidelines described in this section.
This is to improve readability and avoid poorly written code.

### Casing
- Global variables: `UPPER_CASE_SNAKE_CASE`
- Functions: `camelCase`
- Types: `PascalCase`
- CSS Classes: `kebab-case`

### Separation of concerns
A function should only have one purpose. If two functions serve
one purpose, make one function out of it. If one function serves
two purpuses, split them into two seperate functions.

### Code documentation
Document your typescript code using [jsdoc](https://jsdoc.app/).
This will help code readability and maintainability.

### Console logs
While developing, you might want to use console logs to debug
this website. To make the console log output better readable
create console logs like this:
```typescript
console.log("<filename>: <Console log message>");
console.log("example-file: Some example log message");
```
With this, log messages can be easily traceable and thus
its easier to see where an error/log happened.


## Build for production
In this section, the process of building this repository
for a production environment is described.

### Linting
Before building for production, always first run the linter.
The *linter* will analyze the code statically and display any
errors that he can find. This is done to prevent further issues
and to find issues that might be overlooked otherwise.
```bash
npm run lint
```

### Type checking
Since TypeScript has a typing system, this should also be taken
into account while developing. Use the [vue-tsc](https://www.npmjs.com/package/vue-tsc)
to check if your types are correct:

```bash
npm run type-check
```

### Building
To build this project, use the following command:
```bash
npm run build
```
This command performs type-checking, compilation and minification
for production deployment.
