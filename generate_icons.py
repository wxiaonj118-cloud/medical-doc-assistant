#!/usr/bin/env python3
"""
PWA Icon Generator for Medical Document Assistant
Generates all required icons from a source image
"""

from PIL import Image
import os
import sys

def generate_icons(source_image_path, output_dir='static/icons'):
    """Generate PWA icons from source image"""
    
    print("\n🎨 PWA Icon Generator")
    print("=" * 50)
    
    # Check if source image exists
    if not os.path.exists(source_image_path):
        print(f"❌ Error: Source image not found at: {source_image_path}")
        return False
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    print(f"📁 Output directory: {output_dir}")
    
    try:
        # Open source image
        img = Image.open(source_image_path)
        print(f"🖼️  Source image: {os.path.basename(source_image_path)}")
        print(f"📏 Original size: {img.size[0]}x{img.size[1]} pixels")
        
        # Convert to RGBA if needed (for transparency support)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Icon sizes needed for PWA (standard sizes)
        sizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512]
        
        print("\n🔧 Generating icons...")
        print("-" * 50)
        
        generated_count = 0
        for size in sizes:
            # Calculate new size while maintaining aspect ratio
            img_copy = img.copy()
            
            # Create a square canvas with transparent background
            square_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            
            # Resize image to fit in square (with padding if needed)
            img_copy.thumbnail((size, size), Image.Resampling.LANCZOS)
            
            # Calculate position to center the image
            x = (size - img_copy.size[0]) // 2
            y = (size - img_copy.size[1]) // 2
            
            # Paste resized image onto square canvas
            square_img.paste(img_copy, (x, y), img_copy if img_copy.mode == 'RGBA' else None)
            
            # Save icon
            output_path = os.path.join(output_dir, f'icon-{size}.png')
            square_img.save(output_path, 'PNG', optimize=True)
            
            print(f"✅ Generated {size}x{size} icon: {output_path}")
            generated_count += 1
        
        print("-" * 50)
        print(f"\n✨ Success! Generated {generated_count} icons in: {output_dir}")
        
        # Generate HTML snippet for including icons
        print("\n📝 HTML snippet for your base.html (already added):")
        print("<link rel=\"apple-touch-icon\" href=\"/static/icons/icon-192.png\">")
        print("<link rel=\"apple-touch-icon\" sizes=\"152x152\" href=\"/static/icons/icon-152.png\">")
        print("<link rel=\"apple-touch-icon\" sizes=\"167x167\" href=\"/static/icons/icon-167.png\">")
        print("<link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"/static/icons/icon-180.png\">")
        
        return True
        
    except Exception as e:
        print(f"❌ Error generating icons: {e}")
        return False

def create_sample_html(output_dir='static/icons'):
    """Create a sample HTML file to preview icons"""
    
    html_content = """<!DOCTYPE html>
<html>
<head>
    <title>PWA Icons Preview</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; background: #f5f5f7; }
        h1 { color: #1d1d1f; }
        .icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; margin-top: 20px; }
        .icon-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .icon-card img { width: 100%; max-width: 128px; height: auto; border-radius: 20px; }
        .icon-size { margin-top: 10px; font-weight: 600; color: #1d1d1f; }
        .icon-path { font-size: 12px; color: #86868b; word-break: break-all; }
    </style>
</head>
<body>
    <h1>🎨 PWA Icons Preview</h1>
    <p>Generated icons for Medical Document Assistant PWA</p>
    <div class="icon-grid">
"""
    
    sizes = [72, 96, 128, 144, 152, 167, 180, 192, 384, 512]
    for size in sizes:
        html_content += f"""
        <div class="icon-card">
            <img src="icon-{size}.png" alt="{size}x{size} icon">
            <div class="icon-size">{size}x{size}</div>
            <div class="icon-path">icon-{size}.png</div>
        </div>"""
    
    html_content += """
    </div>
</body>
</html>"""
    
    preview_path = os.path.join(output_dir, 'preview.html')
    with open(preview_path, 'w') as f:
        f.write(html_content)
    print(f"\n👁️  Preview page created: {preview_path}")

def main():
    """Main function"""
    print("\n" + "=" * 60)
    print("📱 Medical Document Assistant - PWA Icon Generator")
    print("=" * 60)
    
    # Check if PIL is installed
    try:
        from PIL import Image
    except ImportError:
        print("\n❌ PIL (Pillow) is not installed!")
        print("\nPlease install required package:")
        print("  pip install Pillow")
        print("\nOr run:")
        print("  pip install -r requirements.txt")
        return
    
    # Get source image path
    if len(sys.argv) > 1:
        source_image = sys.argv[1]
    else:
        print("\n📝 Usage: python generate_icons.py <path_to_source_image>")
        print("   Example: python generate_icons.py my_logo.png")
        print("\nOr drag and drop an image file onto this script.")
        
        source_image = input("\nEnter path to source image: ").strip().strip('"').strip("'")
    
    # Generate icons
    if generate_icons(source_image):
        create_sample_html()
        print("\n" + "=" * 60)
        print("✅ Next steps:")
        print("1. Check the generated icons in 'static/icons/' folder")
        print("2. Open 'static/icons/preview.html' to preview all icons")
        print("3. Restart your Flask app")
        print("4. Test PWA installation on your phone")
        print("=" * 60)
    else:
        print("\n❌ Icon generation failed. Please check the source image and try again.")

if __name__ == '__main__':
    main()