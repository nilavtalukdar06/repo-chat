import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useLogin } from "../hooks";
import { loginSchema, type LoginInput } from "../schemas";
import { AuthLayout } from "./auth-layout";
import { AuthSubmitButton } from "./auth-submit-button";
import { AuthTextField } from "./auth-text-field";

export function SignInForm() {
  const login = useLogin();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

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
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
      >
        <FieldGroup className="gap-3">
          <AuthTextField
            control={form.control}
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
          />
          <AuthTextField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
          />
          <AuthSubmitButton pending={login.isPending}>
            Continue
          </AuthSubmitButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
