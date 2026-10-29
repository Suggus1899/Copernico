import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { asyncHandler } from '../src/utils/asyncHandler.js';
import { parsePagination } from '../src/utils/pagination.js';
test('pagination bounds negative page and limit', () => {
 assert.deepEqual(parsePagination({ page: '-2', limit: '-4' }, 20, 100), { page: 1, limit: 1 });
});
test('asyncHandler forwards one rejection to next', async () => {
 const app = express(); let calls = 0;
 app.get('/', asyncHandler(async () => { throw new Error('expected'); }));
 app.use((_error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => { calls++; res.sendStatus(500); });
 await request(app).get('/').expect(500);
 assert.equal(calls, 1);
});
