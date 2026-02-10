#!/usr/bin/env python3
"""
Remove ONLY the teal shadow from product images.
Teal: R < 130, G > 200, B > 200
Coral border: R > 180, G < 180 - will NOT be affected
"""
from PIL import Image
import os

IMAGE_DIR = '/Users/nicholascollins/retailer-portal/public/images/products'

def is_teal_shadow(r, g, b):
    """
    Detect teal shadow color.
    Teal shadow is approximately RGB(112, 228, 223):
    - Red is LOW (< 140)
    - Green is HIGH (> 200)
    - Blue is HIGH (> 200)
    """
    return r < 140 and g > 200 and b > 200

def remove_teal(image_path):
    """Remove teal shadow from image"""
    print(f"Processing: {os.path.basename(image_path)}")

    img = Image.open(image_path)
    img = img.convert("RGBA")

    pixels = img.load()
    width, height = img.size

    changed = 0
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 0 and is_teal_shadow(r, g, b):
                pixels[x, y] = (0, 0, 0, 0)  # Make transparent
                changed += 1

    img.save(image_path, "PNG")
    print(f"  Removed {changed:,} teal pixels")
    return changed

def main():
    print("Removing teal shadow (R<140, G>200, B>200)...\n")

    total = 0
    for filename in sorted(os.listdir(IMAGE_DIR)):
        if filename.endswith('.png'):
            image_path = os.path.join(IMAGE_DIR, filename)
            total += remove_teal(image_path)

    print(f"\nDone! Removed {total:,} teal pixels total")

if __name__ == "__main__":
    main()
