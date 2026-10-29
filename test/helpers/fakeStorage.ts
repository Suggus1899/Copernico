import type { Storage } from '../../src/types/storage.js';
export interface FakeStorage extends Storage { objects: Map<string, { body: Buffer; contentType: string }>; failOn(action: string): void }
import { randomUUID } from 'node:crypto';

/**
 * Almacenamiento en memoria con la misma forma que createSupabaseStorage.
 * Las URLs firmadas apuntan a un host ficticio; los tests comprueban `objects`
 * para verificar qué se guardó o borró realmente.
 */
export const createFakeStorage = (): FakeStorage => {
  const objects = new Map<string, { body: Buffer; contentType: string }>();
  const failing = new Set<string>();

  const maybeFail = (action: string) => {
    if (failing.has(action)) throw new Error(`fallo simulado en ${action}`);
  };

  return {
    objects,
    failOn(action) {
      failing.add(action);
    },
    async upload(key, body, contentType) {
      maybeFail('upload');
      if (objects.has(key)) throw new Error(`la clave ya existe: ${key}`);
      objects.set(key, { body: Buffer.from(body), contentType });
    },
    async createSignedUrl(key, { downloadName } = {}) {
      maybeFail('sign');
      if (!objects.has(key)) throw new Error(`objeto inexistente: ${key}`);
      const url = new URL(`https://storage.test/${key}`);
      url.searchParams.set('token', randomUUID());
      if (downloadName) url.searchParams.set('download', downloadName);
      return url.toString();
    },
    async remove(keys) {
      maybeFail('remove');
      for (const key of keys) objects.delete(key);
    },
  };
};
