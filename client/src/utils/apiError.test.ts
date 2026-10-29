import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getApiErrorMessage } from './apiError';

test('reports network failures, validation details, API message and fallback', () => {
  assert.match(getApiErrorMessage(new Error('offline')), /conectar/);
  assert.equal(getApiErrorMessage({ response: { data: { error: { details: [{ message: 'Campo inválido' }], message: 'Validación' } } } }), 'Campo inválido');
  assert.equal(getApiErrorMessage({ response: { data: { error: { message: 'Denegado' } } } }), 'Denegado');
  assert.equal(getApiErrorMessage({ response: { data: {} } }, 'Alternativo'), 'Alternativo');
});
