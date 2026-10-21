import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export type ApiResponse<T> = {
  success: true;
  statusCode: number;
  message: string;
  data: T;
};
