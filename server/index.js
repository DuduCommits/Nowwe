import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDB } from "./db.js";
import groupsRouter from "./routes/groups.js";
import membersRouter from "./routes/members.js";
import expensesRouter from "./routes/expenses.js";
import balancesRouter from "./routes/balances.js";
import scenariosRouter from "./routes/scenarios.js";
import reportsRouter from "./routes/reports.js";
import categoriesRouter from "./routes/categories.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL, "https://balance-board.netlify.app"].filter(Boolean)
    : ["http://localhost:5173", "http://0.0.0.0:5173"],
  credentials: true,
}));
app.use(express.json());

// ── Initialize Database ──────────────────────────────────────
initDB();

// ── API Routes ───────────────────────────────────────────────
app.use("/api/groups", groupsRouter);
app.use("/api/groups", membersRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/groups", balancesRouter);
app.use("/api/groups", scenariosRouter);
app.use("/api/groups", reportsRouter);
app.use("/api/groups", categoriesRouter);

// ── Health Check ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "BalanceBoard API is running 🌿",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ── Serve React Build in Production ──────────────────────────
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientBuildPath));

  // All non-API routes serve the React app (client-side routing)
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(clientBuildPath, "index.html"));
    }
  });
}

// ── Error Handler ────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  🌿 BalanceBoard API
  ─────────────────────
  Port:       ${PORT}
  Environment: ${process.env.NODE_ENV || "development"}
  Database:   SQLite (${process.env.NODE_ENV === "production" ? "ephemeral — use PostgreSQL for production" : "local"})
  `);
});
