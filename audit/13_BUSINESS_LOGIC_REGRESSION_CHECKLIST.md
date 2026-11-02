# Phase 13: Business Logic Regression Checklist

**Purpose:** Comprehensive Verification Protocol to Guarantee Zero Breaking Changes to Existing Business Logic  
**Date:** November 1, 2026  
**Auditor:** Principal Full-Stack Quality Assurance Architect  

---

## 1. Prime Directive: Zero Business Logic Regression

> [!IMPORTANT]
> **MANDATE:** No optimization may alter, break, rename, or eliminate existing user flows, pricing structures, API contracts, database fields, or UI styling. All optimizations must be drop-in architectural improvements that preserve 100% of functional parity.

---

## 2. Exhaustive Verification Checklist by Domain

### Domain 1: Authentication & User Accounts
- [ ] **Email & Password Login:** Candidate, Expert, and Admin roles authenticate and receive signed JWT.
- [ ] **OTP Verification:** Transient OTP generated via `Otp.js` (TTL 300s) and sent via GoDaddy SMTP.
- [ ] **Google OAuth 2.0:** One-tap Google sign-in creates or updates candidate user without error.
- [ ] **Session Continuity:** Reloading the browser maintains authenticated state without white flicker (`AuthContext.tsx`).
- [ ] **Role-Based Guards:** `RoleBasedRoute` permits authorized roles and redirects unauthorized users to `/login`.

---

### Domain 2: Subscription Plans & Pricing
- [ ] **Plan Tiers:**
  - Free Plan: ₹0 (1 trial interview)
  - Pro Plan: ₹1 (3 mock interview credits during testing)
  - Ultimate Plan: ₹2 (6 mock interview credits during testing)
- [ ] **Plan Highlighting:** Active user plan is highlighted with badge on `/plans` and `/payment`.
- [ ] **Navbar Membership Badge:** `Navigation.tsx` renders "Pro Member (X credits)" or "Ultimate Member (X credits)".
- [ ] **1-Click Checkout:** Clicking "Upgrade" or "Get Started" launches Razorpay standard modal without redirect loops.

---

### Domain 3: Payment Verification & Anti-Replay Ledger
- [ ] **HMAC Signature Check:** Backend verifies `razorpay_signature` against `RAZORPAY_KEY_SECRET`.
- [ ] **Anti-Replay Security:** Resubmitting an identical `razorpay_payment_id` is blocked with HTTP 400.
- [ ] **User Upgrade:** Upon verification, `User.isPremium = true`, `premiumPlan = planId`, `freeInterviewsCount` credited.
- [ ] **Payment Record:** Verified payment is inserted into `PaymentRecord` collection.

---

### Domain 4: Candidate Mentor Booking & Scheduling
- [ ] **Mentor Directory:** `/find-mentor` displays mentor cards with rating, category, hourly rate, and badges.
- [ ] **Calendar Slots:** Candidate selects available date/time defined in expert's `availability`.
- [ ] **Credit Deduction:** Premium candidate can book using 1 free credit without paying cash (`/use-premium-credit`).
- [ ] **Direct Payment Booking:** Candidate can book via Razorpay checkout; session created with status `'confirmed'`.
- [ ] **Session Record:** Session is saved with `sessionId`, `startTime`, `endTime`, `expertId`, `candidateId`.

---

### Domain 5: Transactional Email & Notifications
- [ ] **Expert Allocation Email:** Nodemailer dispatches detailed meeting notification to expert with candidate info.
- [ ] **Candidate Confirmation Email:** Candidate receives confirmation with session date, time slot, and meeting link.
- [ ] **In-App Realtime Sync:** Socket.IO pushes `SESSION_CREATED` event; notification bell count increments.
- [ ] **Async Dispatch:** Email transmission runs asynchronously without causing HTTP client timeouts.

---

### Domain 6: Expert Dashboard & Availability
- [ ] **Dashboard Metrics:** Total sessions, earnings, upcoming bookings render accurately.
- [ ] **Availability Editor:** Expert can define and update recurring weekly slots or date overrides.
- [ ] **Withdrawal & Wallet:** Expert can view available balance, frozen balance, and request bank payouts.

---

### Domain 7: Live Video Meeting & WebRTC Signaling
- [ ] **Meeting URL Resolution:** Candidate and Expert navigate to `/live-meeting/:sessionId`.
- [ ] **Jitsi / WebRTC Handshake:** Video, audio, and chat establish connections without peer disconnects.
- [ ] **Session Completion:** Finishing the meeting updates `Session.status` to `'completed'`.

---

### Domain 8: Resume Builder & PDF Generation
- [ ] **Editor Interface:** Candidate can fill out personal details, education, experience, skills, and projects.
- [ ] **Realtime Preview:** Layout updates reactively without DOM re-render lag.
- [ ] **PDF Download:** Clicking "Download PDF" invokes `jspdf` / `html2canvas-pro` and exports formatted document.

---

### Domain 9: Admin Dashboard & Control Panel
- [ ] **Expert Approval Workflow:** Admin can approve or reject pending mentor applications (`PendingExpertsTable`).
- [ ] **User Management:** Admin can view, search, and manage registered candidates and experts (`UsersTable`).
- [ ] **Pricing Rules:** Admin can configure category multipliers and base pricing (`PricingRules.tsx`).

---

## 3. Regression Safeguard Rules for Code Modifications

1. **Rule of Signatures:** Never alter function parameters, return shapes, or HTTP status codes of existing API endpoints.
2. **Rule of Database Schema:** Never delete existing fields from Mongoose schemas; only append optional fields or indexes.
3. **Rule of Route Paths:** Never alter React Router paths or Express router mount points.
4. **Rule of Visual Fidelity:** Never alter color tokens, typography, component spacing, or UI layout designs.
