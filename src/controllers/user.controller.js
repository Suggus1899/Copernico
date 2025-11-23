import User from "../models/User.js";

export const getUsers = async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    const filter = { status: { $ne: 'deleted' } };
    
    if (role) filter.role = role;
    if (status) filter.status = status;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const users = await User.find(filter)
      .select('-password -verificationToken -passwordResetToken') 
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
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

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -verificationToken -passwordResetToken');
    
    if (!user || user.status === 'deleted') {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const userData = req.body;

    // Verificar si el usuario ya existe por email
    const userFound = await User.findOne({ 
      email: userData.email,
      status: { $ne: 'deleted' }
    });

    if (userFound) {
      const error = new Error("The user already exists");
      error.status = 409;
      throw error;
    }

    // Agregar información de auditoría
    if (req.user) {
      userData.createdBy = req.user.id;
      userData.updatedBy = req.user.id;
    }

    // Crear nuevo usuario
    const newUser = new User(userData);
    const userSaved = await newUser.save();
    
    // Excluir campos sensibles en la respuesta
    const userResponse = userSaved.toObject();
    delete userResponse.password;
    delete userResponse.verificationToken;
    delete userResponse.passwordResetToken;

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    
    // Agregar información de auditoría
    if (req.user) {
      updateData.updatedBy = req.user.id;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -verificationToken -passwordResetToken');

    if (!user || user.status === 'deleted') {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Soft delete - marcar como deleted y agregar deletedAt
    const userDeleted = await User.findByIdAndUpdate(
      id,
      { 
        status: 'deleted',
        deletedAt: new Date(),
        updatedBy: req.user?.id 
      },
      { new: true }
    ).select('-password -verificationToken -passwordResetToken');

    if (!userDeleted) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: "User deleted successfully",
      data: userDeleted
    });
  } catch (error) {
    next(error);
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -verificationToken -passwordResetToken');
    
    if (!user || user.status === 'deleted') {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    // Prevenir que usuarios normales cambien ciertos campos
    const allowedFields = [
      'personalInfo', 'academicProfile', 'studentProfile', 
      'tutorProfile', 'advisorProfile', 'communicationSettings'
    ];
    
    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field]) {
        updateData[field] = req.body[field];
      }
    });

    // Agregar información de auditoría
    updateData.updatedBy = req.user.id;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -verificationToken -passwordResetToken');

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const changeUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      const error = new Error("Invalid status");
      error.status = 400;
      throw error;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { 
        status,
        updatedBy: req.user?.id 
      },
      { new: true }
    ).select('-password -verificationToken -passwordResetToken');

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.json({
      success: true,
      message: `User ${status} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};