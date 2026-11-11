from PIL import Image
import os

artifact_dir = r"C:\Users\ASUS\.gemini\antigravity\brain\fa4cc859-e99d-440e-a4b9-ef64c859d17c"
ai_path = os.path.join(artifact_dir, "evidence_preview_modal_ai.png")
it_path = os.path.join(artifact_dir, "evidence_preview_modal_it.png")
agile_path = os.path.join(artifact_dir, "evidence_preview_modal_agile.png")

img_ai = Image.open(ai_path)
print("Image size:", img_ai.size)

# The screenshot is 1440 x 1100.
# The certificate is centered in the modal.
# Let's find the navy ribbon by finding the dark blue pixels (#021638 to #0B52BC)
# We can search around y in range 300 to 550.
# Let's scan for the blue ribbon.
width, height = img_ai.size
pixels = img_ai.load()

# Let's find horizontal lines where gold border (#D4AF37 ~ R: 200-220, G: 170-185, B: 50-70) or dark blue ribbon exists
gold_pixels = []
for y in range(250, 600):
    for x in range(300, 1150):
        r, g, b, a = pixels[x, y] if len(pixels[x, y]) == 4 else (*pixels[x, y], 255)
        # Gold stroke: ~ (212, 175, 55)
        if 180 <= r <= 230 and 150 <= g <= 195 and 30 <= b <= 80:
            gold_pixels.append((x, y))

if gold_pixels:
    min_x = min(p[0] for p in gold_pixels)
    max_x = max(p[0] for p in gold_pixels)
    min_y = min(p[1] for p in gold_pixels)
    max_y = max(p[1] for p in gold_pixels)
    print(f"Detected ribbon region: x={min_x}..{max_x} (width={max_x - min_x}), y={min_y}..{max_y} (height={max_y - min_y})")
else:
    print("Could not automatically locate gold pixels, scanning blue")
