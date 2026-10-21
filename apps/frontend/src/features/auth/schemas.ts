import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .pipe(z.email("Please provide a valid email address"));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long"),
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
