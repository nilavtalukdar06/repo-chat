import z from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("please provide a valid email address"));

export const registerSchema = z.object({
  name: z.string().min(2, "name must be at least 2 characters long"),
  email: emailSchema,
  password: z.string().min(8, "password must be at least 8 characters long"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
