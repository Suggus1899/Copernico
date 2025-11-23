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
      studentId: z.string().optional(),
      career: z.string().optional(),
      semester: z.number().min(1).max(20).optional(),
      averageGrade: z.number().min(0).max(5).optional(),
      enrolledCourses: z.array(z.string()).optional()
    }).optional().refine((data, ctx) => {
      if (ctx.parent.role === 'student' && !data?.studentId) {
        return false;
      }
      return true;
    }, {
      message: "Student ID is required for students",
      path: ["studentProfile.studentId"]
    }),
    
    // Solo para tutores
    tutorProfile: z.object({
      specialties: z.array(z.string()).optional(),
      teachingMethods: z.array(z.string()).optional(),
      maxStudents: z.number().min(1).optional(),
      hourlyRate: z.number().min(0).optional(),
      bio: z.string().max(500).optional()
    }).optional().refine((data, ctx) => {
      if (ctx.parent.role === 'tutor' && (!data?.specialties || data.specialties.length === 0)) {
        return false;
      }
      return true;
    }, {
      message: "At least one specialty is required for tutors",
      path: ["tutorProfile.specialties"]
    }),
    
    // Solo para asesores
    advisorProfile: z.object({
      specializationAreas: z.array(z.string()).optional(),
      appointmentDuration: z.number().min(30).optional(),
      certification: z.array(z.string()).optional(),
      bio: z.string().max(500).optional()
    }).optional().refine((data, ctx) => {
      if (ctx.parent.role === 'advisor' && (!data?.specializationAreas || data.specializationAreas.length === 0)) {
        return false;
      }
      return true;
    }, {
      message: "At least one specialization area is required for advisors",
      path: ["advisorProfile.specializationAreas"]
    })
    
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
});