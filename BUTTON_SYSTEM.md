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
  color: var(--color-body-secondary);
  
  &:hover:not(:disabled) {
    color: var(--color-primary);
  }
}
```

### Editable Input Field
```scss
.hostname-input {
  flex: 1;
  max-width: 250px;
  padding: 8px 12px;
  border: 2px solid var(--color-accent);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-body);
  font-size: inherit;
  font-weight: inherit;
  font-family: inherit;
  box-shadow: 0 0 0 1px rgba(var(--color-accent-rgb, 59, 130, 246), 0.1);

  &:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb, 59, 130, 246), 0.15);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--color-background-secondary);
    border-color: var(--color-border);
    box-shadow: none;
  }
}
```

### Save/Cancel Icon Buttons
```scss
.save-button {
  @include button-icon(32px);
  color: var(--color-success);
  
  &:hover:not(:disabled) {
    background: rgba(var(--color-success-rgb, 34, 197, 94), 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.cancel-button {
  @include button-icon(32px);
  color: var(--color-body-secondary);
  
  &:hover:not(:disabled) {
    color: var(--color-danger);
    background: rgba(var(--color-danger-rgb, 239, 68, 68), 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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
