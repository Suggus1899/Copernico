import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { schemaValidator } from '../src/middlewares/schemaValidator.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
test('validation transforms dates and numeric queries before handlers and rejects invalid input', async () => {
 const app=express(); app.use(express.json());
 app.post('/', schemaValidator(z.object({body:z.object({date:z.string().datetime().transform(v=>new Date(v))}),query:z.object({page:z.coerce.number()})})), (req,res)=>res.json({date:req.body.date instanceof Date,page:typeof req.query.page}));
 app.use(errorHandler);
 await request(app).post('/?page=2').send({date:'2026-10-29T12:00:00Z'}).expect(200,{date:true,page:'number'});
 const invalid=await request(app).post('/?page=no').send({date:'bad'}).expect(422);
 assert.equal(invalid.body.error.code,'VALIDATION_ERROR');
});
