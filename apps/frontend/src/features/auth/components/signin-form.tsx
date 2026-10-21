import { useState } from "react";
import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { getErrorMessage, getFieldErrors } from "@/lib/api-error";
import { useLogin } from "../hooks";
import { validateLogin, type FieldErrors } from "../validation";
import { AuthLayout } from "./auth-layout";
import { AuthSubmitButton } from "./auth-submit-button";
import { AuthTextField } from "./auth-text-field";

export function SignInForm() {
  const login = useLogin();
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  const serverErrors = getFieldErrors(login.error);
  const hasFieldErrors = Object.keys(serverErrors).length > 0;
  const formError =
    login.error && !hasFieldErrors ? getErrorMessage(login.error) : undefined;

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const errors = validateLogin(email, password);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) return;

    login.mutate({ email, password });
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to chat with your repositories."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className={buttonVariants({
              variant: "link",
              className: "h-auto p-0 text-sm font-medium",
            })}
          >
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup className="gap-3">
          <AuthTextField
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
            error={clientErrors.email ?? serverErrors.email}
          />
          <AuthTextField
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            error={clientErrors.password ?? serverErrors.password}
          />
          {formError ? (
            <FieldError className="px-4">{formError}</FieldError>
          ) : null}
          <AuthSubmitButton pending={login.isPending}>
            Continue
          </AuthSubmitButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
