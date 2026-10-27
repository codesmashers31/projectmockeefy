import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.SANDBOX_API_KEY?.trim();
const apiSecret = process.env.SANDBOX_API_SECRET?.trim();
const baseUrl = process.env.SANDBOX_BASE_URL?.trim() || "https://api.sandbox.co.in";

console.log("Testing Sandbox with:");
console.log("apiKey:", apiKey ? apiKey.slice(0, 8) + "..." : "NONE");
console.log("baseUrl:", baseUrl);

async function run() {
  try {
    const authRes = await fetch(`${baseUrl}/authenticate`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
        "x-api-version": "1.0.0",
        "Content-Type": "application/json"
      }
    });
    const authData = await authRes.json();
    console.log("Auth status:", authRes.status);
    console.log("Auth response:", authData);

    const token = authData?.data?.access_token || authData?.access_token;
    if (!token) {
      console.error("No token!");
      return;
    }

    // Try dummy aadhaar or check endpoint
    const testAadhaar = "999999990019"; // standard UIDAI test aadhaar
    console.log("\nTesting /kyc/aadhaar/okyc/otp with test aadhaar:", testAadhaar);
    const otpRes = await fetch(`${baseUrl}/kyc/aadhaar/okyc/otp`, {
      method: "POST",
      headers: {
        "authorization": token,
        "x-api-key": apiKey,
        "x-api-version": "1.0.0",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
        "aadhaar_number": testAadhaar,
        "consent": "y",
        "reason": "Expert Identity Verification for Mockeefy"
      })
    });
    console.log("OTP status:", otpRes.status);
    const otpData = await otpRes.json().catch(() => null);
    console.log("OTP response:", otpData);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

run();
