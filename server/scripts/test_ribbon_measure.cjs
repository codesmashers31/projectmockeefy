// Test exact text measurement across domain titles
// Inter / Plus Jakarta Sans bold font character width factors
// In sans-serif bold / 800 uppercase:
// Wide characters: W, M, @, & ~ 0.85 - 0.95 em
// Normal characters: A, B, C, D, E, G, H, K, N, O, P, Q, R, S, U, V, X, Y, Z ~ 0.65 - 0.72 em
// Narrow characters: I, J, L, T ~ 0.35 - 0.55 em
// Space ~ 0.28 em

const titles = [
  "AI MOCK INTERVIEW SESSION",
  "IT PROFESSIONAL MOCK INTERVIEW SESSION",
  "WEB DEVELOPMENT MOCK INTERVIEW SESSION",
  "SOFTWARE DEVELOPMENT MOCK INTERVIEW SESSION",
  "CYBERSECURITY MOCK INTERVIEW SESSION",
  "AGILE & PROJECT MANAGEMENT MOCK INTERVIEW SESSION",
  "FULL STACK DEVELOPMENT (MERN) MOCK INTERVIEW SESSION",
];

function getAdaptiveRibbonTypography(text, maxInnerWidth = 520) {
  // Candidate font sizes from 17px down to 9.5px
  // Short text should use original 17px with 2.8px letter-spacing
  // As text gets longer, letter-spacing scales down (e.g. from 2.8px to 1.0px) and font size scales down
  
  // Approximate character-width model calibrated to Inter 800 uppercase
  const charWidths = {
    ' ': 0.28,
    'I': 0.35, 'J': 0.45, 'L': 0.50, 'T': 0.55, 'F': 0.55,
    'M': 0.92, 'W': 0.95, '&': 0.78, '(': 0.38, ')': 0.38,
    '-': 0.40, '/': 0.45,
  };
  
  function measureString(str, fontSize, letterSpacing) {
    let w = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i].toUpperCase();
      const em = charWidths[ch] !== undefined ? charWidths[ch] : 0.68;
      w += em * fontSize;
      if (i < str.length - 1) {
        w += letterSpacing;
      }
    }
    return w;
  }

  // Iterate downward from 17px to find best fit
  const candidateSizes = [
    { fontSize: 17, letterSpacing: 2.8 },
    { fontSize: 16.5, letterSpacing: 2.6 },
    { fontSize: 16, letterSpacing: 2.4 },
    { fontSize: 15.5, letterSpacing: 2.2 },
    { fontSize: 15, letterSpacing: 2.0 },
    { fontSize: 14.5, letterSpacing: 1.8 },
    { fontSize: 14, letterSpacing: 1.6 },
    { fontSize: 13.5, letterSpacing: 1.5 },
    { fontSize: 13, letterSpacing: 1.4 },
    { fontSize: 12.5, letterSpacing: 1.3 },
    { fontSize: 12, letterSpacing: 1.2 },
    { fontSize: 11.5, letterSpacing: 1.1 },
    { fontSize: 11, letterSpacing: 1.0 },
    { fontSize: 10.5, letterSpacing: 0.9 },
    { fontSize: 10, letterSpacing: 0.8 },
  ];

  for (const cfg of candidateSizes) {
    const w = measureString(text, cfg.fontSize, cfg.letterSpacing);
    if (w <= maxInnerWidth) {
      return {
        fontSize: `${cfg.fontSize}px`,
        letterSpacing: `${cfg.letterSpacing}px`,
        computedWidth: Math.round(w),
        fontSizeNum: cfg.fontSize,
        letterSpacingNum: cfg.letterSpacing,
      };
    }
  }

  // Minimum fallback
  const last = candidateSizes[candidateSizes.length - 1];
  return {
    fontSize: `${last.fontSize}px`,
    letterSpacing: `${last.letterSpacing}px`,
    computedWidth: Math.round(measureString(text, last.fontSize, last.letterSpacing)),
    fontSizeNum: last.fontSize,
    letterSpacingNum: last.letterSpacing,
  };
}

for (const t of titles) {
  const res = getAdaptiveRibbonTypography(t);
  console.log(`${t.padEnd(52)} => size: ${res.fontSize.padEnd(6)} ls: ${res.letterSpacing.padEnd(5)} width: ${res.computedWidth}px (<= 520: ${res.computedWidth <= 520})`);
}
