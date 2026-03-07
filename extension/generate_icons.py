#!/usr/bin/env python3
"""
Generate simple placeholder icons for the Chrome extension
Requires: pip install pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Install Pillow: pip3 install pillow")
    exit(1)

import os

def create_icon(size, output_path):
    """Create a simple icon with Spotify green and music note"""
    # Create image with Spotify green background
    img = Image.new('RGB', (size, size), '#1DB954')
    draw = ImageDraw.Draw(img)
    
    # Draw white circle in center
    margin = size // 4
    draw.ellipse([margin, margin, size-margin, size-margin], fill='white')
    
    # Draw music note symbol (simplified)
    center_x, center_y = size // 2, size // 2
    font_size = size // 2
    
    try:
        # Try to use system font for music note
        draw.text((center_x - font_size//4, center_y - font_size//3), 
                  '♫', fill='#1DB954', font=None)
    except:
        # Fallback: draw simple shapes
        note_x = center_x - size // 8
        note_y = center_y
        # Draw note stem
        draw.rectangle([note_x, note_y - size//4, note_x + 4, note_y + size//8], fill='#1DB954')
        # Draw note head
        draw.ellipse([note_x - 6, note_y, note_x + 8, note_y + size//6], fill='#1DB954')
    
    img.save(output_path, 'PNG')
    print(f"✓ Created {output_path}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')
    
    os.makedirs(icons_dir, exist_ok=True)
    
    sizes = [16, 48, 128]
    for size in sizes:
        output_path = os.path.join(icons_dir, f'icon{size}.png')
        create_icon(size, output_path)
    
    print("\n✅ All icons created successfully!")
    print(f"📁 Location: {icons_dir}\n")

if __name__ == '__main__':
    main()
