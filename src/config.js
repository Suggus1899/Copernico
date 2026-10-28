import { randomBytes } from "node:crypto";
import { config as loadDotenv } from "dotenv";

loadDotenv();

const DEV_MONGODB_URI = "mongodb://127.0.0.1:27017/copernico?replicaSet=rs0";
const DEV_FRONTEND_ORIGIN = "http://localhost:5173";
const DURATION_PATTERN = /^(\d+)([smhd])$/;
const DURATION_UNITS_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Limits compartidos por los módulos de almacenamiento. */
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const MATERIAL_MAX_BYTES = 50 * 1024 * 1024;

/** Convierte "15m", "12h" o "7d" a milisegundos. Devuelve null si el formato no es válido. */
export function durationToMs(value) {
  const match = DURATION_PATTERN.exec(String(value ?? "").trim());
  if (!match) return null;
  return Number(match[1]) * DURATION_UNITS_MS[match[2]];
}

/** Oculta credenciales de una URI de MongoDB antes de escribirla en logs. */
export function redactUri(uri = "") {
  return uri.replace(/\/\/[^@/]+@/, "//***:***@");
}

/**
 * Construye la configuración a partir de variables de entorno.
 * Función pura: no escribe en consola ni termina el proceso; lanza ConfigError
 * con todos los problemas encontrados para que el arranque los muestre juntos.
 */
export function buildConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const problems = [];
  const warnings = [];

  const port = Number(env.PORT || 4002);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push("PORT debe ser un número de puerto válido");
  }

  let mongodbUri = env.MONGODB_URI || "";
  if (!mongodbUri) {
    if (isProduction) problems.push("MONGODB_URI es obligatorio en producción");
    mongodbUri = DEV_MONGODB_URI;
  }

  let jwtSecret = env.JWT_SECRET || "";
  if (!jwtSecret) {
    if (isProduction) {
      problems.push("JWT_SECRET es obligatorio en producción");
    } else {
      // Secreto efímero: las sesiones de desarrollo se invalidan al reiniciar.
      jwtSecret = randomBytes(48).toString("hex");
      warnings.push("JWT_SECRET no definido: se usa un secreto aleatorio (las sesiones no sobreviven reinicios).");
    }
  } else if (isProduction && jwtSecret.length < 32) {
    problems.push("JWT_SECRET debe tener al menos 32 caracteres en producción");
  }

  const jwtExpiresIn = env.JWT_EXPIRES_IN || "12h";
  const sessionMaxAgeMs = durationToMs(jwtExpiresIn);
  if (sessionMaxAgeMs === null) {
    problems.push("JWT_EXPIRES_IN debe tener formato como 30m, 12h o 7d");
  }

  let frontendOrigins = (env.FRONTEND_URL || (isProduction ? "" : DEV_FRONTEND_ORIGIN))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (isProduction && frontendOrigins.length === 0) {
    problems.push("FRONTEND_URL es obligatorio en producción (lista separada por comas)");
  }
  frontendOrigins = frontendOrigins.map((origin) => {
    try {
      return new URL(origin).origin;
    } catch {
      problems.push(`FRONTEND_URL contiene un valor inválido: ${origin}`);
      return origin;
    }
  });

  const trustProxy = Number(env.TRUST_PROXY || 0);
  if (!Number.isInteger(trustProxy) || trustProxy < 0) {
    problems.push("TRUST_PROXY debe ser un entero mayor o igual a 0 (número de proxies confiables)");
  }

  const supabaseUrl = (env.SUPABASE_URL || "").replace(/\/+$/, "");
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const storageConfigured = Boolean(supabaseUrl && supabaseServiceKey);
  if (Boolean(supabaseUrl) !== Boolean(supabaseServiceKey)) {
    problems.push("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben configurarse juntas");
  }
  if (isProduction && !storageConfigured) {
    problems.push("SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios en producción (almacenamiento privado)");
  }
  if (!storageConfigured && !isProduction) {
    warnings.push("Almacenamiento no configurado: avatares, documentos y materiales responderán 503");
  }

  if (problems.length > 0) {
    throw new ConfigError(`Configuración inválida:\n  - ${problems.join("\n  - ")}`);
  }

  return {
    warnings,
    values: {
      NODE_ENV: nodeEnv,
      isProduction,
      PORT: port,
      MONGODB_URI: mongodbUri,
      JWT_SECRET: jwtSecret,
      JWT_EXPIRES_IN: jwtExpiresIn,
      SESSION_MAX_AGE_MS: sessionMaxAgeMs,
      FRONTEND_ORIGINS: Object.freeze(frontendOrigins),
      TRUST_PROXY: trustProxy,
      SUPABASE_URL: supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
      SUPABASE_STORAGE_BUCKET: env.SUPABASE_STORAGE_BUCKET || "copernico-private",
    },
  };
}

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}

const built = buildConfig();

export const config = Object.freeze(built.values);
export const configWarnings = Object.freeze(built.warnings);
