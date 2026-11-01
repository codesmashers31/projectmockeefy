# Phase 7: Razorpay Payment Gateway Security & Performance Audit

**Audit Target:** Payment Controllers, Routes, Webhook Handlers, and Client Checkout Integration  
**Date:** November 1, 2026  
**Auditor:** Principal FinTech Security & Payment Systems Auditor  

---

## 1. Executive Summary

Mockeefy integrates Razorpay for two primary revenue streams: (1) Candidate subscription plans (Pro ₹1, Ultimate ₹2 during test phase) and (2) Expert interview session bookings. Recent security enhancements added an HMAC SHA-256 signature verification and an anti-replay ledger via `PaymentRecord.js`. However, our audit revealed **two critical security vulnerabilities** in order creation and webhook verification that require immediate mitigation before high-volume commercial scaling.

---

## 2. In-Depth Security Vulnerability Analysis

### Finding 1: Client-Supplied Price Tampering in Order Creation
- **Location:** `server/controllers/paymentController.js` (Lines 17-30)
- **Code:**
  ```javascript
  export const createOrder = async (req, res) => {
    try {
      const { amount, currency = 'INR', receipt } = req.body;
      if (!amount) {
        return res.status(400).json({ success: false, message: 'Amount is required' });
      }
      const options = {
        amount: amount * 100, // Razorpay works in paise
        currency,
        receipt,
      };
      const order = await razorpay.orders.create(options);
      res.status(200).json({ success: true, order });
  ```
- **Severity:** **HIGH**
- **Vulnerability:** The backend accepts `amount` directly from the untrusted client HTTP request body without validating it against the authoritative database pricing rule or expert session rate.
- **Exploitation Scenario:** A malicious user can intercept the `POST /api/payment/create-order` network request (via Chrome DevTools or curl) and submit `{ amount: 1 }` (₹1) instead of the legitimate session price of ₹1,500. Razorpay creates a valid ₹1 order. Upon payment completion, Razorpay verifies the ₹1 signature, and the session is booked at a 99% fraudulent discount.
- **Recommended Remediation:**
  - If `paymentType === 'subscription'`, validate `planId` against authoritative server constants (`pro-219` = ₹1 / ₹219, `ultimate-419` = ₹2 / ₹419).
  - If booking an interview session, fetch the canonical hourly rate directly from `ExpertDetails.findById(expertId)` on the server and calculate the exact price server-side:
    ```javascript
    // Authoritative Server-Side Price Calculation
    let canonicalAmount;
    if (planId === 'pro-219') canonicalAmount = 1;
    else if (planId === 'ultimate-419') canonicalAmount = 2;
    else {
      const expert = await ExpertDetails.findById(expertId);
      canonicalAmount = (expert.hourlyRate / 60) * duration;
    }
    ```

---

### Finding 2: Webhook Signature Verification Flaw (JSON.stringify vs. Raw Buffer)
- **Location:** `server/controllers/webhookController.js` (Lines 13-20)
- **Code:**
  ```javascript
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body; // express.json() parsed object

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  ```
- **Severity:** **HIGH**
- **Vulnerability:** Razorpay computes the webhook HMAC signature on the **raw binary bytes** transmitted over HTTP. Calling `JSON.stringify(body)` on an object already parsed by `express.json()` alters whitespace, key order, and Unicode escaping.
- **Impact:** Legitimate Razorpay webhooks (e.g. payout confirmations, chargebacks, refund events) will fail signature verification intermittently, causing dropped webhook events. Conversely, if signature verification is bypassed or tampered, unauthorized state changes could occur.
- **Recommended Remediation:**
  - Mount `express.raw({ type: 'application/json' })` specifically on the `/api/webhooks/razorpay` route to capture `req.rawBody` buffer:
    ```javascript
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(req.rawBody)
      .digest('hex');
    ```

---

### Finding 3: Anti-Replay Protection Gap for Session Bookings
- **Location:** `server/controllers/paymentController.js` (Lines 221-255 vs 258-345)
- **Severity:** **MEDIUM**
- **Issue:** The anti-replay check `const existingPayment = await PaymentRecord.findOne({ paymentId })` runs for all verification calls. However, when the payment is confirmed, `PaymentRecord.create()` is called **only inside the subscription branch** (`if (paymentType === 'subscription')`), but NOT inside the session booking branch (`if (bookingDetails)`).
- **Impact:** A candidate who books an interview session has their payment verified, but no `PaymentRecord` is created for that `paymentId`. Consequently, `existingPayment` will return `null` if the same payment ID is resubmitted, allowing replay of booking sessions.
- **Recommended Remediation:**
  - Move `PaymentRecord.create()` outside the conditional branch so every successfully verified payment (both subscriptions and bookings) is recorded in `PaymentRecord`.

---

## 3. Security Checklist & Best Practice Compliance

| Requirement | Current Status | Audit Verdict |
|---|---|---|
| Server-side Razorpay Secret Isolation | Stored strictly in `server/.env` (`RAZORPAY_KEY_SECRET`) | **PASS (Compliant)** |
| HMAC SHA-256 Signature Verification | Implemented with `crypto.createHmac` | **PASS (Compliant)** |
| Timing Safe String Comparison | `crypto.timingSafeEqual` used in webhook verification | **PASS (Compliant)** |
| Authoritative Amount Validation | Client sends `amount` in `createOrder` | **FAIL (Remediation Required)** |
| Raw Webhook Buffer Signature | `JSON.stringify(req.body)` used | **FAIL (Remediation Required)** |
| Anti-Replay Protection | Recorded for Subscriptions only | **PARTIAL (Extend to Bookings)** |
| Webhook Idempotency Check | `WebhookLog.findOne({ razorpayEventId })` | **PASS (Compliant)** |
| Free Plan Route Protection | JWT `protect` middleware enforced | **PASS (Compliant)** |

---

## 4. Remediation Plan

1. **Immediate (P0):** Enforce server-side authoritative price resolution in `createOrder` based on canonical plan IDs or verified expert hourly rates.
2. **Immediate (P0):** Capture `req.rawBody` buffer for webhook signature computation.
3. **P1:** Ensure `PaymentRecord.create()` records both session bookings and subscriptions.
4. **P2:** Configure webhook handler to respond with `HTTP 200 OK` within 2 seconds, dispatching long-running notifications to background execution.
