import z from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "name is too short"),
  email: z.email("email is not valid"),
  password: z.string().min(8, "password is too short"),
});

export const loginSchema = z.object({
  email: z.email("email is not valid"),
  password: z.string().min(1, "password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
