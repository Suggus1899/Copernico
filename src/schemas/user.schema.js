import { z } from 'zod';
import { createUserBody } from './auth.schema.js';

const text = (max) => z.string().trim().max(max);
const optionalText = (max) => text(max).optional();
const textList = (maxItems, maxLength) => z.array(z.string().trim().min(1).max(maxLength)).max(maxItems);

// Solo se aceptan los campos editables por el propio usuario. Zod descarta el resto, de modo que
// rol, estado, correo, contraseña, avatar, documentos y relaciones nunca llegan a la base de datos.
const profileUpdateBody = z.object({
  personalInfo: z
    .object({
      firstName: text(60).min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
      lastName: text(60).min(2, 'El apellido debe tener al menos 2 caracteres').optional(),
      username: optionalText(60),
      phone: optionalText(30),
      address: optionalText(200),
      city: optionalText(100),
      country: optionalText(100),
      province: optionalText(100),
      postalCode: optionalText(20),
      specialty: optionalText(200),
      degrees: optionalText(500),
      experience: optionalText(500),
      certifications: optionalText(500),
      bio: optionalText(1000),
    })
    .optional(),
  academicProfile: z
    .object({
      institution: optionalText(200),
      department: optionalText(200),
      title: optionalText(200),
      experienceYears: z.number().min(0).max(80).optional(),
      skills: textList(50, 60).optional(),
    })
    .optional(),
  studentProfile: z
    .object({
      career: optionalText(200),
      semester: z.number().int().min(0).max(30).optional(),
    })
    .optional(),
  tutorProfile: z
    .object({
      specialties: textList(20, 80).optional(),
      teachingMethods: textList(20, 80).optional(),
      maxStudents: z.number().int().min(0).max(500).optional(),
      available: z.boolean().optional(),
      appointmentDuration: z.number().int().min(15).max(240).optional(),
    })
    .optional(),
  communicationSettings: z
    .object({
      allowNotifications: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      notificationPreferences: textList(20, 60).optional(),
    })
    .optional(),
});

export const updateProfileSchema = z.object({ body: profileUpdateBody });

export const createUserSchema = z.object({ body: createUserBody });
