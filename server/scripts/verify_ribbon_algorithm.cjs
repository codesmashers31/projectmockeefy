const titles = [
  { domain: "AI", text: "AI MOCK INTERVIEW SESSION" },
  { domain: "IT", text: "IT PROFESSIONAL MOCK INTERVIEW SESSION" },
  { domain: "Web Development", text: "WEB DEVELOPMENT MOCK INTERVIEW SESSION" },
  { domain: "Software Development", text: "SOFTWARE DEVELOPMENT MOCK INTERVIEW SESSION" },
  { domain: "Cybersecurity", text: "CYBERSECURITY MOCK INTERVIEW SESSION" },
  { domain: "Agile & Project Management", text: "AGILE & PROJECT MANAGEMENT MOCK INTERVIEW SESSION" },
  { domain: "Full Stack Development (MERN)", text: "FULL STACK DEVELOPMENT (MERN) MOCK INTERVIEW SESSION" },
];

const fallbackMeasureUppercaseInter = (text, fontSize, letterSpacing) => {
  const charWidths = {
    ' ': 0.28,
    'I': 0.35, 'J': 0.45, 'L': 0.50, 'T': 0.55, 'F': 0.55,
    'M': 0.92, 'W': 0.95, '&': 0.78, '(': 0.38, ')': 0.38,
    '-': 0.40, '/': 0.45,
  };
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i].toUpperCase();
    const em = charWidths[ch] !== undefined ? charWidths[ch] : 0.68;
    total += em * fontSize;
    if (i < text.length - 1) {
      total += letterSpacing;
    }
  }
  return total;
};

const candidateConfigs = [
  { fontSize: 17, letterSpacing: 2.8 },
  { fontSize: 16.5, letterSpacing: 2.5 },
  { fontSize: 16, letterSpacing: 2.3 },
  { fontSize: 15.5, letterSpacing: 2.1 },
  { fontSize: 15, letterSpacing: 1.9 },
  { fontSize: 14.5, letterSpacing: 1.7 },
  { fontSize: 14, letterSpacing: 1.5 },
  { fontSize: 13.5, letterSpacing: 1.4 },
  { fontSize: 13, letterSpacing: 1.3 },
  { fontSize: 12.5, letterSpacing: 1.2 },
  { fontSize: 12, letterSpacing: 1.1 },
  { fontSize: 11.5, letterSpacing: 1.0 },
  { fontSize: 11, letterSpacing: 0.9 },
  { fontSize: 10.5, letterSpacing: 0.8 },
  { fontSize: 10, letterSpacing: 0.7 },
];

function getAdaptiveRibbonTypography(text, maxInnerWidth = 520) {
  for (const cfg of candidateConfigs) {
    const w = fallbackMeasureUppercaseInter(text, cfg.fontSize, cfg.letterSpacing);
    if (w <= maxInnerWidth) {
      return {
        fontSize: `${cfg.fontSize}px`,
        letterSpacing: `${cfg.letterSpacing}px`,
        fontSizeNum: cfg.fontSize,
        letterSpacingNum: cfg.letterSpacing,
        computedWidth: Math.round(w),
      };
    }
  }
  const minCfg = candidateConfigs[candidateConfigs.length - 1];
  return {
    fontSize: `${minCfg.fontSize}px`,
    letterSpacing: `${minCfg.letterSpacing}px`,
    fontSizeNum: minCfg.fontSize,
    letterSpacingNum: minCfg.letterSpacing,
    computedWidth: Math.round(fallbackMeasureUppercaseInter(text, minCfg.fontSize, minCfg.letterSpacing)),
  };
}

console.log("=== ADAPTIVE RIBBON TYPOGRAPHY CALCULATION RESULTS ===");
for (const item of titles) {
  const typo = getAdaptiveRibbonTypography(item.text, 520);
  console.log(`Domain: ${item.domain.padEnd(30)} => ${item.text}`);
  console.log(`   Font Size: ${typo.fontSize.padEnd(7)} | Letter Spacing: ${typo.letterSpacing.padEnd(6)} | Width: ${typo.computedWidth}px / 520px | Fits: ${typo.computedWidth <= 520}\n`);
}
