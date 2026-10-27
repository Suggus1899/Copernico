import { AppError } from '../utils/AppError.js';
import User from '../models/User.js';
import { getStorage, removeQuietly } from '../services/storage/index.js';
import {
  buildObjectKey,
  DOCUMENT_EXTENSIONS,
  identifyUpload,
  IMAGE_EXTENSIONS,
  toDisplayName,
} from '../utils/fileTypes.js';
import { MAX_DOCUMENTS_PER_REQUEST } from '../middlewares/upload.middleware.js';

const MAX_DOCUMENTS_PER_USER = 20;

// Ruta estable: el avatar se sirve con una redirección a una URL firmada de vida corta.
const avatarPath = (userId) => `/api/users/${userId}/avatar`;

const findOwnUser = async (userId, select) => {
  const user = await User.findById(userId).select(select);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado');
  return user;
};

const findOwnDocument = async (userId, docId) => {
  const user = await User.findOne({ _id: userId, 'documents._id': docId }).select('+documents');
  const document = user?.documents.id(docId);
  if (!document) throw new AppError(404, 'NOT_FOUND', 'Documento no encontrado');
  return document;
};

// ---- Avatar del usuario autenticado ----

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'BAD_REQUEST', 'No se proporcionó ninguna imagen');
    const kind = identifyUpload(req.file, IMAGE_EXTENSIONS);
    const storage = getStorage();
    const userId = req.user.id;
    const current = await findOwnUser(userId, '+avatarKey');

    const key = buildObjectKey('avatars', kind.ext, userId);
    await storage.upload(key, req.file.buffer, kind.mime);
    try {
      await User.updateOne(
        { _id: userId },
        { $set: { 'personalInfo.avatar': avatarPath(userId), avatarKey: key, updatedBy: userId } },
      );
    } catch (error) {
      await removeQuietly(storage, [key]);
      throw error;
    }
    if (current.avatarKey) await removeQuietly(storage, [current.avatarKey]);

    const user = await findOwnUser(userId);
    res.json({
      success: true,
      message: 'Avatar actualizado exitosamente',
      data: { avatar: avatarPath(userId), user },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('+avatarKey');
    if (!user?.avatarKey || user.status === 'deleted') {
      throw new AppError(404, 'NOT_FOUND', 'El usuario no tiene avatar');
    }
    const url = await getStorage().createSignedUrl(user.avatarKey);
    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
};

export const deleteUserAvatar = async (req, res, next) => {
  try {
    const storage = getStorage();
    const userId = req.user.id;
    const current = await findOwnUser(userId, '+avatarKey');
    if (!current.avatarKey) {
      throw new AppError(404, 'NOT_FOUND', 'El usuario no tiene avatar para eliminar');
    }

    await User.updateOne(
      { _id: userId },
      { $unset: { 'personalInfo.avatar': '', avatarKey: '' }, $set: { updatedBy: userId } },
    );
    await removeQuietly(storage, [current.avatarKey]);

    const user = await findOwnUser(userId);
    res.json({ success: true, message: 'Avatar eliminado exitosamente', data: user });
  } catch (error) {
    next(error);
  }
};

// ---- Documentos privados del usuario autenticado ----
// Todas las respuestas que cambian documentos devuelven la lista completa.

export const listDocuments = async (req, res, next) => {
  try {
    const user = await findOwnUser(req.user.id, '+documents');
    res.json({ success: true, data: { documents: user.documents } });
  } catch (error) {
    next(error);
  }
};

export const uploadDocuments = async (req, res, next) => {
  try {
    const files = req.files ?? [];
    if (files.length === 0) throw new AppError(400, 'BAD_REQUEST', 'No se proporcionó ningún documento');
    const userId = req.user.id;

    // Se valida todo antes de subir nada: un archivo inválido no deja subidas a medias.
    const items = files.map((file) => {
      const kind = identifyUpload(file, DOCUMENT_EXTENSIONS);
      return { file, kind, key: buildObjectKey('documents', kind.ext, userId) };
    });

    const storage = getStorage();
    const uploadedKeys = [];
    try {
      const entries = [];
      for (const { file, kind, key } of items) {
        await storage.upload(key, file.buffer, kind.mime);
        uploadedKeys.push(key);
        entries.push({
          name: toDisplayName(file.originalname, kind.ext),
          key,
          mimeType: kind.mime,
          size: file.size,
          tags: [],
        });
      }
      // El límite se comprueba en la misma operación que la escritura (índice que no debe existir).
      const result = await User.updateOne(
        { _id: userId, [`documents.${MAX_DOCUMENTS_PER_USER - entries.length}`]: { $exists: false } },
        { $push: { documents: { $each: entries } }, $set: { updatedBy: userId } },
      );
      if (result.matchedCount === 0) {
        throw new AppError(422, 'DOCUMENT_LIMIT_REACHED', `Solo puedes tener ${MAX_DOCUMENTS_PER_USER} documentos`);
      }
    } catch (error) {
      await removeQuietly(storage, uploadedKeys);
      throw error;
    }

    const user = await findOwnUser(userId, '+documents');
    res.status(201).json({
      success: true,
      message: 'Documentos subidos correctamente',
      data: { documents: user.documents },
    });
  } catch (error) {
    next(error);
  }
};

export const updateDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { docId } = req.params;
    const { name, tags } = req.body;

    const set = { updatedBy: userId };
    if (name !== undefined) set['documents.$.name'] = name;
    if (tags !== undefined) set['documents.$.tags'] = tags;

    const result = await User.updateOne({ _id: userId, 'documents._id': docId }, { $set: set });
    if (result.matchedCount === 0) throw new AppError(404, 'NOT_FOUND', 'Documento no encontrado');

    const user = await findOwnUser(userId, '+documents');
    res.json({ success: true, message: 'Documento actualizado', data: { documents: user.documents } });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const storage = getStorage();
    const userId = req.user.id;
    const document = await findOwnDocument(userId, req.params.docId);

    await User.updateOne(
      { _id: userId },
      { $pull: { documents: { _id: document._id } }, $set: { updatedBy: userId } },
    );
    await removeQuietly(storage, [document.key]);

    const user = await findOwnUser(userId, '+documents');
    res.json({ success: true, message: 'Documento eliminado', data: { documents: user.documents } });
  } catch (error) {
    next(error);
  }
};

export const downloadDocument = async (req, res, next) => {
  try {
    const document = await findOwnDocument(req.user.id, req.params.docId);
    const url = await getStorage().createSignedUrl(document.key, { downloadName: document.name });
    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
};
