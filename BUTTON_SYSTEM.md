# Button System Documentation

## Overview

This project uses a comprehensive button mixin system that provides consistent styling across all components. After removing the global button reset, all buttons now use this standardized system.

## Quick Usage

### Global CSS Classes

You can use these classes directly in your HTML/templates:

```html
<!-- Primary buttons -->
<button class="btn btn-primary">Primary Button</button>
<button class="btn btn-primary btn-sm">Small Primary</button>
<button class="btn btn-primary btn-lg">Large Primary</button>

<!-- Secondary buttons -->
<button class="btn btn-secondary">Secondary Button</button>

<!-- Success/Error buttons -->
<button class="btn btn-success">Save</button>
<button class="btn btn-danger">Delete</button>

<!-- Ghost/Link buttons -->
<button class="btn btn-ghost">Ghost Button</button>
<button class="btn btn-link">Link Button</button>

<!-- Icon buttons -->
<button class="btn-icon">👤</button>
<button class="btn-icon btn-icon-sm">👤</button>
<button class="btn-icon btn-icon-lg">👤</button>
```

### SCSS Mixins (Recommended for Vue Components)

In your Vue component's `<style>` section:

```scss
<style scoped lang="scss">
@use '@/assets/scss/mixins' as *;

.my-custom-button {
  // Use predefined combinations
  @include button-primary-md;
  
  // Or build custom combinations
  @include button-base;
  @include button-success;
  @include button-sm;
  
  // Add custom styling
  border-radius: 12px;
  text-transform: uppercase;
}

.my-icon-button {
  @include button-icon(32px);
  color: var(--color-primary);
}
</style>
```

## Available Mixins

### Base Mixins

- `@include button-reset` - Removes all default browser button styling
- `@include button-base` - Provides common button foundation (includes reset)

### Size Mixins

- `@include button-sm` - Small button (28px height, 12px font)
- `@include button-md` - Medium button (36px height, 14px font)
- `@include button-lg` - Large button (44px height, 16px font)

### Variant Mixins

- `@include button-primary` - Primary brand color button
- `@include button-secondary` - Secondary/outline button
- `@include button-success` - Green success button
- `@include button-danger` - Red danger/error button
- `@include button-ghost` - Transparent button with hover
- `@include button-link` - Link-style button

### Special Mixins

- `@include button-icon($size)` - Circular icon button (default 32px)

### Complete Combinations

For quick usage, these combine base + variant + size:

- `@include button-primary-sm`
- `@include button-primary-md`
- `@include button-primary-lg`
- `@include button-secondary-sm`
- `@include button-secondary-md`
- `@include button-secondary-lg`
- `@include button-success-sm`
- `@include button-success-md`
- `@include button-danger-sm`
- `@include button-danger-md`

## Examples from the Project

### Edit Button (Icon Button)
```scss
.edit-button {
  @include button-icon(28px);
  margin-left: 8px;
  color: var(--color-body-secondary);
  
  &:hover:not(:disabled) {
    color: var(--color-primary);
  }
}
```

### Save/Cancel Buttons
```scss
.save-button {
  @include button-success-sm;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 60px;
}

.cancel-button {
  @include button-secondary-sm;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 60px;
}
```

## Design Tokens

The button system uses CSS variables for theming:

- `--primary` - Primary brand color
- `--color-background` - Background colors
- `--color-border` - Border colors
- `--color-body` - Text colors

## Accessibility Features

All button mixins include:

- Proper focus states with visible outlines
- Disabled state handling
- Pointer cursor management
- Screen reader friendly markup (when used properly)

## Migration Guide

If you have existing buttons that now look broken:

1. **For template buttons**: Add appropriate CSS classes:
   ```html
   <!-- Old -->
   <button>Click me</button>
   
   <!-- New -->
   <button class="btn btn-primary">Click me</button>
   ```

2. **For styled buttons**: Import and use mixins:
   ```scss
   // Add this import
   @use '@/assets/scss/mixins' as *;
   
   .my-button {
     // Add appropriate mixin
     @include button-primary-md;
   }
   ```

3. **For icon buttons**: Use the icon button mixin:
   ```scss
   .icon-btn {
     @include button-icon(32px);
   }
   ```

## Best Practices

1. **Use mixins in Vue components** for better maintainability
2. **Use global classes for simple cases** in templates
3. **Always start with `@include button-base`** if building custom buttons
4. **Use semantic variant names** (primary, secondary, success, danger)
5. **Test disabled and focus states** in your implementations
