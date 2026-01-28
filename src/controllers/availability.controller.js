import AvailabilitySlot from "../models/AvailabilitySlot.js";
import User from "../models/User.js";

export const getAvailabilitySlots = async (req, res, next) => {
  try {
    const { 
      userId, 
      userRole, 
      subject, 
      status, 
      scheduleType,
      date,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const filter = {};
    
    // Filtros
    if (userId) filter.userId = userId;
    if (userRole) filter.userRole = userRole;
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (status) filter.status = status;
    if (scheduleType) filter.scheduleType = scheduleType;
    
    // Filtro por fecha para slots específicos
    if (date) {
      const targetDate = new Date(date);
      filter.$or = [
        { scheduleType: 'recurring' },
        { 
          scheduleType: 'specific_dates',
          specificDate: {
            $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            $lt: new Date(targetDate.setHours(23, 59, 59, 999))
          }
        }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { startTime: 1 }
    };

    const slots = await AvailabilitySlot.find(filter)
      .populate('userId', 'personalInfo email role')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await AvailabilitySlot.countDocuments(filter);

    res.json({
      success: true,
      data: slots,
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

export const getAvailabilitySlotById = async (req, res, next) => {
  try {
    const slot = await AvailabilitySlot.findById(req.params.id)
      .populate('userId', 'personalInfo email role')
      .populate('createdBy', 'personalInfo')
      .populate('updatedBy', 'personalInfo');

    if (!slot) {
      const error = new Error("Availability slot not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      data: slot
    });
  } catch (error) {
    next(error);
  }
};

export const createAvailabilitySlot = async (req, res, next) => {
  try {
    const slotData = req.body;

    // Verificar que el usuario existe y tiene el rol correcto
    const user = await User.findById(slotData.userId);
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (!['tutor', 'advisor'].includes(user.role)) {
      const error = new Error("User must be a tutor or advisor to create availability slots");
      error.status = 400;
      throw error;
    }

    // Verificar que userRole coincide con el rol real del usuario
    if (user.role !== slotData.userRole) {
      const error = new Error("User role mismatch");
      error.status = 400;
      throw error;
    }

    // Verificar superposición de horarios
    const overlappingSlot = await AvailabilitySlot.findOne({
      userId: slotData.userId,
      status: 'available',
      $or: [
        {
          scheduleType: 'recurring',
          dayOfWeek: slotData.dayOfWeek,
          $or: [
            { startTime: { $lt: slotData.endTime }, endTime: { $gt: slotData.startTime } }
          ]
        },
        {
          scheduleType: 'specific_dates',
          specificDate: slotData.specificDate,
          $or: [
            { startTime: { $lt: slotData.endTime }, endTime: { $gt: slotData.startTime } }
          ]
        }
      ]
    });

    if (overlappingSlot) {
      const error = new Error("Time slot overlaps with existing availability");
      error.status = 409;
      throw error;
    }

    // Agregar información de auditoría
    if (req.user) {
      slotData.createdBy = req.user.id;
      slotData.updatedBy = req.user.id;
    }

    const newSlot = new AvailabilitySlot(slotData);
    const slotSaved = await newSlot.save();

    // Populate para la respuesta
    const populatedSlot = await AvailabilitySlot.findById(slotSaved._id)
      .populate('userId', 'personalInfo email role');

    res.status(201).json({
      success: true,
      message: "Availability slot created successfully",
      data: populatedSlot
    });
  } catch (error) {
    next(error);
  }
};

export const updateAvailabilitySlot = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    
    // Agregar información de auditoría
    if (req.user) {
      updateData.updatedBy = req.user.id;
    }

    const slot = await AvailabilitySlot.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'personalInfo email role');

    if (!slot) {
      const error = new Error("Availability slot not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: "Availability slot updated successfully",
      data: slot
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAvailabilitySlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const slot = await AvailabilitySlot.findByIdAndDelete(id);

    if (!slot) {
      const error = new Error("Availability slot not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: "Availability slot deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAvailabilitySlots = async (req, res, next) => {
  try {
    const { status, scheduleType, subject } = req.query;
    
    const filter = { userId: req.user.id };
    
    if (status) filter.status = status;
    if (scheduleType) filter.scheduleType = scheduleType;
    if (subject) filter.subject = new RegExp(subject, 'i');

    const slots = await AvailabilitySlot.find(filter)
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableSlotsForSubject = async (req, res, next) => {
  try {
    const { subject, date, userRole = 'tutor' } = req.query;
    
    if (!subject) {
      const error = new Error("Subject is required");
      error.status = 400;
      throw error;
    }

    const filter = {
      userRole,
      subject: new RegExp(subject, 'i'),
      status: 'available'
    };

    // Filtro por fecha
    if (date) {
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      filter.$or = [
        { 
          scheduleType: 'recurring',
          dayOfWeek: dayOfWeek
        },
        { 
          scheduleType: 'specific_dates',
          specificDate: {
            $gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            $lt: new Date(targetDate.setHours(23, 59, 59, 999))
          }
        }
      ];
    }

    const slots = await AvailabilitySlot.find(filter)
      .populate('userId', 'personalInfo academicProfile tutorProfile advisorProfile rating')
      .sort({ startTime: 1 });

    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateAvailabilityStatus = async (req, res, next) => {
  try {
    const { slotIds, status } = req.body;

    if (!Array.isArray(slotIds) || slotIds.length === 0) {
      const error = new Error("slotIds array is required");
      error.status = 400;
      throw error;
    }

    if (!['available', 'booked', 'cancelled', 'completed'].includes(status)) {
      const error = new Error("Invalid status");
      error.status = 400;
      throw error;
    }

    const result = await AvailabilitySlot.updateMany(
      { _id: { $in: slotIds } },
      { 
        status,
        updatedBy: req.user?.id 
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} availability slots updated to ${status}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};