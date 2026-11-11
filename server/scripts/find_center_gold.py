from PIL import Image
import os

artifact_dir = r"C:\Users\ASUS\.gemini\antigravity\brain\fa4cc859-e99d-440e-a4b9-ef64c859d17c"
ai_path = os.path.join(artifact_dir, "evidence_preview_modal_ai.png")
im = Image.open(ai_path)
pixels = im.load()

# Let's search column 711 (center) vertically for gold border
gold_ys = []
for y in range(200, 800):
    r, g, b, a = pixels[711, y] if len(pixels[711, y]) == 4 else (*pixels[711, y], 255)
    # Check if gold-like
    if r > 160 and g > 130 and b < 90:
        gold_ys.append((y, (r, g, b)))

print("Gold pixels along center vertical line (x=711):")
for y, c in gold_ys:
    print(f"y={y}: {c}")
