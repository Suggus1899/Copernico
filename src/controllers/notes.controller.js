import Note from "../models/Note.js";

export const getNotes = async (req, res, next) => {
  try {
    // Filtrar notas por usuario autenticado
    const filter = {};
    if (req.user) {
      filter.userId = req.user.id;
    }

    const notes = await Note.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'personalInfo email');
    
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
    const filter = { _id: req.params.id };
    
    // Solo permitir acceso a notas propias (excepto admin)
    if (req.user && req.user.role !== 'admin') {
      filter.userId = req.user.id;
    }

    const note = await Note.findOne(filter)
      .populate('userId', 'personalInfo email');

    if (!note) {
      const error = new Error("Note not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    
    // Solo permitir eliminar notas propias (excepto admin)
    if (req.user && req.user.role !== 'admin') {
      filter.userId = req.user.id;
    }

    const deletedNote = await Note.findOneAndDelete(filter);

    if (!deletedNote) {
      const error = new Error("Note not found");
      error.status = 404;
      throw error;
    }

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
    
    const filter = { _id: req.params.id };
    
    // Solo permitir actualizar notas propias (excepto admin)
    if (req.user && req.user.role !== 'admin') {
      filter.userId = req.user.id;
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (subject !== undefined) updateData.subject = subject.trim();
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

    const noteUpdated = await Note.findOneAndUpdate(
      filter,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'personalInfo email');

    if (!noteUpdated) {
      const error = new Error("Note not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: "Note updated successfully",
      data: noteUpdated
    });
  } catch (error) {
    next(error);
  }
};
