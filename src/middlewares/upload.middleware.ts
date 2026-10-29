import type { RequestHandler } from 'express';
import multer from 'multer';
import { AVATAR_MAX_BYTES, DOCUMENT_MAX_BYTES, MATERIAL_MAX_BYTES } from '../config.js';
import { AppError } from '../utils/AppError.js';

export const MAX_DOCUMENTS_PER_REQUEST = 5;

const toMb = (bytes: number) => Math.round(bytes / (1024 * 1024));

const toUploadError = (error: unknown, maxBytes: number) => {
  if (!(error instanceof multer.MulterError)) return error;
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError(413, 'FILE_TOO_LARGE', `El archivo supera el tamaño máximo de ${toMb(maxBytes)} MB`);
  }
  return new AppError(400, 'INVALID_UPLOAD', 'Subida no válida: revisa el nombre del campo y el número de archivos');
};

// Los archivos se mantienen en memoria, se validan por firma y se suben a Storage.
// Nunca se escriben en el disco del servidor.
const withUploadErrors = (middleware: RequestHandler, maxBytes: number): RequestHandler => (req, res, next) => {
  middleware(req, res, (error) => next(error ? toUploadError(error, maxBytes) : undefined));
};

const memory = multer.memoryStorage();

export const avatarUpload = withUploadErrors(
  multer({ storage: memory, limits: { fileSize: AVATAR_MAX_BYTES, files: 1 } }).single('avatar'),
  AVATAR_MAX_BYTES,
);

export const documentsUpload = withUploadErrors(
  multer({ storage: memory, limits: { fileSize: DOCUMENT_MAX_BYTES, files: MAX_DOCUMENTS_PER_REQUEST } })
    .array('documents', MAX_DOCUMENTS_PER_REQUEST),
  DOCUMENT_MAX_BYTES,
);

export const materialUpload = withUploadErrors(
  multer({ storage: memory, limits: { fileSize: MATERIAL_MAX_BYTES, files: 1 } }).single('file'),
  MATERIAL_MAX_BYTES,
);
