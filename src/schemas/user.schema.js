import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    // Datos básicos (obligatorios para todos)
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
    role: z.enum(['student', 'tutor', 'advisor', 'admin']),
    
    // Información personal (obligatoria para todos)
    personalInfo: z.object({
      firstName: z.string().min(2, 'El nombre es requerido'),
      lastName: z.string().min(2, 'El apellido es requerido'),
      username: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional(),
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
    }).optional(),
    
    // Solo para tutores
    tutorProfile: z.object({
      specialties: z.array(z.string().min(1)).min(1, 'Al menos una especialidad es requerida'),
      experienceYears: z.number().min(0, 'Años de experiencia debe ser 0 o mayor').optional()
    }).optional(),
    
    // Solo para asesores
    advisorProfile: z.object({
      specializationAreas: z.array(z.string().min(1)).min(1, 'Al menos un área de especialización es requerida'),
      certification: z.array(z.string()).optional(),
      bio: z.string().max(500, 'El enfoque de asesoramiento no debe exceder 500 caracteres').optional()
    }).optional()
    
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
});

export const updateProfileSchema = z.object({
  body: z.object({
    // Información personal (opcional para actualizar)
    personalInfo: z.object({
      firstName: z.string().min(2, 'El nombre es requerido').optional(),
      lastName: z.string().min(2, 'El apellido es requerido').optional(),
      username: z.string().optional(),
      phone: z.string().optional(),
      avatar: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      province: z.string().optional(),
      postalCode: z.string().optional(),
      language: z.string().optional()
    }).optional(),
    
    // Campos condicionales por rol (opcionales)
    academicProfile: z.object({
      institution: z.string().optional(),
      department: z.string().optional(),
      title: z.string().optional(),
      experienceYears: z.number().min(0).optional(),
      skills: z.array(z.string()).optional()
    }).optional(),
    
    // Solo para estudiantes
    studentProfile: z.object({
      studentId: z.string().min(1, 'ID Estudiantil es requerido').optional(),
      institution: z.string().optional(),
      program: z.string().optional(),
      gradYear: z.number().int().optional(),
      career: z.string().optional(),
      semester: z.number().int().optional(),
      averageGrade: z.number().optional(),
      enrolledCourses: z.array(z.string()).optional()
    }).optional(),
    
    // Solo para tutores
    tutorProfile: z.object({
      specialties: z.array(z.string().min(1)).optional(),
      experienceYears: z.number().min(0, 'Años de experiencia debe ser 0 o mayor').optional(),
      teachingMethods: z.array(z.string()).optional(),
      hourlyRate: z.number().optional(),
      available: z.boolean().optional(),
      paymentInfo: z.object({
        method: z.string().optional(),
        account: z.string().optional(),
        bankName: z.string().optional()
      }).optional(),
      documents: z.array(z.string()).optional()
    }).optional(),
    
    // Solo para asesores
    advisorProfile: z.object({
      specializationAreas: z.array(z.string().min(1)).optional(),
      certification: z.array(z.string()).optional(),
      bio: z.string().max(500, 'El enfoque de asesoramiento no debe exceder 500 caracteres').optional(),
      documents: z.array(z.string()).optional(),
      available: z.boolean().optional(),
      appointmentDuration: z.number().optional()
    }).optional()
    ,
    // Preferencias de comunicación/notificaciones
    communicationSettings: z.object({
      allowNotifications: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      notificationPreferences: z.array(z.enum(['email','push','sms'])).optional()
    }).optional()
  })
});

export const updatePreferencesSchema = z.object({
  body: z.object({
    communicationSettings: z.object({
      allowNotifications: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      notificationPreferences: z.array(z.enum(['email','push','sms'])).optional()
    })
  })
});