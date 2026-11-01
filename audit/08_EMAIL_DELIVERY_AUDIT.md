# Phase 8: Email Delivery Architecture & Security Audit

**Audit Target:** `server/services/emailService.js` & Nodemailer Integration  
**Date:** November 1, 2026  
**Auditor:** Senior Infrastructure & Communications Systems Engineer  

---

## 1. Executive Summary

Mockeefy relies on Nodemailer 9.0.1 connecting via GoDaddy Secure Server (`smtpout.secureserver.net:465` SSL) to deliver business-critical transactional emails: booking confirmation receipts, expert session allocation, password resets, and OTP verifications. While the service provides comprehensive HTML layouts, our audit identified **three significant operational and security issues**: lack of connection pooling, disabled TLS certificate validation, and absence of a persistent retry queue.

---

## 2. In-Depth Technical Findings

### Finding 1: Transporter Connection Instantiation & Disabled Connection Pooling
- **Location:** `server/services/emailService.js` (Lines 18-51)
- **Code:**
  ```javascript
  export const getTransporter = () => {
    // ...
    const transportOptions = {
      pool: false, // Connection pooling explicitly disabled
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    };
    return nodemailer.createTransport(transportOptions);
  };
  ```
- **Severity:** **MEDIUM / HIGH**
- **Impact:**
  - Calling `getTransporter()` for every email means every single message establishes a brand-new TCP socket and SSL/TLS handshake with GoDaddy's mail servers.
  - An SSL handshake over port 465 introduces **300ms to 1,500ms of latency per email**. Under a burst of candidate bookings, repeated TCP connection attempts risk GoDaddy rate-limiting the account (SMTP Error 421 / 451).
- **Remediation:** Convert transporter to a **singleton pooled connection**:
  ```javascript
  let cachedTransporter = null;
  export const getTransporter = () => {
    if (!cachedTransporter) {
      cachedTransporter = nodemailer.createTransport({
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 10, // Max 10 messages/sec
        host: cleanVal(process.env.SMTP_HOST) || "smtpout.secureserver.net",
        port: 465,
        secure: true,
        auth: { user, pass },
      });
    }
    return cachedTransporter;
  };
  ```

---

### Finding 2: Insecure TLS Certificate Verification (`rejectUnauthorized: false`)
- **Location:** `server/services/emailService.js` (Line 35)
- **Severity:** **HIGH (Security Risk)**
- **Issue:** Setting `rejectUnauthorized: false` instructs Node.js to ignore invalid, expired, or self-signed SSL certificates when connecting to the SMTP server.
- **Risk:** This leaves SMTP traffic vulnerable to Man-In-The-Middle (MITM) attacks if routing traverses an untrusted ISP or compromised proxy. Attackers could intercept password reset tokens, OTPs, or session details in plaintext.
- **Remediation:** Remove `rejectUnauthorized: false`. Since GoDaddy (`smtpout.secureserver.net`) provides a globally valid CA-signed SSL certificate, strict TLS verification should always be enforced.

---

### Finding 3: In-Memory / Unpersisted Dispatch Without Retry Queue
- **Location:** `server/controllers/paymentController.js` (Lines 326-337)
- **Severity:** **MEDIUM**
- **Issue:** Emails are triggered asynchronously via `.catch()`:
  ```javascript
  triggerBookingEmails({ ... }).catch((emailErr) => {
    console.error("[BookingPayment] Error in asynchronous triggerBookingEmails:", emailErr);
  });
  ```
- **Impact:** While fire-and-forget execution ensures the candidate gets their HTTP booking confirmation instantly without waiting for SMTP latency, if GoDaddy's server temporarily drops or throttles the connection, the email is permanently lost without a retry mechanism.
- **Remediation:** For enterprise durability, transactional emails should be queued into a Redis-backed queue (e.g. BullMQ) or logged to a `PendingEmail` MongoDB collection with exponential retry backoff.

---

### Finding 4: Domain Authentication (SPF, DKIM, DMARC)
- **Status:** **EXTERNAL PREREQUISITE**
- **Audit Requirement:** For emails sent from `@mockeefy.com` not to land in Candidate/Expert spam or junk folders, the DNS records must be configured:
  - **SPF:** `v=spf1 include:secureserver.net ~all`
  - **DKIM:** Generated via GoDaddy domain console and added as TXT record.
  - **DMARC:** `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@mockeefy.com`

---

## 3. Email Optimization Action Plan

| Priority | Task | Impact | Risk |
|---|---|---|---|
| **P1** | Convert transporter to Singleton Pooled Transporter (`pool: true, maxConnections: 5`) | Eliminates 300-1500ms handshake overhead; prevents rate-limits | Low |
| **P1** | Enforce Strict TLS Verification (`rejectUnauthorized: true`) | Prevents MITM packet sniffing on transactional emails | Low |
| **P2** | Add fallback retry logic for failed email attempts | Guarantees delivery even during transient SMTP outages | Low |
| **P3** | Verify SPF/DKIM DNS records on `mockeefy.com` domain | Eliminates Spam folder classification on Gmail/Outlook | Zero |
