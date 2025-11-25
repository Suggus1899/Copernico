import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    // Datos básicos (obligatorios para todos)
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
    role: z.enum(['student', 'tutor', 'advisor']),
    
    // Información personal (obligatoria para todos)
    personalInfo: z.object({
      firstName: z.string().min(2, 'El nombre es requerido'),
      lastName: z.string().min(2, 'El apellido es requerido'),
      phone: z.string().optional(),
      avatar: z.string().optional()
    }),
    
    // Campos condicionales por rol
    academicProfile: z.object({
      institution: z.string().optional(),
      department: z.string().optional(),
      title: z.string().optional(),
      experienceYears: z.number().min(0).optional(),
      skills: z.array(z.string()).optional()
    }).optional(),
    
    // Solo para estudiantes
    studentProfile: z.object({
      studentId: z.string().min(1, 'ID Estudiantil es requerido')
    }).optional().refine((data, ctx) => {
      if (ctx.parent.role === 'student' && !data?.studentId) {
        return false;
      }
      return true;
    }, {
      message: "ID Estudiantil es requerido para estudiantes",
      path: ["studentProfile.studentId"]
    }),
    
    // Solo para tutores
    tutorProfile: z.object({
      specialties: z.array(z.string().min(1)).min(1, 'Al menos una especialidad es requerida'),
      experienceYears: z.number().min(0, 'Años de experiencia debe ser 0 o mayor').optional()
    }).optional().refine((data, ctx) => {
      if (ctx.parent.role === 'tutor' && (!data?.specialties || data.specialties.length === 0)) {
        return false;
      }
      return true;
    }, {
      message: "Al menos una especialidad es requerida para tutores",
      path: ["tutorProfile.specialties"]
    }),
    
    // Solo para asesores
    advisorProfile: z.object({
      specializationAreas: z.array(z.string().min(1)).min(1, 'Al menos un área de especialización es requerida'),
      certification: z.array(z.string()).optional(),
      bio: z.string().max(500, 'El enfoque de asesoramiento no debe exceder 500 caracteres').optional()
    }).optional().refine((data, ctx) => {
      if (ctx.parent.role === 'advisor' && (!data?.specializationAreas || data.specializationAreas.length === 0)) {
        return false;
      }
      return true;
    }, {
      message: "Al menos un área de especialización es requerida para asesores",
      path: ["advisorProfile.specializationAreas"]
    })
    
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
});