# Phase 6: Redis & Advanced Caching Strategy

**Audit Target:** Application Caching Architecture & Redis Integration  
**Date:** November 1, 2026  
**Auditor:** Principal Distributed Systems Architect  

---

## 1. Existing Caching Architecture Assessment

The Mockeefy project currently features an intelligent, multi-layer caching architecture introduced via `server/services/cacheService.js`:

```
Client (TanStack Query Cache)
             |
             v  HTTP Request
Express Server (cacheMiddleware)
             |
      +------+------+
      |             |
      v             v
ioredis Cluster   In-Memory Adapter (Zero-downtime Fallback)
(If REDIS_URL)    (LRU Map with TTL & auto-cleanup)
```

### Key Architectural Strengths Already Implemented
1. **Zero-Downtime Fallback Adapter:** If `REDIS_URL` is omitted (e.g. local Windows development or low-cost cloud dyno), `cacheService.js` automatically routes all `.get()`, `.set()`, `.del()`, and `.flush()` calls to an internal high-performance in-memory Map with automatic TTL eviction. No crashes or unhandled connection exceptions occur.
2. **Dynamic Redis Connectivity:** When a valid `REDIS_URL` (Redis Cloud, Upstash, or local redis-server) is provided in `.env`, `ioredis` establishes a persistent connection with reconnect backoff and keepalive pings.

---

## 2. API Endpoint Caching Classification

To maximize performance without introducing stale data risks or security vulnerabilities, every API endpoint is classified into one of four distinct caching tiers:

| Tier | Endpoints | Recommended Cache Strategy | TTL | Invalidation Trigger |
|---|---|---|---|---|
| **Tier 1: Semi-Static Public Taxonomy** | `GET /api/categories`<br>`GET /api/skills`<br>`GET /api/pricing` | Redis / Memory (`public:taxonomy:*`) | 30 Minutes | Admin updates category, skill, or pricing rule |
| **Tier 2: Public Directory & Mentors** | `GET /api/expert`<br>`GET /api/expert/:id` | Redis / Memory (`expert:list:*`, `expert:profile::id`) | 5 Minutes | Expert updates profile, rates, or availability |
| **Tier 3: User Dashboard & Private Data** | `GET /api/user/profile`<br>`GET /api/sessions/my-sessions`<br>`GET /api/wallet` | TanStack Query (Client-side) + Scoped Redis (`user::uid:sessions`) | 2 Minutes | Payment verification, session booking, or profile update |
| **Tier 4: Transactional & Sensitive** | `POST /api/payment/create-order`<br>`POST /api/payment/verify-payment`<br>`POST /api/webhooks/*`<br>`POST /api/auth/*` | **STRICTLY NEVER CACHE** | 0s | Immediate real-time execution; Anti-replay via DB |

---

## 3. Cache Key Specifications & Invalidation Rules

### Key Formatting Standard
All cache keys follow a namespaced hierarchical convention:
`mockeefy:{environment}:{entity}:{scope}:{identifier}`

Examples:
- `mockeefy:prod:categories:all` (TTL: 1800s)
- `mockeefy:prod:expert:profile:64f1a2b...` (TTL: 300s)
- `mockeefy:prod:user:sessions:64f1a2b...` (TTL: 120s)

### Cache Invalidation Hooks
To prevent users from seeing outdated calendar slots or stale pricing:
1. **On Admin Pricing Update (`POST /api/admin/pricing-rules`):**
   - Execute `cacheService.del('mockeefy:prod:pricing:*')`.
2. **On Expert Profile Save (`PUT /api/expert/profile`):**
   - Execute `cacheService.del('mockeefy:prod:expert:profile:' + expertId)`.
   - Invalidate directory cache: `cacheService.del('mockeefy:prod:expert:list:*')`.
3. **On Payment Verification (`POST /api/payment/verify-payment`):**
   - Invalidate candidate session cache: `cacheService.del('mockeefy:prod:user:sessions:' + candidateId)`.
   - Invalidate expert calendar cache: `cacheService.del('mockeefy:prod:user:sessions:' + expertId)`.

---

## 4. Cache Stampede & Penetration Safeguards

1. **Cache Stampede Protection (Probabilistic Early Expiration):**
   - When a popular key (such as `/api/categories` or top mentors) expires, hundreds of concurrent requests could hit MongoDB simultaneously.
   - Mitigation: Add jitter to TTL values (`ttl + Math.floor(Math.random() * 60)`) so keys do not expire at the exact same millisecond.
2. **Cache Penetration Protection (Null Caching):**
   - If a malicious user queries a non-existent expert ID (`/api/expert/9999999999`), caching a short-lived `null` result (TTL 30s) prevents repeated malicious database queries.

---

## 5. Security & Isolation Guidelines

- **NEVER Cache Financial Payloads:** Razorpay order secrets, webhook payloads, and wallet transaction ledgers must bypass all caches to guarantee authoritative ledger accuracy.
- **Tenant Isolation:** Cache keys containing user data must always include the authenticated `req.user.id` extracted from the verified JWT. Never use client-supplied query parameters or headers for user identification.
- **Redis Outage Behavior:** If Redis experiences network partition, `cacheService.js` logs a single warning and transparently falls back to the local in-memory adapter without dropping user requests.
