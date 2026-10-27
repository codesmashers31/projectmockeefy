/**
 * sandboxAadhaarService.js
 * Service for Aadhaar OTP-based verification using Sandbox.co.in OKYC APIs.
 * Includes automatic dev/mock fallback if Sandbox API credentials are not yet configured
 * or if UIDAI government servers are temporarily down (Source Unavailable).
 */

// In-memory token cache for Sandbox.co.in
let cachedToken = null;
let tokenExpiresAt = 0;

// In-memory store for dev/mock OTP sessions: Map<referenceId, { otp, aadhaarNumber, expiresAt } >
const mockOtpSessions = new Map();

// Helper: Clean up expired mock sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [refId, session] of mockOtpSessions.entries()) {
    if (session.expiresAt < now) {
      mockOtpSessions.delete(refId);
    }
  }
}, 60000);

/**
 * Format Aadhaar number to masked format: •••• •••• 1234
 */
export function maskAadhaar(aadhaarNumber) {
  if (!aadhaarNumber) return "";
  const clean = aadhaarNumber.toString().replace(/\D/g, "");
  const last4 = clean.slice(-4);
  return `•••• •••• ${last4}`;
}

// --- Verhoeff Checksum Algorithm (UIDAI Standard) ---
const verhoeffD = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const verhoeffP = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

/**
 * Validates 12-digit number against the Verhoeff checksum
 */
export function validateVerhoeff(str) {
  let c = 0;
  const digits = String(str).split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) {
    c = verhoeffD[c][verhoeffP[i % 8][digits[i]]];
  }
  return c === 0;
}

// In-memory rate limiter: userId -> [timestamp1, timestamp2, ...]
const otpRateLimits = new Map();
// Failed OTP attempt tracker: referenceId -> count
const otpVerifyAttempts = new Map();

/**
 * Rate limit check: Max 5 OTP sends per 10 minutes per user
 */
export function checkAadhaarRateLimit(userId) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxAttempts = 5;

  const timestamps = (otpRateLimits.get(userId) || []).filter(ts => now - ts < windowMs);

  if (timestamps.length >= maxAttempts) {
    const oldest = timestamps[0];
    const waitSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return {
      allowed: false,
      waitSeconds,
      message: `Too many OTP requests. Please wait ${Math.ceil(waitSeconds / 60)} minute(s) before requesting another OTP.`
    };
  }

  return { allowed: true };
}

/**
 * Records an OTP send event for rate limiting once all pre-checks succeed
 */
export function recordAadhaarOtpSend(userId) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const timestamps = (otpRateLimits.get(userId) || []).filter(ts => now - ts < windowMs);
  timestamps.push(now);
  otpRateLimits.set(userId, timestamps);
}

/**
 * Validates a 12-digit Aadhaar number format & Verhoeff checksum
 */
export function validateAadhaarFormat(aadhaarNumber) {
  const clean = (aadhaarNumber || "").toString().replace(/[\s-]/g, "");
  if (!/^\d{12}$/.test(clean)) {
    return { valid: false, message: "Aadhaar number must be exactly 12 digits." };
  }
  // Aadhaar numbers do not start with 0 or 1
  if (clean.startsWith("0") || clean.startsWith("1")) {
    return { valid: false, message: "Invalid Aadhaar number (cannot start with 0 or 1)." };
  }
  // Mathematical Verhoeff Checksum verification
  if (!validateVerhoeff(clean)) {
    return { valid: false, message: "Invalid Aadhaar number (checksum validation failed). Please double check the 12 digits." };
  }
  return { valid: true, cleanNumber: clean };
}

/**
 * Check if Sandbox API credentials are configured in environment
 */
function isSandboxConfigured() {
  if (process.env.SANDBOX_USE_MOCK === "true") return false;
  const apiKey = process.env.SANDBOX_API_KEY;
  const apiSecret = process.env.SANDBOX_API_SECRET;
  return Boolean(apiKey && apiSecret && apiKey.trim() !== "" && apiSecret.trim() !== "");
}

/**
 * Authenticates with Sandbox.co.in and retrieves access token (cached for 23 hours)
 */
async function getSandboxAccessToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const apiKey = process.env.SANDBOX_API_KEY?.trim();
  const apiSecret = process.env.SANDBOX_API_SECRET?.trim();
  const baseUrl = process.env.SANDBOX_BASE_URL?.trim() || "https://api.sandbox.co.in";

  const response = await fetch(`${baseUrl}/authenticate`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "x-api-secret": apiSecret,
      "x-api-version": "1.0.0",
      "Content-Type": "application/json"
    }
  });

  const data = await response.json().catch(() => null);
  const token = data?.data?.access_token || data?.access_token;

  if (!response.ok || !token) {
    const errorMsg = data?.message || data?.error || `HTTP ${response.status} failed to authenticate with Sandbox.co.in`;
    throw new Error(`Sandbox authentication error: ${errorMsg}`);
  }

  cachedToken = token;
  // Tokens are valid for 24 hours; refresh after 23 hours
  tokenExpiresAt = now + 23 * 60 * 60 * 1000;
  return cachedToken;
}

/**
 * Sends OTP to the Aadhaar-registered mobile number
 * @param {string} aadhaarNumber - 12-digit Aadhaar number
 * @param {string} aadhaarName - Full name entered by user
 * @returns {Promise<{ success: boolean, referenceId: string, message: string, maskedMobile?: string, isMock?: boolean, devOtp?: string }>}
 */
export async function sendAadhaarOtp(aadhaarNumber, aadhaarName = "") {
  const formatCheck = validateAadhaarFormat(aadhaarNumber);
  if (!formatCheck.valid) {
    throw new Error(formatCheck.message);
  }
  const cleanAadhaar = formatCheck.cleanNumber;

  if (!isSandboxConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      const devOtp = "123456";
      const refId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      mockOtpSessions.set(refId, {
        otp: devOtp,
        aadhaarNumber: cleanAadhaar,
        aadhaarName,
        expiresAt: Date.now() + 10 * 60 * 1000
      });
      return {
        success: true,
        referenceId: refId,
        message: `OTP sent to mobile registered with Aadhaar ending in ${cleanAadhaar.slice(-4)}.`,
        maskedMobile: `******${cleanAadhaar.slice(-4)}`,
        isMock: true,
        devOtp
      };
    }
    throw new Error("Sandbox API credentials are not configured in server/.env.");
  }

  const baseUrl = process.env.SANDBOX_BASE_URL?.trim() || "https://api.sandbox.co.in";
  const apiKey = process.env.SANDBOX_API_KEY?.trim();

  let lastError = null;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const token = await getSandboxAccessToken();
      console.log(`[SANDBOX SEND-OTP] Calling UIDAI Aadhaar OKYC OTP (Attempt ${attempt}/${maxAttempts}) for Aadhaar ${maskAadhaar(cleanAadhaar)}...`);

      const response = await fetch(`${baseUrl}/kyc/aadhaar/okyc/otp`, {
        method: "POST",
        headers: {
          "authorization": token,
          "x-api-key": apiKey,
          "x-api-version": "1.0.0",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
          "aadhaar_number": cleanAadhaar,
          "consent": "y",
          "reason": "Expert Identity Verification for Mockeefy"
        })
      });

      const result = await response.json().catch(() => null);
      console.log(`[SANDBOX SEND-OTP RESPONSE ${attempt}]:`, response.status, result);

      // Handle transient UIDAI 503 "Source Unavailable"
      if (response.status === 503 || (result?.message && result.message.toLowerCase().includes("source unavailable"))) {
        lastError = new Error("UIDAI government server is temporarily busy (Source Unavailable). Please wait a moment and try again.");
        if (attempt < maxAttempts) {
          console.warn(`[SANDBOX RETRY] UIDAI returned 503. Waiting 2s before attempt ${attempt + 1}...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        // In development mode, fallback to dev OTP when UIDAI returns 503
        if (process.env.NODE_ENV !== "production") {
          console.warn("[SANDBOX DEV FALLBACK] UIDAI returned 503 in development mode. Falling back to dev OTP session...");
          const devOtp = "123456";
          const refId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          mockOtpSessions.set(refId, {
            otp: devOtp,
            aadhaarNumber: cleanAadhaar,
            aadhaarName,
            expiresAt: Date.now() + 10 * 60 * 1000
          });
          return {
            success: true,
            referenceId: refId,
            message: `OTP sent to mobile registered with Aadhaar ending in ${cleanAadhaar.slice(-4)}.`,
            maskedMobile: `******${cleanAadhaar.slice(-4)}`,
            isMock: true,
            devOtp
          };
        }
        throw lastError;
      }

      if (!response.ok || (result?.code && result.code !== 200)) {
        const errMsg = result?.data?.message || result?.message || "Failed to send Aadhaar OTP to your registered mobile number.";
        throw new Error(errMsg);
      }

      const refId = result?.data?.reference_id?.toString() || result?.data?.referenceId?.toString();
      if (!refId) {
        const msg = result?.data?.message || result?.message || "";
        if (msg.toLowerCase().includes("try after") || msg.toLowerCase().includes("already")) {
          throw new Error("An OTP has already been sent to your Aadhaar-registered mobile. " + msg);
        }
        throw new Error(msg || "Could not generate reference ID from UIDAI. Please try again in 45 seconds.");
      }

      console.log(`[SANDBOX OTP SUCCESS] Reference ID generated: ${refId}. SMS dispatched by UIDAI to mobile registered with Aadhaar.`);

      return {
        success: true,
        referenceId: refId,
        message: result?.data?.message || `OTP sent to the mobile number registered with your Aadhaar ending in ${cleanAadhaar.slice(-4)}. Please check your SMS.`,
        maskedMobile: result?.data?.masked_mobile || `******${cleanAadhaar.slice(-4)}`,
        isMock: false
      };
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts && (err.message?.includes("fetch failed") || err.message?.includes("ECONNRESET") || err.message?.includes("ETIMEDOUT"))) {
        console.warn(`[SANDBOX RETRY] Connection error: ${err.message}. Retrying attempt ${attempt + 1}...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      // If error occurred and in dev mode, fallback to dev OTP
      if (process.env.NODE_ENV !== "production") {
        console.warn("[SANDBOX DEV FALLBACK] Sandbox request failed in development mode. Falling back to dev OTP session...", err.message);
        const devOtp = "123456";
        const refId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        mockOtpSessions.set(refId, {
          otp: devOtp,
          aadhaarNumber: cleanAadhaar,
          aadhaarName,
          expiresAt: Date.now() + 10 * 60 * 1000
        });
        return {
          success: true,
          referenceId: refId,
          message: `OTP sent to mobile registered with Aadhaar ending in ${cleanAadhaar.slice(-4)}.`,
          maskedMobile: `******${cleanAadhaar.slice(-4)}`,
          isMock: true,
          devOtp
        };
      }
      throw err;
    }
  }

  throw lastError || new Error("Failed to send OTP to Aadhaar registered mobile number. Please try again.");
}

/**
 * Verifies the OTP entered by the user
 * @param {object} params
 * @param {string} params.referenceId - Reference ID from sendAadhaarOtp
 * @param {string} params.otp - 6 digit OTP
 * @param {string} params.aadhaarNumber - 12 digit Aadhaar number
 * @param {string} params.aadhaarName - Profile name for simulation verification only
 * @returns {Promise<{ success: boolean, status: string, maskedAadhaar: string, name?: string, message: string }>}
 */
export async function verifyAadhaarOtp({ referenceId, otp, aadhaarNumber, aadhaarName = "" }) {
  if (!referenceId) throw new Error("Reference ID is required.");
  if (!otp || otp.toString().trim().length !== 6) {
    throw new Error("Please enter a valid 6-digit OTP.");
  }
  const cleanOtp = otp.toString().trim();
  const cleanAadhaar = (aadhaarNumber || "").toString().replace(/\D/g, "");

  // Track & enforce attempt limit (Max 3 failed attempts)
  const currentAttempts = (otpVerifyAttempts.get(referenceId) || 0) + 1;
  otpVerifyAttempts.set(referenceId, currentAttempts);

  // In development mode, if user enters test OTP 123456, accept immediately regardless of nodemon reloads or live UIDAI downtimes
  if (process.env.NODE_ENV !== "production" && cleanOtp === "123456") {
    console.log(`[SANDBOX DEV OVERRIDE] In development mode, accepting test OTP 123456 for refId: ${referenceId}`);
    otpVerifyAttempts.delete(referenceId);
    mockOtpSessions.delete(referenceId);
    return {
      success: true,
      status: "VALID",
      maskedAadhaar: maskAadhaar(cleanAadhaar || aadhaarNumber),
      name: aadhaarName,
      message: "Aadhaar verified successfully (Development Mode)."
    };
  }

  if (currentAttempts > 3) {
    mockOtpSessions.delete(referenceId);
    otpVerifyAttempts.delete(referenceId);
    throw new Error("Too many failed OTP attempts. For security, this OTP session has been locked. Please request a new OTP.");
  }

  // If mock/simulated referenceId (dev mode when sandbox is not configured or UIDAI is down)
  if (referenceId.startsWith("sim_") || mockOtpSessions.has(referenceId)) {
    const session = mockOtpSessions.get(referenceId);

    // If session lost due to server restart in development, allow universal test OTP 123456
    if (!session && process.env.NODE_ENV !== "production") {
      if (cleanOtp === "123456") {
        return {
          success: true,
          status: "VALID",
          maskedAadhaar: maskAadhaar(aadhaarNumber),
          name: aadhaarName,
          message: "Aadhaar verified successfully (Development Mode)."
        };
      }
      throw new Error("OTP session expired due to server restart. Please enter test OTP 123456 or request a new OTP.");
    }

    if (!session) {
      throw new Error("OTP session expired or invalid. Please request a new OTP.");
    }
    if (session.expiresAt < Date.now()) {
      mockOtpSessions.delete(referenceId);
      throw new Error("OTP has expired. Please request a new OTP.");
    }

    const isMatch = cleanOtp === session.otp || (process.env.NODE_ENV !== "production" && cleanOtp === "123456");
    if (!isMatch) {
      throw new Error(`Incorrect OTP entered (Attempt ${currentAttempts} of 3). Please enter the 6-digit test OTP 123456.`);
    }

    mockOtpSessions.delete(referenceId);
    otpVerifyAttempts.delete(referenceId);
    const actualNumber = session.aadhaarNumber || aadhaarNumber;
    return {
      success: true,
      status: "VALID",
      maskedAadhaar: maskAadhaar(actualNumber),
      name: session.aadhaarName || aadhaarName,
      message: "Aadhaar verified successfully."
    };
  }

  // Live Sandbox.co.in verification call
  const token = await getSandboxAccessToken();
  const baseUrl = process.env.SANDBOX_BASE_URL?.trim() || "https://api.sandbox.co.in";
  const apiKey = process.env.SANDBOX_API_KEY?.trim();

  console.log(`[SANDBOX VERIFY] Verifying OTP for refId: ${referenceId}`);

  const response = await fetch(`${baseUrl}/kyc/aadhaar/okyc/otp/verify`, {
    method: "POST",
    headers: {
      "authorization": token,
      "x-api-key": apiKey,
      "x-api-version": "1.0.0",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "@entity": "in.co.sandbox.kyc.aadhaar.okyc.request",
      "reference_id": referenceId.toString(),
      "otp": cleanOtp
    })
  });

  const result = await response.json().catch(() => null);
  console.log("[SANDBOX VERIFY RESPONSE]:", response.status, result);

  const data = result?.data || {};
  const errMsg = data?.message || result?.message || "";

  // 1. Success from Sandbox / UIDAI
  if (response.ok && (result?.code === 200 || !result?.code) && data.status === "VALID") {
    otpVerifyAttempts.delete(referenceId);
    return {
      success: true,
      status: "VALID",
      maskedAadhaar: maskAadhaar(aadhaarNumber),
      name: data.name, // Official legal name returned by UIDAI
      message: "Aadhaar verified successfully."
    };
  }

  const errLower = errMsg.toLowerCase();

  // 2. Dev Fallback for UIDAI Downtime (503 / Source Unavailable / 5xx)
  if (process.env.NODE_ENV !== "production" && (response.status === 503 || errLower.includes("source unavailable") || response.status >= 500)) {
    console.warn(`[SANDBOX DEV FALLBACK] UIDAI / Sandbox server error (${response.status}: ${errMsg}). Proceeding with verification in dev mode for "${aadhaarName}".`);
    otpVerifyAttempts.delete(referenceId);
    return {
      success: true,
      status: "VALID",
      maskedAadhaar: maskAadhaar(cleanAadhaar || aadhaarNumber),
      name: aadhaarName,
      message: "Aadhaar verified successfully (Dev Fallback: UIDAI server was busy)."
    };
  }

  if (response.status === 503 || errLower.includes("source unavailable")) {
    throw new Error("UIDAI government server is temporarily down (Source Unavailable). Please wait 1-2 minutes and request a new OTP.");
  }

  if (errLower.includes("expired")) {
    throw new Error("This OTP has expired or was already submitted. Please click 'Resend OTP' to request a new code.");
  }

  throw new Error(errMsg || `Invalid OTP entered (Attempt ${currentAttempts} of 3). Please verify and try again.`);
}
