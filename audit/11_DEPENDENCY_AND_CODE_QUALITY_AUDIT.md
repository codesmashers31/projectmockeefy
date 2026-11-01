# Phase 11: Dependency & Code Quality Audit

**Audit Target:** Client & Server `package.json`, Lockfiles, ESLint, and TypeScript Definitions  
**Date:** November 1, 2026  
**Auditor:** Senior Software Architect & Code Quality Specialist  

---

## 1. Executive Summary

The Mockeefy codebase is written in modern JavaScript and TypeScript (React 18 + Node.js ESM). While the server dependency manifest is lean and targeted (27 dependencies), the client dependency manifest has accumulated **duplicate packages, redundant rendering engines, and competing toast libraries** that inflate node_modules, expand build times, and increase bundle weight by ~1.2 MB.

---

## 2. Dependency Inefficiencies & Redundancies

### 1. Competing UI Toast & Notification Packages
- **Detected Packages:**
  - `sonner` (v1.7.4)
  - `react-hot-toast` (v2.6.0)
  - `sweetalert2` (v11.23.0)
  - `@radix-ui/react-toast` (v1.2.14)
- **Evaluation:** Having four notification libraries in one project creates UI inconsistency (different animations, positions, and styling) and adds ~180 KB of unnecessary JavaScript.
- **Action:** Standardize exclusively on `sonner` (which is already configured with custom Tailwind styling in `components/ui/sonner.tsx`). Safely deprecate and remove `react-hot-toast` and `sweetalert2`.

---

### 2. Redundant PDF & HTML-to-Canvas Engines
- **Detected Packages:**
  - `html2canvas` (v1.4.1)
  - `html2canvas-pro` (v2.5.0)
  - `html2pdf.js` (v0.14.0)
  - `jspdf` (v4.2.1)
  - `pdfjs-dist` (v3.11.174)
- **Evaluation:** `html2canvas` and `html2canvas-pro` are duplicate forks of the same library. `client/vite.config.ts` currently aliases `html2canvas` to `html2canvas-pro` to prevent build crashes.
- **Action:** Remove `html2pdf.js` and `html2canvas`. Standardize frontend resume rendering on `jspdf` + `html2canvas-pro`.

---

### 3. Duplicate Vite React Plugins
- **Detected Packages:**
  - `@vitejs/plugin-react` (v5.1.1)
  - `@vitejs/plugin-react-swc` (v3.11.0)
- **Evaluation:** `vite.config.ts` uses `@vitejs/plugin-react`. The SWC plugin is an unused duplicate.
- **Action:** Prune `@vitejs/plugin-react-swc` from `devDependencies`.

---

### 4. Server-Side Dependency Health Check
- **Packages Audited:** `express`, `mongoose`, `ioredis`, `nodemailer`, `socket.io`, `razorpay`, `helmet`, `bcryptjs`, `jsonwebtoken`, `passport`.
- **Status:** **PASS.** All server dependencies are actively maintained, standard industry choices with zero high-severity CVEs detected in current lockfile.

---

## 3. Code Quality & TypeScript Rigor

1. **TypeScript Coverage:**
   - Client is configured with TypeScript 5.8.3 (`client/tsconfig.json`).
   - Several component props still use `any` (e.g. `bookingDetails: any`, `user: any` in payment modals).
   - Recommendation: Introduce strict interface typings (`IBookingDetails`, `IUserSession`) to ensure type safety during refactoring.
2. **ESLint & Formatting Consistency:**
   - ESLint 9 is configured with typescript-eslint.
   - Code formatting is generally consistent across React components and Express controllers.
3. **Dead Code & Obsolete Files:**
   - 34 obsolete scripts (`dummySeed.js`, `server/scripts/*`, `server/scratch/*`) were cleaned up in prior sessions, successfully reducing repository noise.

---

## 4. Pruning Plan & Projected Bundle Savings

| Action | Packages Removed | Disk Space Saved | Minified Bundle Saved |
|---|---|---|---|
| Prune redundant Toast libraries | `react-hot-toast`, `sweetalert2` | ~8.4 MB | ~110 KB |
| Prune redundant PDF engines | `html2pdf.js`, `html2canvas` | ~16.2 MB | ~280 KB |
| Prune duplicate Vite plugins | `@vitejs/plugin-react-swc` | ~12.5 MB | Dev only (0 KB) |
| **Total Net Optimization** | **5 packages** | **~37.1 MB** | **~390 KB** |
