#!/usr/bin/env python3
"""
SVG Formatter Script
Parses and formats all SVG files to be consistent across the project.
"""

import os
import re
from pathlib import Path
from xml.etree import ElementTree as ET


def remove_namespace(tag):
    """Remove namespace from XML tag."""
    return tag.split('}')[-1] if '}' in tag else tag


def clean_svg_element(element):
    """Remove unwanted attributes from SVG elements."""
    # Attributes to remove from child elements
    attrs_to_remove = ['style', 'fill', 'stroke', 'stroke-width']
    
    for attr in attrs_to_remove:
        if attr in element.attrib:
            del element.attrib[attr]
    
    # Recursively clean child elements
    for child in element:
        clean_svg_element(child)


def format_svg_content(svg_element, indent="  "):
    """Format SVG element with proper indentation."""
    lines = []
    
    for child in svg_element:
        tag = remove_namespace(child.tag)
        
        # Skip namespace-only paths or invisible elements
        if tag == 'path' and child.attrib.get('stroke') == 'none' and not child.attrib.get('d'):
            continue
        if tag == 'desc':
            continue
            
        # Build attributes string
        attrs = []
        for key, value in sorted(child.attrib.items()):
            key = remove_namespace(key)
            attrs.append(f'{key}="{value}"')
        
        attr_str = ' '.join(attrs)
        
        if attr_str:
            if len(child):  # Has children
                lines.append(f'{indent}<{tag} {attr_str}>')
                # Recursively format children
                for subchild in child:
                    lines.extend(format_svg_content(subchild, indent + "  "))
                lines.append(f'{indent}</{tag}>')
            else:
                lines.append(f'{indent}<{tag} {attr_str}/>')
        else:
            if len(child):
                lines.append(f'{indent}<{tag}>')
                for subchild in child:
                    lines.extend(format_svg_content(subchild, indent + "  "))
                lines.append(f'{indent}</{tag}>')
            else:
                lines.append(f'{indent}<{tag}/>')
    
    return lines


def format_main_svg(svg_path):
    """Format main SVG icons with css-icon class."""
    try:
        # Read and parse SVG
        content = svg_path.read_text(encoding='utf-8')
        
        # Remove XML declaration and DOCTYPE
        content = re.sub(r'<\?xml[^>]*\?>\s*', '', content)
        content = re.sub(r'<!DOCTYPE[^>]*>\s*', '', content)
        
        # Parse XML
        root = ET.fromstring(content)
        
        # Clean child elements
        for child in root:
            clean_svg_element(child)
        
        # Format children
        children_lines = format_svg_content(root)
        
        # Build final SVG
        svg_start = '<svg class="css-icon" viewBox="-1 -1 23 23" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">'
        svg_end = '</svg>'
        
        formatted = f"{svg_start}\n" + "\n".join(children_lines) + f"\n{svg_end}"
        
        # Write back
        svg_path.write_text(formatted, encoding='utf-8')
        return True, None
        
    except Exception as e:
        return False, str(e)


def format_tabler_svg(svg_path):
    """Format Tabler SVG icons with compact format."""
    try:
        # Read and parse SVG
        content = svg_path.read_text(encoding='utf-8')
        
        # Remove XML declaration and DOCTYPE
        content = re.sub(r'<\?xml[^>]*\?>\s*', '', content)
        content = re.sub(r'<!DOCTYPE[^>]*>\s*', '', content)
        
        # Parse XML
        root = ET.fromstring(content)
        
        # Build compact single-line format
        parts = []
        for child in root:
            tag = remove_namespace(child.tag)
            
            # Skip desc elements
            if tag == 'desc':
                continue
            
            attrs = []
            for key, value in child.attrib.items():
                key = remove_namespace(key)
                attrs.append(f'{key}="{value}"')
            
            attr_str = ' '.join(attrs)
            
            if attr_str:
                parts.append(f'<{tag} {attr_str}/>')
            else:
                parts.append(f'<{tag}/>')
        
        # Build final SVG (single line, compact)
        svg_start = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">'
        svg_end = '</svg>'
        
        formatted = svg_start + ''.join(parts) + svg_end
        
        # Write back
        svg_path.write_text(formatted, encoding='utf-8')
        return True, None
        
    except Exception as e:
        return False, str(e)


def main():
    """Main function to format all SVG files."""
    base_path = Path(__file__).parent / 'public' / 'images' / 'svg'
    
    print("SVG Formatter")
    print("=" * 60)
    
    # Format main SVG icons
    print("\nFormatting main icons...")
    main_svgs = list(base_path.glob('*.svg'))
    success_count = 0
    error_count = 0
    
    for svg_path in sorted(main_svgs):
        success, error = format_main_svg(svg_path)
        if success:
            success_count += 1
            print(f"✓ {svg_path.name}")
        else:
            error_count += 1
            print(f"✗ {svg_path.name}: {error}")
    
    print(f"\nMain icons: {success_count} successful, {error_count} errors")
    
    # Format Tabler icons
    tabler_path = base_path / 'tabler'
    if tabler_path.exists():
        print("\nFormatting Tabler icons...")
        tabler_svgs = list(tabler_path.glob('*.svg'))
        tabler_success = 0
        tabler_error = 0
        
        for svg_path in sorted(tabler_svgs):
            success, error = format_tabler_svg(svg_path)
            if success:
                tabler_success += 1
                print(f"✓ tabler/{svg_path.name}")
            else:
                tabler_error += 1
                print(f"✗ tabler/{svg_path.name}: {error}")
        
        print(f"\nTabler icons: {tabler_success} successful, {tabler_error} errors")
    
    # Format other subdirectories (lucide, material, custom) if needed
    for subdir in ['lucide', 'material', 'custom']:
        subdir_path = base_path / subdir
        if subdir_path.exists():
            print(f"\nFormatting {subdir} icons...")
            sub_svgs = list(subdir_path.glob('*.svg'))
            sub_success = 0
            sub_error = 0
            
            for svg_path in sorted(sub_svgs):
                success, error = format_tabler_svg(svg_path)  # Use tabler format for consistency
                if success:
                    sub_success += 1
                    print(f"✓ {subdir}/{svg_path.name}")
                else:
                    sub_error += 1
                    print(f"✗ {subdir}/{svg_path.name}: {error}")
            
            print(f"\n{subdir.capitalize()} icons: {sub_success} successful, {sub_error} errors")
    
    print("\n" + "=" * 60)
    print("Formatting complete!")


if __name__ == '__main__':
    main()
