import { api, type ApiResponse } from "@/lib/api";
import { getErrorStatus } from "@/lib/api-error";
import type { AuthUser, LoginInput, RegisterInput } from "./types";

export async function fetchSession() {
  try {
    const { data } = await api.get<ApiResponse<AuthUser>>("/api/auth/me");
    return data.data;
  } catch (error) {
    if (getErrorStatus(error) === 401) return null;
    throw error;
  }
}

export async function login(input: LoginInput) {
  const { data } = await api.post<ApiResponse<AuthUser>>(
    "/api/auth/login",
    input,
  );
  return data.data;
}

export async function register(input: RegisterInput) {
  await api.post("/api/auth/register", input);
}

export async function logout() {
  await api.post("/api/auth/logout");
}
