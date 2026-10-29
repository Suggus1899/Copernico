import type { RequestHandler } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';
export type Handler<P = ParamsDictionary, Res = unknown, Body = unknown, Q = Query> = RequestHandler<P, Res, Body, Q>;
import type { z } from 'zod';
export type BodyOf<S extends z.ZodType> = z.output<S> extends { body: infer B } ? B : never;
