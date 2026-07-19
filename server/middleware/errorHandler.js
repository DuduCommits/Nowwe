export function errorHandler(err, req, res, next) {
  console.error("Error:", err.message || err);

  if (err.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors,
    });
  }

  if (err.code === "SQLITE_CONSTRAINT") {
    return res.status(409).json({
      success: false,
      message: "A resource with that identifier already exists.",
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal server error",
  });
}
