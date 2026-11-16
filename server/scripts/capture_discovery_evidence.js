import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:/Users/ASUS/.gemini/antigravity/brain/fa4cc859-e99d-440e-a4b9-ef64c859d17c";

async function captureEvidence() {
  console.log("Launching headless browser to capture live discovery page screenshots...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. All Tracks
  console.log("Navigating to http://localhost:5173/ ...");
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 2000));
  
  const allTracksPath = path.join(ARTIFACT_DIR, "evidence_discovery_all_tracks_59.png");
  await page.screenshot({ path: allTracksPath });
  console.log("Captured:", allTracksPath);

  // 2. Select IT track
  console.log("Navigating to IT category filter (?category=IT)...");
  await page.goto("http://localhost:5173/?category=IT", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 2000));
  const itPath = path.join(ARTIFACT_DIR, "evidence_discovery_category_it_16.png");
  await page.screenshot({ path: itPath });
  console.log("Captured:", itPath);

  // 3. Select Web Development track
  console.log("Navigating to Web Development category filter (?category=Web%20Development)...");
  await page.goto("http://localhost:5173/?category=Web%20Development", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 2000));
  const webPath = path.join(ARTIFACT_DIR, "evidence_discovery_category_webdev_3.png");
  await page.screenshot({ path: webPath });
  console.log("Captured:", webPath);

  // 4. Empty category fallback (?category=Test)
  console.log("Navigating to empty category (?category=Test)...");
  await page.goto("http://localhost:5173/?category=Test", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 2500));
  const fallbackPath = path.join(ARTIFACT_DIR, "evidence_discovery_empty_category_fallback.png");
  await page.screenshot({ path: fallbackPath });
  console.log("Captured:", fallbackPath);

  // 5. Close-up card showing Professional Domain & Price/Availability layout
  const cardElement = await page.$(".sidebar-main-card article");
  if (cardElement) {
    const cardPath = path.join(ARTIFACT_DIR, "evidence_discovery_expert_card_closeup.png");
    await cardElement.screenshot({ path: cardPath });
    console.log("Captured:", cardPath);
  }

  await browser.close();
  console.log("All evidence screenshots captured successfully!");
}

captureEvidence().catch(err => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
