import Note from "../models/Note.js";

export const getNotes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notes = await Note.find({
      $or: [
        { userId: userId },
        { visibility: 'public' },
        { sharedWith: userId }
      ]
    }).populate('sharedWith', 'personalInfo.firstName personalInfo.lastName');
    res.json(notes);
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const { title, content, date, tags, visibility, sharedWith } = req.body;

    // Get author name from user profile or fall back to generic
    const authorName = req.user.personalInfo?.firstName
      ? `${req.user.personalInfo.firstName} ${req.user.personalInfo.lastName}`
      : 'Unknown';

    const newNote = new Note({
      title,
      content,
      date,
      tags,
      visibility,
      sharedWith,
      author: authorName,
      userId: req.user.id
    });

    const savedNote = await newNote.save();
    return res.json(savedNote);
  } catch (error) {
    next(error);
  }
};

export const getNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      const error = new Error("La nota no existe");
      error.status = 404;
      throw error;
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const deletedNote = await Note.findByIdAndDelete(req.params.id);

    if (!deletedNote) {
      const error = new Error("La nota no existe");
      error.status = 404;
      throw error;
    }

    return res.sendStatus(204);
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const { title, content, date, tags, visibility, sharedWith } = req.body;

    // Ensure user owns the note
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this note" });
    }

    const noteUpdated = await Note.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          title,
          content,
          date,
          tags,
          visibility,
          sharedWith
        },
      },
      {
        new: true,
      }
    );

    return res.json(noteUpdated);
  } catch (error) {
    next(error);
  }
};
