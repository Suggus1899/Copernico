import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseStorage } from '../src/services/storage/supabaseStorage.js';

const PROJECT_URL = 'https://proyecto.supabase.co';
const BUCKET = 'copernico-private';

/** fetch falso: registra cada petición y responde con lo que devuelva `respond`. */
const recordingFetch = (respond = () => new Response('{}', { status: 200 })) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return respond(url, init);
  };
  return { calls, fetchImpl };
};

const storageWith = (fetchImpl) =>
  createSupabaseStorage({ url: PROJECT_URL, serviceKey: 'service-key', bucket: BUCKET, fetchImpl });

describe('almacenamiento Supabase: cliente REST', () => {
  it('sube objetos al bucket privado con la clave de servicio y sin sobrescribir', async () => {
    const { calls, fetchImpl } = recordingFetch();
    await storageWith(fetchImpl).upload('avatars/u1/foto nueva.png', Buffer.from('png'), 'image/png');

    const [call] = calls;
    assert.equal(call.url, `${PROJECT_URL}/storage/v1/object/${BUCKET}/avatars/u1/foto%20nueva.png`);
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.headers.Authorization, 'Bearer service-key');
    assert.equal(call.init.headers.apikey, 'service-key');
    assert.equal(call.init.headers['Content-Type'], 'image/png');
    assert.equal(call.init.headers['x-upsert'], 'false');
  });

  it('firma enlaces temporales de 300 s con el nombre de descarga solo si se pide', async () => {
    const signedBody = JSON.stringify({ signedURL: `/object/sign/${BUCKET}/documents/u1/a.pdf?token=abc` });
    const { calls, fetchImpl } = recordingFetch(() => new Response(signedBody, { status: 200 }));
    const storage = storageWith(fetchImpl);

    const url = new URL(await storage.createSignedUrl('documents/u1/a.pdf', { downloadName: 'Tema 1.pdf' }));
    assert.equal(JSON.parse(calls[0].init.body).expiresIn, 300);
    assert.equal(url.origin, PROJECT_URL);
    assert.equal(url.pathname, `/storage/v1/object/sign/${BUCKET}/documents/u1/a.pdf`);
    assert.equal(url.searchParams.get('token'), 'abc');
    assert.equal(url.searchParams.get('download'), 'Tema 1.pdf');

    const inline = new URL(await storage.createSignedUrl('documents/u1/a.pdf'));
    assert.equal(inline.searchParams.has('download'), false);
  });

  it('borra por prefijos en una sola petición y no llama a la API si no hay claves', async () => {
    const { calls, fetchImpl } = recordingFetch();
    const storage = storageWith(fetchImpl);

    await storage.remove([]);
    assert.equal(calls.length, 0);

    await storage.remove(['avatars/u1/a.png', 'avatars/u1/b.png']);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${PROJECT_URL}/storage/v1/object/${BUCKET}`);
    assert.equal(calls[0].init.method, 'DELETE');
    assert.deepEqual(JSON.parse(calls[0].init.body), { prefixes: ['avatars/u1/a.png', 'avatars/u1/b.png'] });
  });

  it('traduce respuestas de error del proveedor a 502 STORAGE_ERROR', async () => {
    const { fetchImpl } = recordingFetch(() => new Response('{"message":"forbidden"}', { status: 403 }));

    await assert.rejects(storageWith(fetchImpl).upload('avatars/u1/a.png', Buffer.from('x'), 'image/png'), {
      status: 502,
      code: 'STORAGE_ERROR',
      details: { action: 'upload', status: 403 },
    });
  });

  it('traduce fallos de red a 502 STORAGE_ERROR sin filtrar el error original', async () => {
    const fetchImpl = async () => {
      throw new TypeError('fetch failed');
    };

    await assert.rejects(storageWith(fetchImpl).remove(['avatars/u1/a.png']), {
      status: 502,
      code: 'STORAGE_ERROR',
      details: { action: 'remove' },
    });
  });
});
