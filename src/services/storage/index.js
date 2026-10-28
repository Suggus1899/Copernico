import { config } from '../../config.js';
import { AppError } from '../../utils/AppError.js';
import { createSupabaseStorage } from './supabaseStorage.js';

let override = null;
let configured;

const createFromConfig = () => {
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createSupabaseStorage({
    url: config.SUPABASE_URL,
    serviceKey: config.SUPABASE_SERVICE_ROLE_KEY,
    bucket: config.SUPABASE_STORAGE_BUCKET,
  });
};

// Almacenamiento privado activo. Sin credenciales responde 503 en lugar de fallar en silencio.
export const getStorage = () => {
  if (override) return override;
  if (configured === undefined) configured = createFromConfig();
  if (!configured) {
    throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'El almacenamiento de archivos no está configurado');
  }
  return configured;
};

// Solo para tests: sustituye el almacenamiento por una implementación en memoria.
export const setStorage = (storage) => {
  override = storage;
};

// Limpieza posterior a un cambio ya guardado en BD: un fallo aquí solo deja un objeto huérfano.
export const removeQuietly = async (storage, keys) => {
  try {
    await storage.remove(keys);
  } catch (error) {
    console.warn('No se pudo eliminar un archivo del almacenamiento:', error.message);
  }
};
