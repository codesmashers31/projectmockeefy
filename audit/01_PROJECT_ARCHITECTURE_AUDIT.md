# Phase 1: Project Architecture Audit Report

**Project Name:** Mockeefy (Interview Mock Platform)  
**Audit Date:** November 1, 2026  
**Auditor:** Principal Full-Stack Architect & DevSecOps Engineer  
**Inspection Mode:** Read-Only Codebase Discovery  

---

## 1. Executive Architecture Summary

Mockeefy is a full-stack, real-time interview preparation and mentorship booking platform built on a decoupled **React (Vite) + Node.js (Express ESM) + MongoDB Atlas** architecture. It facilitates candidate-to-expert interview sessions, WebRTC/Jitsi video meetings, subscription plans, digital wallet transactions, resume parsing, and automated notifications.

```
+----------------------------------------------------------------------------------------------------+
|                                         CLIENT (React 18)                                          |
|  - Vite 7.3.1 SPA, React Router DOM 6.30, Tailwind CSS v4, Radix UI Primitive Components         |
|  - TanStack React Query v5.83 (Partial), Custom Context (AuthContext, ResumeContext)               |
+-------------------------------------------------+--------------------------------------------------+
                                                  |
                                   HTTP / REST    |  WebSocket / WSS
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                        API GATEWAY / SERVER                                        |
|  - Node.js (v20+), Express 4.21.1 (ES Modules), HTTP Server                                        |
|  - Middleware: Helmet CSP, MongoSanitize, CORS Whitelist, CookieParser, ExpressRateLimit           |
|  - Socket.IO 4.8.1 (Realtime updates & WebRTC signaling)                                           |
+------------------------+---------------------------------+-----------------------------------------+
                         |                                 |
                         v                                 v
+--------------------------------------+   +------------------------------------+   +----------------+
|           DATA PERSISTENCE           |   |       EXTERNAL INTEGRATIONS        |   | CACHING LAYER  |
|  - MongoDB Atlas (Mongoose 8.21.0)   |   |  - Razorpay (Payments & Webhooks)  |   |  - ioredis     |
|  - 26 Schema Models                  |   |  - GoDaddy SMTP (Nodemailer 9.0)   |   |  - In-Memory   |
|  - Cloudinary (CDN Asset Storage)    |   |  - Google OAuth 2.0 (Passport)     |   |    Fallback    |
|  - Local disk storage (uploads/)     |   |  - Jitsi Meet SDK / WebRTC         |   |    Adapter     |
+--------------------------------------+   +------------------------------------+   +----------------+
```

---

## 2. Technology Stack & Framework Inventory

### Frontend
- **Runtime & Build Tool:** Vite 7.3.1, Node.js, TypeScript 5.8.3
- **Core UI Libraries:** React 18.3.1, React DOM 18.3.1
- **Styling:** Tailwind CSS 4.1.17 (`@tailwindcss/vite`), `clsx`, `tailwind-merge`, `class-variance-authority`
- **Routing:** React Router DOM 6.30.1 (Single-page app routing)
- **Data Fetching & State:** `@tanstack/react-query` 5.83.0 (used in selected components), React Context API (`AuthContext`, `ResumeContext`), Axios 1.12.2
- **UI Components:** 25+ `@radix-ui` primitives, Lucide React 0.462.0, Motion 12.26.2, Sonner 1.7.4, React Hot Toast 2.6.0, SweetAlert2 11.23.0
- **Rich Media & Canvas:** Three.js 0.160.0 (`@react-three/fiber`, `@react-three/drei`), jsPDF 4.2.1, `html2canvas-pro` 2.5.0, `pdfjs-dist` 3.11.174, Recharts 2.15.4

### Backend
- **Runtime:** Node.js (ES Modules `"type": "module"`), Express 4.21.1
- **Database ODM:** Mongoose 8.21.0 connected to MongoDB Atlas
- **Realtime Layer:** Socket.IO 4.8.1 and custom WebRTC signaling protocol (`websocket/signaling.js`)
- **Authentication:** JWT (`jsonwebtoken` 9.0.2), `bcryptjs` 2.4.3, Passport.js 0.7.0 (`passport-google-oauth20`)
- **Security Middleware:** Helmet 8.1.0 (CSP, Frameguard), `express-mongo-sanitize` 2.2.0, `express-rate-limit` 8.5.2, CORS 2.8.5
- **Caching Layer:** `ioredis` 6.0.0 with automatic zero-downtime in-memory fallback adapter (`cacheService.js`)
- **Scheduled Background Tasks:** `node-cron` 4.2.1 (`services/schedulerService.js`, `jobs/reconciliationJob.js`)
- **Payment Processing:** Razorpay Node SDK 2.9.6 (Orders, Webhook validation, Anti-replay verification via `PaymentRecord`)
- **Email Delivery:** Nodemailer 9.0.1 configured with GoDaddy SMTP (`smtpout.secureserver.net:465`)
- **File Uploads:** Multer 1.4.5-lts.1 + Cloudinary 2.9.0 (`multer-storage-cloudinary` 2.2.1) + Local disk fallback (`uploads/`)

---

## 3. Component Architecture & Routing Flow

Frontend routing is defined in `client/src/App.tsx`. All routes are wrapped inside `BrowserRouter`, `QueryClientProvider`, `AuthProvider`, and `ResumeProvider`.

### Route Breakdown
1. **Public Visitor Routes:**
   - `/` (`Index.tsx`) - Landing page with hero, mentor search, pricing teasers.
   - `/plans` (`SubscriptionPlans.tsx`) - Membership pricing tier selection (Free, Pro ₹1, Ultimate ₹2).
   - `/terms`, `/privacy`, `/refund-cancellation`, `/return-policy`, `/shipping-policy` - Legal and compliance pages.
   - `/auth/login`, `/auth/register`, `/auth/forgot-password` - Authentication pages wrapped in `GuestRoute`.
2. **Candidate Protected Routes (`RoleBasedRoute` `allowedRoles={['candidate', 'admin']}`):**
   - `/find-mentor` (`FindMentor.tsx`) - Search and filter verified mentors.
   - `/expert/:id` (`ExpertProfilePage.tsx`) - Expert public profile and review display.
   - `/book/:id` (`BookSessionPage.tsx`) - Slot selection, interview topics, and booking modal.
   - `/payment` (`PaymentPage.tsx`) - Razorpay checkout integration with instant plan hydration.
   - `/my-sessions` (`MySessions.tsx`) - Candidate session manager and calendar.
   - `/user-profile` (`UserProfile.tsx`) - Profile editing, resume uploads, skill preferences.
   - `/resume-builder` (`ResumeBuilderPage.tsx`) - Drag-and-drop resume builder with PDF export.
   - `/ai-interview` (`AiInterview.tsx`) - AI mock interview simulation.
3. **Expert Protected Routes (`RoleBasedRoute` `allowedRoles={['expert', 'admin']}`):**
   - `/expert/dashboard` (`DashboardIndex.tsx`) - Analytics, earnings, session metrics.
   - `/expert/profile`, `/expert/sessions`, `/expert/availability`, `/expert/skills`, `/expert/settings`, `/expert/withdrawal` (`WithdrawalPage.tsx`).
4. **Admin Routes (`RoleBasedRoute` `allowedRoles={['admin']}`):**
   - `/admin` (`AdminPage.tsx`) - Verification table, pricing rules, system management.
   - `/admin/pricing-rules`, `/admin/certification-rules`, `/admin/hr-contacts`.
5. **Real-Time Meeting Room:**
   - `/live-meeting/:sessionId` (`LiveMeeting.tsx`) - Jitsi Meet WebRTC integration.

### Identified Routing Architectural Bottleneck
- **Zero Route-Level Code Splitting:** `client/src/App.tsx` contains **55 static top-level imports**. Every single page (including heavy Admin panels, 3D Canvas, PDF generation, Recharts, and AI Interview) is loaded synchronously in the initial JavaScript bundle (`index-*.js`, **12.05 MB** uncompressed).

---

## 4. Backend API Structure & Route Inventory

The Express API exposes 24 specialized route modules mounted under `/api`:

| Route Prefix | Controller / Service | Purpose | Auth Required |
|---|---|---|---|
| `/api/auth` | `authController.js` | Login, Register, Google OAuth, OTP verification | No (Rate-limited) |
| `/api/expert` | `expertController.js` | Expert directory, profile updates, availability | Partial |
| `/api/user` | `userProfileController.js` | Candidate profile, preferences, resume upload | Yes (JWT) |
| `/api/sessions` | `sessionController.js` | Session CRUD, cancellations, rescheduling | Yes (JWT) |
| `/api/notifications` | `notificationController.js`| Real-time user notification feed | Yes (JWT) |
| `/api/payment` | `paymentController.js` | Razorpay order creation, payment verification | Yes (JWT) |
| `/api/wallet` | `walletController.js` | Balance, ledger transactions, payouts | Yes (JWT) |
| `/api/payouts` | `payoutController.js` | Mentor payout requests & bank details | Yes (JWT) |
| `/api/webhooks` | `webhookController.js` | Razorpay payout & capture webhooks | Signature Verified |
| `/api/admin` | `adminController.js` | Expert approvals, user bans, analytics | Admin Only |
| `/api/pricing` | `pricingController.js` | Dynamic session pricing calculation | Partial |
| `/api/categories` | `categoryController.js`| Interview categories & domain taxonomy | No (Public) |
| `/api/skills` | `skillController.js` | Skill tag directory | No (Public) |
| `/api/meetings` | `meetingController.js` | Meeting token generation & WebRTC room metadata | Yes (JWT) |
| `/api/reviews` | `reviewController.js` | Session ratings and feedback | Yes (JWT) |
| `/api/reports` | `reportController.js` | User violation reports | Yes (JWT) |

---

## 5. Database Architecture & Data Models

The system defines **26 Mongoose models** stored in MongoDB Atlas:
1. `User.js` - Central user document (candidate, expert, admin, walletBalance, isPremium, premiumPlan).
2. `expertModel.js` - Expert profile, bios, social links, verification status, hourly rates.
3. `Session.js` - Booking lifecycle (scheduled slots, candidateId, expertId, meetingLink, status).
4. `PaymentRecord.js` - Verified payment audit ledger (prevents replay attacks).
5. `Wallet.js` & `WalletTransaction.js` - Financial double-entry ledger for experts.
6. `PayoutRequest.js` & `PayoutMethod.js` - Bank transfer payout records.
7. `Category.js` & `Skill.js` - Domain tagging and search taxonomy.
8. `PricingRule.js` & `PricingHistory.js` - Dynamic pricing engine.
9. `Notification.js` - Push/in-app alert records.
10. `Otp.js` - Time-to-live (TTL 300s) transient verification codes.
11. `Resume.js` - Parsed resume data structures.
12. `Meeting.js` & `AiSession.js` - Live video session states and AI interview records.
13. `WebhookLog.js` - Idempotency store for external payment callbacks.

---

## 6. Payment & Financial Pipeline

1. **Client Plan Selection / Booking:** Client requests an order via `/api/payment/create-order` with the calculated price.
2. **Razorpay Order Creation:** Backend SDK creates an authorized order with Razorpay in INR paise.
3. **Checkout Modal:** Razorpay standard modal triggers in the browser.
4. **Verification Handshake:**
   - Client submits `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to `/api/payment/verify-payment`.
   - Backend calculates HMAC SHA-256 using `RAZORPAY_KEY_SECRET`.
   - Anti-replay check: Backend queries `PaymentRecord.findOne({ paymentId })`. If already exists, aborts with 400.
   - Upon verification, user's `isPremium` / `freeInterviewsCount` or candidate `Session` is updated.
   - `PaymentRecord` document created to lock the payment ID permanently.

---

## 7. Email Dispatch Architecture

- **Engine:** Nodemailer 9.0.1 connecting via GoDaddy Secure Server (`smtpout.secureserver.net:465`).
- **Templates:** HTML emails for booking confirmation, expert allocation, session reminders, OTP verification, and password resets.
- **Async Execution:** Email triggers in `paymentController.js` run asynchronously via unawaited Promise chains to prevent blocking HTTP client responses.

---

## 8. Deployment & Environment Setup

- **Frontend Hosting:** Render / Vercel SPA deployment with rewrite rule to `index.html`.
- **Backend Hosting:** Render Web Service (`https://projectmockeefy.onrender.com` / Node.js runtime).
- **Environment Separation:** Server `.env` holds MongoDB URI, Razorpay credentials, GoDaddy SMTP auth, and JWT secrets. Client `.env` contains only public variables (`VITE_API_URL`, `VITE_RAZORPAY_KEY_ID`, `VITE_GOOGLE_CLIENT_ID`).
