# Phase 10: Scalability & Cloud Deployment Report

**Audit Target:** Architecture Scalability, Horizontal Concurrency, and CI/CD Deployment  
**Date:** November 1, 2026  
**Auditor:** Principal Cloud Architect & DevSecOps Lead  

---

## 1. Executive Summary

Mockeefy currently operates as a decoupled single-region system deployed across **Vercel / Render Static Site (Frontend)** and **Render Web Service (Node.js Backend)** with **MongoDB Atlas (Database)**. 

While this architecture comfortably accommodates current traffic (< 1,000 daily active users), scaling to 10,000+ concurrent users or introducing horizontal autoscaling requires addressing three architectural bottlenecks: **Socket.IO cluster synchronization, in-process cron jobs, and local disk persistence**.

---

## 2. Horizontal Scaling Readiness Assessment

```
                      +-----------------------------+
                      |       CLOUD LOAD BALANCER   |
                      |  (Render / AWS ALB / NGINX) |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
      +-----------------+                         +-----------------+
      |  Node Worker 1  |                         |  Node Worker 2  |
      +--------+--------+                         +--------+--------+
               |                                           |
               +---------------------+---------------------+
                                     |
                                     v
                      +-----------------------------+
                      |         REDIS CLUSTER       |
                      |  - Socket.IO Redis Adapter  |
                      |  - Distributed Cron Locks   |
                      |  - API Response Cache       |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |      MONGODB ATLAS M10+     |
                      |    (Replica Set with HA)    |
                      +-----------------------------+
```

### Bottleneck 1: Socket.IO Clustering & Real-time WebRTC Signaling
- **Current State:** Socket.IO runs in-memory on a single Node.js instance (`server/services/socketService.js`).
- **Limitation:** If horizontal autoscaling spawns 2 or more backend containers, a candidate connected to Worker 1 will not receive session updates or WebRTC signaling messages sent by an expert connected to Worker 2.
- **Solution:** Add `@socket.io/redis-adapter` backed by `ioredis`. All socket broadcasts, meeting events, and status syncs will be published across all worker nodes seamlessly.

---

### Bottleneck 2: In-Process Cron Schedulers
- **Current State:** Scheduled tasks (`initScheduler`, `initReconciliationJob`) run via `node-cron` inside the web process.
- **Limitation:** In a 3-worker cluster, cron tasks fire 3 times simultaneously, producing duplicate reminder emails and concurrent database writes.
- **Solution:** Wrap cron task execution in a Redis distributed lock:
  ```javascript
  const acquired = await cacheService.acquireLock('cron:reconciliation', 55); // 55s TTL
  if (!acquired) return; // Another worker is already executing
  ```

---

### Bottleneck 3: Ephemeral File Uploads on Cloud Containers
- **Current State:** `server/server.js` serves static uploads via `express.static("uploads")`.
- **Limitation:** Modern cloud platforms (Render, Heroku, AWS ECS) use **ephemeral containers**. Whenever a dyno restarts or deploys, any images saved to the local `uploads/` directory are permanently deleted.
- **Solution:** Complete the transition to Cloudinary (`multer-storage-cloudinary`), which is already installed in `server/package.json`. All avatar and resume uploads should persist strictly to Cloudinary CDN, ensuring zero asset loss on container restarts.

---

## 3. Database Scaling & Connection Pooling (MongoDB Atlas)

- **Connection Pool Tuning:**
  - On a shared Atlas cluster (M0 / M2 / M5), max concurrent connections are capped (e.g. 500 connections).
  - Setting `maxPoolSize: 50` on 4 backend instances consumes 200 connections, leaving ample headroom for Atlas background tasks and CLI tooling.
- **Replica Set Read Preference:**
  - High-volume read queries (such as mentor search or category listings) can safely specify `.readPreference('secondaryPreferred')` to offload traffic from the primary database node.

---

## 4. Cloud Deployment Checklist

| Category | Requirement | Current Status | Remediation Required |
|---|---|---|---|
| **Frontend CDN** | Brotli compression & immutable asset caching (`Cache-Control: public, max-age=31536000, immutable`) | Configured via Vite output hash | **PASS** |
| **Backend Workers** | Process clustering via PM2 or Cloud Container Scaling | Single instance | Recommended on traffic spike |
| **Asset Persistence**| Zero local disk writes; 100% Cloudinary CDN storage | Partial (Local fallback exists) | Migrate 100% to Cloudinary |
| **Realtime Sync** | Redis Adapter for multi-worker Socket.IO | In-memory only | Integrate `@socket.io/redis-adapter` |
| **Health Checks** | `/healthz` or `/api/health` endpoint for load balancer probe | Missing | Add lightweight `/api/health` probe |
