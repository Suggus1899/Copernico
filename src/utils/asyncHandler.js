/**
 * Express 4 no espera las promesas de los manejadores: un rechazo quedaría sin gestionar.
 * Este wrapper lo envía a next() para que lo resuelva errorHandler.
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
