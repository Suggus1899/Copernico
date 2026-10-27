import { MongoMemoryReplSet } from 'mongodb-memory-server';

/**
 * Arranca un replica set efímero y carga la app con configuración de test.
 * La configuración se lee al importar src/config.js, por eso las variables
 * de entorno se fijan antes de importar la app (importación dinámica).
 */
export async function startIntegrationEnv() {
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.JWT_SECRET ??= 'test-secret-with-more-than-thirty-two-characters';

  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  process.env.MONGODB_URI = replSet.getUri();

  const { default: app } = await import('../../src/app.js');
  const { connectDatabase, disconnectDatabase } = await import('../../src/database.js');
  await connectDatabase(process.env.MONGODB_URI);

  return {
    app,
    async stop() {
      await disconnectDatabase();
      await replSet.stop();
    },
  };
}
