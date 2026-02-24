# Deployment

## Production build

Before building, always lint and type-check:

```bash
npm run lint
npm run type-check
npm run build
```

The `npm run build` command runs both `type-check` and the Vite build in parallel. Built files are output to `dist/`.

`npm run build-only` skips type-checking (useful when iterating quickly, but don't use it for releases).

## Debian package

The project ships as a Debian package (`hifiberry-webui`). The `build.sh` script automates the full build process:

```bash
./build.sh
```

This does the following:

1. Builds the Vue app inside a Docker container for a reproducible environment
2. Copies the built `dist/` into `debian/webui-dist/`
3. Runs `sbuild` to produce the `.deb` package

### Options

| Flag | Effect |
|------|--------|
| `--no-lintian` | Skip lintian checks during sbuild |
| `--clean` | Remove `node_modules`, `dist`, and `debian/webui-dist`, then exit |
| `--help` | Show usage |

### Requirements

- Docker (for the Vue build step)
- `sbuild` + an unshare chroot set up for Debian stable

### Version

The package version is read from `debian/changelog`. Update that file when bumping the version.

### Cross-compilation

If a `scripts/cross-compile-env.sh` script exists in the parent directory, `build.sh` sources it automatically to configure cross-compilation environment variables.

## nginx integration

After installation, the package configures nginx to serve the UI and proxy API requests to the appropriate backend services. The nginx config snippets live in `debian/package-files/etc/nginx/`.

The `configure-webui` script (`debian/package-files/usr/sbin/configure-webui`) sets up the nginx site configuration during `postinst`.
