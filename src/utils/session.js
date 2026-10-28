import jwt from "jsonwebtoken";
import { config } from "../config.js";

export const SESSION_COOKIE = "copernico_session";
export const JWT_ISSUER = "copernico-api";
export const JWT_AUDIENCE = "copernico-web";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
  };
}

/**
 * Emite la sesión: JWT firmado en cookie HttpOnly. El claim `sv` (sessionVersion)
 * permite invalidar todas las sesiones de un usuario al cambiar credenciales.
 */
export function issueSession(res, user) {
  const token = jwt.sign(
    { sv: user.sessionVersion ?? 0, role: user.role },
    config.JWT_SECRET,
    {
      subject: String(user._id),
      expiresIn: config.JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithm: "HS256",
    }
  );
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: config.SESSION_MAX_AGE_MS });
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

export function verifySessionToken(token) {
  return jwt.verify(token, config.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}
