import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startIntegrationEnv } from './helpers/integration.js';

const ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Clave-Segura-2025';
const SESSION = 'copernico_session';
const MB = 1024 * 1024;

// Contenidos mínimos con la firma correcta: el tipo lo decide el contenido, no el nombre del fichero.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const PDF = Buffer.from('%PDF-1.4\n% documento de prueba\n');
const TXT = Buffer.from('Apuntes de la clase de hoy\n');
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)]);
const EXE = Buffer.from('MZ programa de prueba');

const cookieOf = (res) => {
  const cookie = (res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${SESSION}=`));
  return cookie?.split(';')[0];
};

describe('archivos privados: avatares, documentos y materiales', () => {
  let env;
  let User;
  let EducationalMaterial;
  let setStorage;
  let tutor;
  let otherTutor;
  let ana;
  let bruno;

  /** Petición autenticada; los tests la encadenan con .attach, .field o .send. */
  const authed = (method, url, as) =>
    request(env.app)[method](url).set('Origin', ORIGIN).set('Cookie', as.cookie);

  /** Claves guardadas en el almacenamiento de test que empiezan por el prefijo dado. */
  const keysUnder = (prefix) => [...env.storage.objects.keys()].filter((key) => key.startsWith(prefix));

  before(async () => {
    env = await startIntegrationEnv();
    ({ default: User } = await import('../src/models/User.js'));
    ({ default: EducationalMaterial } = await import('../src/models/EducationalMaterial.js'));
    ({ setStorage } = await import('../src/services/storage/index.js'));

    const signup = async (body) => {
      const res = await request(env.app)
        .post('/api/auth/signup')
        .set('Origin', ORIGIN)
        .send({ password: PASSWORD, ...body });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      const user = await User.findOne({ email: body.email }).lean();
      return { id: String(user._id), cookie: cookieOf(res) };
    };

    tutor = await signup({
      email: 'luis@example.com',
      role: 'tutor',
      personalInfo: { firstName: 'Luis', lastName: 'Tutor' },
      tutorProfile: { specialties: ['Matemáticas'] },
    });
    otherTutor = await signup({
      email: 'marta@example.com',
      role: 'tutor',
      personalInfo: { firstName: 'Marta', lastName: 'Tutora' },
      tutorProfile: { specialties: ['Física'] },
    });
    ana = await signup({
      email: 'ana@example.com',
      role: 'student',
      personalInfo: { firstName: 'Ana', lastName: 'Estudiante' },
      studentProfile: { studentId: 'A001' },
    });
    bruno = await signup({
      email: 'bruno@example.com',
      role: 'student',
      personalInfo: { firstName: 'Bruno', lastName: 'Estudiante' },
      studentProfile: { studentId: 'B001' },
    });
  });

  after(async () => {
    await env?.stop();
  });

  // Los tests de cada bloque comparten estado y se ejecutan en orden.

  describe('avatares', () => {
    it('sube un avatar privado, lo sirve con enlace firmado y reemplaza el anterior', async () => {
      const first = await authed('post', '/api/users/profile/avatar', ana).attach('avatar', PNG, 'foto.png');
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.equal(first.body.data.avatar, `/api/users/${ana.id}/avatar`);
      assert.equal(keysUnder(`avatars/${ana.id}/`).length, 1);

      const second = await authed('post', '/api/users/profile/avatar', ana).attach('avatar', PNG, 'otra.png');
      assert.equal(second.status, 200, JSON.stringify(second.body));
      assert.equal(keysUnder(`avatars/${ana.id}/`).length, 1, 'el avatar anterior se borra del almacenamiento');

      const served = await authed('get', `/api/users/${ana.id}/avatar`, tutor);
      assert.equal(served.status, 302);
      assert.match(served.headers.location, /^https:\/\/storage\.test\/avatars\//);
    });

    it('rechaza contenido que no coincide con su extensión y archivos de más de 2 MB', async () => {
      const disguised = await authed('post', '/api/users/profile/avatar', ana).attach('avatar', TXT, 'foto.png');
      assert.equal(disguised.status, 415);
      assert.equal(disguised.body.error.code, 'UNSUPPORTED_MEDIA_TYPE');

      const oversized = Buffer.concat([PNG, Buffer.alloc(2 * MB)]);
      const big = await authed('post', '/api/users/profile/avatar', ana).attach('avatar', oversized, 'grande.png');
      assert.equal(big.status, 413);
      assert.equal(big.body.error.code, 'FILE_TOO_LARGE');

      assert.equal(keysUnder(`avatars/${ana.id}/`).length, 1, 'los rechazos no dejan objetos sueltos');
    });

    it('elimina el avatar y deja de servirse', async () => {
      const removed = await authed('delete', '/api/users/profile/avatar', ana);
      assert.equal(removed.status, 200, JSON.stringify(removed.body));
      assert.equal(keysUnder(`avatars/${ana.id}/`).length, 0);

      const gone = await authed('get', `/api/users/${ana.id}/avatar`, tutor);
      assert.equal(gone.status, 404);
    });

    it('sin almacenamiento configurado responde 503 y no guarda nada', async () => {
      setStorage(null);
      try {
        const res = await authed('post', '/api/users/profile/avatar', bruno).attach('avatar', PNG, 'foto.png');
        assert.equal(res.status, 503);
        assert.equal(res.body.error.code, 'STORAGE_NOT_CONFIGURED');
      } finally {
        setStorage(env.storage);
      }
      assert.equal(keysUnder(`avatars/${bruno.id}/`).length, 0);
    });
  });

  describe('documentos', () => {
    it('sube documentos, los lista sin claves internas y los descarga con su nombre', async () => {
      const res = await authed('post', '/api/users/profile/documents', ana)
        .attach('documents', PDF, 'Tema 1.pdf')
        .attach('documents', TXT, 'notas.txt');
      assert.equal(res.status, 201, JSON.stringify(res.body));

      const docs = res.body.data.documents;
      assert.deepEqual(docs.map((doc) => doc.name), ['Tema 1.pdf', 'notas.txt']);
      assert.deepEqual(docs.map((doc) => doc.mimeType), ['application/pdf', 'text/plain; charset=utf-8']);
      assert.ok(docs.every((doc) => doc.key === undefined), 'la clave de almacenamiento no sale en la API');
      assert.equal(keysUnder(`documents/${ana.id}/`).length, 2);

      const download = await authed('get', `/api/users/profile/documents/${docs[0]._id}/download`, ana);
      assert.equal(download.status, 302);
      assert.equal(new URL(download.headers.location).searchParams.get('download'), 'Tema 1.pdf');
    });

    it('renombra y elimina un documento liberando su almacenamiento', async () => {
      const [pdf, txt] = (await authed('get', '/api/users/profile/documents', ana)).body.data.documents;

      const renamed = await authed('patch', `/api/users/profile/documents/${pdf._id}`, ana).send({
        name: 'Tema 1 revisado',
      });
      assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
      assert.equal(renamed.body.data.documents[0].name, 'Tema 1 revisado');

      const removed = await authed('delete', `/api/users/profile/documents/${pdf._id}`, ana);
      assert.equal(removed.status, 200, JSON.stringify(removed.body));
      assert.deepEqual(removed.body.data.documents.map((doc) => doc._id), [txt._id]);
      assert.equal(keysUnder(`documents/${ana.id}/`).length, 1);
    });

    it('rechaza documentos con firma incorrecta o extensión no permitida', async () => {
      const zipAsPdf = await authed('post', '/api/users/profile/documents', ana).attach('documents', ZIP, 'falso.pdf');
      assert.equal(zipAsPdf.status, 415);
      assert.equal(zipAsPdf.body.error.code, 'UNSUPPORTED_MEDIA_TYPE');

      const executable = await authed('post', '/api/users/profile/documents', ana).attach('documents', EXE, 'programa.exe');
      assert.equal(executable.status, 415);

      assert.equal(keysUnder(`documents/${ana.id}/`).length, 1);
    });

    it('no permite descargar documentos de otro usuario', async () => {
      const [txt] = (await authed('get', '/api/users/profile/documents', ana)).body.data.documents;
      const res = await authed('get', `/api/users/profile/documents/${txt._id}/download`, bruno);
      assert.equal(res.status, 404);
    });

    it('limita a 20 documentos por usuario sin dejar objetos huérfanos', async () => {
      for (let batch = 0; batch < 4; batch += 1) {
        let req = authed('post', '/api/users/profile/documents', bruno);
        for (let index = 0; index < 5; index += 1) {
          req = req.attach('documents', PDF, `lote-${batch}-${index}.pdf`);
        }
        const res = await req;
        assert.equal(res.status, 201, JSON.stringify(res.body));
      }
      assert.equal(keysUnder(`documents/${bruno.id}/`).length, 20);

      const extra = await authed('post', '/api/users/profile/documents', bruno).attach('documents', PDF, 'sexto.pdf');
      assert.equal(extra.status, 422);
      assert.equal(extra.body.error.code, 'DOCUMENT_LIMIT_REACHED');
      assert.equal(keysUnder(`documents/${bruno.id}/`).length, 20);
    });
  });

  describe('materiales', () => {
    let material;

    it('un tutor sube un material con archivo privado y etiquetas normalizadas', async () => {
      const res = await authed('post', '/api/materials', tutor)
        .field('title', 'Diagrama de fuerzas')
        .field('subject', 'Física')
        .field('tags', 'Cálculo, Repaso')
        .attach('file', PNG, 'diagrama.png');
      assert.equal(res.status, 201, JSON.stringify(res.body));
      material = res.body.data;

      assert.equal(material.type, 'image');
      assert.equal(material.originalFileName, 'diagrama.png');
      assert.deepEqual(material.tags, ['cálculo', 'repaso']);
      assert.equal(material.fileKey, undefined, 'la clave de almacenamiento no sale en la API');
      assert.equal(keysUnder(`materials/${tutor.id}/`).length, 1);

      const rejected = await authed('post', '/api/materials', tutor)
        .field('title', 'Ejecutable')
        .field('subject', 'Física')
        .attach('file', EXE, 'programa.exe');
      assert.equal(rejected.status, 415);
      assert.equal(keysUnder(`materials/${tutor.id}/`).length, 1);
    });

    it('un estudiante no puede subir materiales', async () => {
      const res = await authed('post', '/api/materials', ana)
        .field('title', 'Intento')
        .field('subject', 'Física')
        .attach('file', PDF, 'intento.pdf');
      assert.equal(res.status, 403);
    });

    it('los estudiantes solo ven materiales publicados; los borradores son del autor', async () => {
      const asStudent = await authed('get', '/api/materials', ana);
      assert.ok(asStudent.body.data.some((item) => item._id === material._id));

      const draft = await authed('patch', `/api/materials/${material._id}/status`, tutor).send({ status: 'draft' });
      assert.equal(draft.status, 200, JSON.stringify(draft.body));

      const studentList = await authed('get', '/api/materials', ana);
      assert.equal(studentList.body.data.some((item) => item._id === material._id), false);
      assert.equal((await authed('get', `/api/materials/${material._id}`, ana)).status, 403);
      assert.equal((await authed('get', `/api/materials/${material._id}/download`, ana)).status, 403);

      assert.equal((await authed('get', `/api/materials/${material._id}`, otherTutor)).status, 403);
      const otherList = await authed('get', '/api/materials?status=draft', otherTutor);
      assert.equal(otherList.body.data.some((item) => item._id === material._id), false);

      const owner = await authed('get', `/api/materials/${material._id}`, tutor);
      assert.equal(owner.status, 200);
      assert.equal(owner.body.data.fileKey, undefined);
    });

    it('descarga un material publicado con enlace firmado y cuenta la descarga', async () => {
      const published = await authed('patch', `/api/materials/${material._id}/status`, tutor).send({
        status: 'published',
      });
      assert.equal(published.status, 200, JSON.stringify(published.body));

      const res = await authed('get', `/api/materials/${material._id}/download`, ana);
      assert.equal(res.status, 302, JSON.stringify(res.body));
      assert.match(res.headers.location, /^https:\/\/storage\.test\/materials\//);
      assert.equal(new URL(res.headers.location).searchParams.get('download'), 'diagrama.png');

      const stored = await EducationalMaterial.findById(material._id).lean();
      assert.equal(stored.downloads, 1);
    });

    it('solo el autor o un administrador puede borrar y el borrado elimina el archivo', async () => {
      const { fileKey } = await EducationalMaterial.findById(material._id).select('+fileKey').lean();

      const denied = await authed('delete', `/api/materials/${material._id}`, otherTutor);
      assert.equal(denied.status, 403);
      assert.ok(env.storage.objects.has(fileKey));

      const removed = await authed('delete', `/api/materials/${material._id}`, tutor);
      assert.equal(removed.status, 200, JSON.stringify(removed.body));
      assert.equal(env.storage.objects.has(fileKey), false);
      assert.equal(await EducationalMaterial.countDocuments({ _id: material._id }), 0);
    });
  });
});
