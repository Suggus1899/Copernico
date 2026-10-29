import type { Server } from 'node:http';
import app from './app.js';
import { config, configWarnings } from './config.js';
import { connectDatabase, disconnectDatabase } from './database.js';

// Tiempo máximo para cerrar conexiones antes de forzar la salida.
const SHUTDOWN_TIMEOUT_MS = 10_000;

let server: Server | undefined;
let shuttingDown = false;

async function shutdown(reason: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] Cerrando (${reason})...`);

  const forceExit = setTimeout(() => {
    console.error('[server] Tiempo de cierre agotado; saliendo.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  const finish = async () => {
    await disconnectDatabase().catch((error) => {
      console.error('[server] Error al desconectar MongoDB:', error.message);
    });
    process.exit(exitCode);
  };

  if (!server) return finish();
  server.close(finish);
  server.closeIdleConnections();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[server] Promesa no gestionada:', reason);
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (error) => {
  console.error('[server] Excepción no capturada:', error);
  shutdown('uncaughtException', 1);
});

async function main() {
  for (const warning of configWarnings) console.warn(`[config] ${warning}`);
  await connectDatabase(config.MONGODB_URI);

  server = app.listen(config.PORT, () => {
    console.log(`[server] API en el puerto ${config.PORT} (${config.NODE_ENV})`);
  });
  // Balanceadores como Render cierran conexiones inactivas; mantenerlas más tiempo evita resets.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

main().catch((error) => {
  console.error('[server] No se pudo iniciar:', error.message);
  process.exit(1);
});
