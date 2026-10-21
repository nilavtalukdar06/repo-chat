import { useState } from "react";
import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { getErrorMessage, getFieldErrors } from "@/lib/api-error";
import { useRegister } from "../hooks";
import { validateRegister, type FieldErrors } from "../validation";
import { AuthLayout } from "./auth-layout";
import { AuthSubmitButton } from "./auth-submit-button";
import { AuthTextField } from "./auth-text-field";

export function SignUpForm() {
  const register = useRegister();
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  const serverErrors = getFieldErrors(register.error);
  const hasFieldErrors = Object.keys(serverErrors).length > 0;
  const formError =
    register.error && !hasFieldErrors
      ? getErrorMessage(register.error)
      : undefined;

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const errors = validateRegister(name, email, password);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) return;

    register.mutate({ name, email, password });
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Sign up to start chatting with your repositories."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/signin"
            className={buttonVariants({
              variant: "link",
              className: "h-auto p-0 text-sm font-medium",
            })}
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup className="gap-3">
          <AuthTextField
            name="name"
            label="Full name"
            autoComplete="name"
            error={clientErrors.name ?? serverErrors.name}
          />
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
            autoComplete="new-password"
            error={clientErrors.password ?? serverErrors.password}
          />
          {formError ? (
            <FieldError className="px-4">{formError}</FieldError>
          ) : null}
          <AuthSubmitButton pending={register.isPending}>
            Continue
          </AuthSubmitButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
