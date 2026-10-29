import type { FilterQuery } from 'mongoose';
import type { BodyOf, Handler } from '../types/http.js';
import type { AssignmentRecord } from '../models/Assignment.js';
import type * as schemas from '../schemas/assignment.schema.js';
import Assignment from "../models/Assignment.js";
import EducationalMaterial from "../models/EducationalMaterial.js";
import User from "../models/User.js";

type AssignmentQuery = { studentId?: string; assignedBy?: string; status?: string; materialId?: string; overdue?: string; page?: string; limit?: string };
type AssignmentParams = Record<string, string>;

export const getAssignments: Handler<AssignmentParams, unknown, unknown, AssignmentQuery> = async (req, res, next) => {
  try {
    const { 
      studentId, 
      assignedBy, 
      status, 
      materialId,
      overdue,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter: FilterQuery<AssignmentRecord> = {};
    
    // Filtros según el rol del usuario
    if (req.user!.role === 'student') {
      filter.studentId = req.user!.id;
    } else if (['tutor', 'advisor'].includes(req.user!.role)) {
      filter.assignedBy = req.user!.id;
    }
    
    // Filtros adicionales para admin
    if (studentId && req.user!.role !== 'student') filter.studentId = studentId;
    if (assignedBy && !['tutor', 'advisor'].includes(req.user!.role)) filter.assignedBy = assignedBy;
    if (status) filter.status = status;
    if (materialId) filter.materialId = materialId;
    
    // Filtro para tareas vencidas
    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $in: ['assigned', 'returned'] };
    }

    const options = {
      page: parseInt(String(page)),
      limit: parseInt(String(limit)),
      sort: { dueDate: 1 as const }
    };

    const assignments = await Assignment.find(filter)
      .populate('materialId', 'title subject type difficulty')
      .populate('studentId', 'personalInfo email studentProfile')
      .populate('assignedBy', 'personalInfo email')
      .populate('appointmentId', 'subject scheduledDate')
      .populate('grading.gradedBy', 'personalInfo')
      .populate('comments.authorId', 'personalInfo')
      .populate('extensions.requestedBy', 'personalInfo')
      .populate('extensions.approvedBy', 'personalInfo')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await Assignment.countDocuments(filter);

    res.json({
      success: true,
      data: assignments,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById: Handler<AssignmentParams> = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('materialId', 'title subject type difficulty assignmentDetails')
      .populate('studentId', 'personalInfo email studentProfile')
      .populate('assignedBy', 'personalInfo email')
      .populate('appointmentId', 'subject scheduledDate')
      .populate('grading.gradedBy', 'personalInfo')
      .populate('comments.authorId', 'personalInfo')
      .populate('extensions.requestedBy', 'personalInfo')
      .populate('extensions.approvedBy', 'personalInfo')
      .populate('createdBy', 'personalInfo')
      .populate('updatedBy', 'personalInfo');

    if (!assignment) {
      const error = new Error("Assignment not found") as Error & { status: number };
      error.status = 404;
      throw error;
    }

    // Verificar permisos
    const canView = 
      req.user!.role === 'admin' ||
      assignment.studentId._id.toString() === req.user!.id ||
      assignment.assignedBy._id.toString() === req.user!.id;

    if (!canView) {
      const error = new Error("Access denied to this assignment") as Error & { status: number };
      error.status = 403;
      throw error;
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

export const createAssignment: Handler<AssignmentParams, unknown, BodyOf<typeof schemas.createAssignmentSchema> & { assignedBy?: string; createdBy?: string; updatedBy?: string }> = async (req, res, next) => {
  try {
    const assignmentData = req.body;

    // Verificar que el material existe
    const material = await EducationalMaterial.findById(assignmentData.materialId);
    if (!material) {
      const error = new Error("Educational material not found") as Error & { status: number };
      error.status = 404;
      throw error;
    }

    // Verificar que el estudiante existe y es estudiante
    const student = await User.findById(assignmentData.studentId);
    if (!student || student.role !== 'student') {
      const error = new Error("Student not found or invalid role") as Error & { status: number };
      error.status = 404;
      throw error;
    }

    // Verificar permisos para asignar tareas
    if (!['tutor', 'advisor', 'admin'].includes(req.user!.role)) {
      const error = new Error("Only tutors, advisors and admins can create assignments") as Error & { status: number };
      error.status = 403;
      throw error;
    }

    // Agregar información de auditoría
    assignmentData.assignedBy = req.user!.id;
    assignmentData.createdBy = req.user!.id;
    assignmentData.updatedBy = req.user!.id;

    const newAssignment = new Assignment(assignmentData);
    const assignmentSaved = await newAssignment.save();

    // Populate para la respuesta
    const populatedAssignment = await Assignment.findById(assignmentSaved._id)
      .populate('materialId', 'title subject type')
      .populate('studentId', 'personalInfo email')
      .populate('assignedBy', 'personalInfo email');

    res.status(201).json({
      success: true,
      message: "Assignment created successfully",
      data: populatedAssignment
    });
  } catch (error) {
    next(error);
  }
};

export const updateAssignment: Handler<AssignmentParams, unknown, BodyOf<typeof schemas.updateAssignmentSchema>> = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      const error = new Error("Assignment not found") as Error & { status: number };
      error.status = 404;
      throw error;
    }

    // Verificar permisos - solo asignador o admin puede editar
    if (assignment.assignedBy.toString() !== req.user!.id && req.user!.role !== 'admin') {
      const error = new Error("Not authorized to update this assignment") as Error & { status: number };
      error.status = 403;
      throw error;
    }

    const updateData = { 
      ...req.body,
      updatedBy: req.user!.id
    };

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('materialId', 'title subject type')
    .populate('studentId', 'personalInfo email')
    .populate('assignedBy', 'personalInfo email')
    .populate('updatedBy', 'personalInfo');

    res.json({
      success: true,
      message: "Assignment updated successfully",
      data: updatedAssignment
    });
  } catch (error) {
    next(error);
  }
};

export const submitAssignment: Handler<AssignmentParams, unknown, BodyOf<typeof schemas.submitAssignmentSchema>> = async (req, res, next) => {
  try {
    const submissionData = req.body;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      const error = new Error("Assignment not found") as Error & { status: number };
      error.status = 404;
      throw error;
    }

    // Verificar que el estudiante es el dueño de la tarea
    if (assignment.studentId.toString() !== req.user!.id) {
      const error = new Error("Not authorized to submit this assignment") as Error & { status: number };
      error.status = 403;
      throw error;
    }

    // Verificar que no esté ya calificada
    if (assignment.status === 'graded') {
      const error = new Error("Cannot submit already graded assignment") as Error & { status: number };
      error.status = 400;
      throw error;
    }

    await assignment.submitAssignment(submissionData as Partial<NonNullable<AssignmentRecord['submission']>>);

    const updatedAssignment = await Assignment.findById(req.params.id)
      .populate('materialId', 'title subject type')
      .populate('studentId', 'personalInfo email');

    res.json({
      success: true,
      message: "Assignment submitted successfully",
      data: updatedAssignment
    });
  } catch (error) {
    next(error);
  }
};

export const gradeAssignment: Handler<AssignmentParams, unknown, BodyOf<typeof schemas.gradeAssignmentSchema>> = async (req, res, next) => {
  try {
    const gradeData = req.body;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      const error = new Error("Assignment not found") as Error & { status: number };
      error.status = 404;
      throw error;
    }

    // Verificar permisos - solo asignador o admin puede calificar
    if (assignment.assignedBy.toString() !== req.user!.id && req.user!.role !== 'admin') {
      const error = new Error("Not authorized to grade this assignment") as Error & { status: number };
      error.status = 403;
      throw error;
    }

    // Verificar que esté enviada para calificar
    if (!assignment.submission?.submittedAt) {
      const error = new Error("Assignment must be submitted before grading") as Error & { status: number };
      error.status = 400;
      throw error;
    }

    await assignment.gradeAssignment(req.user!.id, gradeData as Partial<NonNullable<AssignmentRecord['grading']>>);

    const updatedAssignment = await Assignment.findById(req.params.id)
      .populate('materialId', 'title subject type')
      .populate('studentId', 'personalInfo email')
      .populate('grading.gradedBy', 'personalInfo');

    res.json({
      success: true,
      message: "Assignment graded successfully",
      data: updatedAssignment
    });
  } catch (error) {
    next(error);
  }
};

export const addComment: Handler<AssignmentParams, unknown, BodyOf<typeof schemas.addCommentSchema>> = async (req, res, next) => {
  try {
    const { comment, isPrivate, attachments } = req.body;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      const error = new Error("Assignment not found") as Error & { status: number };
      error.status = 404;
      throw error;
    }

    // Verificar permisos - estudiante, asignador o admin
    const canComment = 
      assignment.studentId.toString() === req.user!.id ||
      assignment.assignedBy.toString() === req.user!.id ||
      req.user!.role === 'admin';

    if (!canComment) {
      const error = new Error("Not authorized to comment on this assignment") as Error & { status: number };
      error.status = 403;
      throw error;
    }

    await assignment.addComment(req.user!.id, comment, isPrivate);

    const updatedAssignment = await Assignment.findById(req.params.id)
      .populate('comments.authorId', 'personalInfo');

    res.json({
      success: true,
      message: "Comment added successfully",
      data: updatedAssignment!.comments
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAssignments: Handler<AssignmentParams, unknown, unknown, { status?: string; overdue?: string }> = async (req, res, next) => {
  try {
    const { status, overdue } = req.query;
    
    let filter: FilterQuery<AssignmentRecord> = { studentId: req.user!.id };
    
    if (status) filter.status = status;
    
    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $in: ['assigned', 'returned'] };
    }

    const assignments = await Assignment.find(filter)
      .populate('materialId', 'title subject type difficulty')
      .populate('assignedBy', 'personalInfo email')
      .sort({ dueDate: 1 as const });

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingAssignments: Handler = async (req, res, next) => {
  try {
    const assignments = await Assignment.getPendingAssignments(req.user!.id);

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    next(error);
  }
};

export const requestExtension: Handler<AssignmentParams, unknown, BodyOf<typeof schemas.requestExtensionSchema>> = async (req, res, next) => {
  try {
    const { reason, newDueDate } = req.body;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      const error = new Error("Assignment not found") as Error & { status: number };
      error.status = 404;
      throw error;
    }

    // Verificar que el estudiante es el dueño
    if (assignment.studentId.toString() !== req.user!.id) {
      const error = new Error("Not authorized to request extension for this assignment") as Error & { status: number };
      error.status = 403;
      throw error;
    }

    await assignment.requestExtension(req.user!.id, reason, newDueDate as unknown as Date);

    const updatedAssignment = await Assignment.findById(req.params.id)
      .populate('extensions.requestedBy', 'personalInfo');

    res.json({
      success: true,
      message: "Extension requested successfully",
      data: updatedAssignment!.extensions
    });
  } catch (error) {
    next(error);
  }
};

export const approveExtension: Handler<AssignmentParams, unknown, { extensionIndex?: number }> = async (req, res, next) => {
  try {
    const { extensionIndex } = req.body;
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      const error = new Error("Assignment not found") as Error & { status: number };
      error.status = 404;
      throw error;
    }

    // Verificar permisos - solo asignador o admin puede aprobar
    if (assignment.assignedBy.toString() !== req.user!.id && req.user!.role !== 'admin') {
      const error = new Error("Not authorized to approve extensions") as Error & { status: number };
      error.status = 403;
      throw error;
    }

    if (!assignment.extensions[extensionIndex!]) {
      const error = new Error("Extension request not found") as Error & { status: number };
      error.status = 404;
      throw error;
    }

    // Aprobar la extensión y actualizar fecha de entrega
    assignment.extensions[extensionIndex!].approved = true;
    assignment.extensions[extensionIndex!].approvedBy = req.user!.id as unknown as typeof assignment.extensions[number]['approvedBy'];
    assignment.extensions[extensionIndex!].approvedAt = new Date();
    assignment.dueDate = assignment.extensions[extensionIndex!].newDueDate as Date;

    await assignment.save();

    res.json({
      success: true,
      message: "Extension approved successfully",
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentStatistics: Handler = async (req, res, next) => {
  try {
    let filter: FilterQuery<AssignmentRecord> = {};
    
    if (req.user!.role === 'student') {
      filter.studentId = req.user!.id;
    } else if (['tutor', 'advisor'].includes(req.user!.role)) {
      filter.assignedBy = req.user!.id;
    }

    const stats = await Assignment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          averageGrade: { $avg: '$grading.grade' }
        }
      }
    ]);

    const totalAssignments = await Assignment.countDocuments(filter);
    const gradedAssignments = await Assignment.countDocuments({
      ...filter,
      status: 'graded'
    });
    const averageGrade = await Assignment.aggregate([
      { $match: { ...filter, status: 'graded' } },
      {
        $group: {
          _id: null,
          average: { $avg: '$grading.grade' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        statusDistribution: stats,
        totalAssignments,
        gradedAssignments,
        averageGrade: averageGrade[0]?.average || 0
      }
    });
  } catch (error) {
    next(error);
  }
};
