import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    fullname: z
      .string({
        required_error: "Fullname is required",
      })
      .min(3),
    email: z
      .string({
        required_error: "Email is required",
      })
      .email({
        message: "Email is invalid",
      }),
    password: z
      .string({
        required_error: "Password is required",
      })
      .min(8, {
        message: "Password must be at least 8 characters",
      }),
    userType: z
      .enum(['Estudiante', 'Tutor', 'Asesor'], {
        required_error: "User type is required",
        invalid_type_error: "User type must be Estudiante, Tutor, or Asesor",
      }),
  }),
});

export const signinSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: "Email is required",
      })
      .email({
        message: "Email is invalid",
      }),
    password: z
      .string({
        required_error: "Password is required",
      })
      .min(8, {
        message: "Password must be at least 8 characters",
      }),
  }),
});

const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({
          required_error: "La contraseña actual es requerida",
        })
        .min(8, {
          message: "La contraseña actual debe tener al menos 8 caracteres",
        }),
      newPassword: z
        .string({
          required_error: "La nueva contraseña es requerida",
        })
        .regex(passwordPolicy, {
          message: "La nueva contraseña debe tener 8 caracteres, mayúscula, minúscula y número",
        }),
      confirmPassword: z
        .string({
          required_error: "La confirmación es requerida",
        })
        .min(8, {
          message: "La confirmación debe tener al menos 8 caracteres",
        }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Las contraseñas no coinciden",
      path: ["confirmPassword"],
    })
    .refine((data) => data.newPassword !== data.currentPassword, {
      message: "La nueva contraseña debe ser diferente a la actual",
      path: ["newPassword"],
    }),
});

export const changeEmailSchema = z.object({
  body: z.object({
    newEmail: z
      .string({
        required_error: "El nuevo correo es requerido",
      })
      .email({
        message: "Correo inválido",
      }),
  }),
});
