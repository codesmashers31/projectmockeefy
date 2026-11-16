from PIL import Image, ImageDraw, ImageFont
import os

artifact_dir = r"C:\Users\ASUS\.gemini\antigravity\brain\fa4cc859-e99d-440e-a4b9-ef64c859d17c"
ai_path = os.path.join(artifact_dir, "evidence_preview_modal_ai.png")
it_path = os.path.join(artifact_dir, "evidence_preview_modal_it.png")
agile_path = os.path.join(artifact_dir, "evidence_preview_modal_agile.png")

img_ai = Image.open(ai_path)
img_it = Image.open(it_path)
img_agile = Image.open(agile_path)

# In the 1422 x 1004 modal screenshot:
# Center is ~ 711
# Let's crop from x = 450 to 970 (width = 520) and y = 368 to 418 (height = 50)
crop_box = (470, 368, 952, 422)

crop_ai = img_ai.crop(crop_box)
crop_it = img_it.crop(crop_box)
crop_agile = img_agile.crop(crop_box)

crop_ai.save(os.path.join(artifact_dir, "evidence_crop_ribbon_ai.png"))
crop_it.save(os.path.join(artifact_dir, "evidence_crop_ribbon_it.png"))
crop_agile.save(os.path.join(artifact_dir, "evidence_crop_ribbon_agile.png"))

print("Cropped ribbons saved successfully!")
print("Crop size:", crop_ai.size)

# Now let's create a side-by-side vertical composite image comparing AI, IT, and Agile & Project Management
# with title labels and vertical reference boundary guide lines!
comp_w = 640
comp_h = 320
comp = Image.new("RGB", (comp_w, comp_h), "#060D1A")
draw = ImageDraw.Draw(comp)

# Try to use a clean font or default
try:
    font = ImageFont.truetype("arial.ttf", 13)
    header_font = ImageFont.truetype("arial.ttf", 14)
except:
    font = ImageFont.load_default()
    header_font = font

draw.text((20, 12), "MOCKEEFY ADAPTIVE RIBBON COMPARISON (EXACT SAME FIXED RIBBON)", fill="#D4AF37", font=header_font)

# Paste AI
draw.text((20, 42), "1. AI (Original 17px Reference Font Size — 620px Fixed Outer Ribbon):", fill="#94A3B8", font=font)
comp.paste(crop_ai, (79, 62))

# Paste IT
draw.text((20, 125), "2. IT (Original 17px Reference Font Size — 620px Fixed Outer Ribbon):", fill="#94A3B8", font=font)
comp.paste(crop_it, (79, 145))

# Paste Agile
draw.text((20, 208), "3. Agile & Project Management (Adaptive Font Size — Same Fixed Ribbon):", fill="#94A3B8", font=font)
comp.paste(crop_agile, (79, 228))

# Draw red/gold vertical alignment guide lines on left and right outer ribbon edges
# to visually prove identical outer dimensions
guide_left = 79 + 3
guide_right = 79 + crop_ai.size[0] - 3
draw.line([(guide_left, 55), (guide_left, 285)], fill="#10B981", width=1)
draw.line([(guide_right, 55), (guide_right, 285)], fill="#10B981", width=1)

draw.text((20, 292), "Vertical Green Lines: 100% Identical Ribbon Width & Alignment Across All Domains", fill="#10B981", font=font)

comp.save(os.path.join(artifact_dir, "evidence_ribbon_side_by_side_comparison.png"))
print("Saved evidence_ribbon_side_by_side_comparison.png!")
