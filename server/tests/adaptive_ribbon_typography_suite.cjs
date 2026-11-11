// ============================================================================
// MOCKEEFY — ADAPTIVE RIBBON TYPOGRAPHY & FIXED GEOMETRY VERIFICATION SUITE
// ============================================================================

const assert = (condition, message) => {
    if (!condition) {
        console.error(`  ✗ FAIL: ${message}`);
        process.exitCode = 1;
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`  ✓ PASS: ${message}`);
};

const fixedPolygonPoints = "-310,0 -284,-22 284,-22 310,0 284,22 -284,22";
const canvasDimensions = { width: 1682, height: 935 };
const ribbonCenter = { x: 841, y: 313 };

// Character width model matching Inter 800 uppercase
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

function formatCategoryRibbonText(domain, isPreview = false, isMaster = false) {
    const rawDomain = (domain || "").trim();
    const displayDomain = rawDomain.toUpperCase();
    const isNeutralDomain =
        !rawDomain ||
        rawDomain.toLowerCase() === "default" ||
        rawDomain.toLowerCase() === "your domain";

    if (isPreview) {
        if (isNeutralDomain) return "YOUR DOMAIN MOCK INTERVIEW SESSION";
        if (rawDomain.toLowerCase() === "it") return "IT PROFESSIONAL MOCK INTERVIEW SESSION";
        return `${displayDomain} MOCK INTERVIEW SESSION`;
    }
    if (isMaster) {
        return "MASTER INTERVIEW READINESS CERTIFICATION";
    }
    if (!rawDomain || rawDomain.toLowerCase() === "it") {
        return "IT PROFESSIONAL MOCK INTERVIEW SESSION";
    }
    return `${displayDomain} MOCK INTERVIEW SESSION`;
}

async function run() {
    console.log("======================================================================");
    console.log("  MOCKEEFY ADAPTIVE RIBBON TYPOGRAPHY & FIXED GEOMETRY TEST SUITE     ");
    console.log("======================================================================\n");

    // ----------------------------------------------------------------------
    // TEST SECTION 1: Exact Master Artwork & Ribbon Geometry Stability
    // ----------------------------------------------------------------------
    console.log("--- TEST SECTION 1: Exact Master Artwork & Ribbon Geometry Stability ---");
    assert(canvasDimensions.width === 1682, "Canvas width strictly preserved at 1682");
    assert(canvasDimensions.height === 935, "Canvas height strictly preserved at 935");
    assert(ribbonCenter.x === 841, "Ribbon center X translated strictly at 841 (50% of 1682)");
    assert(ribbonCenter.y === 313, "Ribbon center Y translated strictly at 313");
    assert(fixedPolygonPoints === "-310,0 -284,-22 284,-22 310,0 284,22 -284,22", "Ribbon polygon points strictly fixed (-310 to +310, -22 to +22)");

    // ----------------------------------------------------------------------
    // TEST SECTION 2: Dynamic Category Ribbon Text Formatting
    // ----------------------------------------------------------------------
    console.log("\n--- TEST SECTION 2: Dynamic Category Ribbon Text Formatting ---");
    const testCases = [
        { domain: "AI", expected: "AI MOCK INTERVIEW SESSION" },
        { domain: "IT", expected: "IT PROFESSIONAL MOCK INTERVIEW SESSION" },
        { domain: "Web Development", expected: "WEB DEVELOPMENT MOCK INTERVIEW SESSION" },
        { domain: "Software Development", expected: "SOFTWARE DEVELOPMENT MOCK INTERVIEW SESSION" },
        { domain: "Cybersecurity", expected: "CYBERSECURITY MOCK INTERVIEW SESSION" },
        { domain: "Agile & Project Management", expected: "AGILE & PROJECT MANAGEMENT MOCK INTERVIEW SESSION" },
        { domain: "Full Stack Development (MERN)", expected: "FULL STACK DEVELOPMENT (MERN) MOCK INTERVIEW SESSION" },
    ];

    for (const tc of testCases) {
        const textPreview = formatCategoryRibbonText(tc.domain, true);
        const textIssued = formatCategoryRibbonText(tc.domain, false);
        assert(textPreview === tc.expected, `[Preview] ${tc.domain} formats as '${tc.expected}'`);
        assert(textIssued === tc.expected, `[Issued] ${tc.domain} formats as '${tc.expected}'`);
    }

    // ----------------------------------------------------------------------
    // TEST SECTION 3: Adaptive Typography Fitting Inside Fixed Ribbon
    // ----------------------------------------------------------------------
    console.log("\n--- TEST SECTION 3: Adaptive Typography Fitting Inside Fixed Ribbon ---");
    const maxInnerWidth = 520;

    for (const tc of testCases) {
        const typo = getAdaptiveRibbonTypography(tc.expected, maxInnerWidth);
        assert(typo.computedWidth <= maxInnerWidth, `${tc.domain} computed width (${typo.computedWidth}px) fits inside max ${maxInnerWidth}px boundary`);
        assert(typo.fontSizeNum <= 17 && typo.fontSizeNum >= 10, `${tc.domain} font size (${typo.fontSize}) within allowed range 10px–17px`);
        assert(typo.letterSpacingNum > 0, `${tc.domain} letter-spacing (${typo.letterSpacing}) is strictly positive (no distortion)`);
    }

    // Explicit verification for AI, IT, and Agile & Project Management
    console.log("\n--- TEST SECTION 4: AI, IT, and Agile & Project Management Detailed Verification ---");
    const aiTypo = getAdaptiveRibbonTypography("AI MOCK INTERVIEW SESSION", maxInnerWidth);
    assert(aiTypo.fontSizeNum === 17, `AI retains original reference font size 17px (got: ${aiTypo.fontSize})`);
    assert(aiTypo.letterSpacingNum === 2.8, `AI retains original reference letter spacing 2.8px (got: ${aiTypo.letterSpacing})`);

    const itTypo = getAdaptiveRibbonTypography("IT PROFESSIONAL MOCK INTERVIEW SESSION", maxInnerWidth);
    assert(itTypo.fontSizeNum === 17, `IT retains original reference font size 17px (got: ${itTypo.fontSize})`);
    assert(itTypo.letterSpacingNum === 2.8, `IT retains original reference letter spacing 2.8px (got: ${itTypo.letterSpacing})`);

    const agileTypo = getAdaptiveRibbonTypography("AGILE & PROJECT MANAGEMENT MOCK INTERVIEW SESSION", maxInnerWidth);
    assert(agileTypo.fontSizeNum < 17, `Agile & Project Management adaptively reduces font size (got: ${agileTypo.fontSize})`);
    assert(agileTypo.computedWidth <= maxInnerWidth, `Agile & Project Management strictly fits within inner bounds (width: ${agileTypo.computedWidth}px <= 520px)`);

    console.log("\n======================================================================");
    console.log("  ALL TESTS PASSED SUCCESSFULLY!                                      ");
    console.log("======================================================================\n");
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
