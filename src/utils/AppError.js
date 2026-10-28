/**
 * Error esperado de la API. El manejador central lo convierte en
 * { success: false, error: { code, message, details? } } con el status indicado.
 */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
