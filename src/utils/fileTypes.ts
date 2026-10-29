import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError } from './AppError.js';

const OFFICE_OPEN_XML = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const startsWithBytes = (buffer: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => buffer[offset + index] === byte);
const startsWithAscii = (buffer: Buffer, text: string, offset = 0) =>
  buffer.toString('latin1', offset, offset + text.length) === text;
const isZipContainer = (buffer: Buffer) => startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04]);
const isPlainText = (buffer: Buffer) => !buffer.subarray(0, 8192).includes(0);

// Tipos admitidos. La validez se decide por la extensión y por la firma del contenido;
// el mimetype declarado por el navegador no se usa porque se puede falsificar.
const FILE_KINDS: Record<string, { mime: string; matches: (buffer: Buffer) => boolean }> = {
  jpg: { mime: 'image/jpeg', matches: (buffer: Buffer) => startsWithBytes(buffer, [0xff, 0xd8, 0xff]) },
  png: { mime: 'image/png', matches: (buffer: Buffer) => startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  webp: { mime: 'image/webp', matches: (buffer: Buffer) => startsWithAscii(buffer, 'RIFF') && startsWithAscii(buffer, 'WEBP', 8) },
  pdf: { mime: 'application/pdf', matches: (buffer: Buffer) => startsWithAscii(buffer, '%PDF-') },
  txt: { mime: 'text/plain; charset=utf-8', matches: isPlainText },
  docx: { mime: OFFICE_OPEN_XML.docx, matches: isZipContainer },
  xlsx: { mime: OFFICE_OPEN_XML.xlsx, matches: isZipContainer },
  pptx: { mime: OFFICE_OPEN_XML.pptx, matches: isZipContainer },
};

const EXTENSION_ALIASES: Record<string, string> = { jpeg: 'jpg' };

export const IMAGE_EXTENSIONS = ['jpg', 'png', 'webp'];
export const DOCUMENT_EXTENSIONS = ['pdf', 'txt', 'docx', 'xlsx', 'pptx', 'jpg', 'png', 'webp'];

// Valida extensión y firma del contenido. Devuelve el tipo canónico o lanza 415.
export const identifyUpload = (file: Pick<Express.Multer.File, "originalname" | "buffer">, allowedExtensions: string[]) => {
  const extension = path.extname(file.originalname || '').slice(1).toLowerCase();
  const name = EXTENSION_ALIASES[extension] ?? extension;
  if (!allowedExtensions.includes(name)) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Tipo de archivo no permitido');
  }
  const kind = FILE_KINDS[name];
  if (!kind.matches(file.buffer)) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'El contenido del archivo no coincide con su extensión');
  }
  return { ext: name, mime: kind.mime };
};

// Clave de objeto generada por el servidor: nunca incluye el nombre original.
export const buildObjectKey = (folder: string, ext: string, ownerId?: unknown) =>
  ownerId ? `${folder}/${ownerId}/${randomUUID()}.${ext}` : `${folder}/${randomUUID()}.${ext}`;

// Nombre visible y de descarga: sin rutas ni caracteres de control.
export const toDisplayName = (originalName: unknown, ext: string) => {
  const cleaned = path.basename(String(originalName || ''))
    .replace(/[\u0000-\u001f\u007f"\\/]/g, '_')
    .trim()
    .slice(0, 120);
  return cleaned || `archivo.${ext}`;
};
