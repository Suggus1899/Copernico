import type { RequestHandler } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';
/** Express 4 forwards rejected handler promises through next. */
export const asyncHandler = <P = ParamsDictionary, Res = unknown, Body = unknown, Q = Query>(handler: RequestHandler<P, Res, Body, Q>): RequestHandler<P, Res, Body, Q> => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
