# Lucide Icons Style Guide

## Style Information

- **Icon Library**: Lucide (Fork of Feather Icons)
- **Style**: Outline/Stroke-based
- **Size**: 24x24px viewBox
- **Stroke Width**: Adjustable (default: 2px)
- **Fill**: `none` (outline style)
- **Stroke**: `currentColor` for theme compatibility
- **License**: ISC License (completely free)

## Source

Icons are sourced from Lucide Icons:
https://lucide.dev/

## Stroke Width Customization

Lucide icons support dynamic stroke width adjustment via CSS:

```css
.icon-thin { stroke-width: 1; }
.icon-normal { stroke-width: 2; }
.icon-bold { stroke-width: 3; }
```

Or inline:
```vue
<svg stroke-width="1.5">...</svg>
```

## Format

- **Format**: SVG
- **ViewBox**: `0 0 24 24`
- **Dimensions**: 24px x 24px
- **Fill**: `none`
- **Stroke**: `currentColor`
- **Stroke Width**: `2` (default, customizable)
- **Stroke Linecap**: `round`
- **Stroke Linejoin**: `round`

## Player Control Icons

The following icons are available for media player controls:

### Icon Files and Lucide IDs

- `play.svg` - **Lucide ID**: `play` - Play button (triangle pointing right)
- `pause.svg` - **Lucide ID**: `pause` - Pause button (two vertical bars)
- `skip-back.svg` - **Lucide ID**: `skip-back` - Previous track (triangle with line)
- `skip-forward.svg` - **Lucide ID**: `skip-forward` - Next track (triangle with line)
- `shuffle.svg` - **Lucide ID**: `shuffle` - Shuffle mode (crossed arrows with dots)
- `repeat.svg` - **Lucide ID**: `repeat` - Repeat all (circular arrow)
- `repeat-1.svg` - **Lucide ID**: `repeat-1` - Repeat single track (circular arrow with "1")
- `heart.svg` - **Lucide ID**: `heart` - Heart/favorite button (heart shape)

### Icon Sources

All icons are sourced from [Lucide Icons](https://lucide.dev/) with the following direct links:

- Play: <https://lucide.dev/icons/play>
- Pause: <https://lucide.dev/icons/pause>
- Skip Back: <https://lucide.dev/icons/skip-back>
- Skip Forward: <https://lucide.dev/icons/skip-forward>
- Shuffle: <https://lucide.dev/icons/shuffle>
- Repeat: <https://lucide.dev/icons/repeat>
- Repeat 1: <https://lucide.dev/icons/repeat-1>
- Heart: <https://lucide.dev/icons/heart>

## Usage

Icons should be used with the `Icon` component:

```vue
<Icon icon="lucide/play" />
```

### With Custom Stroke Width

```vue
<Icon icon="lucide/play" class="stroke-thin" />
```

```css
.stroke-thin svg { stroke-width: 1.5; }
.stroke-bold svg { stroke-width: 2.5; }
```

## Icon Variants

All Lucide icons use the same base design language:

- Consistent 2px stroke width (customizable)
- Rounded line caps and joins
- 24x24px grid system
- Outline style (no fills except for special cases like filled heart)
