import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { config } from "../config.js";

const mongoValidationDetails = (error) =>
  Object.values(error.errors || {}).map((item) => ({ path: item.path, message: item.message }));

/** Traduce errores conocidos a { status, code, message, details }. */
function normalizeError(err) {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }
  if (err.type === "entity.parse.failed") {
    return { status: 400, code: "INVALID_JSON", message: "El cuerpo de la petición no es JSON válido." };
  }
  if (err.type === "entity.too.large") {
    return { status: 413, code: "PAYLOAD_TOO_LARGE", message: "La petición es demasiado grande." };
  }
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    return {
      status: tooLarge ? 413 : 400,
      code: tooLarge ? "FILE_TOO_LARGE" : "UPLOAD_ERROR",
      message: tooLarge ? "El archivo supera el tamaño permitido." : "No se pudo procesar el archivo.",
    };
  }
  if (err instanceof ZodError) {
    return {
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Los datos enviados no son válidos.",
      details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    };
  }
  if (err.name === "ValidationError") {
    return { status: 422, code: "VALIDATION_ERROR", message: "Los datos enviados no son válidos.", details: mongoValidationDetails(err) };
  }
  if (err.name === "CastError") {
    return { status: 400, code: "INVALID_ID", message: "El identificador indicado no es válido." };
  }
  if (err.code === 11000) {
    return { status: 409, code: "DUPLICATE", message: "El registro ya existe." };
  }
  if (err.code === 20 || /replica set/i.test(err.message || "")) {
    return { status: 503, code: "DATABASE_TRANSACTIONS_UNAVAILABLE", message: "La base de datos no admite esta operación en este momento." };
  }
  return { status: 500, code: "INTERNAL_ERROR", message: "Error interno del servidor." };
}

export function notFoundHandler(req, res, next) {
  next(new AppError(404, "NOT_FOUND", `No existe la ruta ${req.method} ${req.path}.`));
}

/** Manejador global: una única forma de error para toda la API. */
export function errorHandler(err, req, res, _next) {
  const normalized = normalizeError(err);

  if (normalized.status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}:`, config.isProduction ? err.message : err);
  }

  const body = { code: normalized.code, message: normalized.message };
  if (normalized.details) body.details = normalized.details;
  res.status(normalized.status).json({ success: false, error: body });
}
