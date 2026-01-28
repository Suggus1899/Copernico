import Note from "../models/Note.js";
import User from "../models/User.js";

export const getNotes = async (req, res, next) => {
  try {
    // Filtrar notas por usuario autenticado o compartidas con él
    const filter = {};
    if (req.user) {
      filter.$or = [
        { userId: req.user.id },
        { "sharedWith.user": req.user.id }
      ];
    }

    const notes = await Note.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'personalInfo email')
      .populate('sharedWith.user', 'personalInfo email');

    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const { title, content, subject, tags } = req.body;

    // Validar campos requeridos
    if (!title || !content) {
      const error = new Error("Title and content are required");
      error.status = 400;
      throw error;
    }

    const noteData = {
      title: title.trim(),
      content: content.trim(),
      subject: subject?.trim() || '',
      tags: Array.isArray(tags) ? tags : [],
      author: req.user?.personalInfo?.firstName
        ? `${req.user.personalInfo.firstName} ${req.user.personalInfo.lastName || ''}`.trim()
        : req.user?.email || 'Usuario',
      userId: req.user?.id
    };

    const newNote = new Note(noteData);
    const savedNote = await newNote.save();

    // Populate para la respuesta
    const populatedNote = await Note.findById(savedNote._id)
      .populate('userId', 'personalInfo email');

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      data: populatedNote
    });
  } catch (error) {
    next(error);
  }
};

export const getNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('userId', 'personalInfo email')
      .populate('sharedWith.user', 'personalInfo email');

    if (!note) {
      const error = new Error("Note not found");
      error.status = 404;
      throw error;
    }

    // Verificar acceso (propietario, admin o compartido)
    const isOwner = note.userId._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isShared = note.sharedWith.some(share => share.user._id.toString() === req.user.id);

    if (!isOwner && !isAdmin && !isShared) {
      const error = new Error("Not authorized");
      error.status = 403;
      throw error;
    }

    res.json({
      success: true,
      data: {
        ...note.toObject(),
        permission: isOwner ? 'owner' : (isAdmin ? 'admin' : note.sharedWith.find(s => s.user._id.toString() === req.user.id).permission)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      const error = new Error("Note not found");
      error.status = 404;
      throw error;
    }

    // Solo permitir eliminar notas propias (excepto admin)
    if (note.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to delete this note");
      error.status = 403;
      throw error;
    }

    await Note.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Note deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const { title, content, subject, tags, isFavorite } = req.body;

    const note = await Note.findById(req.params.id);

    if (!note) {
      const error = new Error("Note not found");
      error.status = 404;
      throw error;
    }

    // Verificar permisos
    const isOwner = note.userId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const sharedPermission = note.sharedWith.find(s => s.user.toString() === req.user.id);
    const canWrite = sharedPermission && sharedPermission.permission === 'write';

    if (!isOwner && !isAdmin && !canWrite) {
      const error = new Error("Not authorized to update this note");
      error.status = 403;
      throw error;
    }

    // Si es compartido (no dueño/admin), solo puede editar título y contenido
    // Dueño puede editar todo
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();

    if (isOwner || isAdmin) {
      if (subject !== undefined) updateData.subject = subject.trim();
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
      if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    }

    const noteUpdated = await Note.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'personalInfo email')
      .populate('sharedWith.user', 'personalInfo email');

    res.json({
      success: true,
      message: "Note updated successfully",
      data: noteUpdated
    });
  } catch (error) {
    next(error);
  }
};

export const shareNote = async (req, res, next) => {
  try {
    const { email, permission = 'read' } = req.body;
    const noteId = req.params.id;

    if (!['read', 'write'].includes(permission)) {
      const error = new Error("Invalid permission. Must be 'read' or 'write'");
      error.status = 400;
      throw error;
    }

    const note = await Note.findById(noteId);
    if (!note) {
      const error = new Error("Note not found");
      error.status = 404;
      throw error;
    }

    // Solo el dueño puede compartir (o admin)
    if (note.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to share this note");
      error.status = 403;
      throw error;
    }

    // Buscar usuario a compartir
    const userToShare = await User.findOne({ email });
    if (!userToShare) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (userToShare._id.toString() === req.user.id) {
      const error = new Error("Cannot share with yourself");
      error.status = 400;
      throw error;
    }

    // Verificar si ya está compartido
    const existingShareIndex = note.sharedWith.findIndex(
      s => s.user.toString() === userToShare._id.toString()
    );

    if (existingShareIndex > -1) {
      // Actualizar permiso si ya existe
      note.sharedWith[existingShareIndex].permission = permission;
    } else {
      // Agregar nuevo share
      note.sharedWith.push({
        user: userToShare._id,
        permission
      });
    }

    await note.save();

    const updatedNote = await Note.findById(noteId)
      .populate('userId', 'personalInfo email')
      .populate('sharedWith.user', 'personalInfo email');

    res.json({
      success: true,
      message: `Note shared with ${email}`,
      data: updatedNote
    });

  } catch (error) {
    next(error);
  }
};

export const unshareNote = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const noteId = req.params.id;

    const note = await Note.findById(noteId);
    if (!note) {
      const error = new Error("Note not found");
      error.status = 404;
      throw error;
    }

    // Solo el dueño puede dejar de compartir (o admin)
    // Opcional: el usuario con quien se compartió podría "salirse" (future improvement)
    if (note.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      const error = new Error("Not authorized to unshare this note");
      error.status = 403;
      throw error;
    }

    note.sharedWith = note.sharedWith.filter(
      s => s.user.toString() !== userId
    );

    await note.save();

    const updatedNote = await Note.findById(noteId)
      .populate('userId', 'personalInfo email')
      .populate('sharedWith.user', 'personalInfo email');

    res.json({
      success: true,
      message: "Note access removed",
      data: updatedNote
    });

  } catch (error) {
    next(error);
  }
};
