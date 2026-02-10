#!/usr/bin/env python3
"""
Remove teal/turquoise shadow from product images
"""
from PIL import Image
import os

IMAGE_DIR = '/Users/nicholascollins/retailer-portal/public/images/products'

def is_teal(r, g, b, tolerance=40):
    """Check if pixel is teal/turquoise color"""
    # Teal is roughly (100-150, 180-210, 190-210)
    # Looking at the image, the teal shadow is around (127, 195, 195)

    # Check if it's a teal-ish color:
    # - Green and Blue are similar (within 30 of each other)
    # - Green and Blue are both high (> 150)
    # - Red is significantly lower than Green/Blue

    if g > 140 and b > 140:  # Both G and B are high
        if abs(g - b) < 40:  # G and B are similar
            if r < g - 20:  # R is lower
                return True

    return False

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
            if a > 0 and is_teal(r, g, b):
                pixels[x, y] = (0, 0, 0, 0)  # Make transparent
                changed += 1

    img.save(image_path, "PNG")
    print(f"  Removed {changed} teal pixels")
    return changed

def main():
    print("Removing teal shadows from product images...\n")

    total = 0
    for filename in os.listdir(IMAGE_DIR):
        if filename.endswith('.png'):
            image_path = os.path.join(IMAGE_DIR, filename)
            total += remove_teal(image_path)

    print(f"\nDone! Removed {total} teal pixels total")

if __name__ == "__main__":
    main()
