from PIL import Image
import os

artifact_dir = r"C:\Users\ASUS\.gemini\antigravity\brain\fa4cc859-e99d-440e-a4b9-ef64c859d17c"
ai_path = os.path.join(artifact_dir, "evidence_preview_modal_ai.png")
it_path = os.path.join(artifact_dir, "evidence_preview_modal_it.png")
agile_path = os.path.join(artifact_dir, "evidence_preview_modal_agile.png")

img_ai = Image.open(ai_path)
# Let's crop a box centered around x=711 (center of 1422) and check several Y ranges
center_x = 711
crop_w = 600
left = center_x - crop_w // 2
right = center_x + crop_w // 2

# In 1422 x 1004, the modal is in the middle. Let's find where "AI MOCK INTERVIEW SESSION" is:
# Let's crop from y=300 to y=500
test_crop = img_ai.crop((left, 320, right, 440))
test_crop.save(os.path.join(artifact_dir, "test_ribbon_crop.png"))
print("Saved test_ribbon_crop.png, size:", test_crop.size)
