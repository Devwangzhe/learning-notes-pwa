from PIL import Image, ImageDraw, ImageFont
import os

icon_dir = r'C:\Users\Administrator\.qclaw\workspace\learning-notes-pwa\icons'
os.makedirs(icon_dir, exist_ok=True)

for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png')]:
    img = Image.new('RGBA', (size, size), (99, 102, 241, 255))
    draw = ImageDraw.Draw(img)
    m = size // 5
    draw.rounded_rectangle([m, m, size-m, size-m], radius=size//10, fill=(255,255,255,240))
    font = ImageFont.load_default()
    img.save(os.path.join(icon_dir, name), 'PNG')

print('Icons created!')
