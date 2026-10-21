import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toastError } from "@/lib/notify";
import { login, logout, register } from "./api";
import { sessionQueryOptions } from "./queries";
import type { LoginInput, RegisterInput } from "./schemas";

export function useSession() {
  return useQuery(sessionQueryOptions);
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (user) => {
      queryClient.setQueryData(sessionQueryOptions.queryKey, user);
      void navigate("/", { replace: true });
    },
    onError: (error) => toastError(error, "Unable to sign in"),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await register(input);
      return login({ email: input.email, password: input.password });
    },
    onSuccess: (user) => {
      queryClient.setQueryData(sessionQueryOptions.queryKey, user);
      void navigate("/", { replace: true });
    },
    onError: (error) => toastError(error, "Unable to create your account"),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(sessionQueryOptions.queryKey, null);
      void navigate("/signin", { replace: true });
    },
    onError: (error) => toastError(error, "Unable to sign out"),
  });
}
