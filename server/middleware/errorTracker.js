import logger from "../config/logger.js";

export const errorTracker = (err, req, res, _next) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode: err.status || 500,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    userAgent: req.headers["user-agent"],
  };

  logger.error("Request error:", errorLog);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
};
