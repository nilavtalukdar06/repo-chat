import z from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "name must be at least 2 characters long"),
  email: z.email("please provide a valid email address"),
  password: z.string().min(8, "password must be at least 8 characters long"),
});

export const loginSchema = z.object({
  email: z.email("please provide a valid email address"),
  password: z.string().min(1, "password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
