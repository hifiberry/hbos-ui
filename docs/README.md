# Documentation

This directory contains technical documentation for the HiFiBerryOS WebUI project.

## Architecture

This project is built on [VueJS][1]. [VueJS][1] provides a way to seperate
different components, thus creating [separation of concerns][2]. Using this
framework also improves the reusability of code.

The project also uses the [pinia store][4] for local storage synchronization.

### Folder overview
- `.vscode`: Recommended [VSCode][3] extensions
- `debian`: Debian packaging files
- `debug`: Scripts to help debugging the project
- `docs`: Project documentation
- `public`: Assets, such as fonts, images or the favicon
- `src`: Code of the project
- `src/api`: API abstraction layers
- `src/assets`: SCSS stuff
- `src/components`: Components that are used throughout the website
- `src/composables`: Reuse logic using vue's Composition API
- `src/helpers`: Useful helpers functions
- `src/layouts`: Available layouts for vuejs
- `src/router`: Router definitions. Those file/s in here define what to show when going to what url
- `src/services`: Functions and types that connect with external services
- `src/stores`: [Pinia][4] stores
- `src/types`: Types that are used throughout the project
- `src/utils`: Utility function definitions
- `src/views`: The different ui views

## Available Documentation

- **[Button System](./button-system.md)** - Comprehensive guide to the button mixin system, including usage examples and best practices
- **[Known Issues & Fixes](./fixes-needed.md)** - Current issues, fixes needed, and technical notes
- **[Missing Icons](./missing-icons.md)** - Icons that are currently missing

## Contributing

When adding new components or systems, please:

1. Document any new mixins or utilities in the appropriate files
2. Include usage examples and best practices
3. Update this index file with new documentation links

[1]: https://vuejs.org
[2]: https://en.wikipedia.org/wiki/Separation_of_concerns
[3]: https://code.visualstudio.com/download
[4]: https://pinia.vuejs.org
