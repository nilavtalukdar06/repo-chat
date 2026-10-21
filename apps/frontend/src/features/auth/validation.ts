const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Partial<Record<string, string>>;

export function validateLogin(email: string, password: string) {
  const errors: FieldErrors = {};
  if (!EMAIL_PATTERN.test(email))
    errors.email = "Please provide a valid email address";
  if (!password) errors.password = "Password is required";
  return errors;
}

export function validateRegister(
  name: string,
  email: string,
  password: string,
) {
  const errors: FieldErrors = {};
  if (name.length < 2) errors.name = "Name must be at least 2 characters long";
  if (!EMAIL_PATTERN.test(email))
    errors.email = "Please provide a valid email address";
  if (password.length < 8)
    errors.password = "Password must be at least 8 characters long";
  return errors;
}
