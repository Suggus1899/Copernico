import ClassVideo from '../models/ClassVideo.js';
import VideoProgress from '../models/VideoProgress.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { parseYouTubeId } from '../utils/youtube.js';

const AUTHOR_FIELDS = 'personalInfo.firstName personalInfo.lastName personalInfo.avatar';

const isAdmin = (user) => user.role === 'admin';
const isOwner = (user, video) => String(video.uploadedBy?._id ?? video.uploadedBy) === user.id;
const canManage = (user, video) => isAdmin(user) || isOwner(user, video);

/**
 * Filtro Mongo equivalente a `ClassVideo#canAccess`: el propietario ve sus vídeos
 * (también archivados); el resto solo los publicados que puede ver.
 */
const visibleTo = (user) => {
  if (isAdmin(user)) return {};
  return {
    $or: [
      { uploadedBy: user.id },
      {
        status: 'published',
        $or: [{ visibility: { $in: ['public', 'students'] } }, { allowedStudents: user.id }]
      }
    ]
  };
};

const subjectFilter = (subject) => new RegExp(escapeRegex(subject), 'i');

const pageInfo = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit)
});

const progressSummary = (progress) => (progress ? {
  progressPercentage: progress.progressPercentage,
  isCompleted: progress.isCompleted,
  watchTime: progress.watchTime,
  status: progress.status,
  lastWatchedAt: progress.lastWatchedAt
} : null);

/** Carga un vídeo que el usuario puede ver; si no, responde 404 para no revelar su existencia. */
const findVisibleVideo = async (id, user) => {
  const video = await ClassVideo.findById(id);
  if (!video || !video.canAccess(user)) {
    throw new AppError(404, 'NOT_FOUND', 'Vídeo no encontrado');
  }
  return video;
};

/** Carga un vídeo que el usuario puede gestionar (propietario o admin). */
const findManageableVideo = async (id, user) => {
  const video = await findVisibleVideo(id, user);
  if (!canManage(user, video)) {
    throw new AppError(403, 'FORBIDDEN', 'No puedes modificar este vídeo');
  }
  return video;
};

export const getClassVideos = asyncHandler(async (req, res) => {
  const { subject, status, visibility, uploadedBy, tag, page, limit } = req.query;

  const filter = { ...visibleTo(req.user) };
  if (subject) filter.subject = subjectFilter(subject);
  if (status) filter.status = status;
  if (visibility) filter.visibility = visibility;
  if (uploadedBy) filter.uploadedBy = uploadedBy;
  if (tag) filter.tags = tag.toLowerCase();

  const [videos, total] = await Promise.all([
    ClassVideo.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('uploadedBy', AUTHOR_FIELDS),
    ClassVideo.countDocuments(filter)
  ]);

  res.json({ success: true, data: videos, pagination: pageInfo(page, limit, total) });
});

export const getPopularClassVideos = asyncHandler(async (req, res) => {
  const { subject, limit } = req.query;

  const filter = { ...visibleTo(req.user), status: 'published' };
  if (subject) filter.subject = subjectFilter(subject);

  const videos = await ClassVideo.find(filter)
    .sort({ views: -1, likes: -1 })
    .limit(limit)
    .populate('uploadedBy', AUTHOR_FIELDS);

  res.json({ success: true, data: videos });
});

export const getMyClassVideos = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;

  const filter = { uploadedBy: req.user.id };
  if (status) filter.status = status;

  const [videos, total] = await Promise.all([
    ClassVideo.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ClassVideo.countDocuments(filter)
  ]);

  res.json({ success: true, data: videos, pagination: pageInfo(page, limit, total) });
});

export const getClassVideoById = asyncHandler(async (req, res) => {
  const video = await findVisibleVideo(req.params.id, req.user);

  // Contador de vistas atómico; el documento de respuesta refleja el nuevo valor.
  await ClassVideo.updateOne({ _id: video._id }, { $inc: { views: 1 } });
  video.views += 1;

  await video.populate([
    { path: 'uploadedBy', select: AUTHOR_FIELDS },
    { path: 'updatedBy', select: AUTHOR_FIELDS }
  ]);

  const data = {
    ...video.toObject(),
    likedByMe: video.likedBy.some((id) => String(id) === req.user.id)
  };
  if (!canManage(req.user, video)) {
    delete data.allowedStudents;
    delete data.likedBy;
  }

  if (req.user.role === 'student') {
    const progress = await VideoProgress.findOne({ studentId: req.user.id, videoId: video._id });
    data.progress = progressSummary(progress);
  }

  res.json({ success: true, data });
});

export const createClassVideo = asyncHandler(async (req, res) => {
  const { youtubeUrl, ...fields } = req.body;

  const video = await ClassVideo.create({
    ...fields,
    youtubeId: parseYouTubeId(youtubeUrl),
    uploadedBy: req.user.id
  });

  res.status(201).json({ success: true, message: 'Vídeo creado', data: video });
});

export const updateClassVideo = asyncHandler(async (req, res) => {
  const video = await findManageableVideo(req.params.id, req.user);
  const { youtubeUrl, ...fields } = req.body;

  video.set(fields);
  if (youtubeUrl !== undefined) video.youtubeId = parseYouTubeId(youtubeUrl);
  video.updatedBy = req.user.id;
  await video.save();

  res.json({ success: true, message: 'Vídeo actualizado', data: video });
});

export const deleteClassVideo = asyncHandler(async (req, res) => {
  const video = await findManageableVideo(req.params.id, req.user);
  await video.deleteOne();

  res.json({ success: true, message: 'Vídeo eliminado' });
});

export const toggleLikeVideo = asyncHandler(async (req, res) => {
  const video = await findVisibleVideo(req.params.id, req.user);
  if (isOwner(req.user, video)) {
    throw new AppError(400, 'OWN_VIDEO', 'No puedes dar like a tu propio vídeo');
  }

  await video.toggleLike(req.user.id);

  res.json({
    success: true,
    data: {
      likes: video.likes,
      likedByMe: video.likedBy.some((id) => String(id) === req.user.id)
    }
  });
});
