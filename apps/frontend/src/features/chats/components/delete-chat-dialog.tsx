import { useMatch, useNavigate } from "react-router";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteChat } from "../hooks";
import type { Chat } from "../types";

type DeleteChatDialogProps = {
  chat: Chat | null;
  onClose: () => void;
};

export function DeleteChatDialog({ chat, onClose }: DeleteChatDialogProps) {
  const navigate = useNavigate();
  const activeChatId = useMatch("/chat/:chatId")?.params.chatId;
  const remove = useDeleteChat({
    onSuccess: (id) => {
      onClose();
      if (id === activeChatId) void navigate("/", { replace: true });
    },
  });

  return (
    <AlertDialog
      open={chat !== null}
      onOpenChange={(open) => !open && !remove.isPending && onClose()}
    >
      <AlertDialogContent className="rounded-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-normal">
            Delete chat?
          </AlertDialogTitle>
          <AlertDialogDescription className="font-light">
            “{chat?.title}” and all of its messages will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="rounded-b-md">
          <AlertDialogCancel
            size="sm"
            className="rounded-md font-light"
            disabled={remove.isPending}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            size="sm"
            className="min-w-20 rounded-md font-light"
            disabled={remove.isPending}
            onClick={() => chat && remove.mutate(chat.id)}
          >
            {remove.isPending ? <Spinner /> : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
