from PIL import Image, ImageDraw, ImageFont
import os

artifact_dir = r"C:\Users\ASUS\.gemini\antigravity\brain\fa4cc859-e99d-440e-a4b9-ef64c859d17c"
ai_path = os.path.join(artifact_dir, "evidence_preview_modal_ai.png")
it_path = os.path.join(artifact_dir, "evidence_preview_modal_it.png")
agile_path = os.path.join(artifact_dir, "evidence_preview_modal_agile.png")

img_ai = Image.open(ai_path)
width, height = img_ai.size
pixels = img_ai.load()

# Look for dark blue ribbon fill: #021638 to #0B52BC -> R: 2..15, G: 20..85, B: 55..190
blue_ribbon_pixels = []
for y in range(300, 500):
    for x in range(350, 1100):
        r, g, b, a = pixels[x, y] if len(pixels[x, y]) == 4 else (*pixels[x, y], 255)
        if r <= 20 and 20 <= g <= 90 and 50 <= b <= 195:
            blue_ribbon_pixels.append((x, y))

if blue_ribbon_pixels:
    min_x = min(p[0] for p in blue_ribbon_pixels)
    max_x = max(p[0] for p in blue_ribbon_pixels)
    min_y = min(p[1] for p in blue_ribbon_pixels)
    max_y = max(p[1] for p in blue_ribbon_pixels)
    print(f"Exact ribbon bounds: x={min_x}..{max_x} (width={max_x - min_x + 1}), y={min_y}..{max_y} (height={max_y - min_y + 1})")
