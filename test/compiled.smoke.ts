import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import test from 'node:test';
import { resolve } from 'node:path';

async function getFreePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not determine a free port');
  await new Promise<void>((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
  return address.port;
}

test('compiled API becomes ready and exits after SIGTERM', async () => {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  let child: ReturnType<typeof spawn> | undefined;
  let output = '';

  try {
    const port = await getFreePort();
    child = spawn(process.execPath, [resolve('dist/src/index.js')], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        MONGODB_URI: replSet.getUri(),
        PORT: String(port),
        FRONTEND_URL: 'http://localhost:5173',
        JWT_SECRET: 'compiled-test-secret-with-more-than-thirty-two-characters',
        SUPABASE_URL: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', chunk => { output += String(chunk); });
    child.stderr?.on('data', chunk => { output += String(chunk); });

    const url = `http://127.0.0.1:${port}/api/health/ready`;
    const deadline = Date.now() + 30_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null) break;
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
        if (response.status === 200 && (await response.json() as { status?: string }).status === 'ready') {
          ready = true;
          break;
        }
      } catch {
        // The compiled process may still be connecting to the ephemeral replica set.
      }
      await delay(100);
    }
    assert.equal(ready, true, `Compiled API did not become ready. Process output:\n${output}`);

    assert.equal(child.kill('SIGTERM'), true);
    let shutdownTimer: ReturnType<typeof setTimeout> | undefined;
    const closeResult = await Promise.race([
      once(child, 'close'),
      new Promise<never>((_, reject) => {
        shutdownTimer = setTimeout(() => reject(new Error(`API did not close on SIGTERM. Process output:\n${output}`)), 9000);
      }),
    ]).finally(() => { if (shutdownTimer) clearTimeout(shutdownTimer); });
    const [code, signal] = closeResult;
    if (process.platform === 'win32') {
      // Windows terminates child processes directly for SIGTERM and cannot exercise Node's handler.
      assert.equal(signal, 'SIGTERM');
    } else {
      assert.equal(code, 0, `API exited with signal ${signal}. Process output:\n${output}`);
      assert.match(output, /Cerrando \(SIGTERM\)/);
      assert.doesNotMatch(output, /Tiempo de cierre agotado/);
    }
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await once(child, 'close');
    }
    await replSet.stop();
  }
});
