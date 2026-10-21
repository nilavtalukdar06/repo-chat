import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCreateRepository } from "../hooks";
import { createRepositorySchema, type CreateRepositoryInput } from "../schemas";

export function CreateRepositoryDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<CreateRepositoryInput>({
    resolver: zodResolver(createRepositorySchema),
    defaultValues: { githubUrl: "" },
  });
  const create = useCreateRepository({
    onSuccess: () => {
      setOpen(false);
      form.reset();
    },
  });

  function handleOpenChange(next: boolean) {
    if (create.isPending) return;
    setOpen(next);
    if (!next) form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button size="sm" className="rounded-md font-light" />}
      >
        <PlusIcon />
        Add repository
      </DialogTrigger>
      <DialogContent className="rounded-md sm:max-w-md">
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          <DialogHeader>
            <DialogTitle className="font-normal">Add repository</DialogTitle>
            <DialogDescription className="font-light">
              Paste a public GitHub repository URL. We&apos;ll index it so you
              can chat with its code.
            </DialogDescription>
          </DialogHeader>
          <Controller
            name="githubUrl"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="sr-only">
                  GitHub URL
                </FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="url"
                  autoComplete="off"
                  placeholder="https://github.com/owner/repo"
                  aria-invalid={fieldState.invalid}
                  className="rounded-md font-light"
                  disabled={create.isPending}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-md font-light"
                  disabled={create.isPending}
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              className="min-w-20 rounded-md font-light"
              disabled={create.isPending}
            >
              {create.isPending ? <Spinner /> : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
