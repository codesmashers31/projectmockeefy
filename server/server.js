import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

// Dev Server
import { initScheduler } from "./services/schedulerService.js";
import { initSocket } from "./services/socketService.js";
import { initReconciliationJob } from "./jobs/reconciliationJob.js";
import { verifyEmailConnection } from "./services/emailService.js";
import attachSignaling from "./websocket/signaling.js";
import passport from "passport";
import session from "express-session";
import "./config/passport.js"; // Import passport config

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import expertRoutes from "./routes/expertRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import userAdminRoutes from './routes/userAdminRoutes.js';
import adminRoutes from './routes/adminRoutes.js';


import categoryRoutes from "./routes/categoryRoutes.js";
import aiSessionRoutes from "./routes/aiSessionRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";

import pricingRoutes from "./routes/pricingRoutes.js";
import savedExpertRoutes from "./routes/savedExpertRoutes.js";
import certificationRoutes from "./routes/certificationRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import tipsRoutes from "./routes/tipsRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import hrContactRoutes from "./routes/hrContactRoutes.js";
import certificationRuleRoutes from "./routes/certificationRuleRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

await connectDB();
initScheduler();
initReconciliationJob();
verifyEmailConnection().catch((err) => console.warn("[EmailService] Verification warning:", err.message));

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://interviewmock.vercel.app",
  "https://www.interviewmock.vercel.app",
  "https://ownproject-interview.vercel.app",
  "https://www.ownproject-interview.vercel.app",
  "https://interviewmock.onrender.com",
  "https://ownproject-interview.onrender.com",
  "https://mockeefy.com",
  "https://www.mockeefy.com",
  "https://mockeefy.onrender.com",
  "https://projectb-yqmq.onrender.com",
  "https://projectmockeefy.onrender.com",
  "https://projectmockeefy.vercel.app",
  "https://www.projectmockeefy.vercel.app",
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

const isDev = process.env.NODE_ENV !== "production";
const devOriginRegex = /^https?:\/\/[^/]+:(5173|5174)$/;
const localDevRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const renderFrontendRegex = /^https:\/\/[a-z0-9-]+\.onrender\.com$/;

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (isDev && (localDevRegex.test(origin) || devOriginRegex.test(origin))) return true;
  if (renderFrontendRegex.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);
    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(cookieParser());

// Security headers for Google Auth (COOP/COEP) - REMOVED to fix net::ERR_FAILED
// app.use((req, res, next) => {
//   res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
//   res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
//   res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
//   next();
// });

// Enable trust proxy for Render/Heroku (required for secure cookies)
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const io = initSocket(httpServer, {
  origin: (requestOrigin, callback) => {
    if (isOriginAllowed(requestOrigin)) return callback(null, true);
    console.log(`[Socket CORS] Blocked origin: ${requestOrigin}`);
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST"],
  credentials: true,
});

attachSignaling(io);

// Middleware
app.use(express.json());

// Security Hardening (Phase 2 & 5.2)
app.use(helmet({
  crossOriginResourcePolicy: false,
  frameguard: { action: "sameorigin" }, // allow images to load across domains
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://checkout.razorpay.com"], // Required for React and Razorpay
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://*.googleusercontent.com"],
      connectSrc: ["'self'", "https://api.razorpay.com", "ws:", "wss:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(mongoSanitize()); // Prevent NoSQL Injection

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 99999, // relax limits in dev mode to prevent 429 errors
  message: "Too many requests from this IP, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Specific Auth Brute-Force Protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 15 : 100,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/send-otp', authLimiter);
// serve uploaded images (dev)
app.use("/uploads/profileImages", express.static(path.join(process.cwd(), "uploads/profileImages")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Debug logging endpoint for client error diagnosis
app.all("/api/debug-log", (req, res) => {
  const logEntry = `[${new Date().toISOString()}] DEBUG LOG: ${JSON.stringify(req.body || req.query)}\n`;
  console.log(logEntry);
  fs.appendFileSync(path.join(process.cwd(), "debug_events.log"), logEntry, "utf8");
  res.json({ success: true });
});

// Monitor all /api/user/resumes requests
app.use("/api/user/resumes", (req, res, next) => {
  const logEntry = `[${new Date().toISOString()}] RESUMES REQ: ${req.method} ${req.url} - Auth: ${!!req.headers.authorization} - UserId: ${req.headers.userid} - CT: ${req.headers['content-type']}\n`;
  console.log(logEntry);
  fs.appendFileSync(path.join(process.cwd(), "debug_events.log"), logEntry, "utf8");
  next();
});

// mount routers
app.use("/api/auth", authRoutes);
app.use("/api/expert", expertRoutes);
app.use("/api/user", userProfileRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/ai-interview', aiSessionRoutes);
app.use('/api/admin/users', userAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/user/saved-experts', savedExpertRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/tips', tipsRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/hr-contacts', hrContactRoutes);
app.use('/api/certification-rules', certificationRuleRoutes);

// Global error handling middleware (catches Multer and other uncaught route errors)
app.use((err, req, res, next) => {
  console.error("[Server Error]", err?.message || err);
  if (err?.name === "MulterError" || err?.code?.startsWith?.("LIMIT_")) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File size exceeds the 10MB limit." });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "An unexpected server error occurred."
    });
  }
  next();
});

const PORT = process.env.PORT || 5000;

// Serve static assets in production
// Serve static assets in production
// if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
//   // Serve static files from the client/dist directory
//   // app.use(express.static(path.join(process.cwd(), '../client/dist')));

//   // Handle SPA routing: serve index.html for any unknown routes
//   // app.get('*', (req, res) => {
//   //   res.sendFile(path.join(process.cwd(), '../client/dist/index.html'));
//   // });
// }

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Reload trigger

