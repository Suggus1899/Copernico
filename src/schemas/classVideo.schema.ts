import { z } from 'zod';
import { CLASS_VIDEO_STATUS, CLASS_VIDEO_VISIBILITY } from '../models/ClassVideo.js';
import { parseYouTubeId } from '../utils/youtube.js';

import { objectId } from './common.js';
const text = (max: number) => z.string().trim().max(max);
const minutes = z.coerce.number().int().min(0).max(1440);

/** Acepta el ID de YouTube o cualquier URL de youtube.com / youtu.be con un vídeo válido. */
const youtubeUrl = text(300).refine((value) => parseYouTubeId(value) !== null, {
  message: 'Introduce una URL de YouTube válida o el identificador del vídeo.'
});

const tags = z.array(text(50).min(1)).max(20);
const allowedStudents = z.array(objectId).max(500);
const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
};

export const createClassVideoSchema = z.object({
  body: z.object({
    title: text(200).min(1, 'El título es obligatorio'),
    description: text(1000).optional(),
    subject: text(100).min(1, 'La asignatura es obligatoria'),
    topic: text(100).optional(),
    grade: text(50).optional(),
    duration: minutes.optional(),
    youtubeUrl,
    visibility: z.enum(CLASS_VIDEO_VISIBILITY).default('students'),
    allowedStudents: allowedStudents.default([]),
    tags: tags.default([])
  })
});

export const updateClassVideoSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    title: text(200).min(1).optional(),
    description: text(1000).optional(),
    subject: text(100).min(1).optional(),
    topic: text(100).optional(),
    grade: text(50).optional(),
    duration: minutes.optional(),
    youtubeUrl: youtubeUrl.optional(),
    visibility: z.enum(CLASS_VIDEO_VISIBILITY).optional(),
    allowedStudents: allowedStudents.optional(),
    tags: tags.optional(),
    status: z.enum(CLASS_VIDEO_STATUS).optional()
  }).refine((body) => Object.keys(body).length > 0, {
    message: 'No hay campos para actualizar'
  })
});

export const videoIdParamSchema = z.object({
  params: z.object({ id: objectId })
});

export const listClassVideosSchema = z.object({
  query: z.object({
    subject: text(100).optional(),
    status: z.enum(CLASS_VIDEO_STATUS).optional(),
    visibility: z.enum(CLASS_VIDEO_VISIBILITY).optional(),
    uploadedBy: objectId.optional(),
    tag: text(50).optional(),
    ...pagination
  })
});

export const myClassVideosSchema = z.object({
  query: z.object({
    status: z.enum(CLASS_VIDEO_STATUS).optional(),
    ...pagination
  })
});

export const popularClassVideosSchema = z.object({
  query: z.object({
    subject: text(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10)
  })
});
