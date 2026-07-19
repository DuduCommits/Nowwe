import "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { initDB } from "./db.js";
import groupsRouter from "./routes/groups.js";
import membersRouter from "./routes/members.js";
import expensesRouter from "./routes/expenses.js";
import balancesRouter from "./routes/balances.js";
import scenariosRouter from "./routes/scenarios.js";
import reportsRouter from "./routes/reports.js";
import categoriesRouter from "./routes/categories.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { errorTracker } from "./middleware/errorTracker.js";
import logger from "./config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security Headers ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── Compression ───────────────────────────────────────────────
app.use(compression({ level: 6 }));

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = process.env.NODE_ENV === "production"
  ? ["https://balance-board.netlify.app", process.env.FRONTEND_URL].filter(Boolean)
  : ["http://localhost:5173", "http://0.0.0.0:5173"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── HTTP Logging ──────────────────────────────────────────────
app.use(morgan("combined", {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.path === "/api/health",
}));

// ── Global Rate Limiting ──────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later 🙏" },
});

// ── Write Operation Rate Limiting ─────────────────────────────
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Slow down! Max 20 writes per minute 🙏" },
});

app.use(globalLimiter);

// ── Initialize Database ──────────────────────────────────────
initDB();

// ── API Routes ───────────────────────────────────────────────
app.use("/api/groups", writeLimiter, groupsRouter);
app.use("/api/groups", writeLimiter, membersRouter);
app.use("/api/expenses", writeLimiter, expensesRouter);
// Also mount at /api so GET /api/groups/:id/expenses resolves correctly
app.use("/api", expensesRouter);
app.use("/api/groups", balancesRouter);
app.use("/api/groups", scenariosRouter);
app.use("/api/groups", reportsRouter);
app.use("/api/groups", writeLimiter, categoriesRouter);

// ── Health Check ─────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    checks: {},
  };

  try {
    const { getDB } = await import("./db.js");
    getDB().prepare("SELECT 1").get();
    health.checks.database = "ok";
  } catch {
    health.checks.database = "failed";
    health.status = "degraded";
  }

  const mem = process.memoryUsage();
  health.checks.memory = {
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
  };

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

// ── Serve React Build in Production ──────────────────────────
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientBuildPath));

  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(clientBuildPath, "index.html"));
    }
  });
}

// ── Error Handler Chain ──────────────────────────────────────
app.use(errorHandler);
app.use(errorTracker);

// ── Graceful Shutdown ────────────────────────────────────────
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`🌿 BalanceBoard API running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
});

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down...`);

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after 30s");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  process.exit(1);
});
