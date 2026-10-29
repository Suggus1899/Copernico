import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import client from './axiosConfig';

test('keeps cookies and lets the browser choose the FormData boundary', async () => {
  const adapter: AxiosAdapter = async (config) => {
    assert.equal(config.withCredentials, true);
    assert.notEqual(config.headers.get('Content-Type'), 'application/json');
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
  await client.post('/upload', new FormData(), {
    adapter,
    transformRequest: [(data: unknown, headers: AxiosHeaders) => {
      assert.equal(headers.get('Content-Type'), undefined);
      return data;
    }],
  });
});

test('redirects only expired sessions outside access forms', async (t) => {
  t.after(() => Reflect.deleteProperty(globalThis, 'window'));
  const redirects: string[] = [];
  const location = { pathname: '/dashboard', assign: (url: string) => redirects.push(url) };
  Object.defineProperty(globalThis, 'window', { value: { location }, configurable: true });
  const reject = (code: string, status = 401): AxiosAdapter => async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError('rejected', undefined, config, undefined, { data: { error: { code } }, status, statusText: 'Unauthorized', headers: new AxiosHeaders(), config });
  };
  for (const code of ['SESSION_INVALID', 'UNAUTHENTICATED']) await assert.rejects(client.get('/profile', { adapter: reject(code) }));
  assert.deepEqual(redirects, ['/login', '/login']);
  for (const pathname of ['/login', '/signup']) {
    location.pathname = pathname;
    await assert.rejects(client.get('/profile', { adapter: reject('SESSION_INVALID') }));
  }
  location.pathname = '/account/change-password';
  await assert.rejects(client.get('/password', { adapter: reject('INVALID_CREDENTIALS') }));
  await assert.rejects(client.get('/profile', { adapter: reject('SESSION_INVALID', 500) }));
  await assert.rejects(client.get('/profile', { adapter: async () => { throw new Error('network'); } }));
  assert.equal(redirects.length, 2);
});
