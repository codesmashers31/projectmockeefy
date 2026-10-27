import crypto from "crypto";

/**
 * Normalizes a name string by removing common honorifics, role tags, punctuation, and extra spaces.
 */
export function normalizeName(name = "") {
  return name
    .toLowerCase()
    .replace(/\s*\((expert|coach|mentor|candidate|admin|user)\)\s*/gi, "")
    .replace(/\b(expert|coach|mentor)\b/gi, "")
    .replace(/\b(mr|mrs|ms|miss|dr|prof|shri|shree|smt)\b\.?/gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Checks if two tokens are equal or have minor transliteration/phonetic variations
 */
function areTokensFuzzyEqual(t1, t2) {
  if (t1 === t2) return true;
  if (t1.length >= 4 && t2.length >= 4) {
    const dist = levenshteinDistance(t1, t2);
    if (dist === 1 && Math.abs(t1.length - t2.length) <= 1) return true;
    if (dist <= 2 && Math.min(t1.length, t2.length) >= 7) return true;
  }
  return false;
}

/**
 * Compares an Account Name and an Aadhaar Legal Name.
 * Handles Indian name conventions, initials (e.g. "R. Rajesh Kumar", "Rajesh Kumar R",
 * "S. John Doe", "Godson A"), reordered tokens, and spacing variations.
 * 
 * @param {string} accountName - The name on Mockeefy account profile
 * @param {string} aadhaarName - The legal name on Aadhaar card returned by UIDAI
 * @returns {{
 *   score: number,
 *   status: "MATCH" | "MISMATCH",
 *   isAcceptable: boolean,
 *   reason: string
 * }}
 */
export function compareNames(accountName = "", aadhaarName = "") {
  const normAccount = normalizeName(accountName);
  const normAadhaar = normalizeName(aadhaarName);

  if (!normAccount || !normAadhaar) {
    return {
      score: 0,
      status: "MISMATCH",
      isAcceptable: false,
      reason: "Name is missing on account or Aadhaar"
    };
  }

  // 1. Exact Match (case-insensitive & whitespace normalized)
  if (normAccount === normAadhaar) {
    return {
      score: 100,
      status: "MATCH",
      isAcceptable: true,
      reason: "Exact name match"
    };
  }

  // 2. Exact match ignoring spaces (e.g. "Arockia Raj" vs "Arockiaraj")
  const compactAccount = normAccount.replace(/\s+/g, "");
  const compactAadhaar = normAadhaar.replace(/\s+/g, "");
  if (compactAccount === compactAadhaar) {
    return {
      score: 98,
      status: "MATCH",
      isAcceptable: true,
      reason: "Exact match (spacing variation)"
    };
  }

  const tokensA = normAccount.split(" ").filter(Boolean);
  const tokensB = normAadhaar.split(" ").filter(Boolean);

  // 3. Exact permutation (e.g. "Rajesh Kumar" vs "Kumar Rajesh")
  if (
    tokensA.length === tokensB.length &&
    [...tokensA].sort().join(" ") === [...tokensB].sort().join(" ")
  ) {
    return {
      score: 95,
      status: "MATCH",
      isAcceptable: true,
      reason: "Exact name components match in different order"
    };
  }

  // 4. Advanced Name & Initial Matching
  const matchedA = new Set();
  const matchedB = new Set();

  // Pass 1: Exact and fuzzy token matches
  for (let i = 0; i < tokensA.length; i++) {
    for (let j = 0; j < tokensB.length; j++) {
      if (matchedA.has(i) || matchedB.has(j)) continue;
      if (areTokensFuzzyEqual(tokensA[i], tokensB[j])) {
        matchedA.add(i);
        matchedB.add(j);
      }
    }
  }

  // Pass 2: Concatenation matches (e.g. ['arockia', 'raj'] vs ['arockiaraj'])
  for (let i = 0; i < tokensA.length - 1; i++) {
    if (matchedA.has(i) || matchedA.has(i + 1)) continue;
    const combinedA = tokensA[i] + tokensA[i + 1];
    for (let j = 0; j < tokensB.length; j++) {
      if (matchedB.has(j)) continue;
      if (combinedA === tokensB[j] || areTokensFuzzyEqual(combinedA, tokensB[j])) {
        matchedA.add(i);
        matchedA.add(i + 1);
        matchedB.add(j);
      }
    }
  }
  for (let j = 0; j < tokensB.length - 1; j++) {
    if (matchedB.has(j) || matchedB.has(j + 1)) continue;
    const combinedB = tokensB[j] + tokensB[j + 1];
    for (let i = 0; i < tokensA.length; i++) {
      if (matchedA.has(i)) continue;
      if (combinedB === tokensA[i] || areTokensFuzzyEqual(combinedB, tokensA[i])) {
        matchedB.add(j);
        matchedB.add(j + 1);
        matchedA.add(i);
      }
    }
  }

  // Pass 3: Initial to full name expansion (e.g. 'r' matches 'raman' or 'rajesh')
  for (let i = 0; i < tokensA.length; i++) {
    if (matchedA.has(i)) continue;
    for (let j = 0; j < tokensB.length; j++) {
      if (matchedB.has(j)) continue;
      const tokA = tokensA[i];
      const tokB = tokensB[j];

      // tokA is initial, tokB is full word
      if (tokA.length === 1 && tokB.length > 1 && tokB.startsWith(tokA)) {
        matchedA.add(i);
        matchedB.add(j);
        break;
      }
      // tokB is initial, tokA is full word
      if (tokB.length === 1 && tokA.length > 1 && tokA.startsWith(tokB)) {
        matchedA.add(i);
        matchedB.add(j);
        break;
      }
      // Both are single-letter initials and equal
      if (tokA.length === 1 && tokB.length === 1 && tokA === tokB) {
        matchedA.add(i);
        matchedB.add(j);
        break;
      }
    }
  }

  // Check remaining unmatched tokens
  const unmatchedA = tokensA.filter((_, idx) => !matchedA.has(idx));
  const unmatchedB = tokensB.filter((_, idx) => !matchedB.has(idx));

  // Non-initial unmatched tokens (words of length > 1)
  const nonInitialUnmatchedA = unmatchedA.filter(t => t.length > 1);
  const nonInitialUnmatchedB = unmatchedB.filter(t => t.length > 1);

  // At least one substantial word (length >= 3) MUST have matched between both names
  const hasSubstantialMatch = Array.from(matchedA).some(idx => tokensA[idx].length >= 3) ||
                              Array.from(matchedB).some(idx => tokensB[idx].length >= 3);

  // Conflicting full words in BOTH names (e.g. "Amit Sharma" vs "Rahul Sharma")
  if (nonInitialUnmatchedA.length > 0 && nonInitialUnmatchedB.length > 0) {
    return {
      score: 30,
      status: "MISMATCH",
      isAcceptable: false,
      reason: `Conflicting name components found: "${nonInitialUnmatchedA.join(' ')}" vs "${nonInitialUnmatchedB.join(' ')}"`
    };
  }

  // If at least one substantial name component matched and there are no conflicting full words:
  if (hasSubstantialMatch && (matchedA.size > 0 || matchedB.size > 0)) {
    const totalTokens = Math.max(tokensA.length, tokensB.length);
    const matchedCount = Math.max(matchedA.size, matchedB.size);
    const score = Math.min(95, Math.round((matchedCount / totalTokens) * 100));

    return {
      score,
      status: "MATCH",
      isAcceptable: true,
      reason: "Name components and initials matched successfully"
    };
  }

  return {
    score: 0,
    status: "MISMATCH",
    isAcceptable: false,
    reason: "Name on Aadhaar does not match profile name"
  };
}

/**
 * Creates a one-way cryptographic SHA-256 hash of an Aadhaar number.
 * Used to enforce uniqueness across accounts without storing plain 12-digit Aadhaar.
 */
export function hashAadhaar(aadhaarNumber = "") {
  const clean = aadhaarNumber.toString().replace(/\D/g, "");
  const secretSalt = process.env.AADHAAR_HASH_SALT || "mockeefy_aadhaar_salt_2026";
  return crypto.createHash("sha256").update(`${clean}_${secretSalt}`).digest("hex");
}
