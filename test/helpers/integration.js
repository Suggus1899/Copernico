import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createFakeStorage } from './fakeStorage.js';

/**
 * Arranca un replica set efímero y carga la app con configuración de test.
 * La configuración se lee al importar src/config.js, por eso las variables
 * de entorno se fijan antes de importar la app (importación dinámica).
 */
export async function startIntegrationEnv() {
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.JWT_SECRET ??= 'test-secret-with-more-than-thirty-two-characters';
  // Vacías para que un .env local nunca apunte los tests a un bucket real (dotenv no sobrescribe claves existentes).
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';

  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  process.env.MONGODB_URI = replSet.getUri();

  const { default: app } = await import('../../src/app.js');
  const { connectDatabase, disconnectDatabase } = await import('../../src/database.js');
  const { setStorage } = await import('../../src/services/storage/index.js');
  await connectDatabase(process.env.MONGODB_URI);

  const storage = createFakeStorage();
  setStorage(storage);

  return {
    app,
    storage,
    async stop() {
      setStorage(null);
      await disconnectDatabase();
      await replSet.stop();
    },
  };
}
