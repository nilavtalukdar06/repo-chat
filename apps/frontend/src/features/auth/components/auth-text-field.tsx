import type { ComponentProps } from "react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AuthTextFieldProps = Omit<ComponentProps<typeof Input>, "id"> & {
  name: string;
  label: string;
  error?: string;
};

export function AuthTextField({
  name,
  label,
  error,
  ...props
}: AuthTextFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={name} className="sr-only">
        {label}
      </FieldLabel>
      <Input
        id={name}
        name={name}
        placeholder={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="h-12 rounded-full px-5 text-base md:text-base"
        {...props}
      />
      {error ? (
        <FieldError id={`${name}-error`} className="px-4">
          {error}
        </FieldError>
      ) : null}
    </Field>
  );
}
