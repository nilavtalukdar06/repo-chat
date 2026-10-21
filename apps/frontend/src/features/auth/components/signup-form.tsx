import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useRegister } from "../hooks";
import { registerSchema, type RegisterInput } from "../schemas";
import { AuthLayout } from "./auth-layout";
import { AuthSubmitButton } from "./auth-submit-button";
import { AuthTextField } from "./auth-text-field";

export function SignUpForm() {
  const register = useRegister();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

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
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => register.mutate(values))}
      >
        <FieldGroup className="gap-3">
          <AuthTextField
            control={form.control}
            name="name"
            label="Full name"
            autoComplete="name"
          />
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
            autoComplete="new-password"
          />
          <AuthSubmitButton pending={register.isPending}>
            Continue
          </AuthSubmitButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
