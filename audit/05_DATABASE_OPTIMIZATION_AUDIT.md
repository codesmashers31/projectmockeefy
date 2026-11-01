# Phase 5: Database Optimization Audit

**Audit Target:** MongoDB Atlas (`mockeefy` database) & Mongoose 8.21.0 ODM  
**Date:** November 1, 2026  
**Auditor:** Principal Database Optimization Specialist  

---

## 1. Executive Summary

The database architecture is built on MongoDB Atlas with 26 Mongoose schema models. While core models (`Session`, `Otp`, `PricingRule`, `SavedExpert`) feature targeted compound indexes, several high-traffic collections (`User`, `WalletTransaction`) suffer from **missing indexes**, forcing full collection scans (`COLLSCAN`) on admin user filtering and candidate wallet transaction lookups.

---

## 2. Model-by-Model Indexing & Query Analysis

### 1. `User.js` Collection (`users`)
- **Current Indexes:**
  - `_id`: Default unique index
  - `email`: Unique index (`unique: true`)
  - `googleId`: Sparse unique index (`sparse: true`)
- **Missing Critical Indexes:**
  - `{ userType: 1, createdAt: -1 }`: Frequently queried in Admin tables (`PendingExpertsTable`, `UsersTable`, `userAdminRoutes.js`). Currently executes an unindexed collection scan across all registered users.
  - `{ isPremium: 1 }`: Queried for subscription metrics and premium candidate filtering.
- **Security Concern:**
  - Password hash is stored on the root user schema without `{ select: false }`. Any `.find()` or `.findOne()` call that forgets to specify `.select('-password')` risks leaking bcrypt password hashes to API consumers.
- **Recommendation:**
  ```javascript
  userSchema.index({ userType: 1, createdAt: -1 });
  userSchema.index({ isPremium: 1 });
  // Add select: false to password field
  password: { type: String, required: true, select: false },
  ```

---

### 2. `WalletTransaction.js` Collection (`wallettransactions`)
- **Location:** `server/models/WalletTransaction.js`
- **Current Indexes:**
  - `_id`: Default unique index
  - `walletId`: Single index (`index: true`)
- **Critical Missing Index:**
  - `userId`: **Not indexed!** (Lines 10-14: `userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }`).
- **Impact:** When an expert or candidate visits their wallet dashboard or requests transaction history, MongoDB performs an unindexed scan across all transactions in the entire platform. As the transaction ledger grows, this endpoint's latency will degrade exponentially.
- **Recommendation:**
  ```javascript
  walletTransactionSchema.index({ userId: 1, createdAt: -1 });
  walletTransactionSchema.index({ status: 1 });
  ```

---

### 3. `Session.js` Collection (`sessions`)
- **Location:** `server/models/Session.js`
- **Current Indexes (Audited):**
  - `sessionId`: Unique index (`unique: true`)
  - `{ expertId: 1, status: 1 }`: Compound index
  - `{ candidateId: 1, status: 1 }`: Compound index
  - `{ startTime: 1, status: 1 }`: Compound index
- **Assessment:** **EXCELLENT.** The session collection is indexed for high-frequency queries (expert calendars, candidate bookings, and cron reminder scans).

---

### 4. `PaymentRecord.js` Collection (`paymentrecords`)
- **Location:** `server/models/PaymentRecord.js`
- **Current Indexes (Audited):**
  - `paymentId`: Unique index (`unique: true, index: true`)
  - `orderId`: Indexed (`index: true`)
  - `userId`: Indexed (`index: true`)
- **Assessment:** **EXCELLENT.** Directly supports anti-replay attack lookups in $O(1)$ time complexity (`IXSCAN`).

---

### 5. `Otp.js` Collection (`otps`)
- **Location:** `server/models/Otp.js`
- **Current Indexes (Audited):**
  - `{ createdAt: 1 }` with `expireAfterSeconds: 300`
- **Assessment:** **EXCELLENT.** Uses MongoDB's native TTL (Time-To-Live) background thread to automatically purge expired OTP documents after 5 minutes without manual cron scripts.

---

## 3. Database Connection Pool & Network Timeout Settings

- **Location:** `server/config/db.js`
- **Current Implementation:**
  ```javascript
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });
  ```
- **Observations:**
  - `maxPoolSize` defaults to 100 in Mongoose 8. On serverless or low-memory cloud instances (e.g. Render starter tier), 100 idle connections can exhaust MongoDB Atlas connection limits.
  - Missing `socketTimeoutMS` and `minPoolSize`.
- **Recommended Configuration:**
  ```javascript
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,     // Close inactive sockets after 45s
    maxPoolSize: 50,             // Maintain up to 50 active sockets
    minPoolSize: 5,              // Keep 5 warm connections ready
  });
  ```

---

## 4. Transaction & ACID Safety Review

- **Status:** **PASS in Wallet and Webhooks.**
- In `server/controllers/webhookController.js` and `server/controllers/walletController.js`, multi-document financial updates (debiting wallet, updating payout status, inserting transaction ledger) correctly use MongoDB Sessions and transactions:
  ```javascript
  const session = await mongoose.startSession();
  session.startTransaction();
  // ... writes with { session }
  await session.commitTransaction();
  ```
- This guarantees ACID atomicity and prevents inconsistent balances in the event of an unexpected database failure midway through a payout.

---

## 5. Prioritized Database Remediation Plan

| Priority | Action Item | Target Model | Expected Result |
|---|---|---|---|
| **P1** | Add compound index `{ userId: 1, createdAt: -1 }` | `WalletTransaction.js` | Transforms wallet queries from COLLSCAN to IXSCAN (sub-5ms) |
| **P1** | Add compound index `{ userType: 1, createdAt: -1 }` | `User.js` | Eliminates table lag on Admin dashboard |
| **P2** | Add connection pool limits (`maxPoolSize: 50`, `minPoolSize: 5`) | `config/db.js` | Eliminates connection starvation on MongoDB Atlas |
| **P2** | Add `{ select: false }` to `password` field | `User.js` | Eliminates risk of accidental password hash exposure |
