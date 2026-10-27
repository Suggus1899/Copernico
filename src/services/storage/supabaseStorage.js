import { AppError } from '../../utils/AppError.js';

const REQUEST_TIMEOUT_MS = 15_000;
export const SIGNED_URL_TTL_SECONDS = 300;

const encodeObjectKey = (key) => key.split('/').map(encodeURIComponent).join('/');

const storageError = (action, response) =>
  new AppError(502, 'STORAGE_ERROR', 'Error del servicio de almacenamiento', { action, status: response.status });

// Cliente mínimo de la API REST de Supabase Storage. Usa la clave de servicio solo en el
// backend; el bucket es privado y los clientes reciben únicamente URLs firmadas temporales.
export const createSupabaseStorage = ({ url, serviceKey, bucket, fetchImpl = fetch }) => {
  const apiBase = `${url}/storage/v1`;
  const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };

  const send = async (action, path, init) => {
    let response;
    try {
      response = await fetchImpl(`${apiBase}${path}`, {
        ...init,
        headers: { ...headers, ...init.headers },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new AppError(502, 'STORAGE_ERROR', 'No se pudo contactar con el servicio de almacenamiento', { action });
    }
    if (!response.ok) throw storageError(action, response);
    return response;
  };

  return {
    async upload(key, body, contentType) {
      await send('upload', `/object/${bucket}/${encodeObjectKey(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': contentType, 'x-upsert': 'false' },
        body,
      });
    },

    async createSignedUrl(key, { expiresIn = SIGNED_URL_TTL_SECONDS, downloadName } = {}) {
      const response = await send('sign', `/object/sign/${bucket}/${encodeObjectKey(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn }),
      });
      const { signedURL } = await response.json();
      const signed = new URL(`${apiBase}${signedURL}`);
      if (downloadName) signed.searchParams.set('download', downloadName);
      return signed.toString();
    },

    async remove(keys) {
      if (keys.length === 0) return;
      await send('remove', `/object/${bucket}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: keys }),
      });
    },
  };
};
