import { config } from "dotenv";
config();

export const PORT = process.env.PORT || 4000;
export const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost/merndatabase";

// Validar que JWT_SECRET esté configurado y sea seguro
const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (!JWT_SECRET_ENV || JWT_SECRET_ENV === "secretkey" || JWT_SECRET_ENV.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️  ERROR CRÍTICO: JWT_SECRET no está configurado o es inseguro en producción');
    console.error('   Configura una clave secreta de al menos 32 caracteres en .env');
    process.exit(1);
  } else {
    console.warn('⚠️  ADVERTENCIA: JWT_SECRET usando valor por defecto. NO usar en producción.');
  }
}

export const JWT_SECRET = JWT_SECRET_ENV || "secretkey";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";