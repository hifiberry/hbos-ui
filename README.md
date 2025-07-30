# HiFiBerryOS WebUI

A modern Vue 3 web interface for HiFiBerryOS, providing an intuitive way to control and configure your HiFiBerry audio system.

## Overview

This project is a complete rewrite of the HiFiBerryOS web interface using modern web technologies:

- **Vue 3** with Composition API for reactive user interfaces
- **TypeScript** for type safety and better development experience  
- **Vite** for fast development and optimized production builds
- **SCSS** with a comprehensive design system and component mixins

## Features

### Music Control & Playback

- Browse music library with artist, album, and track views
- Full playback controls (play, pause, skip, shuffle, repeat)
- Real-time now-playing interface with album artwork
- **Interactive lyrics display** with real-time synchronization
- **Metadata tooltip** showing detailed song information on cover art hover
- Queue management and playlist functionality

### System Configuration

- Audio device and HAT configuration
- Network and wireless setup
- System information and diagnostics
- Service management and status monitoring

### Modern UI/UX

- Responsive design for desktop and mobile devices
- Dark/light mode theming
- Consistent component library with reusable mixins
- Smooth animations and transitions

## Quick Start

### Development

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build

```sh
# Build for production
npm run build
```

For detailed setup instructions, see the [Development Setup Guide](./docs/setup.md).

## Architecture

The project follows Vue 3 best practices with:

- **Composition API** for logic organization
- **TypeScript** throughout for type safety
- **Pinia** for state management
- **Vue Router** for navigation
- **Component-based architecture** with reusable design system

## Documentation

Technical documentation is available in the [`docs/`](./docs/) directory:

- **[Development Setup](./docs/setup.md)** - Environment setup and build instructions
- **[Button System](./docs/button-system.md)** - Component styling system and mixins
- **[Development Roadmap](./docs/development.md)** - Project phases and features  
- **[Known Issues](./docs/fixes-needed.md)** - Current fixes needed

For a complete overview, see the [documentation index](./docs/README.md).

## Contributing

Please review the documentation before contributing:

1. Follow the [Development Setup](./docs/setup.md) guide
2. Check [Known Issues](./docs/fixes-needed.md) for current limitations
3. Use the established [Button System](./docs/button-system.md) for UI components
4. Run `npm run lint` before submitting changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This project is part of the HiFiBerryOS ecosystem.
