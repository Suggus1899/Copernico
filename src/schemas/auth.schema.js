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
