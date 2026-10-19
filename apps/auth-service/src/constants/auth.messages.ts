export const AUTH_MESSAGES = {
  USER_ALREADY_EXISTS: "a user with this email already exists",
  INVALID_CREDENTIALS: "invalid email or password",
  AUTHENTICATION_REQUIRED: "authentication is required to access this resource",
  SESSION_EXPIRED: "session has expired, please log in again",
  REGISTER_SUCCESS: "user registered successfully",
  LOGIN_SUCCESS: "user logged in successfully",
  LOGOUT_SUCCESS: "user logged out successfully",
  PROFILE_FETCHED: "user profile fetched successfully",
  SESSION_VALID: "session is valid",
} as const;
