# Material Icons Style Guide

## Style Information

- **Icon Library**: Material Design Icons (Google)
- **Style**: Filled
- **Size**: 24x24px viewBox
- **Fill**: Uses `currentColor` for theme compatibility
- **Format**: SVG

## Source

Icons are sourced from Google's Material Design Icons:
https://fonts.google.com/icons

## Format

- **Format**: SVG
- **ViewBox**: `0 0 24 24`
- **Dimensions**: 24px x 24px
- **Color**: `currentColor` (inherits from CSS)

## Player Control Icons

The following icons are used for media player controls:

- `play_arrow` - Play button
- `pause` - Pause button
- `skip_previous` - Previous track
- `skip_next` - Next track
- `shuffle` - Shuffle mode
- `repeat` - Repeat all
- `repeat_one` - Repeat track
- `favorite` - Heart (filled)
- `favorite_border` - Heart (outline)

## Usage

Icons should be used with the `Icon` component:

```vue
<Icon icon="material/play_arrow" />
```
