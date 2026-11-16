from PIL import Image
import os

artifact_dir = r"C:\Users\ASUS\.gemini\antigravity\brain\fa4cc859-e99d-440e-a4b9-ef64c859d17c"
ai_path = os.path.join(artifact_dir, "evidence_preview_modal_ai.png")
im = Image.open(ai_path)
pixels = im.load()

white_pixels = []
for y in range(250, 600):
    for x in range(500, 950):
        r, g, b, a = pixels[x, y] if len(pixels[x, y]) == 4 else (*pixels[x, y], 255)
        # White text inside navy ribbon
        if r > 240 and g > 240 and b > 240:
            white_pixels.append((x, y))

if white_pixels:
    min_x = min(p[0] for p in white_pixels)
    max_x = max(p[0] for p in white_pixels)
    min_y = min(p[1] for p in white_pixels)
    max_y = max(p[1] for p in white_pixels)
    print(f"White text bounds: x={min_x}..{max_x} (w={max_x - min_x + 1}), y={min_y}..{max_y} (h={max_y - min_y + 1})")
else:
    print("No white pixels found")
