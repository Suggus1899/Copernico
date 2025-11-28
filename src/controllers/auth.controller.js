import User from "../models/User.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const signup = async (req, res, next) => {
  try {
    const { 
      email, 
      password, 
      role,
      personalInfo,
      studentProfile,
      tutorProfile,
      advisorProfile,
      academicProfile,
      // Compatibilidad con formato antiguo
      fullname,
      userType
    } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ 
        success: false,
        error: "User already exists" 
      });
    }

    // Mapear formato antiguo a nuevo formato si es necesario
    let finalRole = role;
    let finalPersonalInfo = personalInfo;

    if (fullname && !personalInfo) {
      // Compatibilidad: convertir fullname a firstName y lastName
      const nameParts = fullname.trim().split(/\s+/);
      finalPersonalInfo = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || nameParts[0] || ''
      };
    }

    if (userType && !role) {
      // Mapear formato antiguo a nuevo
      const roleMap = {
        'Estudiante': 'student',
        'Tutor': 'tutor',
        'Asesor': 'advisor'
      };
      finalRole = roleMap[userType] || 'student';
    }

    if (!finalRole) {
      finalRole = 'student'; // Default
    }

    if (!finalPersonalInfo || !finalPersonalInfo.firstName) {
      return res.status(400).json({
        success: false,
        error: "First name and last name are required"
      });
    }

    // Mapear experienceYears de tutorProfile a academicProfile si existe
    let finalAcademicProfile = academicProfile || {};
    let finalTutorProfile = tutorProfile;
    
    if (finalRole === 'tutor' && tutorProfile?.experienceYears !== undefined) {
      // Mover experienceYears de tutorProfile a academicProfile
      finalAcademicProfile = {
        ...finalAcademicProfile,
        experienceYears: tutorProfile.experienceYears
      };
      // Remover experienceYears de tutorProfile (no pertenece ahí según el modelo)
      const { experienceYears, ...tutorProfileWithoutExp } = tutorProfile;
      finalTutorProfile = tutorProfileWithoutExp;
    }

    // El password se hashea automáticamente en el pre-save hook del modelo
    const user = new User({
      email,
      password, // Se hasheará automáticamente
      role: finalRole,
      personalInfo: finalPersonalInfo,
      studentProfile: studentProfile || (finalRole === 'student' ? {} : undefined),
      tutorProfile: finalTutorProfile || (finalRole === 'tutor' ? {} : undefined),
      advisorProfile: advisorProfile || (finalRole === 'advisor' ? {} : undefined),
      academicProfile: finalAcademicProfile
    });

    const savedUser = await user.save();

    // Generar token con expiración configurable
    const token = jwt.sign(
      { _id: savedUser._id }, 
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.header("auth-token", token);
    return res.status(201).json({
      success: true,
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: {
        id: savedUser._id,
        email: savedUser.email,
        role: savedUser.role,
        personalInfo: savedUser.personalInfo
      }
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        error: "Email already registered" 
      });
    }
    next(error);
  }
};

export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists - necesitamos el password para comparar
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid credentials" 
      });
    }

    // Verificar si la cuenta está bloqueada
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        error: `Cuenta bloqueada temporalmente. Intenta nuevamente en ${minutesLeft} minuto(s).`
      });
    }

    // Verificar estado del usuario
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Tu cuenta está ${user.status}. Contacta al administrador.`
      });
    }

    // Check if password is correct
    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      // Incrementar intentos fallidos
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Bloquear después de 5 intentos fallidos
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
      }
      
      await user.save();
      
      return res.status(400).json({ 
        success: false,
        error: "Invalid credentials" 
      });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Create and assign a token con expiración configurable
    const token = jwt.sign(
      { _id: user._id }, 
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.header("auth-token", token);
    
    return res.status(200).json({
      success: true,
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        personalInfo: user.personalInfo
      }
    });
  } catch (error) {
    console.error('Signin error:', error.message);
    next(error);
  }
};

export const profile = async (req, res, next) => {
  try {
    const userFound = await User.findById(req.user._id)
      .select("-password -verificationToken -passwordResetToken");
    
    if (!userFound) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    return res.json({
      success: true,
      data: userFound
    });
  } catch (error) {
    next(error);
  }
};
