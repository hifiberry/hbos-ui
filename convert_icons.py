#!/usr/bin/env python3
"""
Convert SVG icons to PNG in multiple sizes for the HiFiBerry UI.
Uses PIL/Pillow with cairosvg for conversion since system tools aren't available.
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
    import cairosvg
    import io
except ImportError:
    print("Missing dependencies. Install with:")
    print("pip install pillow cairosvg")
    sys.exit(1)

# Required sizes
SIZES = [12, 16, 24, 27]

# Icons we need to convert (based on usage in the app)
ICONS_TO_CONVERT = [
    # Tabler icons
    'tabler/volume-off.svg',
    'tabler/volume.svg',
    
    # Main icons
    'moon-thin.svg',
    'play.svg',
    'pause.svg',
    'next.svg',
    'prev.svg',
    'shuffle.svg',
    'loop.svg',
    'loop-one.svg',
    'clear.svg',
    'caret-down.svg',
    'loading.svg',
    'music.svg',
    'magnifying-glass-light.svg',
    
    # Lucide icons
    'lucide/play.svg',
    'lucide/pause.svg',
    'lucide/skip-back.svg',
    'lucide/skip-forward.svg',
    'lucide/shuffle.svg',
    'lucide/repeat.svg',
    'lucide/repeat-1.svg',
    'lucide/heart.svg',
    'lucide/heart-outline.svg',
    'lucide/heart-filled.svg',
    
    # Other commonly used icons
    'edit.svg',
    'checkmark.svg',
    'close.svg',
    'plus.svg',
    'refresh.svg',
    'computer.svg',
    'hifiberry.svg',
    'volume.svg',
    'heart.svg',
    'nas.svg',
    'cloud.svg',
    'dsp-program.svg',  # DSP program icon
]

def convert_svg_to_png(svg_path, png_path, size):
    """Convert SVG to PNG using cairosvg and PIL."""
    try:
        # Read SVG file
        with open(svg_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
        
        # Convert SVG to PNG bytes
        png_bytes = cairosvg.svg2png(
            bytestring=svg_content.encode('utf-8'),
            output_width=size,
            output_height=size
        )
        
        # Open with PIL for any additional processing
        img = Image.open(io.BytesIO(png_bytes))
        
        # Ensure RGBA mode for transparency
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Save PNG
        img.save(png_path, 'PNG', optimize=True)
        return True
        
    except Exception as e:
        print(f"  Error: {e}")
        return False

def main():
    # Set up paths
    svg_dir = Path('public/images/svg')
    png_dir = Path('public/images/png')
    
    if not svg_dir.exists():
        print(f"SVG directory {svg_dir} not found!")
        sys.exit(1)
    
    # Create PNG directories
    for size in SIZES:
        size_dir = png_dir / f'{size}px'
        size_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories for namespaced icons
        (size_dir / 'tabler').mkdir(exist_ok=True)
        (size_dir / 'lucide').mkdir(exist_ok=True)
    
    # Convert icons
    converted = 0
    failed = 0
    
    for icon_path in ICONS_TO_CONVERT:
        svg_file = svg_dir / icon_path
        
        if not svg_file.exists():
            print(f"⚠️  SVG not found: {svg_file}")
            continue
        
        # Get the icon name without extension
        icon_name = Path(icon_path).stem
        icon_subdir = Path(icon_path).parent if Path(icon_path).parent != Path('.') else ''
        
        print(f"Converting {icon_path}...")
        
        for size in SIZES:
            if icon_subdir:
                png_file = png_dir / f'{size}px' / icon_subdir / f'{icon_name}.png'
            else:
                png_file = png_dir / f'{size}px' / f'{icon_name}.png'
            
            png_file.parent.mkdir(parents=True, exist_ok=True)
            
            if convert_svg_to_png(str(svg_file), str(png_file), size):
                print(f"  ✅ {size}px -> {png_file}")
                converted += 1
            else:
                print(f"  ❌ Failed to convert {size}px")
                failed += 1
    
    print(f"\n🎉 Conversion complete!")
    print(f"✅ Converted: {converted}")
    print(f"❌ Failed: {failed}")
    
    if failed > 0:
        print("\n💡 To install dependencies:")
        print("  pip install pillow cairosvg")

if __name__ == '__main__':
    main()
