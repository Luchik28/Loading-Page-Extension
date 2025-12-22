"""
Simple script to generate placeholder icons for the Chrome extension.
Run this with: python generate_icons.py
Requires: pip install pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    # Create icons directory if it doesn't exist
    icons_dir = "icons"
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
    
    # Define icon sizes
    sizes = [16, 48, 128]
    
    # Colors (gradient purple/blue theme)
    bg_color = (102, 126, 234)  # #667eea
    text_color = (255, 255, 255)
    
    for size in sizes:
        # Create image with background
        img = Image.new('RGB', (size, size), bg_color)
        draw = ImageDraw.Draw(img)
        
        # Draw a simple book shape
        if size >= 48:
            # Draw book outline
            margin = size // 8
            draw.rectangle(
                [margin, margin, size - margin, size - margin],
                fill=(118, 75, 162),  # #764ba2
                outline=text_color,
                width=max(1, size // 32)
            )
            
            # Draw book spine line
            spine_x = size // 3
            draw.line(
                [spine_x, margin, spine_x, size - margin],
                fill=text_color,
                width=max(1, size // 32)
            )
            
            # Draw some page lines
            if size >= 48:
                for i in range(3):
                    y = margin + (size - 2 * margin) * (i + 1) // 4
                    draw.line(
                        [spine_x + size // 16, y, size - margin - size // 16, y],
                        fill=text_color,
                        width=max(1, size // 48)
                    )
        else:
            # For small icon, just draw a simple book
            margin = 2
            draw.rectangle(
                [margin, margin, size - margin, size - margin],
                fill=(118, 75, 162),
                outline=text_color,
                width=1
            )
        
        # Save the icon
        filename = f"{icons_dir}/icon{size}.png"
        img.save(filename)
        print(f"Created {filename}")
    
    print("\n✓ All icons created successfully!")
    print("You can now load the extension in Chrome.")
    
except ImportError:
    print("PIL/Pillow not installed.")
    print("Install it with: pip install pillow")
    print("\nAlternatively, you can:")
    print("1. Create three PNG files manually (16x16, 48x48, 128x128)")
    print("2. Use an online icon generator")
    print("3. Download free icons from flaticon.com or similar sites")
    print("\nSave them as:")
    print("- icons/icon16.png")
    print("- icons/icon48.png")
    print("- icons/icon128.png")
