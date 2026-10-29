import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('retains the operation ID across lost responses and drops queue entries older than 24 hours', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const stored = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => { stored.set(key, value); },
      removeItem: (key: string) => { stored.delete(key); },
    },
  });

  try {
    const { enqueueVideoProgress, syncPendingVideoProgress, MAX_PENDING_PROGRESS_AGE_MS } =
      await vite.ssrLoadModule('/src/utils/videoProgressQueue.ts');
    const { default: api } = await vite.ssrLoadModule('/src/utils/axiosConfig.ts');
    const userId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
    const videoId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    const sent: Array<{ requestId: string; currentTime: number; watchedSeconds: number; totalDuration: number }> = [];
    api.post = async (_url: string, body: typeof sent[number]) => {
      sent.push(body);
      if (sent.length === 1) throw new Error('response lost');
      return { data: { data: { progressPercentage: 10, isCompleted: false, watchTime: 10, status: 'in_progress' } } };
    };

    const operation = enqueueVideoProgress(userId, videoId, { currentTime: 10, watchedSeconds: 10, totalDuration: 100 });
    const firstAttempt = await syncPendingVideoProgress(userId);
    assert.equal(firstAttempt.hasPending, true);
    assert.equal(JSON.parse(stored.get(`copernico:video-progress:${userId}`) ?? '[]')[0].requestId, operation.requestId);

    const retry = await syncPendingVideoProgress(userId);
    assert.equal(retry.hasPending, false);
    assert.equal(sent[0].requestId, operation.requestId);
    assert.deepEqual(sent[1], sent[0]);
    assert.equal(retry.confirmed[0].progress.watchTime, 10);

    const expiredUser = 'cccccccccccccccccccccccc';
    const expiredVideo = 'dddddddddddddddddddddddd';
    stored.set(`copernico:video-progress:${expiredUser}`, JSON.stringify([{
      requestId: '11111111-1111-4111-8111-111111111111',
      videoId: expiredVideo,
      payload: { currentTime: 10, watchedSeconds: 10, totalDuration: 100 },
      createdAt: Date.now() - MAX_PENDING_PROGRESS_AGE_MS - 1,
    }]));
    const expired = await syncPendingVideoProgress(expiredUser);
    assert.equal(expired.expiredCount, 1);
    assert.equal(expired.hasPending, false);
    assert.equal(sent.length, 2);
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
    await vite.close();
  }
});
