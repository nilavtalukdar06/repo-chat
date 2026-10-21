import type { ComponentProps } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AuthTextFieldProps<T extends FieldValues> = Omit<
  ComponentProps<typeof Input>,
  "name" | "id" | "value" | "defaultValue" | "onChange" | "onBlur"
> & {
  control: Control<T>;
  name: Path<T>;
  label: string;
};

export function AuthTextField<T extends FieldValues>({
  control,
  name,
  label,
  ...props
}: AuthTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name} className="sr-only">
            {label}
          </FieldLabel>
          <Input
            {...props}
            {...field}
            id={field.name}
            placeholder={label}
            aria-invalid={fieldState.invalid}
            className="h-12 rounded-full px-5 text-base md:text-base"
          />
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} className="px-4" />
          ) : null}
        </Field>
      )}
    />
  );
}
