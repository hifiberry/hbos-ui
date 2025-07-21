#!/bin/bash

# Build script for hifiberry-webui package
# Complete build process including Vue.js build and Debian package creation

set -e

# Change to the script's directory
cd "$(dirname "$0")"

# Define variables
PACKAGE="hifiberry-webui"
MYDIR="$(pwd)"

# Check for command line options
NO_LINTIAN=false
CLEAN_ONLY=false
for arg in "$@"; do
    case $arg in
        --clean)
            echo "Cleaning build artifacts..."
            rm -rf node_modules dist debian/webui-dist
            rm -f ../*.build ../*.changes ../*.dsc ../*.tar.xz ../*.buildinfo
            echo "Clean completed"
            exit 0
            ;;
        --no-lintian)
            NO_LINTIAN=true
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --clean        Clean build artifacts and exit"
            echo "  --no-lintian   Skip lintian checks during sbuild"
            echo "  --help         Show this help message"
            exit 0
            ;;
    esac
done

echo "Starting hifiberry-webui build process..."

# Check if we're in the right directory (hbos-ui project root)
if [ ! -f "package.json" ] || [ ! -f "vite.config.ts" ]; then
    echo "Error: Not in hbos-ui project directory" >&2
    exit 1
fi

# Extract version from debian/changelog
VERSION=$(head -1 debian/changelog | sed 's/.*(\([^)]*\)).*/\1/')
echo "Building version: $VERSION"

# Step 1: Build the Vue.js application using Docker
echo "Building Vue.js application with Docker..."
# Ensure dist directory exists and has correct permissions
mkdir -p dist
docker build -f debian/Dockerfile -t hifiberry-webui-builder .
# Run Docker as current user to avoid root-owned files
docker run --rm --user "$(id -u):$(id -g)" -v "$(pwd)/dist:/output" hifiberry-webui-builder sh -c "cp -r /app/dist/* /output/"
# Verify the build was successful
if [ ! -f "dist/index.html" ]; then
    echo "Error: Vue.js build failed - index.html not found in dist/" >&2
    exit 1
fi
ls -la dist/
echo "Vue.js build completed successfully"

# Step 2: Copy built files to debian directory so they're included in the source package
echo "Preparing built files for sbuild..."
mkdir -p debian/webui-dist
cp -r dist/* debian/webui-dist/
echo "Built files copied to debian/webui-dist/"

# Step 3: Build the Debian package using sbuild
echo "Building Debian package with sbuild..."
if [[ "$NO_LINTIAN" == true ]]; then
    sbuild -d stable --chroot-mode=unshare --no-run-lintian
else
    sbuild -d stable --chroot-mode=unshare
fi

# The package will be built in the parent directory automatically by sbuild

# Step 4: Clean up build artifacts
echo "Cleaning up build artifacts..."
cd ..
rm -f *.build *.changes *.dsc *.tar.xz *.buildinfo
echo "Build artifacts cleaned up"

echo "Package built successfully"
echo "Built packages:"
ls -la *.deb 2>/dev/null || echo "No packages found"
