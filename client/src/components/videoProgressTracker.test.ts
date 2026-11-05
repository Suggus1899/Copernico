import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('resume and serializes watched time across slow requests and pause', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const originalNow = Date.now;
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
    const { default: Tracker } = await vite.ssrLoadModule('/src/components/VideoProgressTracker.tsx');
    const { default: api } = await vite.ssrLoadModule('/src/utils/axiosConfig.ts');
    let finishFirst!: (value: unknown) => void;
    const first = new Promise((resolve) => { finishFirst = resolve; });
    const calls: number[] = [];
    let resume = 0;
    api.post = async (url: string, body: { watchedSeconds?: number }) => {
      if (url.endsWith('/start')) return { data: { data: { lastPosition: 42 } } };
      calls.push(body.watchedSeconds ?? 0);
      if (calls.length === 1) return first;
      return { data: { data: { progressPercentage: 10, isCompleted: false, watchTime: 10, status: 'in_progress' } } };
    };
    const tracker = new Tracker({ videoId: 'aaaaaaaaaaaaaaaaaaaaaaaa', userId: 'bbbbbbbbbbbbbbbbbbbbbbbb', getVideoTime: () => ({ currentTime: 50, totalDuration: 100 }), onResume: (position: number) => { resume = position; } });
    tracker.setState = (value: object) => { Object.assign(tracker.state, value); };
    tracker.mounted = true;
    tracker.playing = true;
    tracker.generation = 1;
    let now = 1000;
    Date.now = () => now;
    await tracker.startSession(1);
    assert.equal(resume, 42);
    now = 6000;
    tracker.updateProgress();
    await Promise.resolve();
    now = 11000;
    tracker.updateProgress();
    tracker.handleVideoPause();
    assert.deepEqual(calls, [5]);
    finishFirst({ data: { data: { progressPercentage: 5, isCompleted: false, watchTime: 5, status: 'in_progress' } } });
    await tracker.sendQueue;
    assert.equal(calls.reduce((sum, seconds) => sum + seconds, 0), 10);
    assert.equal(tracker.lastUpdateTime, null);

    let finishStart!: (value: unknown) => void;
    const slowStart = new Promise((resolve) => { finishStart = resolve; });
    let starts = 0;
    let resumed = 0;
    api.post = async (url: string) => {
      if (!url.endsWith('/start')) return { data: { data: { progressPercentage: 0, isCompleted: false, watchTime: 0, status: 'in_progress' } } };
      starts += 1;
      return starts === 1 ? slowStart : { data: { data: { lastPosition: 0 } } };
    };
    const second = new Tracker({ videoId: 'cccccccccccccccccccccccc', userId: 'bbbbbbbbbbbbbbbbbbbbbbbb', getVideoTime: () => ({ currentTime: 0, totalDuration: 100 }), onResume: (position: number) => { resumed = position; } });
    second.setState = (value: object) => { Object.assign(second.state, value); };
    second.mounted = true;
    second.handleVideoPlay();
    await Promise.resolve();
    second.handleVideoPause();
    second.handleVideoPlay();
    assert.equal(starts, 1);
    finishStart({ data: { data: { lastPosition: 42 } } });
    await second.startQueue;
    assert.equal(resumed, 42);
    second.handleVideoPause();
    await second.sendQueue;
  } finally {
    Date.now = originalNow;
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
    await vite.close();
  }
});

test('a failed start still tracks playback and pagehide persists the final interval synchronously', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  const originalNow = Date.now;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const stored = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  } });
  let interval: ReturnType<typeof setInterval> | undefined;
  try {
    const { default: Tracker } = await vite.ssrLoadModule('/src/components/VideoProgressTracker.tsx');
    const { default: api } = await vite.ssrLoadModule('/src/utils/axiosConfig.ts');
    let confirm!: (response: unknown) => void;
    const pending = new Promise(resolve => { confirm = resolve; });
    api.post = async (url: string) => {
      if (url.endsWith('/start')) throw new Error('simulated connection failure');
      return pending;
    };
    let now = 1000;
    Date.now = () => now;
    const tracker = new Tracker({ videoId: 'aaaaaaaaaaaaaaaaaaaaaaaa', userId: 'bbbbbbbbbbbbbbbbbbbbbbbb', getVideoTime: () => ({ currentTime: 3, totalDuration: 100 }) });
    tracker.mounted = true;
    tracker.setState = (update: object) => Object.assign(tracker.state, update);
    tracker.handleVideoPlay();
    await tracker.startQueue;
    interval = tracker.updateInterval;
    assert.ok(interval, 'el seguimiento continúa aunque falle la recuperación de posición');
    now = 4000;
    tracker.handlePageHide();
    const operation = JSON.parse(stored.get('copernico:video-progress:bbbbbbbbbbbbbbbbbbbbbbbb') ?? '[]')[0];
    assert.equal(operation.payload.watchedSeconds, 3);
    assert.equal(operation.payload.currentTime, 3);
    assert.equal(tracker.updateInterval, null);
    tracker.handlePageHide();
    assert.equal(JSON.parse(stored.values().next().value ?? '[]').length, 1);
    confirm({ data: { data: { progressPercentage: 3, isCompleted: false, watchTime: 3, status: 'in_progress' } } });
    await tracker.sendQueue;
    assert.equal(stored.size, 0);
    tracker.handleVideoPlay();
    await tracker.startQueue;
    now = 8000;
    tracker.handleProgressClear(new CustomEvent('clear', { detail: { userId: 'bbbbbbbbbbbbbbbbbbbbbbbb' } }));
    tracker.endSession();
    assert.equal(stored.size, 0, 'el desmontaje posterior al logout no vuelve a guardar datos');
  } finally {
    if (interval) clearInterval(interval);
    Date.now = originalNow;
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
    await vite.close();
  }
});
