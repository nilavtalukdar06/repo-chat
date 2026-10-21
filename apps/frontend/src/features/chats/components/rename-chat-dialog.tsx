import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useRenameChat } from "../hooks";
import { renameChatSchema, type RenameChatInput } from "../schemas";
import type { Chat } from "../types";

type RenameChatDialogProps = {
  chat: Chat | null;
  onClose: () => void;
};

export function RenameChatDialog({ chat, onClose }: RenameChatDialogProps) {
  return (
    <Dialog open={chat !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-md sm:max-w-sm">
        {chat ? (
          <RenameChatForm key={chat.id} chat={chat} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RenameChatForm({
  chat,
  onClose,
}: {
  chat: Chat;
  onClose: () => void;
}) {
  const rename = useRenameChat({ onSuccess: onClose });
  const form = useForm<RenameChatInput>({
    resolver: zodResolver(renameChatSchema),
    defaultValues: { title: chat.title },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(({ title }) =>
        rename.mutate({ id: chat.id, title }),
      )}
    >
      <DialogHeader>
        <DialogTitle className="font-normal">Rename chat</DialogTitle>
      </DialogHeader>
      <Controller
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="chat-title" className="sr-only">
              Title
            </FieldLabel>
            <Input
              {...field}
              id="chat-title"
              autoComplete="off"
              autoFocus
              aria-invalid={fieldState.invalid}
              disabled={rename.isPending}
              className="rounded font-light"
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
              className="rounded font-light"
              disabled={rename.isPending}
            />
          }
        >
          Cancel
        </DialogClose>
        <Button
          type="submit"
          size="sm"
          className="min-w-20 rounded font-light"
          disabled={rename.isPending}
        >
          {rename.isPending ? <Spinner /> : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
