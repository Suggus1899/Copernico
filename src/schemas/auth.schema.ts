import { z } from 'zod';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy.js';

export const emailField = z
  .string({ required_error: 'El correo es obligatorio' })
  .trim()
  .toLowerCase()
  .email('El correo no es válido')
  .max(254, 'El correo es demasiado largo');

export const passwordField = z
  .string({ required_error: 'La contraseña es obligatoria' })
  .refine(isStrongPassword, { message: PASSWORD_POLICY_MESSAGE });

// Al iniciar sesión o confirmar una acción no se revela la política de contraseñas.
export const currentPasswordField = z
  .string({ required_error: 'La contraseña actual es obligatoria' })
  .min(1, 'La contraseña actual es obligatoria');

const nameField = (label: string) =>
  z
    .string({ required_error: `${label} es obligatorio` })
    .trim()
    .min(2, `${label} debe tener al menos 2 caracteres`)
    .max(60, `${label} no puede superar 60 caracteres`);

const personalInfoField = z.object({
  firstName: nameField('El nombre'),
  lastName: nameField('El apellido'),
  phone: z.string().trim().max(30).optional(),
});

const studentProfileField = z.object({
  studentId: z.string().trim().min(1, 'El ID estudiantil es obligatorio').max(30).optional(),
});

const tutorProfileField = z.object({
  specialties: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
});

const accountShape = {
  email: emailField,
  password: passwordField,
  personalInfo: personalInfoField,
  studentProfile: studentProfileField.optional(),
  tutorProfile: tutorProfileField.optional(),
};

// Cada rol exige sus datos propios; los campos de otros roles se descartan al guardar.
function requireRoleProfile(data: { role: string; studentProfile?: { studentId?: string }; tutorProfile?: { specialties?: string[] } }, ctx: z.RefinementCtx) {
  if (data.role === 'student' && !data.studentProfile?.studentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['studentProfile', 'studentId'],
      message: 'El ID estudiantil es obligatorio',
    });
  }
  if (data.role === 'tutor' && !data.tutorProfile?.specialties?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tutorProfile', 'specialties'],
      message: 'Indica al menos una especialidad',
    });
  }
}

const signupBody = z
  .object(accountShape)
  .extend({ role: z.enum(['student', 'tutor']) })
  .superRefine(requireRoleProfile);

// Cuerpo para que un administrador cree cuentas (incluye el rol admin).
export const createUserBody = z
  .object(accountShape)
  .extend({ role: z.enum(['student', 'tutor', 'admin']) })
  .superRefine(requireRoleProfile);

export const signupSchema = z.object({ body: signupBody });

export const signinSchema = z.object({
  body: z.object({
    email: emailField,
    password: currentPasswordField,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: currentPasswordField,
    newPassword: passwordField,
  }),
});

export const changeEmailSchema = z.object({
  body: z.object({
    currentPassword: currentPasswordField,
    newEmail: emailField,
  }),
});

export const deactivateSchema = z.object({
  body: z.object({
    currentPassword: currentPasswordField,
  }),
});
