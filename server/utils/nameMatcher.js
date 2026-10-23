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
 * Compares an Account Name and an Aadhaar Legal Name with STRICT EXACT matching.
 * Both names must consist of the exact same components.
 * 
 * @param {string} accountName - The name on Mockeefy account (e.g. "Godson Arockia Raj")
 * @param {string} aadhaarName - The legal name returned by UIDAI (e.g. "Godson Arockia Raj")
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

  // Exact Match (case-insensitive & whitespace normalized)
  if (normAccount === normAadhaar) {
    return {
      score: 100,
      status: "MATCH",
      isAcceptable: true,
      reason: "Exact name match"
    };
  }

  // Token order check (e.g. "Arockia Raj Godson" vs "Godson Arockia Raj")
  // Both names must contain the exact same set of name components/tokens
  const accountTokens = normAccount.split(" ").filter(Boolean).sort();
  const aadhaarTokens = normAadhaar.split(" ").filter(Boolean).sort();

  if (
    accountTokens.length === aadhaarTokens.length &&
    accountTokens.every((tok, idx) => tok === aadhaarTokens[idx])
  ) {
    return {
      score: 100,
      status: "MATCH",
      isAcceptable: true,
      reason: "Exact name components match"
    };
  }

  // If tokens differ (e.g. "Godson" vs "Godson Arockia Raj") -> Strict mismatch!
  return {
    score: 0,
    status: "MISMATCH",
    isAcceptable: false,
    reason: "Name in Aadhaar is not same as profile name."
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
