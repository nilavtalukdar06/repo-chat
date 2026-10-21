import { isAxiosError } from "axios";

type ApiErrorBody = {
  message?: string;
  errors?: { fieldErrors?: Record<string, string[] | undefined> };
};

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";
const NETWORK_MESSAGE = "Unable to reach the server. Please try again.";

function capitalize(message: string) {
  return message.charAt(0).toUpperCase() + message.slice(1);
}

export function getErrorStatus(error: unknown) {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export function getErrorMessage(error: unknown) {
  if (!isAxiosError<ApiErrorBody>(error)) return DEFAULT_MESSAGE;
  if (!error.response) return NETWORK_MESSAGE;
  const message = error.response.data?.message;
  return message ? capitalize(message) : DEFAULT_MESSAGE;
}

export function getFieldErrors(error: unknown) {
  const result: Record<string, string> = {};
  if (!isAxiosError<ApiErrorBody>(error)) return result;
  const fieldErrors = error.response?.data?.errors?.fieldErrors;
  if (!fieldErrors) return result;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages?.[0];
    if (message) result[field] = capitalize(message);
  }
  return result;
}
